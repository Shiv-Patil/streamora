import { GOOGLE_CLIENT_ID, REFRESH_TOKEN_COOKIE } from "@/config/environment";
import { AppError, HttpCode } from "@/config/errors";
import express from "express";
import asyncHandler from "express-async-handler";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import db from "@/lib/db";
import { users } from "@/lib/db/schema/users";
import { eq } from "drizzle-orm";
import {
    generateAccessToken,
    generateRefreshToken,
    generateUniqueUsername,
} from "@/lib/auth";
import { refreshTokenCookieOptions } from "@/config/auth";
import { rateLimit } from "@/config/ratelimit";

const client = new OAuth2Client(GOOGLE_CLIENT_ID);
const router = express.Router();

const bodySchema = z.object({
    token: z.string(),
});

router.post(
    "/",
    rateLimit(
        {
            windowMs: 10 * 1000,
            limit: 1,
            message: "Please wait before logging in",
        },
        "refresh"
    ),
    asyncHandler(async (req, res, next) => {
        const parseResult = bodySchema.safeParse(req.body);
        if (!parseResult.success) {
            next(
                new AppError({
                    httpCode: HttpCode.BAD_REQUEST,
                    description: "token not found in body",
                    feedback: fromError(parseResult.error).toString(),
                })
            );
            return;
        }
        try {
            const ticket = await client.verifyIdToken({
                idToken: parseResult.data.token,
                audience: GOOGLE_CLIENT_ID,
            });
            const ticketPayload = ticket.getPayload();
            if (!ticketPayload)
                return next(
                    new AppError({
                        httpCode: HttpCode.INTERNAL_SERVER_ERROR,
                        description: "Login failed",
                        feedback: "No ticket payload",
                    })
                );
            if (!ticketPayload.email)
                return next(
                    new AppError({
                        httpCode: HttpCode.BAD_REQUEST,
                        description: "Login failed",
                        feedback: "Invalid scope - email was not provided",
                    })
                );
            try {
                await db.transaction(async (tx) => {
                    const result = await db
                        .select()
                        .from(users)
                        .where(eq(users.userId, ticketPayload.sub));
                    if (!result.length) {
                        const usernameResult = await generateUniqueUsername(
                            ticketPayload.email!.split("@")[0]
                        );
                        if (!usernameResult.success)
                            return next(
                                new AppError({
                                    httpCode: HttpCode.INTERNAL_SERVER_ERROR,
                                    description: usernameResult.error,
                                    feedback: usernameResult.feedback,
                                })
                            );
                        const uniqueUsername = usernameResult.data;

                        await tx.insert(users).values({
                            userId: ticketPayload.sub,
                            email: ticketPayload.email!,
                            username: uniqueUsername,
                            profilePicture: ticketPayload.picture,
                        });
                    }
                    if (
                        result.length &&
                        result[0].email !== ticketPayload.email
                    )
                        await tx
                            .update(users)
                            .set({
                                email: ticketPayload.email,
                            })
                            .where(eq(users.userId, ticketPayload.sub));
                    const tokenResult = await generateRefreshToken(
                        ticketPayload.sub,
                        tx
                    );
                    if (!tokenResult.success)
                        return next(
                            new AppError({
                                httpCode: HttpCode.INTERNAL_SERVER_ERROR,
                                description: tokenResult.error,
                                feedback: tokenResult.feedback,
                            })
                        );

                    const { refreshToken, sessionExpiry } = tokenResult.data;
                    const accessToken = generateAccessToken(
                        ticketPayload.sub,
                        sessionExpiry
                    );

                    res.status(200);
                    res.cookie(
                        REFRESH_TOKEN_COOKIE,
                        refreshToken,
                        refreshTokenCookieOptions
                    );
                    res.json({ token: accessToken });
                });
            } catch (e) {
                return next(
                    new AppError({
                        httpCode: HttpCode.INTERNAL_SERVER_ERROR,
                        description: "Database error",
                        feedback: `${e as Error}`,
                    })
                );
            }
        } catch (e) {
            next(
                new AppError({
                    httpCode: HttpCode.UNAUTHORIZED,
                    description: "Login error: invalid token",
                    feedback: JSON.stringify((e as Error).message),
                })
            );
        }
    })
);

export default router;
