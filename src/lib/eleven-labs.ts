import 'dotenv/config'

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const client = new ElevenLabsClient({ apiKey: import.meta.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY });

export async function generateMusic(prompt: string): Promise<Buffer> {

    // Get raw response with headers
    const { data, rawResponse } = await client.textToSpeech.convert('voice_id', {
        text: prompt,
        modelId: 'eleven_multilingual_v2',
    })
    .withRawResponse();

    const chunks: Uint8Array[] = [];
    const reader = data.getReader();
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }
    return Buffer.concat(chunks);
}