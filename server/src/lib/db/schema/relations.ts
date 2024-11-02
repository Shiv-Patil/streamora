import { relations } from "drizzle-orm";
import { followers, refreshTokens, users } from "./users";
import { streams } from "./streams";

export const usersRelations = relations(users, ({ one, many }) => ({
    refreshTokens: many(refreshTokens, {
        relationName: "user",
    }),
    followers: many(followers, {
        relationName: "follower",
    }),
    following: many(followers, {
        relationName: "following",
    }),
    streams: many(streams, {
        relationName: "user",
    }),
    liveStream: one(streams, {
        fields: [users.currentStreamId],
        references: [streams.id],
        relationName: "live_stream",
    }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
    user: one(users, {
        fields: [refreshTokens.userId],
        references: [users.userId],
        relationName: "user",
    }),
}));

export const followersRelations = relations(followers, ({ one }) => ({
    follower: one(users, {
        fields: [followers.followerId],
        references: [users.userId],
        relationName: "following", // user is follower, thus add to following count
    }),
    following: one(users, {
        fields: [followers.followingId],
        references: [users.userId],
        relationName: "follower", // user is being followed, add to follower count
    }),
}));

export const streamsRelations = relations(streams, ({ one }) => ({
    user: one(users, {
        fields: [streams.userId],
        references: [users.userId],
        relationName: "user",
    }),
}));
