export const ACCESS_TOKEN_KEY = "urmom";

if (typeof import.meta.env.VITE_GOOGLE_CLIENT_ID !== "string")
  throw new Error("VITE_GOOGLE_CLIENT_ID required");

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const DEV_URL = "http://localhost:9000/";
const PROD_URL = "https://streamora-bphc.vercel.app/";
export const BASE_URL =
  process.env.NODE_ENV === "production" ? PROD_URL : DEV_URL;
export const BASE_API_URL = BASE_URL + "api/";
export const getThumbnailUrl = (username: string) =>
  `${BASE_URL}stream/${username}.jpeg`;
export const getStreamUrl = (username: string) =>
  `${BASE_URL}stream/${username}/index.m3u8`;

export const LOGIN_ENDPOINT = "/auth/login";
export const REFRESH_ENDPOINT = "/auth/refresh";
export const RTMP_URL = "rtmp://172.21.0.6/live";

export const categories = [
  { label: "Gaming", value: "Gaming" },
  { label: "Art", value: "Art" },
  { label: "Music", value: "Music" },
  { label: "Education", value: "Education" },
  { label: "Tech", value: "Tech" },
  { label: "Sports", value: "Sports" },
  { label: "Creative", value: "Creative" },
  { label: "IRL", value: "IRL" },
  { label: "Politics", value: "Politics" },
  { label: "Alternative", value: "Alternative" },
];
