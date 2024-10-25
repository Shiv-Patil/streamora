import { nmsConfig } from "@/config/nms";
import NodeMediaServer from "node-media-server";
import db from "@/lib/db";
import { users } from "@/lib/db/schema/users";
import { eq } from "drizzle-orm";
import { streams } from "@/lib/db/schema/streams";
import logger from "./logger";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";
import { STREAM_MEDIA_ROOT } from "@/config/environment";

const nms = new NodeMediaServer(nmsConfig);

interface QualityPreset {
    name: string;
    width: number;
    height: number;
    bitrate: number;
    fps: number;
}

const qualityPresets: QualityPreset[] = [
    {
        name: "1080p",
        width: 1920,
        height: 1080,
        bitrate: 4000000, // 4 Mbps
        fps: 24,
    },
    {
        name: "720p",
        width: 1280,
        height: 720,
        bitrate: 2500000, // 2.5 Mbps
        fps: 24,
    },
    {
        name: "480p",
        width: 854,
        height: 480,
        bitrate: 1000000, // 1 Mbps
        fps: 24,
    },
    {
        name: "360p",
        width: 640,
        height: 360,
        bitrate: 500000, // 500 Kbps
        fps: 24,
    },
];

async function getStreamResolution(
    streamPath: string
): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
        // Default to 480p if we can't detect resolution
        const defaultResolution = { width: 854, height: 480 };

        try {
            const inputUrl = `rtmp://localhost:1935${streamPath}`;

            ffmpeg.ffprobe(inputUrl, (err, metadata) => {
                if (err) {
                    logger.error("FFprobe error, using default resolution");
                    resolve(defaultResolution);
                    return;
                }

                const videoStream = metadata.streams.find(
                    (s) => s.codec_type === "video"
                );
                if (!videoStream?.width || !videoStream.height) {
                    resolve(defaultResolution);
                    return;
                }

                resolve({
                    width: videoStream.width,
                    height: videoStream.height,
                });
            });

            // Timeout after 5 seconds
            setTimeout(() => {
                resolve(defaultResolution);
            }, 5000);
        } catch (error) {
            logger.error(`Error in getStreamResolution: ${error as Error}`);
            resolve(defaultResolution);
        }
    });
}

function getApplicableQualities(inputHeight: number): QualityPreset[] {
    return qualityPresets.filter((preset) => preset.height <= inputHeight);
}

async function startTranscoding(streamPath: string, username: string) {
    try {
        const resolution = await getStreamResolution(streamPath);
        logger.debug(
            `[Stream Resolution] ${resolution.width}x${resolution.height}`
        );

        const applicableQualities = getApplicableQualities(resolution.height);
        logger.debug(
            `[Applicable Qualities] ${applicableQualities.map((q) => q.name).join(", ")}`
        );

        const mediaRoot = path.join(STREAM_MEDIA_ROOT, username);

        // Ensure the media directory exists
        await fs.promises.mkdir(mediaRoot, { recursive: true });

        // Start transcoding for each quality
        const transcodePromises = applicableQualities.map(async (quality) => {
            const qualityDir = path.join(mediaRoot, quality.name);
            await fs.promises.mkdir(qualityDir, { recursive: true });

            const inputUrl = `rtmp://localhost:1935${streamPath}`;
            const outputPath = path.join(qualityDir, "index.m3u8");

            return new Promise((resolve, reject) => {
                const command = ffmpeg(inputUrl)
                    .outputOptions([
                        "-c:v libx264", // Video codec
                        "-c:a aac", // Audio codec
                        "-b:a 128k", // Audio bitrate
                        `-b:v ${quality.bitrate}`, // Video bitrate
                        `-maxrate ${quality.bitrate}`,
                        `-bufsize ${quality.bitrate * 2}`,
                        `-vf scale=${quality.width}:${quality.height}`,
                        `-r ${quality.fps}`,
                        "-g 60", // Keyframe interval
                        "-preset superfast", // FFmpeg preset
                        "-tune zerolatency", // Minimize latency
                        "-sc_threshold 0", // Disable scene change detection
                        "-hls_time 2", // Segment duration
                        "-hls_list_size 2", // Number of segments in playlist
                        "-hls_flags delete_segments+append_list",
                        "-f hls", // HLS output format
                    ])
                    .output(outputPath);
                command
                    .on("start", () => {
                        logger.debug(
                            `[FFmpeg] ${quality.name} transcoding started`
                        );
                    })
                    .on("error", (err) => {
                        logger.debug(
                            `[FFmpeg] ${quality.name} transcoding ended`
                        );
                        reject(err);
                    })
                    .on("end", () => {
                        logger.debug(
                            `[FFmpeg] ${quality.name} transcoding ended`
                        );
                        resolve(null);
                    })
                    .run();
            });
        });

        // Generate master playlist
        const masterPlaylist = [
            "#EXTM3U",
            "#EXT-X-VERSION:3",
            ...applicableQualities
                .map((quality) => [
                    `#EXT-X-STREAM-INF:BANDWIDTH=${quality.bitrate},RESOLUTION=${quality.width}x${quality.height}`,
                    `${quality.name}/index.m3u8`,
                ])
                .flat(),
        ].join("\n");

        await fs.promises.writeFile(
            path.join(mediaRoot, "index.m3u8"),
            masterPlaylist
        );

        // Wait for all transcoding processes to start
        await Promise.allSettled(transcodePromises);
    } catch {
        logger.error("[Transcoding] Error");
    }
}

const asyncEventWrapper = (
    fn: (id: string, StreamPath: string) => Promise<void>
) => {
    return (id: string, StreamPath: string) => {
        void fn(id, StreamPath);
    };
};

nms.on(
    "prePublish",
    asyncEventWrapper(async (id, StreamPath) => {
        const session = nms.getSession(id);
        try {
            const streamKey = StreamPath.split("/")[2];
            let username = "";
            await db.transaction(async (tx) => {
                const usersWithKey = await tx
                    .select()
                    .from(users)
                    .where(eq(users.streamKey, streamKey));
                if (!usersWithKey.length) throw new Error("Invalid stream key");
                const user = usersWithKey[0];
                const newStream = await tx
                    .insert(streams)
                    .values({
                        userId: user.userId,
                    })
                    .returning();
                if (!newStream.length)
                    throw new Error("Couldn't insert into stream");
                if (
                    !(
                        await tx
                            .update(users)
                            .set({
                                currentStreamId: newStream[0].id,
                            })
                            .where(eq(users.streamKey, streamKey))
                            .returning()
                    ).length
                )
                    throw new Error("Couldn't update user");
                username = user.username;
            });
            logger.info(
                "[NodeEvent on prePublish]",
                `id=${id} StreamPath=${StreamPath}`
            );
            await startTranscoding(StreamPath, username);
        } catch (e) {
            logger.error(
                `Stream authentication error: ${(e as Error).message}`
            );
            session.reject();
        }
    })
);

nms.on(
    "donePublish",
    asyncEventWrapper(async (id, StreamPath) => {
        const streamKey = StreamPath.split("/")[2];
        logger.info(
            "[NodeEvent on donePublish]",
            `id=${id} StreamPath=${StreamPath}`
        );
        try {
            await db.transaction(async (tx) => {
                const selectUser = await tx
                    .select()
                    .from(users)
                    .where(eq(users.streamKey, streamKey));
                if (!selectUser.length) throw new Error("Invalid stream key");
                const user = selectUser[0];
                try {
                    const mediaRoot = path.join(
                        STREAM_MEDIA_ROOT,
                        user.username
                    );
                    await fs.promises.rm(mediaRoot, {
                        recursive: true,
                        force: true,
                    });
                } catch (err) {
                    logger.error(
                        `[Cleanup] Error removing media files: ${err as Error}`
                    );
                }
                if (user.currentStreamId === null)
                    throw new Error("Current stream is null");
                await tx
                    .update(users)
                    .set({
                        currentStreamId: null,
                    })
                    .where(eq(users.streamKey, streamKey));
                await tx
                    .update(streams)
                    .set({
                        endedAt: new Date(),
                    })
                    .where(eq(streams.id, user.currentStreamId));
            });
        } catch (e) {
            logger.error(
                `Failed to update user live state: ${(e as Error).message}`
            );
        }
    })
);

export default nms;
