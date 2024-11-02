import {
    type BaseChannelType,
    type ChannelType,
    type LiveChannel,
    type notLiveChannel,
} from "@/types/redis";
import { type streams } from "../db/schema/streams";
import { followers, users } from "../db/schema/users";
import redisClient from "../redis";
import { REDIS_KEYS } from "@/config/environment";
import { type ReturnData } from "@/types/generic";
import db from "../db";
import { HttpCode } from "@/config/errors";
import { eq, inArray } from "drizzle-orm";
import logger from "../logger";
import { type StreamCateogry } from "../db/schema/enums";

export type StreamerData = typeof users.$inferSelect;
export type StreamData = typeof streams.$inferSelect;

interface PaginationOptions {
    limit?: number;
    cursor?: string;
}

interface StreamMetrics {
    isConnected: boolean;
    viewers: number;
    peakViewers: number;
    followerDelta: number;
}

export type CacheChannelsProps = ({
    streamerData: StreamerData;
} & (
    | { streamData: undefined; metrics: { lastStreamedAt: number | null } }
    | { streamData: StreamData; metrics: StreamMetrics }
))[];

class ChannelManager {
    readonly FEED_CACHE_TTL = 60;
    readonly MAX_FEED_SEARCH = 200;
    readonly CHANNEL_CACHE_TTL = 120;
    readonly DEFAULT_PAGE_SIZE = 10;
    readonly MAX_PAGE_SIZE = 20;

    private async cacheChannels(props: CacheChannelsProps) {
        const channelsInfo: ChannelType[] = props.map((channel) => {
            const baseDetails: BaseChannelType = {
                streamerUsername: channel.streamerData.username,
                streamerBio: channel.streamerData.bio,
                streamerFollowers: channel.streamerData.followerCount,
                streamerProfilePicture: channel.streamerData.profilePicture,
                streamerProfileBanner: channel.streamerData.profileBanner,
            };
            const liveDetails: LiveChannel | notLiveChannel = channel.streamData
                ? {
                      isLive: true,
                      isConnected: channel.metrics.isConnected,
                      streamTitle: channel.streamData.title,
                      streamCategory: channel.streamData.category,
                      streamStartedAt: channel.streamData.startedAt.getTime(),
                      viewerCount: channel.metrics.viewers,
                  }
                : {
                      isLive: false,
                      lastStreamedAt: channel.metrics.lastStreamedAt,
                  };
            return { ...baseDetails, ...liveDetails };
        });

        try {
            const promises = channelsInfo.map((channelInfo) =>
                redisClient.set(
                    REDIS_KEYS.channelInfoCache(channelInfo.streamerUsername),
                    JSON.stringify(channelInfo)
                )
            );
            await Promise.all(promises);
        } catch (e) {
            logger.error(`Failed to cache channel(s): ${e as Error}`);
        }

        return channelsInfo;
    }

    async getChannelsFromUsernames(
        usernames: string[]
    ): Promise<ReturnData<ChannelType[]>> {
        const totalUsernames = usernames.length;
        if (!totalUsernames) return { success: true, data: [] };
        try {
            const cachedPromises = usernames.map((username) =>
                redisClient.get(REDIS_KEYS.channelInfoCache(username))
            );
            const cached = await Promise.all(cachedPromises);

            const cacheMissedUsernames = [];
            for (let index = 0; index < totalUsernames; index++) {
                const cache = cached[index];
                if (!cache) cacheMissedUsernames.push(usernames[index]);
            }
            const streamersDataWithStreams = await db.query.users.findMany({
                where: inArray(users.username, cacheMissedUsernames),
                with: {
                    liveStream: true,
                },
            });

            const promises = streamersDataWithStreams.map(async (data) => {
                const { liveStream, ...streamerData } = data;
                if (liveStream) {
                    const isConnected = !!(await redisClient.get(
                        REDIS_KEYS.rtmpConnected(liveStream.userId)
                    ));
                    const metrics = {
                        isConnected,
                        viewers: 0,
                        peakViewers: 0, // TODO: Pull from database
                        followerDelta: 0, // TODO: Pull from database
                    };

                    return { streamerData, streamData: liveStream, metrics };
                }
                return {
                    streamerData,
                    streamData: undefined,
                    metrics: {
                        lastStreamedAt:
                            streamerData.lastStremedAt?.getTime() ?? null,
                    },
                };
            });

            const cacheChannelsProps: CacheChannelsProps =
                await Promise.all(promises);
            const cacheMissedChannels =
                await this.cacheChannels(cacheChannelsProps);
            const data: ChannelType[] = [];
            for (
                let index = 0, missedIndex = 0;
                index < totalUsernames;
                index++
            ) {
                const cachedChannel = cached[index];
                if (cachedChannel)
                    data.push(JSON.parse(cachedChannel) as ChannelType);
                else {
                    if (cacheMissedChannels[missedIndex])
                        data.push(cacheMissedChannels[missedIndex]);
                    missedIndex++;
                }
            }
            return { success: true, data };
        } catch (e) {
            return {
                success: false,
                error: "An error occurred",
                feedback: `${e as Error}`,
            };
        }
    }

    private async getFollowingLiveUsernames(
        userId: string
    ): Promise<ReturnData<string[]>> {
        try {
            const data = (
                await db.query.users.findMany({
                    where(fields, { and, isNotNull, inArray }) {
                        return and(
                            isNotNull(fields.currentStreamId),
                            inArray(
                                fields.userId,
                                db
                                    .select({ userId: followers.followingId })
                                    .from(followers)
                                    .where(eq(followers.followerId, userId))
                            )
                        );
                    },
                    columns: {
                        username: true,
                    },
                    limit: this.MAX_FEED_SEARCH,
                })
            ).map((data) => data.username);
            return { success: true, data };
        } catch (e) {
            return {
                success: false,
                error: "An error occurred",
                feedback: `${e as Error}`,
            };
        }
    }

    private async getCategoryLiveUsernames(
        userCategories: StreamCateogry[]
    ): Promise<ReturnData<string[]>> {
        if (!userCategories.length) return { success: true, data: [] };
        try {
            const data = (
                await db.query.streams.findMany({
                    where(fields, { and, isNull, inArray }) {
                        return and(
                            isNull(fields.endedAt),
                            inArray(fields.category, userCategories)
                        );
                    },
                    with: {
                        user: {
                            columns: {
                                username: true,
                            },
                        },
                    },
                    columns: {},
                    orderBy(fields, { desc }) {
                        return [
                            desc(fields.peakViewers),
                            desc(fields.startedAt),
                        ];
                    },
                    limit: this.MAX_FEED_SEARCH,
                })
            ).map((data) => data.user.username);
            return { success: true, data };
        } catch (e) {
            return {
                success: false,
                error: "An error occurred",
                feedback: `${e as Error}`,
            };
        }
    }

    private async getTrendingUsernames(): Promise<ReturnData<string[]>> {
        try {
            const data = (
                await db.query.streams.findMany({
                    where(fields, { isNull }) {
                        return isNull(fields.endedAt);
                    },
                    with: {
                        user: {
                            columns: {
                                username: true,
                            },
                        },
                    },
                    columns: {},
                    orderBy(fields, { desc }) {
                        return [
                            desc(fields.peakViewers),
                            desc(fields.startedAt),
                        ];
                    },
                    limit: this.MAX_FEED_SEARCH,
                })
            ).map((data) => data.user.username);
            return { success: true, data };
        } catch (e) {
            return {
                success: false,
                error: "An error occurred",
                feedback: `${e as Error}`,
            };
        }
    }

    async generateUserFeed(userId?: string): Promise<ReturnData<string[]>> {
        let followingUsernames: string[] = [],
            categoryUsernames: string[] = [];
        try {
            if (userId) {
                const user = await db.query.users.findFirst({
                    where: eq(users.userId, userId),
                });
                if (!user)
                    return {
                        success: false,
                        error: "An error occurred",
                        feedback: "User not found",
                    };
                const followingResult =
                    await this.getFollowingLiveUsernames(userId);
                if (!followingResult.success) return followingResult;
                followingUsernames = followingResult.data;

                const categoryResult = await this.getCategoryLiveUsernames(
                    user.streamCategories
                );
                if (!categoryResult.success) return categoryResult;
                categoryUsernames = categoryResult.data;
            }

            const trendingResult = await this.getTrendingUsernames();
            if (!trendingResult.success) return trendingResult;
            const trendingUsernames = trendingResult.data;

            const usernamesSet = new Set([
                ...followingUsernames,
                ...categoryUsernames,
                ...trendingUsernames,
            ]);
            const uniqueUsernames = [...usernamesSet];

            await redisClient.set(
                REDIS_KEYS.userFeed(userId),
                JSON.stringify(uniqueUsernames),
                {
                    EX: this.FEED_CACHE_TTL,
                }
            );

            return { success: true, data: uniqueUsernames };
        } catch (e) {
            return {
                success: false,
                error: "An error occurred",
                feedback: `${e as Error}`,
            };
        }
    }

    async paginateUserFeed(
        userId?: string,
        options?: PaginationOptions
    ): Promise<ReturnData<{ feed: ChannelType[]; nextCursor?: string }>> {
        const limit = options
            ? Math.min(
                  options.limit ?? this.DEFAULT_PAGE_SIZE,
                  this.MAX_PAGE_SIZE
              )
            : this.DEFAULT_PAGE_SIZE;

        let start = 0;
        try {
            if (options?.cursor) {
                start = parseInt(
                    Buffer.from(options.cursor, "base64url").toString("ascii")
                );
                if (isNaN(start) || start < 0) throw new Error();
            }
        } catch {
            return {
                success: false,
                error: "Invalid cursor",
                code: HttpCode.BAD_REQUEST,
            };
        }

        const feedCache = await redisClient.get(REDIS_KEYS.userFeed(userId));
        let userFeed: string[];

        if (feedCache) userFeed = JSON.parse(feedCache) as string[];
        else {
            const feedResult = await this.generateUserFeed(userId);
            if (!feedResult.success) return feedResult;
            start = 0;
            userFeed = feedResult.data;
        }

        const end = Math.min(start + limit, userFeed.length);
        if (start >= userFeed.length || end <= 0)
            return { success: true, data: { feed: [] } };

        const channelsResult = await this.getChannelsFromUsernames(
            userFeed.slice(start, end)
        );
        if (!channelsResult.success) {
            return channelsResult;
        }

        const hasMore = end < userFeed.length;
        const nextCursor = hasMore
            ? Buffer.from(end.toString()).toString("base64url")
            : undefined;

        return {
            success: true,
            data: { feed: channelsResult.data, nextCursor },
        };
    }
}

export const channelManager = new ChannelManager();
