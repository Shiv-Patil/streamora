import { AppError, HttpCode } from "@/config/errors";
import { rateLimit } from "@/config/ratelimit";
import { generateStreamKey } from "@/lib/auth";
import assert from "assert";
import express from "express";
import expressAsyncHandler from "express-async-handler";
const router = express.Router();

router.post(
    "/",
    rateLimit(
        {
            windowMs: 5 * 1000,
            limit: 1,
            message: "Please wait before generating another key",
        },
        "streamkey"
    ),
    expressAsyncHandler(async (req, res, next) => {
        assert(req.user);
        const result = await generateStreamKey(req.user.userId, true);
        if (!result.success)
            return next(
                new AppError({
                    httpCode: HttpCode.INTERNAL_SERVER_ERROR,
                    description: result.error,
                    feedback: result.feedback,
                })
            );
        res.status(HttpCode.OK).json(result.data);
    })
);

export default router;
