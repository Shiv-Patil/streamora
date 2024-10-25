import dotenv from "dotenv";
dotenv.config({ path: ".env" });
import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
import corsOptions from "@/config/cors";
import type { ErrorRequestHandler } from "express";
import api from "@/api";
import { AppError, HttpCode } from "@/config/errors";
import { errorHandler } from "@/middleware/errorhandler";
import logger from "@/lib/logger";
import { DOCKER, STATIC_DIR, STREAM_MEDIA_ROOT } from "@/config/environment";
import nms from "@/lib/nms";
import { rateLimit } from "@/config/ratelimit";

const app = express();
if (DOCKER) {
    logger.info("RUNNING IN DOCKER");
    app.set("trust proxy", 1);
}

app.use(cors(corsOptions));
app.use(helmet());
app.set("view engine", "jade");
app.disable("x-powered-by");
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const staticErrorHandler: ErrorRequestHandler = (err, _req, _res, _next) => {
    logger.error(err as Error);
};
app.use(
    "/file",
    express.static(STATIC_DIR, {
        acceptRanges: false,
        extensions: ["webp", "png", "jpeg"],
        setHeaders(res) {
            res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        },
    }),
    (_req, res, _next) => {
        res.status(HttpCode.NOT_FOUND).send();
    }
);
app.use(
    "/stream",
    express.static(STREAM_MEDIA_ROOT, {
        acceptRanges: true,
        extensions: ["m3u8", "ts"],
        setHeaders(res) {
            res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        },
    }),
    (_req, res, _next) => {
        res.status(HttpCode.NOT_FOUND).send();
    }
);
app.use(staticErrorHandler);

app.use(rateLimit());
app.use("/api/", api);

// catch 404
app.use((_req, _res, next) => {
    next(
        new AppError({
            httpCode: HttpCode.NOT_FOUND,
            description: "Requested endpoint does not exist",
        })
    );
});

// error handler
const expressErrorHandler: ErrorRequestHandler = (err, req, res, _next) => {
    errorHandler.handleError(err as Error | AppError, req, res);
};
app.use(expressErrorHandler);

process.on("uncaughtException", (error) => {
    logger.error(`Uncaught Exception`);
    errorHandler.handleError(error);
});

nms.run();

export default app;
