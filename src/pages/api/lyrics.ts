import type { APIRoute } from 'astro';
import { z } from 'zod';
import { generateSongLyrics } from '@/lib/ai-service';

const requestSchema = z.object({
    prompt: z.string().min(1, 'prompt is required'),
    section: z.string().min(1, 'section is required'),
    verses: z.number().int().min(1).max(4).optional(),
    chorus: z.boolean().optional(),
});

export const POST: APIRoute = async ({ request }) => {
    let payload: z.infer<typeof requestSchema>;

    try {
        const body = await request.json();
        payload = requestSchema.parse(body);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return Response.json(
                { error: 'Invalid request body', details: error.issues },
                { status: 400 }
            );
        }
        return Response.json({ error: 'Request body must be valid JSON' }, { status: 400 });
    }

    try {
        const lyrics = await generateSongLyrics(payload.prompt, {
            verses: payload.verses ?? 1,
            chorus: payload.chorus ?? false,
        });

        return Response.json({ lyrics }, { status: 200 });
    } catch (err) {
        console.error('[api/lyrics] Error:', err);
        return Response.json({ error: 'Failed to generate lyrics' }, { status: 500 });
    }
};
