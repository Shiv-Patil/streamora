import type { HttpCode } from "@/config/errors";

export interface AppErrorArgs {
    name?: string;
    httpCode: HttpCode;
    description: string;
    feedback?: string;
}
