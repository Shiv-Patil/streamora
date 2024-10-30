import { REDIS_KEYS } from "@/config/environment";
import { AppError, HttpCode } from "@/config/errors";
import db from "@/lib/db";
import { streams } from "@/lib/db/schema/streams";
import { users } from "@/lib/db/schema/users";
import redisClient from "@/lib/redis";
import assert from "assert";
import { eq } from "drizzle-orm";
import express from "express";
import expressAsyncHandler from "express-async-handler";

const router = express.Router();

router.post(
    "/",
    expressAsyncHandler(async (req, res, next) => {
        try {
            await db.transaction(
                async (tx) => {
                    assert(req.user);
                    const data = await tx
                        .select()
                        .from(users)
                        .where(eq(users.userId, req.user.userId));
                    if (!data.length) throw new Error("User does not exist");
                    const user = data[0];
                    if (user.currentStreamId === null) return;
                    const isConnected = await redisClient.get(
                        REDIS_KEYS.rtmpConnected(user.userId)
                    );
                    if (isConnected !== null)
                        throw new Error("Stream is connected");
                    const updatedStreams = await tx
                        .update(streams)
                        .set({
                            endedAt: new Date(),
                        })
                        .where(eq(streams.id, user.currentStreamId))
                        .returning();
                    if (!updatedStreams.length)
                        throw new Error("No stream updated");
                    const updated = await tx
                        .update(users)
                        .set({
                            currentStreamId: null,
                        })
                        .where(eq(users.userId, user.userId))
                        .returning();
                    if (!updated.length)
                        throw new Error(
                            "Couldn't update user's current stream"
                        );
                    await redisClient.del(
                        REDIS_KEYS.channelInfoCache(user.username)
                    );
                },
                { isolationLevel: "serializable" }
            );
        } catch (e) {
            return next(
                new AppError({
                    httpCode: HttpCode.INTERNAL_SERVER_ERROR,
                    description: "An error occurred.",
                    feedback: `${e as Error}`,
                })
            );
        }
        res.status(HttpCode.OK).send();
    })
);

export default router;
