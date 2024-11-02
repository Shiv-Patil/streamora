import { REDIS_KEYS } from "@/config/environment";
import { AppError, HttpCode } from "@/config/errors";
import db from "@/lib/db";
import { followers } from "@/lib/db/schema/users";
import redisClient from "@/lib/redis";
import { type Following } from "@/types/redis";
import assert from "assert";
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
            const toFollow = await db.query.users.findFirst({
                where(fields, { eq }) {
                    return eq(fields.username, result.data.username);
                },
            });
            if (!toFollow)
                return next(
                    new AppError({
                        httpCode: HttpCode.BAD_REQUEST,
                        description: "Invalid user",
                    })
                );

            if (toFollow.userId === req.user.userId)
                return next(
                    new AppError({
                        httpCode: HttpCode.BAD_REQUEST,
                        description: "Cannot follow yourself lol",
                    })
                );

            const inserted = await db
                .insert(followers)
                .values({
                    followerId: req.user.userId,
                    followingId: toFollow.userId,
                })
                .onConflictDoNothing()
                .returning();

            if (!inserted.length)
                return next(
                    new AppError({
                        httpCode: HttpCode.BAD_REQUEST,
                        description: "Already following",
                    })
                );

            await redisClient.del(REDIS_KEYS.userProfile(req.user.userId));
            const responseData: Following = {
                username: toFollow.username,
                profilePicture: toFollow.profilePicture,
                isLive: toFollow.currentStreamId !== null,
            };

            res.status(HttpCode.OK).json(responseData);
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
