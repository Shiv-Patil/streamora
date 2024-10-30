import { REDIS_KEYS } from "@/config/environment";
import { AppError, HttpCode } from "@/config/errors";
import { sanitizeUsername } from "@/lib/auth";
import db from "@/lib/db";
import { users } from "@/lib/db/schema/users";
import redisClient from "@/lib/redis";
import assert from "assert";
import { eq } from "drizzle-orm";
import express from "express";
import expressAsyncHandler from "express-async-handler";
import { z } from "zod";
import { fromError } from "zod-validation-error";
const router = express.Router();

const usernameSchema = z.object({
    username: z
        .string()
        .min(1)
        .max(69)
        .refine(
            (arg) => arg === sanitizeUsername(arg),
            "Only lowercase letters, numbers, underscores, and dashes are allowed"
        ),
});

router.post(
    "/",
    expressAsyncHandler(async (req, res, next) => {
        assert(req.user);
        const parsed = usernameSchema.safeParse(req.body);
        if (!parsed.success) {
            return next(
                new AppError({
                    httpCode: HttpCode.BAD_REQUEST,
                    description: fromError(parsed.error).toString(),
                })
            );
        }
        try {
            await db.transaction(
                async (tx) => {
                    const oldAndDuplicate = await tx.query.users.findMany({
                        where(fields, { eq, or }) {
                            return or(
                                eq(fields.userId, req.user!.userId),
                                eq(fields.username, parsed.data.username)
                            );
                        },
                    });
                    if (
                        !oldAndDuplicate.length ||
                        (oldAndDuplicate.length === 1 &&
                            oldAndDuplicate[0].userId !== req.user!.userId)
                    )
                        throw new Error("User does not exist");
                    if (oldAndDuplicate[0].currentStreamId !== null)
                        return next(
                            new AppError({
                                httpCode: HttpCode.BAD_REQUEST,
                                description:
                                    "Cannot change username while streaming",
                            })
                        );
                    if (oldAndDuplicate.length >= 2)
                        return next(
                            new AppError({
                                httpCode: HttpCode.BAD_REQUEST,
                                description: "Username already exists",
                            })
                        );
                    const oldUsername = oldAndDuplicate[0].username;

                    const updated = await tx
                        .update(users)
                        .set({
                            username: parsed.data.username,
                        })
                        .where(eq(users.userId, req.user!.userId))
                        .returning();
                    if (!updated.length)
                        throw new Error("Username not updated in database");
                    await redisClient.del(
                        REDIS_KEYS.channelInfoCache(oldUsername)
                    );

                    res.status(HttpCode.OK).json(updated[0].username);
                },
                { isolationLevel: "serializable" }
            );
        } catch (e) {
            return next(
                new AppError({
                    httpCode: HttpCode.INTERNAL_SERVER_ERROR,
                    description: "An error occurred",
                    feedback: JSON.stringify(e as object),
                })
            );
        }
    })
);

export default router;
