import { sql } from "drizzle-orm";
import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { streamCategory } from "./enums";
import { users } from "./users";

export const streams = pgTable("streams", {
    id: serial("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => users.userId, { onDelete: "cascade" }),
    title: text("title").notNull(),
    peakViewers: integer("peak_viewers").notNull().default(0),
    categories: streamCategory("categories")
        .array()
        .notNull()
        .default(sql`'{}'::stream_category[]`),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    endedAt: timestamp("ended_at"),
});

export const chatMessages = pgTable("chat_messages", {
    id: serial("id").primaryKey(),
    streamId: integer("stream_id")
        .notNull()
        .references(() => streams.id),
    userId: integer("user_id")
        .notNull()
        .references(() => users.userId),
    message: text("message").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});
