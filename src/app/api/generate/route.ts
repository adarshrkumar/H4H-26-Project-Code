/**
 * POST /api/generate
 * Converted from src/pages/api/generate.ts (Astro APIRoute → Next.js route handler).
 */

import { z } from 'zod';
import { generateAndSave, GenerateAndSaveError } from '@/lib/generate-and-save';

const sectionSchema = z.object({
    sectionName:         z.string().min(1).max(100),
    positiveLocalStyles: z.array(z.string()),
    negativeLocalStyles: z.array(z.string()),
    durationMs:          z.number().int().min(3000).max(120000),
    lines:               z.array(z.string()),
});

const planSchema = z.object({
    positiveGlobalStyles: z.array(z.string()),
    negativeGlobalStyles: z.array(z.string()),
    prompts:              z.array(sectionSchema),
});

const requestSchema = z.object({
    text:          z.string().min(1).max(5000).optional(),
    plan:          planSchema.optional(),
    title:         z.string().min(1).max(255).optional(),
    artist:        z.string().min(1).max(255).optional(),
    musicLengthMs: z.number().int().min(3000).max(240000).optional(),
}).refine(data => data.text || data.plan, {
    message: 'Either text or plan is required',
});

export async function POST(request: Request) {
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
}
