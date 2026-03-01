import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const elevenlabs = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY,
});

export async function generateCompositionPlan(prompt: string, musicLengthMs?: number) {
    return elevenlabs.music.compositionPlan.create({
        prompt,
        ...(musicLengthMs !== undefined && { musicLengthMs }),
    });
}

export async function generateMusic(prompt: string, musicLengthMs?: number): Promise<Buffer> {
    const stream = await elevenlabs.music.compose({
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
