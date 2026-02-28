export interface GenerateAndSavePayload {
    text: string;
    title?: string;
    artist?: string;
    voiceId?: string;
    modelId?: string;
    outputFormat?: string;
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

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function asOptionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function normalizePayload(input: GenerateAndSavePayload): GenerateAndSavePayload {
    return {
        text: input.text.trim(),
        title: asOptionalString(input.title),
        artist: asOptionalString(input.artist),
        voiceId: asOptionalString(input.voiceId),
        modelId: asOptionalString(input.modelId),
        outputFormat: asOptionalString(input.outputFormat),
    };
}

function parseResult(value: unknown): GenerateAndSaveResult {
    if (!isRecord(value)) {
        throw new Error('Invalid response from generate endpoint');
    }

    const { track, file } = value;
    if (!isRecord(track) || !isRecord(file)) {
        throw new Error('Missing track or upload data in response');
    }

    if (typeof file.key !== 'string' || file.key.length === 0) {
        throw new Error('Missing upload key in response');
    }

    if (typeof track.title !== 'string' || track.title.length === 0) {
        throw new Error('Missing track title in response');
    }
    if (typeof track.id !== 'string' || track.id.length === 0) {
        throw new Error('Missing track id in response');
    }
    if (typeof track._creationTime !== 'number') {
        throw new Error('Missing track creation time in response');
    }
    if (typeof track.uploadedAt !== 'number') {
        throw new Error('Missing track upload time in response');
    }

    return track as GenerateAndSaveResult;
}

export async function generateAndSave(
    input: GenerateAndSavePayload,
    options?: { signal?: AbortSignal }
): Promise<GenerateAndSaveResult> {
    const payload = normalizePayload(input);
    if (!payload.text) {
        throw new GenerateAndSaveError('Text is required', 400);
    }

    const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal: options?.signal,
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
        const message =
            isRecord(body) && typeof body.error === 'string'
                ? body.error
                : 'Failed to generate and save audio';
        throw new GenerateAndSaveError(message, response.status, body);
    }

    return parseResult(body);
}
