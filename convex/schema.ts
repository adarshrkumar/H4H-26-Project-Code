import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
    tracks: defineTable({
        title: v.string(),
        artist: v.optional(v.string()),
        album: v.optional(v.string()),
        duration: v.optional(v.number()),
        storageId: v.optional(v.string()),
        mimeType: v.string(),
        uploadedAt: v.number(),
    }).index('by_artist', ['artist']),

    analyses: defineTable({
        trackId: v.id('tracks'),
        mood: v.string(),
        color: v.string(),
        energy: v.number(),
        brightness: v.number(),
        tempo: v.number(),
        flux: v.number(),
        spread: v.number(),
        flatness: v.number(),
        bassRatio: v.number(),
        zcr: v.number(),
        analyzedAt: v.number(),
    }).index('by_track', ['trackId']),
});
