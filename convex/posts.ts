import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const listPosts = query({
    args: {
        published: v.optional(v.boolean()),
        featured: v.optional(v.boolean()),
        authorId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const all = await ctx.db.query('posts').collect();
        return all.filter((post) => {
            if (args.published !== undefined && post.published !== args.published) return false;
            if (args.featured !== undefined && post.featured !== args.featured) return false;
            if (args.authorId && post.authorId !== args.authorId) return false;
            return true;
        });
    },
});

export const createPost = mutation({
    args: {
        title: v.string(),
        slug: v.string(),
        content: v.string(),
        excerpt: v.optional(v.string()),
        authorId: v.string(),
        authorName: v.optional(v.string()),
        published: v.boolean(),
        featured: v.boolean(),
        metaTitle: v.optional(v.string()),
        metaDescription: v.optional(v.string()),
        publishedAt: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const id = await ctx.db.insert('posts', args);
        return await ctx.db.get(id);
    },
});

export const updatePost = mutation({
    args: {
        id: v.id('posts'),
        title: v.optional(v.string()),
        slug: v.optional(v.string()),
        content: v.optional(v.string()),
        excerpt: v.optional(v.string()),
        authorName: v.optional(v.string()),
        published: v.optional(v.boolean()),
        featured: v.optional(v.boolean()),
        metaTitle: v.optional(v.string()),
        metaDescription: v.optional(v.string()),
        publishedAt: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        const existing = await ctx.db.get(id);
        if (!existing) return null;
        await ctx.db.patch(id, updates);
        return await ctx.db.get(id);
    },
});

export const deletePost = mutation({
    args: {
        id: v.id('posts'),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.id);
        if (!existing) return null;
        await ctx.db.delete(args.id);
        return existing;
    },
});
