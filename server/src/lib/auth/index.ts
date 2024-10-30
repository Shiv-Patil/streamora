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
import type { JwtPayload } from "@/types/auth";
import type { ReturnData, Transaction } from "@/types/generic";
import crypto from "crypto";
import redisClient from "../redis";
import { REDIS_KEYS } from "@/config/environment";

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

export const sanitizeUsername = (input: string, replacement = "_"): string => {
    let sanitized = input.trim().toLowerCase();
    sanitized = sanitized.replace(/[^a-zA-Z0-9_-]/g, replacement);
    sanitized = sanitized.substring(0, 69);

    return sanitized;
};

export const generateUniqueUsername = async (
    baseUsername: string
): Promise<ReturnData<string>> => {
    baseUsername = sanitizeUsername(baseUsername);
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

export const generateStreamKey = async (
    userId: string,
    updateUserTable = false
): Promise<ReturnData<string>> => {
    try {
        const streamKey = crypto
            .createHash("sha256")
            .update(
                userId +
                    Date.now().toString() +
                    crypto.randomBytes(16).toString()
            )
            .digest("hex");
        if (updateUserTable) {
            const result = await db
                .update(users)
                .set({
                    streamKey,
                })
                .where(eq(users.userId, userId))
                .returning();
            if (!result.length)
                return { success: false, error: "User does not exist" };
        }
        void redisClient.del(REDIS_KEYS.invalidStreamKey(streamKey)); // JIC
        return { success: true, data: streamKey };
    } catch (e) {
        return {
            success: false,
            error: "An error occurred",
            feedback: `Couldn't generate stream key: ${e as Error}`,
        };
    }
};
