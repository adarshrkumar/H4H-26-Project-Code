import type { APIRoute } from 'astro';
import { convex } from '@/db/initialize';
import { api } from '../../../convex/_generated/api';
import {
    createPostSchema,
    updatePostSchema,
    postQuerySchema,
    type CreatePostInput,
    type UpdatePostInput,
} from '@/db/validations';
import { z } from 'zod';

// GET /api/posts - List posts with pagination and filtering
export const GET: APIRoute = async ({ url }) => {
    try {
        const queryParams = {
            page: url.searchParams.get('page'),
            limit: url.searchParams.get('limit'),
            published: url.searchParams.get('published'),
            featured: url.searchParams.get('featured'),
            authorId: url.searchParams.get('authorId'),
            search: url.searchParams.get('search'),
        };

        const validated = postQuerySchema.parse(queryParams);

        const all = await convex.query(api.posts.listPosts, {
            published: validated.published,
            featured: validated.featured,
            authorId: validated.authorId,
        });

        const filtered = validated.search
            ? all.filter(
                  (p) =>
                      p.title.toLowerCase().includes(validated.search!.toLowerCase()) ||
                      p.content.toLowerCase().includes(validated.search!.toLowerCase())
              )
            : all;

        const offset = (validated.page - 1) * validated.limit;
        const paginated = filtered.slice(offset, offset + validated.limit);

        return new Response(
            JSON.stringify({
                data: paginated,
                meta: {
                    page: validated.page,
                    limit: validated.limit,
                    total: filtered.length,
                },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new Response(
                JSON.stringify({ error: 'Validation error', details: error.errors }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }
        console.error('GET /api/posts error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};

// POST /api/posts - Create a new post
export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const validated: CreatePostInput = createPostSchema.parse(body);

        const newPost = await convex.mutation(api.posts.createPost, {
            ...validated,
            excerpt: validated.excerpt ?? undefined,
            authorName: validated.authorName ?? undefined,
            metaTitle: validated.metaTitle ?? undefined,
            metaDescription: validated.metaDescription ?? undefined,
            publishedAt: validated.published ? Date.now() : undefined,
        });

        return new Response(
            JSON.stringify({ data: newPost, message: 'Post created successfully' }),
            { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new Response(
                JSON.stringify({ error: 'Validation error', details: error.errors }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }
        console.error('POST /api/posts error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};

// PUT /api/posts - Update an existing post
export const PUT: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const validated: UpdatePostInput = updatePostSchema.parse(body);
        const { id, ...updateData } = validated;

        if (!id) {
            return new Response(
                JSON.stringify({ error: 'Post ID is required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const updatedPost = await convex.mutation(api.posts.updatePost, {
            id: id as any,
            ...updateData,
            excerpt: updateData.excerpt ?? undefined,
            authorName: updateData.authorName ?? undefined,
            metaTitle: updateData.metaTitle ?? undefined,
            metaDescription: updateData.metaDescription ?? undefined,
            publishedAt: updateData.published ? Date.now() : undefined,
        });

        if (!updatedPost) {
            return new Response(
                JSON.stringify({ error: 'Post not found' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({ data: updatedPost, message: 'Post updated successfully' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new Response(
                JSON.stringify({ error: 'Validation error', details: error.errors }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }
        console.error('PUT /api/posts error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};

// DELETE /api/posts - Delete a post
export const DELETE: APIRoute = async ({ url }) => {
    try {
        const id = url.searchParams.get('id');

        if (!id) {
            return new Response(
                JSON.stringify({ error: 'Post ID is required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const deletedPost = await convex.mutation(api.posts.deletePost, { id: id as any });

        if (!deletedPost) {
            return new Response(
                JSON.stringify({ error: 'Post not found' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({ message: 'Post deleted successfully' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('DELETE /api/posts error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
