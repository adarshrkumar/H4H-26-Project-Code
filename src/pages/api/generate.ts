import type { APIRoute } from 'astro';
import { z } from 'zod';
import { generateAndSave, GenerateAndSaveError } from '../../lib/generate-and-save';

const requestSchema = z.object({
    text: z.string().min(1, 'text is required').max(5000, 'text is too long'),
    title: z.string().min(1).max(255).optional(),
    artist: z.string().min(1).max(255).optional(),
    voiceId: z.string().min(1).optional(),
    modelId: z.string().min(1).optional(),
    outputFormat: z.string().min(1).optional(),
});

export const POST: APIRoute = async ({ request }) => {
    let payload: z.infer<typeof requestSchema>;

    try {
        const json = await request.json();
        payload = requestSchema.parse(json);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return Response.json(
                {
                    error: 'Invalid request body',
                    details: error.issues,
                },
                { status: 400 }
            );
        }

        return Response.json(
            { error: 'Request body must be valid JSON' },
            { status: 400 }
        );
    }

    try {
        const result = await generateAndSave({
            text: payload.text,
            title: payload.title,
            artist: payload.artist,
            voiceId: payload.voiceId,
            modelId: payload.modelId,
            outputFormat: payload.outputFormat,
        });

        return Response.json( result, { status: 201 } );
    } catch (error) {
        console.error('[api/generate] failed', error);

        if (error instanceof GenerateAndSaveError) {
            return Response.json({ error: error.message }, { status: error.status });
        }

        return Response.json({
            error: error instanceof Error
                   ? error.message
                   : 'Failed to generate and save audio',
        }, { status: 500 });
    }
};
