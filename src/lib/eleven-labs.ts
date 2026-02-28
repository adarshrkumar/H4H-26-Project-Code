import { Music } from '@elevenlabs/elevenlabs-js';

const music = new Music({
    apiKey: import.meta.env.ELEVENLABS_API_KEY,
});

/**
 * Generates a single music track from a text prompt.
 * For per-section generation, use generateAndSave() from generate-and-save.ts instead.
 */
export async function generateMusic(prompt: string, musicLengthMs?: number): Promise<Buffer> {
    const stream = await music.compose({
        prompt,
        ...(musicLengthMs !== undefined && { musicLengthMs }),
        outputFormat: 'mp3_44100_128',
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
