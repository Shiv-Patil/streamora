import { RTMP_CHUNK_SIZE, RTMP_PORT } from "@/config/environment";

export const nmsConfig = {
    logType: 1,
    rtmp: {
        port: RTMP_PORT,
        chunk_size: RTMP_CHUNK_SIZE,
        gop_cache: true,
        ping: 30,
        ping_timeout: 60,
    },
};
