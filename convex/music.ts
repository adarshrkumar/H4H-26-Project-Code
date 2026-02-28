import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const generateUploadUrl = mutation({
    args: {},
    returns: v.string(),
    handler: async (ctx) => {
        return await ctx.storage.generateUploadUrl();
    },
});

export const getFileUrl = query({
    args: { storageId: v.id('_storage') },
    handler: async (ctx, args) => {
        return await ctx.storage.getUrl(args.storageId);
    },
});

export const listMusic = query({
    args: {
        artist: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const all = await ctx.db.query('music').collect();
        return args.artist
            ? all.filter((t) => t.artist === args.artist)
            : all;
    },
});

export const getMusic = query({
    args: { id: v.id('music') },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

export const createMusic = mutation({
    args: {
        id: v.string(),
        title: v.optional(v.string()),
        prompt: v.optional(v.string()),
        artist: v.optional(v.string()),
        duration: v.optional(v.number()),
        file: v.optional(v.object({
            key: v.string(),
            url: v.string(),
        })),
        source: v.optional(v.string()),
        mimeType: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const docId = await ctx.db.insert('music', {
            ...args,
            uploadedAt: Date.now(),
        });
        return await ctx.db.get(docId);
    },
});

export const updateMusic = mutation({
    args: {
        id: v.id('music'),
        title: v.optional(v.string()),
        prompt: v.optional(v.string()),
        artist: v.optional(v.string()),
        duration: v.optional(v.number()),
        file: v.optional(v.object({
            key: v.string(),
            url: v.string(),
        })),
        source: v.optional(v.string()),
        mimeType: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        const existing = await ctx.db.get(id);
        if (!existing) return null;
        await ctx.db.patch(id, updates);
        return await ctx.db.get(id);
    },
});

export const deleteMusic = mutation({
    args: { id: v.id('music') },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.id);
        if (!existing) return null;
        await ctx.db.delete(args.id);
        return existing;
    },
});
