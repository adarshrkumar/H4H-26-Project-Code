import { createRecording, updateRecording } from '@/db/helpers';
import { getFileUrl, uploadFile } from '@/lib/uploadthing';

const DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb';
const DEFAULT_MODEL_ID = 'eleven_multilingual_v2';
const DEFAULT_OUTPUT_FORMAT = 'mp3_44100_128';

export interface GenerateAndSaveInput {
    text: string;
    title?: string;
    artist?: string;
    album?: string;
    voiceId?: string;
    modelId?: string;
    outputFormat?: string;
}

type SavedTrack = Record<string, unknown>;

export interface GenerateAndSaveOutput {
    track: SavedTrack | null;
    uploadThing: {
        key: string;
        url?: string;
    };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function getTrackId(value: unknown): string {
    if (!isRecord(value) || typeof value._id !== 'string' || value._id.length === 0) {
        throw new Error('Failed to create recording row');
    }
    return value._id;
}

function normalizeUpload(uploadResult: unknown): { key: string; url?: string } {
    if (typeof uploadResult === 'string' && uploadResult.length > 0) {
        return {
            key: uploadResult,
            url: getFileUrl(uploadResult),
        };
    }

    if (!isRecord(uploadResult)) {
        throw new Error('UploadThing upload failed');
    }

    if (typeof uploadResult.key === 'string' && uploadResult.key.length > 0) {
        return {
            key: uploadResult.key,
            url:
                typeof uploadResult.ufsUrl === 'string'
                    ? uploadResult.ufsUrl
                    : typeof uploadResult.url === 'string'
                        ? uploadResult.url
                        : getFileUrl(uploadResult.key),
        };
    }

    const data = isRecord(uploadResult.data) ? uploadResult.data : null;
    if (data && typeof data.key === 'string' && data.key.length > 0) {
        return {
            key: data.key,
            url:
                typeof data.ufsUrl === 'string'
                    ? data.ufsUrl
                    : typeof data.url === 'string'
                        ? data.url
                        : getFileUrl(data.key),
        };
    }

    throw new Error('UploadThing upload failed');
}

function sanitizeInput(input: GenerateAndSaveInput): GenerateAndSaveInput {
    return {
        text: input.text.trim(),
        title: input.title?.trim() || undefined,
        artist: input.artist?.trim() || undefined,
        album: input.album?.trim() || undefined,
        voiceId: input.voiceId?.trim() || DEFAULT_VOICE_ID,
        modelId: input.modelId?.trim() || DEFAULT_MODEL_ID,
        outputFormat: input.outputFormat?.trim() || DEFAULT_OUTPUT_FORMAT,
    };
}

function toSafeFileBase(input: string): string {
    const cleaned = input
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return cleaned.slice(0, 64) || 'tts-audio';
}

function shortTitleFromText(text: string): string {
    const normalized = text.trim().replace(/\s+/g, ' ');
    return normalized.slice(0, 80) || 'Generated speech';
}

function parseOutputMime(outputFormat: string): string {
    const lower = outputFormat.toLowerCase();
    if (lower.includes('mp3')) return 'audio/mpeg';
    if (lower.includes('pcm')) return 'audio/wav';
    if (lower.includes('ulaw')) return 'audio/basic';
    return 'audio/mpeg';
}

function parseOutputExtension(outputFormat: string): string {
    const lower = outputFormat.toLowerCase();
    if (lower.includes('pcm')) return 'wav';
    if (lower.includes('ulaw')) return 'ulaw';
    return 'mp3';
}

function getEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is not set`);
    }
    return value;
}

async function synthesizeSpeech(input: {
    apiKey: string;
    text: string;
    voiceId: string;
    modelId: string;
    outputFormat: string;
}): Promise<ArrayBuffer> {
    const endpoint = new URL(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(input.voiceId)}`
    );
    endpoint.searchParams.set('output_format', input.outputFormat);

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'xi-api-key': input.apiKey,
            Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
            text: input.text,
            model_id: input.modelId,
            output_format: input.outputFormat,
        }),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`ElevenLabs request failed (${response.status}): ${body || response.statusText}`);
    }

    const bytes = await response.arrayBuffer();
    if (bytes.byteLength === 0) {
        throw new Error('ElevenLabs returned empty audio content');
    }

    return bytes;
}

export async function generateAndSave(input: GenerateAndSaveInput): Promise<GenerateAndSaveOutput> {
    const payload = sanitizeInput(input);
    if (!payload.text) {
        throw new Error('text is required');
    }

    const elevenLabsApiKey = getEnv('ELEVENLABS_API_KEY');
    const title = payload.title ?? shortTitleFromText(payload.text);
    const outputFormat = payload.outputFormat ?? DEFAULT_OUTPUT_FORMAT;
    const mimeType = parseOutputMime(outputFormat);
    const extension = parseOutputExtension(outputFormat);
    const safeBase = toSafeFileBase(title);
    const fileName = `${safeBase}-${Date.now()}.${extension}`;

    const audioBuffer = await synthesizeSpeech({
        apiKey: elevenLabsApiKey,
        text: payload.text,
        voiceId: payload.voiceId ?? DEFAULT_VOICE_ID,
        modelId: payload.modelId ?? DEFAULT_MODEL_ID,
        outputFormat,
    });

    const file = new File([audioBuffer], fileName, { type: mimeType });
    const uploaded = await uploadFile(file);
    const uploadThing = normalizeUpload(uploaded);

    const created = await createRecording(payload.text);
    const trackId = getTrackId(created) as Parameters<typeof updateRecording>[0];
    const track = await updateRecording(trackId, {
        title,
        fileKey: uploadThing.key,
        fileUrl: uploadThing.url,
    });

    return {
        track,
        uploadThing,
    };
}
