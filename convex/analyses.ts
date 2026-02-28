import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const getLatestAnalysis = query({
    args: { trackId: v.id('tracks') },
    handler: async (ctx, args) => {
        const results = await ctx.db
            .query('analyses')
            .withIndex('by_track', (q) => q.eq('trackId', args.trackId))
            .order('desc')
            .first();
        return results;
    },
});

export const listAnalyses = query({
    args: { trackId: v.id('tracks') },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('analyses')
            .withIndex('by_track', (q) => q.eq('trackId', args.trackId))
            .order('desc')
            .collect();
    },
});

export const createAnalysis = mutation({
    args: {
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
    },
    handler: async (ctx, args) => {
        const id = await ctx.db.insert('analyses', {
            ...args,
            analyzedAt: Date.now(),
        });
        return await ctx.db.get(id);
    },
});
