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
        fps: 30,
    },
    {
        name: "720p",
        width: 1280,
        height: 720,
        bitrate: 2500000, // 2.5 Mbps
        fps: 30,
    },
    {
        name: "480p",
        width: 854,
        height: 480,
        bitrate: 1000000, // 1 Mbps
        fps: 30,
    },
    {
        name: "360p",
        width: 640,
        height: 360,
        bitrate: 500000, // 500 Kbps
        fps: 30,
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
                    `-maxrate ${quality.bitrate * 1.2}`,
                    `-bufsize ${quality.bitrate}`,
                    `-vf scale=${quality.width}:${quality.height}`,
                    `-r ${quality.fps}`,
                    "-g 30", // GOP size
                    "-sc_threshold 0",
                    "-preset ultrafast", // FFmpeg preset
                    "-tune zerolatency", // Minimize latency
                    "-sc_threshold 0", // Disable scene change detection
                    "-hls_time 1", // Segment duration
                    "-hls_list_size 3", // Number of segments in playlist
                    "-hls_segment_type fmp4",
                    "-hls_flags delete_segments+append_list+program_date_time+independent_segments",
                    "-hls_start_number_source epoch",
                    "-strftime 1",
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
                        `[FFmpeg] ${quality.name} transcoding ended as error`
                    );
                    reject(err);
                })
                .on("end", () => {
                    logger.debug(`[FFmpeg] ${quality.name} transcoding ended`);
                    resolve(null);
                })
                .run();
        });
    });

    const thumbnailService = () =>
        new Promise((resolve, reject) => {
            const command = ffmpeg(path.join(mediaRoot, "index.m3u8"))
                .inputFormat("hls")
                .outputOptions(["-q:v 2", "-an", "-frames:v 1", "-f image2"])
                .size("400x?")
                .output(path.join(mediaRoot, "thumbnail.jpeg"));
            command
                .on("error", () => {
                    reject();
                })
                .on("end", () => {
                    logger.debug(`[FFmpeg] thumbnail ended`);
                    resolve(null);
                })
                .run();
        });

    // Generate master playlist
    const masterPlaylist = [
        "#EXTM3U",
        "#EXT-X-VERSION:6",
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

    // run thumbnail service
    const intervalId = setInterval(async () => {
        try {
            await thumbnailService();
        } catch {
            clearInterval(intervalId);
        }
    }, 10000);

    // Wait for all transcoding processes
    await Promise.allSettled(transcodePromises);

    clearInterval(intervalId);
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
                username = user.username;
            });
            logger.debug(
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
        logger.debug(
            "[NodeEvent on donePublish]",
            `id=${id} StreamPath=${StreamPath}`
        );
        try {
            const selectUser = await db
                .select()
                .from(users)
                .where(eq(users.streamKey, streamKey));
            if (!selectUser.length) throw new Error("Invalid stream key");
            const user = selectUser[0];

            const mediaRoot = path.join(STREAM_MEDIA_ROOT, user.username);
            await fs.promises.rm(mediaRoot, {
                recursive: true,
                force: true,
            });
        } catch (e) {
            logger.error(`[Cleanup] Error removing media files: ${e as Error}`);
        }
    })
);

export default nms;
