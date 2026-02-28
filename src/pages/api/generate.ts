import { ConvexHttpClient } from 'convex/browser';
import type { APIRoute } from 'astro';
import { makeFunctionReference } from 'convex/server';
import { z } from 'zod';
import { UTApi, UTFile } from 'uploadthing/server';

const DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb';
const DEFAULT_MODEL_ID = 'eleven_multilingual_v2';
const DEFAULT_OUTPUT_FORMAT = 'mp3_44100_128';

const requestSchema = z.object({
    text: z.string().min(1, 'text is required').max(5000, 'text is too long'),
    title: z.string().min(1).max(255).optional(),
    artist: z.string().min(1).max(255).optional(),
    album: z.string().min(1).max(255).optional(),
    voiceId: z.string().min(1).default(DEFAULT_VOICE_ID),
    modelId: z.string().min(1).default(DEFAULT_MODEL_ID),
    outputFormat: z.string().min(1).default(DEFAULT_OUTPUT_FORMAT),
});

function readEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is not set`);
    }
    return value;
}

function toSafeFileBase(input: string): string {
    const cleaned = input
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return cleaned.slice(0, 64) || 'tts-audio';
}

type UploadResultShape = {
    data?: {
        key?: string;
        ufsUrl?: string;
    } | null;
    error?: unknown;
};

function getUploadData(uploadResponse: unknown): { key: string; url?: string } {
    const result = Array.isArray(uploadResponse)
        ? uploadResponse[0]
        : uploadResponse as UploadResultShape;

    if (!result || typeof result !== 'object') {
        throw new Error('UploadThing upload failed');
    }

    const typed = result as UploadResultShape;
    if (typed.error || !typed.data?.key) {
        throw new Error('UploadThing upload failed');
    }

    return {
        key: typed.data.key,
        url: typed.data.ufsUrl ?? undefined,
    };
}

function shortTitleFromText(text: string): string {
    const normalized = text.trim().replace(/\s+/g, ' ');
    return normalized.slice(0, 80) || 'Generated speech';
}

async function synthesizeSpeech(params: {
    apiKey: string;
    text: string;
    voiceId: string;
    modelId: string;
    outputFormat: string;
}): Promise<ArrayBuffer> {
    const endpoint = new URL(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(params.voiceId)}`
    );
    endpoint.searchParams.set('output_format', params.outputFormat);

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'xi-api-key': params.apiKey,
            Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
            text: params.text,
            model_id: params.modelId,
            output_format: params.outputFormat,
        }),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(
            `ElevenLabs request failed (${response.status}): ${body || response.statusText}`
        );
    }

    const bytes = await response.arrayBuffer();
    if (bytes.byteLength === 0) {
        throw new Error('ElevenLabs returned empty audio content');
    }

    return bytes;
}

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
        const elevenLabsKey = readEnv('ELEVENLABS_API_KEY');
        const uploadThingToken = readEnv('UPLOADTHING_TOKEN');
        const convexUrl = readEnv('PUBLIC_CONVEX_URL');

        const audioBuffer = await synthesizeSpeech({
            apiKey: elevenLabsKey,
            text: payload.text,
            voiceId: payload.voiceId,
            modelId: payload.modelId,
            outputFormat: payload.outputFormat,
        });

        const fileBase = toSafeFileBase(payload.title ?? shortTitleFromText(payload.text));
        const fileName = `${fileBase}-${Date.now()}.mp3`;

        const utapi = new UTApi({ token: uploadThingToken });
        const uploadResponse = await utapi.uploadFiles(
            new UTFile([audioBuffer], fileName, { type: 'audio/mpeg' })
        );
        const uploadData = getUploadData(uploadResponse);

        const convex = new ConvexHttpClient(convexUrl);
        const createMusic = makeFunctionReference<'mutation'>('music:createMusic');
        const music = await convex.mutation(createMusic, {
            title: payload.title ?? shortTitleFromText(payload.text),
            artist: payload.artist ?? 'ElevenLabs',
            album: payload.album,
            mimeType: 'audio/mpeg',
            file: { key: uploadData.key, url: uploadData.url ?? '' },
            source: 'elevenlabs',
        });

        return Response.json(
            {
                music,
                uploadThing: uploadData,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('[api/tts/generate] failed', error);

        return Response.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : 'Failed to generate and store ElevenLabs audio',
            },
            { status: 500 }
        );
    }
};
