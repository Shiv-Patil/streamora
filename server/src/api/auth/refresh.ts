import {
    REFRESH_TOKEN_COOKIE,
    REFRESH_TOKEN_SECRET,
} from "@/config/environment";
import { AppError, HttpCode } from "@/config/errors";
import express from "express";
import asyncHandler from "express-async-handler";
import { z } from "zod";
import db from "@/lib/db";
import { eq } from "drizzle-orm";
import { generateAccessToken, generateRefreshToken } from "@/lib/auth";
import { refreshTokenCookieOptions } from "@/config/auth";
import { refreshTokens } from "@/lib/db/schema/auth";
import jwt, { type VerifyErrors } from "jsonwebtoken";
import { rateLimit } from "@/config/ratelimit";

const router = express.Router();

router.post(
    "/",
    rateLimit(
        {
            windowMs: 10 * 1000,
            limit: 1,
            message: "Please wait before generating another token",
        },
        "refresh"
    ),
    asyncHandler(async (req, res, next) => {
        try {
            await db.transaction(
                async (tx) => {
                    const cookies = req.cookies as Record<string, string>;
                    const refreshToken = cookies
                        ? cookies[REFRESH_TOKEN_COOKIE]
                        : undefined;
                    if (!refreshToken)
                        return next(
                            new AppError({
                                httpCode: HttpCode.UNAUTHORIZED,
                                description: "Refresh token not found",
                            })
                        );
                    try {
                        const decoded = jwt.verify(
                            refreshToken,
                            REFRESH_TOKEN_SECRET
                        );
                        const jwtPayloadSchema = z.object({
                            userId: z.string(),
                        });
                        const parsed = jwtPayloadSchema.safeParse(decoded);
                        if (!parsed.success) {
                            return next(
                                new AppError({
                                    httpCode: HttpCode.INTERNAL_SERVER_ERROR,
                                    description: "Invalid refresh token",
                                })
                            );
                        }
                        let storedTokenData: typeof refreshTokens.$inferSelect;
                        try {
                            const response = await tx
                                .select()
                                .from(refreshTokens)
                                .where(eq(refreshTokens.token, refreshToken));
                            if (!response.length)
                                return next(
                                    new AppError({
                                        httpCode: HttpCode.FORBIDDEN,
                                        description: "Invalid refresh token",
                                    })
                                );
                            storedTokenData = response[0];
                        } catch {
                            return next(
                                new AppError({
                                    httpCode: HttpCode.INTERNAL_SERVER_ERROR,
                                    description: "Database error",
                                })
                            );
                        }
                        if (storedTokenData.used) {
                            // Refresh token reuse detected
                            // TODO: invalidate all sessions
                            await db
                                .delete(refreshTokens)
                                .where(
                                    eq(refreshTokens.userId, parsed.data.userId)
                                );
                            return next(
                                new AppError({
                                    httpCode: HttpCode.UNAUTHORIZED,
                                    description: "Refresh token reuse detected",
                                })
                            );
                        }
                        const tokenResult = await generateRefreshToken(
                            parsed.data.userId,
                            tx,
                            storedTokenData.id
                        );
                        if (!tokenResult.success)
                            return next(
                                new AppError({
                                    httpCode: HttpCode.INTERNAL_SERVER_ERROR,
                                    description: tokenResult.error,
                                    feedback: tokenResult.feedback,
                                })
                            );
                        const { refreshToken: newRefreshToken, sessionExpiry } =
                            tokenResult.data;
                        const accessToken = generateAccessToken(
                            parsed.data.userId,
                            sessionExpiry
                        );
                        res.cookie(
                            REFRESH_TOKEN_COOKIE,
                            newRefreshToken,
                            refreshTokenCookieOptions
                        );
                        res.status(200);
                        res.json({ token: accessToken });
                    } catch (e) {
                        const err = e as VerifyErrors;
                        return next(
                            new AppError({
                                httpCode: HttpCode.UNAUTHORIZED,
                                description: err
                                    ? err.name === "TokenExpiredError"
                                        ? "Refresh token expired"
                                        : "Invalid refresh token"
                                    : "Unknown Error",
                            })
                        );
                    }
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
    })
);

export default router;
