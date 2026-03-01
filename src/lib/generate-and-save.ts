import 'dotenv/config';
import { Music } from '@elevenlabs/elevenlabs-js';
import { generateCompositionPlan } from './eleven-labs';
import { uploadFile, getFileUrl } from './uploadthing';

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
        const apiKey =
            (import.meta as unknown as { env: Record<string, string> }).env?.ELEVENLABS_API_KEY ??
            process.env.ELEVENLABS_API_KEY;
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
    if (!input.plan && !input.text?.trim()) {
        throw new GenerateAndSaveError('Either text or plan is required', 400);
    }

    // Step 1: composition plan (skipped when plan is provided directly)
    if (!input.plan) {
        const text = input.text!.trim();
        try {
            await generateCompositionPlan(text, input.musicLengthMs);
        } catch {
            throw new GenerateAndSaveError('Composition plan failed', 500);
        }
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

    let audio: Buffer;
    let filename: string;
    let songTitle: string;

    try {
        const result = await getMusic().composeDetailed(composeInput);
        audio = result.audio;
        filename = result.filename;
        songTitle = input.title ?? result.json.songMetadata.title ?? (input.text ?? '').slice(0, 60);
    } catch (err) {
        if (isElevenLabsError(err)) {
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
    let fileKey: string;
    let fileUrl: string | undefined;

    try {
        const file = new File([new Uint8Array(audio)], filename, { type: 'audio/mpeg' });
        const uploaded = await uploadFile(file);
        fileKey = uploaded.data?.key ?? '';
        fileUrl = fileKey ? getFileUrl(fileKey) : undefined;
    } catch {
        throw new GenerateAndSaveError('Failed to upload audio', 500);
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
