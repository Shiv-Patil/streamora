import { CookieOptions } from "express";
import { PROD } from "@/config/environment";

export const refreshTokenCookieOptions: CookieOptions = {
    httpOnly: true,
    secure: PROD,
};
