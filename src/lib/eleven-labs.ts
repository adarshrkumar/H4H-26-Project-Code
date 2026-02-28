import 'dotenv/config'

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const client = new ElevenLabsClient({ apiKey: import.meta.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY });

export async function generateMusic(prompt: string): Promise<Buffer> {

    // Get raw response with headers
    const { data, rawResponse } = await client.textToSpeech.convert('voice_id', {
        text: 'Hello, world!',
        modelId: 'eleven_multilingual_v2',
    })
    .withRawResponse();

    // Access character cost from headers
    const charCost = rawResponse.headers.get('x-character-count');
    const requestId = rawResponse.headers.get('request-id');

    return data;
}