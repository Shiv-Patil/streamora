import jwt from "jsonwebtoken";
import db from "@/lib/db";
import { refreshTokens } from "@/lib/db/schema/users";
import {
    ACCESS_TOKEN_EXPIRY,
    ACCESS_TOKEN_SECRET,
    REFRESH_TOKEN_EXPIRY,
    REFRESH_TOKEN_SECRET,
} from "@/config/environment";
import { users } from "@/lib/db/schema/users";
import { eq, like } from "drizzle-orm";
import { JwtPayload } from "@/types/auth";
import { ReturnData, Transaction } from "@/types/generic";

export const generateAccessToken = (
    userId: string,
    sessionExpiry: number
): string => {
    const jwtPayload: JwtPayload = {
        userId: userId,
        sessionExpiry: sessionExpiry,
    };
    const accessToken = jwt.sign(jwtPayload, ACCESS_TOKEN_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
    });
    return accessToken;
};

export const generateRefreshToken = async (
    userId: string,
    tx: Transaction,
    oldTokenId?: number
): Promise<
    ReturnData<{
        refreshToken: string;
        sessionExpiry: number;
    }>
> => {
    const token = jwt.sign({ userId }, REFRESH_TOKEN_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRY,
    });
    const sessionExpiry = (jwt.decode(token) as { exp: number }).exp;
    const expiresAt = new Date(sessionExpiry * 1000);
    try {
        if (oldTokenId)
            await tx
                .update(refreshTokens)
                .set({ used: true })
                .where(eq(refreshTokens.id, oldTokenId));
        await tx.insert(refreshTokens).values({
            userId,
            token,
            expiresAt,
        });
    } catch (e) {
        return {
            success: false,
            error: "Database error",
            feedback: `Couldn't insert into refreshTokens: ${e as Error}`,
        };
    }
    return { success: true, data: { refreshToken: token, sessionExpiry } };
};

export const generateUniqueUsername = async (
    baseUsername: string
): Promise<ReturnData<string>> => {
    baseUsername = baseUsername.toLowerCase();
    try {
        const conflicting = await db
            .select()
            .from(users)
            .where(like(users.username, `${baseUsername}%`));
        if (!conflicting.length) return { success: true, data: baseUsername };
        const maybeUnique = `${baseUsername}${conflicting.length}`;
        if (
            (
                await db
                    .select()
                    .from(users)
                    .where(eq(users.username, maybeUnique))
            ).length
        )
            return {
                success: false,
                error: "Error",
                feedback: "Couldn't generate unique username",
            };
        return { success: true, data: maybeUnique };
    } catch {
        return { success: false, error: "Database error" };
    }
};
