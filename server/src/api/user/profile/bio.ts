import { REDIS_KEYS } from "@/config/environment";
import { AppError, HttpCode } from "@/config/errors";
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

const bodySchema = z.object({
    bio: z.string().trim().max(500),
});
router.post(
    "/",
    expressAsyncHandler(async (req, res, next) => {
        assert(req.user);
        const parsed = bodySchema.safeParse(req.body);
        if (!parsed.success) {
            return next(
                new AppError({
                    httpCode: HttpCode.BAD_REQUEST,
                    description: fromError(parsed.error).toString(),
                })
            );
        }
        try {
            const updated = await db
                .update(users)
                .set({
                    bio: parsed.data.bio,
                })
                .where(eq(users.userId, req.user.userId))
                .returning();
            if (!updated.length)
                return next(
                    new AppError({
                        httpCode: HttpCode.BAD_REQUEST,
                        description: "User does not exist",
                    })
                );
            await redisClient.del(
                REDIS_KEYS.channelInfoCache(updated[0].username)
            );
            res.status(HttpCode.OK).json(updated[0].bio);
        } catch (e) {
            return next(
                new AppError({
                    httpCode: HttpCode.INTERNAL_SERVER_ERROR,
                    description: "Database error",
                    feedback: JSON.stringify(e as object),
                })
            );
        }
    })
);

export default router;
