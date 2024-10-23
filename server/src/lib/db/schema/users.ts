import { relations } from "drizzle-orm";
import {
    pgTable,
    text,
    serial,
    boolean,
    timestamp,
    integer,
    primaryKey,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    userId: text("id").primaryKey(),
    username: text("username").notNull().unique(),
    email: text("email").notNull(),
    profilePicture: text("profile_picture"),
    profileBanner: text("profile_banner"),
    bio: text("bio").notNull().default(""),
    followerCount: integer("follower_count").notNull().default(0),
});

export const usersRelations = relations(users, ({ many }) => ({
    refreshTokens: many(refreshTokens, {
        relationName: "user",
    }),
}));

export const followers = pgTable(
    "followers",
    {
        followerId: text("follower_id")
            .notNull()
            .references(() => users.userId, { onDelete: "cascade" }),
        followingId: text("following_id")
            .notNull()
            .references(() => users.userId, { onDelete: "cascade" }),
    },
    (table) => {
        return {
            pk: primaryKey({ columns: [table.followerId, table.followingId] }),
        };
    }
);

export const refreshTokens = pgTable("refresh_tokens", {
    id: serial("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => users.userId, { onDelete: "cascade" }),
    token: text("token").notNull(),
    used: boolean("used").notNull().default(false),
    expiresAt: timestamp("expires_at").notNull(),
});

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
    user: one(users, {
        fields: [refreshTokens.userId],
        references: [users.userId],
        relationName: "user",
    }),
}));
