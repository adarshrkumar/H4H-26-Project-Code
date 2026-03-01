import 'dotenv/config';
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { generateSongBlueprint } from '@/lib/generate-section-plan';

const requestSchema = z.object({
    mood:        z.string().max(200).default(''),
    songStyle:   z.string().max(500).default(''),
    songConcept: z.string().max(500).default(''),
});

export const POST: APIRoute = async ({ request }) => {
    let payload: z.infer<typeof requestSchema>;

    try {
        const body = await request.json();
        payload = requestSchema.parse(body);
    } catch {
        return Response.json({ error: 'Request body must be valid JSON' }, { status: 400 });
    }

    try {
        const blueprint = await generateSongBlueprint(payload);
        console.log('[api/generate-blueprint] blueprint', JSON.stringify(blueprint));
        return Response.json(blueprint, { status: 200 });
    } catch (err) {
        console.error('[api/generate-blueprint] failed', err);
        return Response.json({ error: 'Failed to generate song blueprint' }, { status: 500 });
    }
};
