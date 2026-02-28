import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
    music: defineTable({
        id: v.string(),
        title: v.optional(v.string()),
        prompt: v.optional(v.string()),
        artist: v.optional(v.string()),
        duration: v.optional(v.number()),
        storageId: v.optional(v.id('_storage')),
        file: v.optional(v.object({ key: v.string(), url: v.string() })),
        source: v.optional(v.string()),
        mimeType: v.optional(v.string()),
        uploadedAt: v.number(),
    }).index('by_id', ['id']),

});
