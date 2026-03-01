import 'dotenv/config';
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { Music } from '@elevenlabs/elevenlabs-js';
import { uploadFile, getFileUrl } from '@/lib/uploadthing';
import { createRecording } from '@/db/helpers.ts';

const OUTPUT_FORMAT = 'mp3_44100_128' as const;

let _music: Music | null = null;
function getMusic(): Music {
    if (!_music) {
        const apiKey = import.meta.env.ELEVENLABS_API_KEY ?? process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
            throw new Error('ELEVENLABS_API_KEY is not set');
        }
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

const requestSchema = z.object({
    text: z.string().min(1, 'text is required').max(5000, 'text is too long'),
    title: z.string().min(1).max(255).optional(),
    artist: z.string().min(1).max(255).optional(),
    voiceId: z.string().min(1).optional(),
    modelId: z.string().min(1).optional(),
    outputFormat: z.string().min(1).optional(),
    // Duration in ms (3 000 – 120 000). Drives per-section length so the full
    // song lands between ~2:30 and 4:00.
    musicLengthMs: z.number().int().min(3000).max(240000).optional(),
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

    // Generate music via ElevenLabs
    let audio: Buffer;
    let songTitle: string;

    try {
        const result = await getMusic().composeDetailed({
            prompt: payload.text,
            outputFormat: OUTPUT_FORMAT,
            ...(payload.musicLengthMs !== undefined && { musicLengthMs: payload.musicLengthMs }),
        });

        audio = result.audio;
        songTitle = payload.title ?? result.json.songMetadata.title ?? payload.text.slice(0, 60);
    } catch (err) {
        if (isElevenLabsError(err)) {
            const code = err.body?.error as string | undefined;
            if (code === 'bad_prompt') {
                return Response.json({
                    error: 'Prompt contains copyrighted material.',
                    suggestion: (err.body?.prompt_suggestion as string) ?? undefined,
                }, { status: 400 });
            }
        }
        console.error('[api/generate] ElevenLabs error:', err);
        return Response.json({ error: 'Failed to generate music' }, { status: 500 });
    }

    // Upload to UploadThing
    let fileKey: string;
    let fileUrl: string;

    try {
        const uploadFilename = `${songTitle.replace(/[^a-z0-9_-]/gi, '_')}.mp3`;
        const file = new File([Buffer.from(audio)], uploadFilename, { type: 'audio/mpeg' });
        const uploaded = await uploadFile(file);

        if (uploaded.error !== null) {
            throw new Error(`Upload failed: ${String(uploaded.error)}`);
        }

        fileKey = uploaded.data?.key || '';
        fileUrl = getFileUrl(fileKey);
    } catch (err: unknown) {
        console.error('[api/generate] UploadThing error:', err);
        return Response.json({ error: 'Failed to upload audio' }, { status: 500 });
    }

    // Save to database
    try {
        await createRecording({
            id: fileKey,
            title: songTitle,
            artist: payload.artist ?? undefined,
            prompt: payload.text,
            source: 'elevenlabs',
            mimeType: 'audio/mpeg',
            file: {
                key: fileKey,
                url: fileUrl,
            },
        });
    } catch (err) {
        console.error('[api/generate] Database save error:', err);
        return Response.json({ error: 'Failed to save track to database' }, { status: 500 });
    }

    return Response.json({
        id: fileKey,
        creationTime: Date.now(),
        title: songTitle,
        artist: payload.artist ?? undefined,
        mimeType: 'audio/mpeg',
        uploadedAt: Date.now(),
        file: {
            key: fileKey,
            url: fileUrl,
        },
    }, { status: 201 });
};
