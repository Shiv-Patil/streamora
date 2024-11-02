import { AppError, HttpCode } from "@/config/errors";
import { channelManager } from "@/lib/feed";
import assert from "assert";
import express from "express";
import expressAsyncHandler from "express-async-handler";
import { z } from "zod";

const router = express.Router();

const querySchema = z.object({
    cursor: z.string().trim().optional(),
});

router.get(
    "/",
    expressAsyncHandler(async (req, res, next) => {
        assert(req.user);
        const result = querySchema.safeParse(req.query);

        const channelResult = await channelManager.paginateUserFeed(
            req.user.userId,
            {
                cursor: result.data?.cursor,
            }
        );
        if (!channelResult.success)
            return next(
                new AppError({
                    httpCode:
                        channelResult.code ?? HttpCode.INTERNAL_SERVER_ERROR,
                    description: channelResult.error,
                    feedback: channelResult.feedback,
                })
            );

        res.status(HttpCode.OK).json(channelResult.data);
    })
);

export default router;
