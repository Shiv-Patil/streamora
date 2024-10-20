export const ACCESS_TOKEN_KEY = "urmom";

if (typeof import.meta.env.VITE_GOOGLE_CLIENT_I !== "string")
  throw new Error("VITE_GOOGLE_CLIENT_ID required");

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_I;
