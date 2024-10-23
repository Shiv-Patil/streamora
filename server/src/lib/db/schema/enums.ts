import { pgEnum } from "drizzle-orm/pg-core";

export const streamCategory = pgEnum("stream_category", [
    "Gaming",
    "Music",
    "Art",
    "Education",
    "Tech",
    "Sports",
    "Creative",
    "IRL",
    "Politics",
    "Alternative",
]);

export type StreamCateogry = (typeof streamCategory.enumValues)[number];
