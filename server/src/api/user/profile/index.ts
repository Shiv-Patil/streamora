import { AppError, HttpCode } from "@/config/errors";
import db from "@/lib/db";
import { users } from "@/lib/db/schema/users";
import assert from "assert";
import { eq } from "drizzle-orm";
import express from "express";
import asyncHandler from "express-async-handler";
import profilePictureRouter from "./profilePicture";
import bioRouter from "./bio";
const router = express.Router();

router.get(
    "/",
    asyncHandler(async (req, res, next) => {
        assert(req.user);
        try {
            const userData = await db
                .select()
                .from(users)
                .where(eq(users.userId, req.user.userId));
            if (!userData.length)
                return next(
                    new AppError({
                        httpCode: HttpCode.NO_CONTENT,
                        description: "User not found",
                    })
                );
            res.status(200);
            res.json(userData[0]);
        } catch (e) {
            return next(
                new AppError({
                    httpCode: HttpCode.INTERNAL_SERVER_ERROR,
                    description: `Database error: ${e as Error}`,
                })
            );
        }
    })
);

router.use("/profilePicture", profilePictureRouter);
router.use("/bio", bioRouter);

export default router;
