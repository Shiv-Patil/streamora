import { REFRESH_TOKEN_COOKIE } from "@/config/environment";
import { AppError, HttpCode } from "@/config/errors";
import db from "@/lib/db";
import { refreshTokens } from "@/lib/db/schema/users";
import assert from "assert";
import { eq } from "drizzle-orm";
import express from "express";
import asyncHandler from "express-async-handler";

const router = express.Router();

router.post(
    "/",
    asyncHandler(async (req, res, next) => {
        assert(req.user);
        const cookies = req.cookies as Record<string, string>;
        const refreshToken = cookies
            ? cookies[REFRESH_TOKEN_COOKIE]
            : undefined;
        if (!refreshToken)
            return next(
                new AppError({
                    httpCode: HttpCode.BAD_REQUEST,
                    description: "Refresh token not found",
                })
            );
        try {
            await db
                .delete(refreshTokens)
                .where(eq(refreshTokens.token, refreshToken));
        } catch (e) {
            return next(
                new AppError({
                    httpCode: HttpCode.INTERNAL_SERVER_ERROR,
                    description: "An error occurred",
                    feedback: `${e as Error}`,
                })
            );
        }
        res.clearCookie(REFRESH_TOKEN_COOKIE);
        res.status(HttpCode.OK).end();
    })
);

export default router;
