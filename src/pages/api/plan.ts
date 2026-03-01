import 'dotenv/config';
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { generateCompositionPlan } from '@/lib/eleven-labs';

const requestSchema = z.object({
    prompt:        z.string().min(1).max(5000),
    musicLengthMs: z.number().int().min(3000).max(240000).optional(),
});

export const POST: APIRoute = async ({ request }) => {
    let payload: z.infer<typeof requestSchema>;

    try {
        const body = await request.json();
        payload = requestSchema.parse(body);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return Response.json({ error: 'Invalid request body', details: error.issues }, { status: 400 });
        }
        return Response.json({ error: 'Request body must be valid JSON' }, { status: 400 });
    }

    try {
        const plan = await generateCompositionPlan(payload.prompt, payload.musicLengthMs);
        return Response.json(plan, { status: 200 });
    } catch (err) {
        console.error('[api/plan]', err);
        return Response.json({ error: 'Failed to create composition plan' }, { status: 500 });
    }
};
