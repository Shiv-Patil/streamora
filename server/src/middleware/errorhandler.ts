import type { Request, Response } from "express";
import { AppError, HttpCode } from "@/config/errors";
import logger from "@/lib/logger";
import { PROD } from "@/config/environment";

class ErrorHandler {
    private isTrustedError(error: Error): boolean {
        if (error instanceof AppError) {
            return true;
        }
        return false;
    }
    private handleTrustedError(
        error: AppError,
        request?: Request,
        response?: Response
    ): void {
        if (!PROD || error.httpCode === HttpCode.INTERNAL_SERVER_ERROR)
            logger.error(
                `${request ? request.path + " " : ""}[${error.httpCode}]: ${error.message}${error.feedback ? " | " + error.feedback : ""}`
            );
        if (response)
            response
                .status(error.httpCode)
                .json({ trusted: true, message: error.message });
    }
    private handleCriticalError(
        error: Error | AppError,
        request?: Request,
        response?: Response
    ): void {
        if (response) {
            response
                .status(HttpCode.INTERNAL_SERVER_ERROR)
                .json({ message: "Internal server error" });
        }
        logger.error(`${request ? request.path + ": " : ""}${error.stack}`);
        logger.error("Application encountered a critical error. Exiting");
        process.exit(1);
    }
    public handleError(
        error: Error | AppError,
        request?: Request,
        response?: Response
    ): void {
        if (this.isTrustedError(error)) {
            this.handleTrustedError(error as AppError, request, response);
        } else {
            this.handleCriticalError(error, request, response);
        }
    }
}

export const errorHandler = new ErrorHandler();
