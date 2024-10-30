import { isNull } from "drizzle-orm";
import {
    pgTable,
    text,
    serial,
    timestamp,
    integer,
    index,
} from "drizzle-orm/pg-core";
import { streamCategory } from "./enums";
import { users } from "./users";

export const streams = pgTable(
    "streams",
    {
        id: serial("id").primaryKey(),
        userId: text("user_id")
            .notNull()
            .references(() => users.userId, { onDelete: "cascade" }),
        title: text("title").notNull(),
        peakViewers: integer("peak_viewers").notNull().default(0),
        category: streamCategory("category").notNull(),
        startedAt: timestamp("started_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        endedAt: timestamp("ended_at", { withTimezone: true }),
    },
    (table) => ({
        isLiveIdx: index("is_live_idx")
            .on(table.endedAt)
            .where(isNull(table.endedAt)),
        streamerIdx: index("streamer_idx")
            .on(table.endedAt, table.userId)
            .where(isNull(table.endedAt)),
        categoryIdx: index("category_idx")
            .on(table.category, table.endedAt)
            .where(isNull(table.endedAt)),
    })
);

export const chatMessages = pgTable("chat_messages", {
    id: serial("id").primaryKey(),
    streamId: integer("stream_id")
        .notNull()
        .references(() => streams.id, { onDelete: "cascade" }),
    userId: text("user_id")
        .notNull()
        .references(() => users.userId, { onDelete: "cascade" }),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
