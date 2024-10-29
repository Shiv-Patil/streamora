import type { ReturnData } from "@/types/generic";
import crypto from "crypto";
import { users } from "@/lib/db/schema/users";
import db from "@/lib/db";
import { eq } from "drizzle-orm";

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
        return { success: true, data: streamKey };
    } catch (e) {
        return {
            success: false,
            error: "An error occurred",
            feedback: `Couldn't generate stream key: ${e as Error}`,
        };
    }
};
