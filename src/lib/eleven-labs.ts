import 'dotenv/config'

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

import config from './config';

const client = new ElevenLabsClient({ apiKey: (import.meta as unknown as { env: Record<string, string> }).env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY });

export async function generateMusic(prompt: string): Promise<Buffer> {
    const data = await client.textToSpeech.convert(config.voice_id, {
        text: prompt,
        modelId: config.model_id,
    });

    const chunks: Uint8Array[] = [];
    const reader = data.getReader();
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }
    return Buffer.concat(chunks);
}

// import { generateMusic } from './eleven-labs';