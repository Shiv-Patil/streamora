import { AppError, HttpCode } from "@/config/errors";
import { channelManager } from "@/lib/feed";
import express from "express";
import expressAsyncHandler from "express-async-handler";
import { z } from "zod";
import { fromError } from "zod-validation-error";

const router = express.Router();

const querySchema = z.object({
    username: z.string().trim().toLowerCase().min(2),
});

router.get(
    "/",
    expressAsyncHandler(async (req, res, next) => {
        const result = querySchema.safeParse(req.query);
        if (!result.success) {
            return next(
                new AppError({
                    httpCode: HttpCode.BAD_REQUEST,
                    description: fromError(result.error).toString(),
                })
            );
        }

        const channelResult = await channelManager.getChannelByUsername(
            result.data.username
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
