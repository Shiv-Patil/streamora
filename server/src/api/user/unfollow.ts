import { REDIS_KEYS } from "@/config/environment";
import { AppError, HttpCode } from "@/config/errors";
import db from "@/lib/db";
import { followers } from "@/lib/db/schema/users";
import redisClient from "@/lib/redis";
import assert from "assert";
import { and, eq } from "drizzle-orm";
import express from "express";
import expressAsyncHandler from "express-async-handler";
import { z } from "zod";
import { fromError } from "zod-validation-error";

const router = express.Router();

const querySchema = z.object({
    username: z.string().trim(),
});

router.post(
    "/",
    expressAsyncHandler(async (req, res, next) => {
        assert(req.user);
        const result = querySchema.safeParse(req.body);

        if (!result.success)
            return next(
                new AppError({
                    httpCode: HttpCode.BAD_REQUEST,
                    description: fromError(result.error).toString(),
                })
            );

        try {
            const toUnfollow = await db.query.users.findFirst({
                where(fields, { eq }) {
                    return eq(fields.username, result.data.username);
                },
            });
            if (!toUnfollow)
                return next(
                    new AppError({
                        httpCode: HttpCode.BAD_REQUEST,
                        description: "Invalid user",
                    })
                );

            if (toUnfollow.userId === req.user.userId)
                return next(
                    new AppError({
                        httpCode: HttpCode.BAD_REQUEST,
                        description: "??? what",
                    })
                );

            const removed = await db
                .delete(followers)
                .where(
                    and(
                        eq(followers.followerId, req.user.userId),
                        eq(followers.followingId, toUnfollow.userId)
                    )
                )
                .returning();

            if (!removed.length)
                return next(
                    new AppError({
                        httpCode: HttpCode.BAD_REQUEST,
                        description: "Already not following",
                    })
                );

            await redisClient.del(REDIS_KEYS.userProfile(req.user.userId));

            res.status(HttpCode.OK).send();
        } catch (e) {
            return next(
                new AppError({
                    httpCode: HttpCode.INTERNAL_SERVER_ERROR,
                    description: "An error occurred",
                    feedback: `${e as Error}`,
                })
            );
        }
    })
);

export default router;
