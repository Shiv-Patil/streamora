import { sql } from "drizzle-orm";
import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { streamCategory } from "./enums";
import { users } from "./users";

export const streams = pgTable("streams", {
    id: serial("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => users.userId, { onDelete: "cascade" }),
    categories: streamCategory("categories")
        .array()
        .notNull()
        .default(sql`'{}'::stream_category[]`),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    endedAt: timestamp("ended_at"),
});
