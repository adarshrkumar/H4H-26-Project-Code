import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
    tracks: defineTable({
        title: v.optional(v.string()),
        prompt: v.optional(v.string()),
        artist: v.optional(v.string()),
        album: v.optional(v.string()),
        duration: v.optional(v.number()),
        storageId: v.optional(v.id('_storage')),
        uploadThingKey: v.optional(v.string()),
        uploadThingUrl: v.optional(v.string()),
        source: v.optional(v.string()),
        mimeType: v.optional(v.string()),
        uploadedAt: v.number(),
    }).index('by_artist', ['artist']),

});
