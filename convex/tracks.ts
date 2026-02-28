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

export const listTracks = query({
    args: {
        artist: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const all = await ctx.db.query('tracks').collect();
        return args.artist
            ? all.filter((t) => t.artist === args.artist)
            : all;
    },
});

export const getTrack = query({
    args: { id: v.id('tracks') },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

export const createTrack = mutation({
    args: {
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
    },
    handler: async (ctx, args) => {
        const id = await ctx.db.insert('tracks', {
            ...args,
            uploadedAt: Date.now(),
        });
        return await ctx.db.get(id);
    },
});

export const updateTrack = mutation({
    args: {
        id: v.id('tracks'),
        title: v.optional(v.string()),
        prompt: v.optional(v.string()),
        artist: v.optional(v.string()),
        album: v.optional(v.string()),
        duration: v.optional(v.number()),
        storageId: v.optional(v.id('_storage')),
        uploadThingKey: v.optional(v.string()),
        uploadThingUrl: v.optional(v.string()),
        source: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        const existing = await ctx.db.get(id);
        if (!existing) return null;
        await ctx.db.patch(id, updates);
        return await ctx.db.get(id);
    },
});

export const deleteTrack = mutation({
    args: { id: v.id('tracks') },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.id);
        if (!existing) return null;
        await ctx.db.delete(args.id);
        return existing;
    },
});
