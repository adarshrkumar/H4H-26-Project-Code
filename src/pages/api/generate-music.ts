import 'dotenv/config';
import type { APIRoute } from 'astro';
import { Music } from '@elevenlabs/elevenlabs-js';
import type { MusicPrompt, SongSection } from '@elevenlabs/elevenlabs-js';

const OUTPUT_FORMAT = 'mp3_44100_128' as const;

let _music: Music | null = null;
function getMusic(): Music {
    if (!_music) {
        const apiKey =
            (import.meta as unknown as { env: Record<string, string> }).env?.ELEVENLABS_API_KEY ??
            process.env.ELEVENLABS_API_KEY;
        _music = new Music({ apiKey });
    }
    return _music;
}

function sectionToPlan(section: SongSection, globalPlan: MusicPrompt): MusicPrompt {
    return {
        positiveGlobalStyles: globalPlan.positiveGlobalStyles,
        negativeGlobalStyles: globalPlan.negativeGlobalStyles,
        sections: [section],
    };
}

function isElevenLabsError(err: unknown): err is { statusCode: number; body: Record<string, unknown> } {
    return (
        err !== null &&
        typeof err === 'object' &&
        'statusCode' in err &&
        'body' in err &&
        typeof (err as Record<string, unknown>).body === 'object'
    );
}

function json(data: unknown, status: number): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

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

    // Step 1: Build composition plan (no credits deducted)
    let compositionPlan: MusicPrompt;
    try {
        compositionPlan = await getMusic().compositionPlan.create({
            prompt,
            ...(musicLengthMs !== undefined && { musicLengthMs }),
        });
    } catch (err) {
        if (isElevenLabsError(err)) {
            const body = err.body;
            const code = body?.error as string | undefined;
            if (code === 'bad_prompt') {
                return json({
                    error: 'Prompt contains copyrighted material.',
                    code: 'bad_prompt',
                    suggestion: (body?.prompt_suggestion as string) ?? undefined,
                }, 400);
            }
        }
        console.error('[generate-music]', err);
        return json({ error: 'Internal server error', code: 'unknown' }, 500);
    }

    // Step 2: Compose each section individually in parallel
    try {
        const sections = await Promise.all(
            compositionPlan.sections.map(async (section: SongSection) => {
                const singleSectionPlan = sectionToPlan(section, compositionPlan);

                const { audio, filename, json: meta } = await getMusic().composeDetailed({
                    compositionPlan: singleSectionPlan,
                    outputFormat: OUTPUT_FORMAT,
                });

                return {
                    sectionName: section.sectionName,
                    durationMs: section.durationMs,
                    filename,
                    title: meta.songMetadata.title ?? section.sectionName,
                    genres: meta.songMetadata.genres,
                    audioBase64: audio.toString('base64'),
                };
            })
        );

        return json({ sections }, 200);
    } catch (err) {
        if (isElevenLabsError(err)) {
            const body = err.body;
            const code = body?.error as string | undefined;
            if (code === 'bad_composition_plan') {
                return json({
                    error: 'A section contains copyrighted style descriptors.',
                    code: 'bad_composition_plan',
                    suggestion: body?.composition_plan_suggestion
                        ? JSON.stringify(body.composition_plan_suggestion)
                        : undefined,
                }, 400);
            }
        }
        console.error('[generate-music]', err);
        return json({ error: 'Internal server error', code: 'unknown' }, 500);
    }
};
