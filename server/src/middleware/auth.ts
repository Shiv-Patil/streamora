import type { Request, Response, NextFunction } from "express";
import { ACCESS_TOKEN_SECRET, REDIS_KEYS } from "@/config/environment";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { AppError, HttpCode } from "@/config/errors";
import redisClient from "@/lib/redis";

// Attaches user object to req
const authMiddleware = (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const authHeaderErr = new AppError({
        httpCode: HttpCode.UNAUTHORIZED,
        description: "Token not found in auth header",
    });
    if (!authHeader) {
        return next(authHeaderErr);
    }
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") return next(authHeaderErr);

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    jwt.verify(parts[1], ACCESS_TOKEN_SECRET, async (err, decoded) => {
        const errObj = new AppError({
            httpCode: HttpCode.UNAUTHORIZED,
            description: "Invalid access token",
        });
        if (err) return next(errObj);
        const jwtPayloadSchema = z.object({
            userId: z.string(),
            sessionExpiry: z.number(),
            iat: z.number(),
        });
        const parsed = jwtPayloadSchema.safeParse(decoded);
        if (!parsed.success) return next(errObj);

        // check if sessions were invalidated
        try {
            const lastSessionInvalidation = await redisClient.get(
                REDIS_KEYS.lastSessionInvalidation(parsed.data.userId)
            );
            if (
                lastSessionInvalidation &&
                parsed.data.iat <= +lastSessionInvalidation
            ) {
                errObj.message = "Access token expired";
                return next(errObj);
            }
        } catch (e) {
            next(
                new AppError({
                    httpCode: HttpCode.INTERNAL_SERVER_ERROR,
                    description: "An error occurred",
                    feedback: `Redis error: ${e as Error}`,
                })
            );
        }

        req.user = parsed.data;
        return next();
    });
};

export default authMiddleware;
