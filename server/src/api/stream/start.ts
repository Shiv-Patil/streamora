import { REDIS_KEYS } from "@/config/environment";
import { AppError, HttpCode } from "@/config/errors";
import { rateLimit } from "@/config/ratelimit";
import db from "@/lib/db";
import { streams } from "@/lib/db/schema/streams";
import { users } from "@/lib/db/schema/users";
import redisClient from "@/lib/redis";
import assert from "assert";
import { eq } from "drizzle-orm";
import express from "express";
import expressAsyncHandler from "express-async-handler";
import { z } from "zod";
import { fromError } from "zod-validation-error";

const router = express.Router();

const bodySchema = z.object({
    title: z.string().trim().min(6),
    category: z.string().trim(),
});

router.post(
    "/",
    rateLimit(
        {
            windowMs: 5 * 1000,
            limit: 1,
            message: "Please wait",
        },
        "stream"
    ),
    expressAsyncHandler(async (req, res, next) => {
        const parsed = bodySchema.safeParse(req.body);
        if (!parsed.success)
            return next(
                new AppError({
                    httpCode: HttpCode.BAD_REQUEST,
                    description: fromError(parsed.error).toString(),
                })
            );
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
                    if (user.currentStreamId !== null)
                        return next(
                            new AppError({
                                httpCode: HttpCode.BAD_REQUEST,
                                description: "User is already streaming",
                            })
                        );
                    const inserted = await tx
                        .insert(streams)
                        .values({
                            userId: user.userId,
                            title: parsed.data.title,
                            category: parsed.data.category,
                        })
                        .returning();
                    if (!inserted.length)
                        throw new Error("No row inserted into streams");
                    const updated = await tx
                        .update(users)
                        .set({
                            currentStreamId: inserted[0].id,
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
