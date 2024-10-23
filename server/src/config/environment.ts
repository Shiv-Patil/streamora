import path from "path";

/**
|----------------------------------------------------------------------------------------|
    App Configuration
|----------------------------------------------------------------------------------------|
*/
export const ENVIRONMENT = process.env.NODE_ENV;
export const PROD = ENVIRONMENT === "production";
export const PORT = process.env.PORT ?? "9000";
export const DOCKER = process.env.DOCKER_ENVIRONMENT ? true : false;
export const STATIC_DIR = path.join(__dirname, "..", "..", "static");
export const HOSTNAME = PROD ? process.env.HOSTNAME : "http://localhost:9000/";

/**
|----------------------------------------------------------------------------------------|
    Authentication Configuration
|----------------------------------------------------------------------------------------|
*/

export const ACCESS_TOKEN_SECRET =
    process.env.ACCESS_TOKEN_SECRET ?? "access_token_key sus";
export const REFRESH_TOKEN_SECRET =
    process.env.REFRESH_TOKEN_SECRET ?? "refresh_token_key amogus";
export const REFRESH_TOKEN_COOKIE = "momento mori";
export const ACCESS_TOKEN_EXPIRY = "30m";
export const REFRESH_TOKEN_EXPIRY = "7d";
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
if (!GOOGLE_CLIENT_ID) throw new Error("GOOGLE_CLIENT_ID not found in env");

/**
|----------------------------------------------------------------------------------------|
    Databases Configuration
|----------------------------------------------------------------------------------------|
*/

const defaultPort = 5432;
function normalizePort(val: string | undefined) {
    if (!val) return defaultPort;
    const port = parseInt(val, 10);
    if (isNaN(port)) return defaultPort;
    if (port >= 0) return port;
    return defaultPort;
}

export const REDIS_URL = DOCKER
    ? "redis://redis:6379"
    : (process.env.REDIS_URL ?? "redis://localhost:6379");

export const CONFIG_PG = {
    host: DOCKER ? "postgres" : (process.env.DB_HOST ?? "localhost"),
    user: process.env.DB_USER ?? "localhost",
    password: process.env.DB_PASSWORD ?? "postgres",
    port: normalizePort(process.env.DB_PORT),
    database: "streamora",
    ssl: false,
};

export const REDIS_KEYS = {
    lastSessionInvalidation: "lastSessionInvalidation",
};
