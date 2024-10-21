export const ACCESS_TOKEN_KEY = "urmom";

if (typeof import.meta.env.VITE_GOOGLE_CLIENT_ID !== "string")
  throw new Error("VITE_GOOGLE_CLIENT_ID required");

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export const DEV_API_URL = "http://localhost:9000/api";
export const PROD_API_URL = "https://streamora-bphc.vercel.app/api";
export const LOGIN_ENDPOINT = "/auth/login";
export const REFRESH_ENDPOINT = "/auth/refresh";
