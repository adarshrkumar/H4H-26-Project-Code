import 'dotenv/config';
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { generateSectionPlan, type SongBlueprint } from '@/lib/generate-section-plan';
import { generateAndSave, GenerateAndSaveError } from '@/lib/generate-and-save';

const blueprintSchema = z.object({
    key:             z.string(),
    bpm:             z.number().int(),
    coreInstruments: z.array(z.string()),
    sonicCharacter:  z.string(),
}).optional();

const requestSchema = z.object({
    sectionId:   z.string().min(1).max(50),
    sectionName: z.string().min(1).max(100),
    musicalRole: z.string().min(1).max(500),
    energyValue: z.string().max(200).default(''),
    lyrics:      z.string().max(2000).default(''),
    customText:  z.string().max(1000).default(''),
    songConcept: z.string().max(500).default(''),
    songStyle:   z.string().max(500).default(''),
    mood:        z.string().max(200).default(''),
    blueprint:   blueprintSchema,
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

    let sectionPrompt;
    try {
        sectionPrompt = await generateSectionPlan(payload);
    } catch (err) {
        console.error('[api/generate-section] generateSectionPlan failed', err);
        return Response.json({ error: 'Failed to generate section plan' }, { status: 500 });
    }

    const blueprint = payload.blueprint as SongBlueprint | undefined;
    const blueprintStyles = blueprint
        ? [`key: ${blueprint.key}`, `tempo: ${blueprint.bpm} BPM`, blueprint.sonicCharacter]
        : [];

    const plan = {
        positiveGlobalStyles: [
            payload.mood,
            payload.songStyle,
            payload.songConcept,
            ...blueprintStyles,
        ].filter(Boolean),
        negativeGlobalStyles: [] as string[],
        prompts: [sectionPrompt],
    };

    try {
        const result = await generateAndSave({ plan, title: payload.sectionName });
        return Response.json(result, { status: 201 });
    } catch (err) {
        if (err instanceof GenerateAndSaveError) {
            const details = err.details !== null && typeof err.details === 'object'
                ? err.details as Record<string, unknown>
                : {};
            return Response.json({ error: err.message, ...details }, { status: err.status });
        }
        console.error('[api/generate-section]', err);
        return Response.json({ error: 'Failed to generate and save section' }, { status: 500 });
    }
};
