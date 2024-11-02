import { AppError, HttpCode } from "@/config/errors";
import db from "@/lib/db";
import { users } from "@/lib/db/schema/users";
import assert from "assert";
import { eq } from "drizzle-orm";
import express from "express";
import asyncHandler from "express-async-handler";
import profilePictureRouter from "./profilePicture";
import bioRouter from "./bio";
import streamKeyRouter from "./streamKey";
import usernameRouter from "./username";
import { type Profile } from "@/types/redis";
import redisClient from "@/lib/redis";
import { REDIS_KEYS } from "@/config/environment";
const router = express.Router();

router.get(
    "/",
    asyncHandler(async (req, res, next) => {
        assert(req.user);
        try {
            const cached = await redisClient.get(
                REDIS_KEYS.userProfile(req.user.userId)
            );
            if (cached) {
                res.status(HttpCode.OK).json(JSON.parse(cached));
                return;
            }
            const userData = await db.query.users.findFirst({
                where: eq(users.userId, req.user.userId),
                with: {
                    following: {
                        columns: {},
                        with: {
                            following: {
                                columns: {
                                    username: true,
                                    profilePicture: true,
                                    currentStreamId: true,
                                },
                            },
                        },
                    },
                },
            });
            if (!userData)
                return next(
                    new AppError({
                        httpCode: HttpCode.NO_CONTENT,
                        description: "User not found",
                    })
                );

            const responseData: Profile = {
                ...userData,
                following: userData.following
                    .map((e) => ({
                        username: e.following.username,
                        profilePicture: e.following.profilePicture,
                        isLive: e.following.currentStreamId !== null,
                    }))
                    .toSorted((a, b) => +b.isLive - +a.isLive),
            };
            await redisClient.set(
                REDIS_KEYS.userProfile(req.user.userId),
                JSON.stringify(responseData),
                {
                    EX: 300,
                }
            );

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

router.use("/profilePicture", profilePictureRouter);
router.use("/bio", bioRouter);
router.use("/streamKey", streamKeyRouter);
router.use("/username", usernameRouter);

export default router;
