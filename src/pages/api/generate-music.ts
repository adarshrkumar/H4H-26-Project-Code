import type { APIRoute } from 'astro';
import { generateAndSave, CopyrightPromptError, CopyrightPlanError } from '@/lib/generate-and-save';

export const POST: APIRoute = async ({ request }) => {
    let prompt: string;
    let musicLengthMs: number | undefined;

    try {
        const body = await request.json();
        prompt = body.prompt;
        musicLengthMs = body.musicLengthMs;
    } catch {
        return json({ error: 'Invalid request body', code: 'unknown' }, 400);
    }

    if (!prompt || typeof prompt !== 'string') {
        return json({ error: 'prompt is required', code: 'unknown' }, 400);
    }

    try {
        const result = await generateAndSave(prompt, musicLengthMs);

        const sections = result.sections.map((section) => ({
            sectionName: section.sectionName,
            durationMs: section.durationMs,
            filename: section.filename,
            title: section.metadata.title,
            genres: section.metadata.genres,
            audioBase64: section.audioBuffer.toString('base64'),
        }));

        return json({ sections }, 200);
    } catch (err) {
        if (err instanceof CopyrightPromptError) {
            return json({
                error: err.message,
                code: 'bad_prompt',
                suggestion: err.suggestion ?? undefined,
            }, 400);
        }
        if (err instanceof CopyrightPlanError) {
            return json({
                error: err.message,
                code: 'bad_composition_plan',
                sectionName: err.sectionName,
                suggestion: err.suggestedPlan
                    ? JSON.stringify(err.suggestedPlan)
                    : undefined,
            }, 400);
        }
        console.error('[generate-music]', err);
        return json({ error: 'Internal server error', code: 'unknown' }, 500);
    }
};

function json(data: unknown, status: number): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
