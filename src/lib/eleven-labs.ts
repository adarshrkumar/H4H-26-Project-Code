import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

let elevenlabs: ElevenLabsClient | null = null;

function getElevenLabsClient(): ElevenLabsClient {
    if (elevenlabs) return elevenlabs;

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
        throw new Error('ELEVENLABS_API_KEY is not set');
    }

    elevenlabs = new ElevenLabsClient({ apiKey });
    return elevenlabs;
}

export async function generateCompositionPlan(prompt: string, musicLengthMs?: number) {
    return getElevenLabsClient().music.compositionPlan.create({
        prompt,
        ...(musicLengthMs !== undefined && { musicLengthMs }),
    });
}

export async function generateMusic(prompt: string, musicLengthMs?: number): Promise<Buffer> {
    const stream = await getElevenLabsClient().music.compose({
        prompt,
        outputFormat: 'mp3_44100_128',
        ...(musicLengthMs !== undefined && { musicLengthMs }),
    });

    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }
    return Buffer.concat(chunks);
}
