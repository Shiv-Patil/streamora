import { Request, Response, NextFunction } from "express";
import { ACCESS_TOKEN_SECRET } from "@/config/environment";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { AppError, HttpCode } from "@/config/errors";

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
        });
        const parsed = jwtPayloadSchema.safeParse(decoded);
        if (!parsed.success) return next(errObj);

        req.user = parsed.data;
        return next();
    });
};

export default authMiddleware;
