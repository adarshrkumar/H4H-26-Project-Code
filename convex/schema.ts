import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
    tracks: defineTable({
        title: v.string(),
        artist: v.optional(v.string()),
        album: v.optional(v.string()),
        duration: v.optional(v.number()),
        storageId: v.optional(v.id('_storage')),
        mimeType: v.string(),
        uploadedAt: v.number(),
    }).index('by_artist', ['artist']),

});
