import redis from "redis";
import logger from "./logger";
import { REDIS_URL } from "@/config/environment";

const redisClient = redis.createClient({
    url: REDIS_URL,
});

void redisClient.connect().catch();

redisClient.on("connect", () => {
    logger.info("Connected to Redis");
});

redisClient.on("error", (error) => {
    logger.error(`Error connecting to Redis: ${error}`);
    process.exit(1);
});

redisClient.on("end", () => {
    logger.info("Disconnected from Redis");
});

export default redisClient;
