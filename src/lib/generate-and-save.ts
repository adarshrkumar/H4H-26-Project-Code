import { Music } from '@elevenlabs/elevenlabs-js';
import { generateCompositionPlan } from './eleven-labs';
import { uploadFile, getFileUrl } from './uploadthing';
import { saveSong, addFileToSong } from '@db/helpers';

export interface SectionPrompt {
    sectionName: string;
    positiveLocalStyles: string[];
    negativeLocalStyles: string[];
    durationMs: number;
    lines: string[];
}

export interface CompositionPlan {
    positiveGlobalStyles: string[];
    negativeGlobalStyles: string[];
    prompts: SectionPrompt[];
}

export interface GenerateAndSavePayload {
    text?: string;
    plan?: CompositionPlan;
    title?: string;
    artist?: string;
    musicLengthMs?: number;
    musicId?: string;       // parent song ID (groups sections together)
    sectionName?: string;   // e.g. 'Intro', 'Verse 1'
    position?: number;      // section order (0-based)
}

export interface GenerateAndSaveResult {
    id: string;
    creationTime: number;
    title: string;
    artist?: string;
    duration?: number;
    storageId?: string;
    file?: {
        key: string;
        url?: string;
    };
    source?: string;
    mimeType?: string;
    uploadedAt: number;
}

export class GenerateAndSaveError extends Error {
    status: number;
    details?: unknown;

    constructor(message: string, status: number, details?: unknown) {
        super(message);
        this.name = 'GenerateAndSaveError';
        this.status = status;
        this.details = details;
    }
}

const OUTPUT_FORMAT = 'mp3_44100_128' as const;

let _music: Music | null = null;
function getMusic(): Music {
    if (!_music) {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        console.log('[generate-and-save] ElevenLabs API key present:', !!apiKey);
        _music = new Music({ apiKey });
    }
    return _music;
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

export async function generateAndSave(input: GenerateAndSavePayload): Promise<GenerateAndSaveResult> {
    console.log('[generate-and-save] start', { hasText: !!input.text, hasPlan: !!input.plan, title: input.title });

    if (!input.plan && !input.text?.trim()) {
        throw new GenerateAndSaveError('Either text or plan is required', 400);
    }

    // Step 1: composition plan (skipped when plan is provided directly)
    if (!input.plan) {
        const text = input.text!.trim();
        console.log('[generate-and-save] step 1: generating composition plan from text');
        try {
            await generateCompositionPlan(text, input.musicLengthMs);
            console.log('[generate-and-save] step 1: composition plan done');
        } catch (err) {
            console.error('[generate-and-save] step 1: composition plan failed', err);
            throw new GenerateAndSaveError('Composition plan failed', 500);
        }
    } else {
        console.log('[generate-and-save] step 1: skipped (plan provided directly)', {
            sections: input.plan.prompts.map(p => p.sectionName),
            globalStyles: input.plan.positiveGlobalStyles,
        });
    }

    // Step 2: generate music
    const composeInput = input.plan
        ? {
            compositionPlan: {
                positiveGlobalStyles: input.plan.positiveGlobalStyles,
                negativeGlobalStyles: input.plan.negativeGlobalStyles,
                sections: input.plan.prompts.map(p => ({
                    sectionName:         p.sectionName,
                    positiveLocalStyles: p.positiveLocalStyles,
                    negativeLocalStyles: p.negativeLocalStyles,
                    durationMs:          p.durationMs,
                    lines:               p.lines,
                })),
            },
            outputFormat: OUTPUT_FORMAT,
        }
        : {
            prompt: input.text!.trim(),
            outputFormat: OUTPUT_FORMAT,
            ...(input.musicLengthMs !== undefined && { musicLengthMs: input.musicLengthMs }),
        };

    console.log('[generate-and-save] step 2: calling ElevenLabs composeDetailed', JSON.stringify(composeInput, null, 2));

    let audio: Buffer;
    let filename: string;
    let songTitle: string;

    try {
        const result = await getMusic().composeDetailed(composeInput);
        console.log('[generate-and-save] step 2: composeDetailed result type:', typeof result);
        console.log('[generate-and-save] step 2: result keys:', result ? Object.keys(result as object) : 'null/undefined');
        audio = result.audio;
        filename = result.filename;
        songTitle = input.title ?? result.json.songMetadata.title ?? (input.text ?? '').slice(0, 60);
        console.log('[generate-and-save] step 2: audio bytes:', audio?.length, 'filename:', filename, 'title:', songTitle);
    } catch (err) {
        console.error('[generate-and-save] step 2: composeDetailed failed', err);
        if (isElevenLabsError(err)) {
            console.error('[generate-and-save] step 2: ElevenLabs error body', JSON.stringify(err.body));
            const code = err.body?.error as string | undefined;
            if (code === 'bad_prompt') {
                throw new GenerateAndSaveError(
                    'Prompt contains copyrighted material.',
                    400,
                    { suggestion: (err.body?.prompt_suggestion as string) ?? undefined },
                );
            }
        }
        throw new GenerateAndSaveError('Failed to generate music', 500);
    }

    // Step 3: upload
    console.log('[generate-and-save] step 3: uploading audio');
    let fileKey: string;
    let fileUrl: string | undefined;

    try {
        const file = new File([new Uint8Array(audio)], filename, { type: 'audio/mpeg' });
        const uploaded = await uploadFile(file);
        console.log('[generate-and-save] step 3: upload result', JSON.stringify(uploaded));
        if (uploaded.error) {
            throw new Error(`UploadThing error: ${uploaded.error.code} — ${uploaded.error.message}`);
        }
        fileKey = uploaded.data?.key ?? '';
        fileUrl = fileKey ? getFileUrl(fileKey) : undefined;
        console.log('[generate-and-save] step 3: fileKey:', fileKey, 'fileUrl:', fileUrl);
    } catch (err) {
        console.error('[generate-and-save] step 3: upload failed', err);
        throw new GenerateAndSaveError('Failed to upload audio', 500);
    }

    // Step 4: persist to Neon
    console.log('[generate-and-save] step 4: saving to Neon');
    try {
        await saveTrack({ id: fileKey, title: songTitle, artist: input.artist, mimeType: 'audio/mpeg', fileKey, fileUrl });
        console.log('[generate-and-save] step 4: Neon save done');
    } catch (err) {
        console.error('[generate-and-save] step 4: Neon insert failed', err);
    }

    return {
        id: fileKey,
        creationTime: Date.now(),
        title: songTitle,
        artist: input.artist,
        mimeType: 'audio/mpeg',
        uploadedAt: Date.now(),
        file: { key: fileKey, url: fileUrl },
    };
}
