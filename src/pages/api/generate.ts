import 'dotenv/config';
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { generateAndSave, GenerateAndSaveError } from '@/lib/generate-and-save';

const requestSchema = z.object({
    text:         z.string().min(1, 'text is required').max(5000, 'text is too long'),
    title:        z.string().min(1).max(255).optional(),
    artist:       z.string().min(1).max(255).optional(),
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
        const result = await generateAndSave(payload);
        return Response.json(result, { status: 201 });
    } catch (err) {
        if (err instanceof GenerateAndSaveError) {
            const details = err.details !== null && typeof err.details === 'object'
                ? err.details as Record<string, unknown>
                : {};
            return Response.json({ error: err.message, ...details }, { status: err.status });
        }
        console.error('[api/generate]', err);
        return Response.json({ error: 'Failed to generate and save' }, { status: 500 });
    }
};
