import { REDIS_KEYS } from "@/config/environment";
import { AppError, HttpCode } from "@/config/errors";
import db from "@/lib/db";
import { users } from "@/lib/db/schema/users";
import redisClient from "@/lib/redis";
import { eq } from "drizzle-orm";
import express from "express";
import expressAsyncHandler from "express-async-handler";
import { z } from "zod";
import { fromError } from "zod-validation-error";

const router = express.Router();

const querySchema = z.object({
    username: z.string().trim().min(2),
});

router.get(
    "/",
    expressAsyncHandler(async (req, res, next) => {
        const result = querySchema.safeParse(req.query);
        if (!result.success) {
            return next(
                new AppError({
                    httpCode: HttpCode.BAD_REQUEST,
                    description: fromError(result.error).toString(),
                })
            );
        }

        const cacheKey = REDIS_KEYS.channelInfoCache(result.data.username);
        const cached = await redisClient.get(cacheKey);

        if (cached) {
            res.status(HttpCode.OK).json(JSON.parse(cached));
            return;
        }

        try {
            const channel = await db.query.users.findFirst({
                where(fields, { eq }) {
                    return eq(fields.username, result.data.username);
                },
                with: {
                    streams: {
                        where(fields, { isNull }) {
                            return isNull(fields.endedAt);
                        },
                    },
                    followers: req.user
                        ? {
                              where: (fields, { eq }) =>
                                  eq(fields.followingId, req.user!.userId),
                          }
                        : undefined,
                },
            });
            if (!channel)
                return next(
                    new AppError({
                        httpCode: HttpCode.NOT_FOUND,
                        description: "Invalid channel",
                    })
                );

            let streamData:
                | ((typeof channel.streams)[number] & { viewerCount?: string })
                | undefined = undefined;
            if (channel.currentStreamId !== null) {
                if (!channel.streams.length) {
                    channel.currentStreamId = null;
                    await db
                        .update(users)
                        .set({
                            currentStreamId: null,
                        })
                        .where(eq(users.userId, channel.userId));
                } else {
                    const viewerCount =
                        (await redisClient.get(
                            REDIS_KEYS.streamViewers(channel.streams[0].id)
                        )) ?? "0";
                    streamData = channel.streams[0];
                    streamData.viewerCount = viewerCount;
                }
            }

            const responseData = {
                isLive: channel.currentStreamId === null ? false : true,
                isFollowing: !!channel.followers,
                streamerUsername: channel.username,
                streamerProfilePicture: channel.profilePicture,
                streamerProfileBanner: channel.profileBanner,
                streamerBio: channel.bio,
                streamerFollowers: channel.followerCount,
                streamTitle: streamData?.title,
                streamCategory: streamData?.category,
                streamStartedAt: streamData?.startedAt,
                viewerCount: streamData?.viewerCount,
            };

            await redisClient.set(cacheKey, JSON.stringify(responseData), {
                EX: 30,
            });

            res.status(HttpCode.OK).json(responseData);
        } catch (e) {
            return next(
                new AppError({
                    httpCode: HttpCode.INTERNAL_SERVER_ERROR,
                    description: "An error occurred.",
                    feedback: `${e as Error}`,
                })
            );
        }
    })
);

export default router;
