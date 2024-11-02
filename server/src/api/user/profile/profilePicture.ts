import { HOSTNAME, REDIS_KEYS, STATIC_DIR } from "@/config/environment";
import { AppError, HttpCode } from "@/config/errors";
import db from "@/lib/db";
import { users } from "@/lib/db/schema/users";
import type { ReturnData } from "@/types/generic";
import assert from "assert";
import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import express from "express";
import expressAsyncHandler from "express-async-handler";
import multer from "multer";
import path from "path";
import sharp from "sharp";
import fs from "fs";
import redisClient from "@/lib/redis";

const router = express.Router();
const MAX_UPLOAD_SIZE = 2 * 1024 * 1024;
const MIN_IMAGE_DIM = 128;
const MAX_IMAGE_DIM = 1024;

const validateImage = async (
    bufferToValidate: Buffer
): Promise<ReturnData<sharp.Sharp>> => {
    let err = "Invalid file type";
    try {
        const image = sharp(bufferToValidate);
        const metadata = await image.metadata();
        if (!["jpeg", "png"].includes(metadata.format || ""))
            return { success: false, error: err };
        if (
            metadata.width! > MAX_IMAGE_DIM ||
            metadata.height! > MAX_IMAGE_DIM ||
            metadata.width! < MIN_IMAGE_DIM ||
            metadata.height! < MIN_IMAGE_DIM
        ) {
            err = `Image dimensions should be a minimum of ${MIN_IMAGE_DIM}x${MIN_IMAGE_DIM} and a maximum of ${MAX_IMAGE_DIM}x${MAX_IMAGE_DIM}`;
            return { success: false, error: err };
        }
        const isSquare = !(metadata.width! !== metadata.height!);
        const maxDim = Math.max(metadata.width!, metadata.height!);
        const resizedImage = isSquare
            ? image
            : image.resize(maxDim, maxDim, {
                  fit: sharp.fit.contain,
                  withoutEnlargement: true,
              });
        return { success: true, data: resizedImage };
    } catch (e) {
        err = "Corrupted file";
        return { success: false, error: err, feedback: `${e as Error}` };
    }
};

function deleteFile(filePath: string) {
    return new Promise<void>((resolve, reject) => {
        fs.unlink(filePath, (err) => {
            if (!err || err.code === "ENOENT") {
                resolve();
            } else {
                reject(err);
            }
        });
    });
}

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_UPLOAD_SIZE,
    },
    fileFilter: (_req, file, callback) => {
        const err = new AppError({
            httpCode: HttpCode.BAD_REQUEST,
            description: "Invalid file type",
        });
        if (!["image/jpeg", "image/png"].includes(file.mimetype))
            return callback(err);
        return callback(null, true);
    },
});

router.post(
    "/",
    upload.single("profilePicture"),
    expressAsyncHandler(async (req, res, next) => {
        assert(req.user);
        if (!req.file) {
            return next(
                new AppError({
                    httpCode: HttpCode.BAD_REQUEST,
                    description: "No file uploaded",
                })
            );
        }
        const validationResult = await validateImage(req.file.buffer);
        if (!validationResult.success)
            return next(
                new AppError({
                    httpCode: HttpCode.BAD_REQUEST,
                    description: validationResult.error,
                    feedback: validationResult.feedback,
                })
            );
        const image = validationResult.data;
        const filename =
            createHash("sha256")
                .update(
                    req.user.userId + Date.now().toString() + "profilePicture"
                )
                .digest("hex") + ".webp";
        const filepath = path.join(STATIC_DIR, filename);
        try {
            const old = await db
                .select()
                .from(users)
                .where(eq(users.userId, req.user.userId));
            if (!old.length) throw new Error("User doesn't exist");
            const oldPictureSplit = (old[0].profilePicture ?? "").split("/");
            const oldPicturePath = path.join(
                STATIC_DIR,
                oldPictureSplit[oldPictureSplit.length - 1]
            );
            if (oldPicturePath.endsWith(".webp"))
                await deleteFile(oldPicturePath);
            await image.webp().toFile(filepath);
            const fileURL = HOSTNAME + "file/" + filename;
            if (
                !(
                    await db
                        .update(users)
                        .set({
                            profilePicture: fileURL,
                        })
                        .where(eq(users.userId, req.user.userId))
                        .returning()
                ).length
            ) {
                await deleteFile(filepath);
                throw new Error("No rows updated in database");
            }

            await redisClient.del([
                REDIS_KEYS.channelInfoCache(old[0].username),
                REDIS_KEYS.userProfile(req.user.userId),
            ]);

            res.status(200).json(fileURL);
        } catch (err) {
            void deleteFile(filepath).catch();
            return next(
                new AppError({
                    httpCode: HttpCode.INTERNAL_SERVER_ERROR,
                    description: "Error uploading file",
                    feedback: `${err as Error}`,
                })
            );
        }
    })
);

export default router;
