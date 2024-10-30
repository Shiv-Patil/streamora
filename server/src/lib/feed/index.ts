import {
    type BaseChannelType,
    type ChannelType,
    type LiveChannel,
    type notLiveChannel,
} from "@/types/redis";
import { type streams } from "../db/schema/streams";
import { users } from "../db/schema/users";
import redisClient from "../redis";
import { REDIS_KEYS } from "@/config/environment";
import { type ReturnData } from "@/types/generic";
import db from "../db";
import { HttpCode } from "@/config/errors";
import { eq } from "drizzle-orm";

export type StreamerData = typeof users.$inferSelect;
export type StreamData = typeof streams.$inferSelect;

export type CacheChannelProps = {
    streamerData: StreamerData;
} & (
    | { streamData: undefined; isConnected: undefined; viewerCount: undefined }
    | { streamData: StreamData; isConnected: boolean; viewerCount: number }
);

class ChannelManager {
    readonly FEED_CACHE_TTL = 300;
    readonly CHANNEL_CACHE_TTL = 120;

    async cacheChannel({
        streamerData,
        streamData,
        isConnected,
        viewerCount,
    }: CacheChannelProps) {
        const baseDetails: BaseChannelType = {
            streamerUsername: streamerData.username,
            streamerBio: streamerData.bio,
            streamerFollowers: streamerData.followerCount,
            streamerProfilePicture: streamerData.profilePicture,
            streamerProfileBanner: streamerData.profileBanner,
        };
        const liveDetails: LiveChannel | notLiveChannel = streamData
            ? {
                  isLive: true,
                  isConnected: isConnected,
                  streamTitle: streamData.title,
                  streamCategory: streamData.category,
                  streamStartedAt: streamData.startedAt.getTime(),
                  viewerCount: viewerCount,
              }
            : { isLive: false };
        const channelInfo: ChannelType = { ...baseDetails, ...liveDetails };

        await redisClient.set(
            REDIS_KEYS.channelInfoCache(channelInfo.streamerUsername),
            JSON.stringify(channelInfo),
            { EX: this.CHANNEL_CACHE_TTL }
        );

        return channelInfo;
    }

    async getChannelByUsername(
        username: string
    ): Promise<ReturnData<ChannelType>> {
        const cached = await redisClient.get(
            REDIS_KEYS.channelInfoCache(username)
        );

        if (cached) {
            const data = JSON.parse(cached) as ChannelType;
            return { success: true, data };
        }

        try {
            const streamerData = await db.query.users.findFirst({
                where(fields, { eq }) {
                    return eq(fields.username, username);
                },
                with: {
                    streams: {
                        where(fields, { isNull }) {
                            return isNull(fields.endedAt);
                        },
                    },
                },
            });
            if (!streamerData)
                return {
                    success: false,
                    code: HttpCode.NOT_FOUND,
                    error: "Invalid channel",
                };

            let cacheChannelProps: CacheChannelProps = {
                streamerData,
                isConnected: undefined,
                streamData: undefined,
                viewerCount: undefined,
            };
            if (streamerData.currentStreamId !== null) {
                if (!streamerData.streams.length) {
                    streamerData.currentStreamId = null;
                    await db
                        .update(users)
                        .set({
                            currentStreamId: null,
                        })
                        .where(eq(users.userId, streamerData.userId));
                } else {
                    const viewerCount = parseInt(
                        (await redisClient.get(
                            REDIS_KEYS.streamViewers(streamerData.streams[0].id)
                        )) ?? "0"
                    );
                    const isConnected = !!(await redisClient.get(
                        REDIS_KEYS.rtmpConnected(streamerData.userId)
                    ));
                    cacheChannelProps = {
                        streamerData,
                        streamData: streamerData.streams[0],
                        viewerCount,
                        isConnected,
                    };
                }
            }

            const data = await channelManager.cacheChannel(cacheChannelProps);

            return { success: true, data };
        } catch (e) {
            return {
                success: false,
                code: HttpCode.INTERNAL_SERVER_ERROR,
                error: "An error occurred",
                feedback: `${e as Error}`,
            };
        }
    }
}

export const channelManager = new ChannelManager();
