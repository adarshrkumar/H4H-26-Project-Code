/**
 * AI Service
 * Centralised wrapper around the Vercel AI SDK using the AI Gateway provider.
 * Requires OPENAI_API_KEY (and optionally a VERCEL_API_KEY) in environment variables.
 */

import { createGateway } from '@ai-sdk/gateway';
import { generateText, streamText, generateObject } from 'ai';
import type { ModelMessage } from 'ai';
import { z } from 'zod';
import config from '@/lib/config';

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

function getApiKey(name: string): string | undefined {
    // Astro server-side env first, then Node process.env
    return (import.meta.env as Record<string, string | undefined>)[name] ?? process.env[name];
}

/**
 * Gateway provider instance.
 * When a VERCEL_API_KEY is present the managed Vercel AI Gateway is used.
 * Otherwise the gateway falls back to the BYOK (bring-your-own-key) mode,
 * forwarding OPENAI_API_KEY directly to OpenAI via the gateway.
 */
export const ai = createGateway({
    apiKey: getApiKey('VERCEL_API_KEY'),
    ...(getApiKey('OPENAI_API_KEY') && {
        headers: {
            // BYOK: pass the OpenAI key so the gateway can forward requests
            'x-ai-byok-openai': getApiKey('OPENAI_API_KEY')!,
        },
    }),
});

const { defaultModel: DEFAULT_MODEL, systemPrompt: DEFAULT_SYSTEM_PROMPT } = config.ai;

// ---------------------------------------------------------------------------
// Text generation
// ---------------------------------------------------------------------------

export interface GenerateOptions {
    model?: string;
    system?: string;
    maxTokens?: number;
    temperature?: number;
}

/**
 * Generate a single text completion.
 */
export async function generate(
    prompt: string,
    options: GenerateOptions = {},
): Promise<string> {
    const { model = DEFAULT_MODEL, system = DEFAULT_SYSTEM_PROMPT, maxTokens, temperature } = options;
    const { text } = await generateText({
        model: ai(model),
        prompt,
        system,
        maxOutputTokens: maxTokens,
        temperature,
    });
    return text;
}

/**
 * Generate a text completion from a conversation history.
 */
export async function chat(
    messages: ModelMessage[],
    options: GenerateOptions = {},
): Promise<string> {
    const { model = DEFAULT_MODEL, system = DEFAULT_SYSTEM_PROMPT, maxTokens, temperature } = options;
    const { text } = await generateText({
        model: ai(model),
        messages,
        system,
        maxOutputTokens: maxTokens,
        temperature,
    });
    return text;
}

// ---------------------------------------------------------------------------
// Streaming
// ---------------------------------------------------------------------------

export interface StreamOptions extends GenerateOptions {
    onChunk?: (chunk: string) => void;
}

/**
 * Stream a text completion, yielding each chunk as it arrives.
 */
export async function* stream(
    prompt: string,
    options: StreamOptions = {},
): AsyncGenerator<string> {
    const { model = DEFAULT_MODEL, system = DEFAULT_SYSTEM_PROMPT, maxTokens, temperature } = options;
    const result = streamText({
        model: ai(model),
        prompt,
        system,
        maxOutputTokens: maxTokens,
        temperature,
    });
    for await (const chunk of result.textStream) {
        yield chunk;
    }
}

// ---------------------------------------------------------------------------
// Structured output
// ---------------------------------------------------------------------------

/**
 * Generate a structured object validated against a Zod schema.
 *
 * @example
 * const schema = z.object({ title: z.string(), tags: z.array(z.string()) });
 * const result = await structured('Describe jazz music', schema);
 */
export async function structured<T extends z.ZodTypeAny>(
    prompt: string,
    schema: T,
    options: GenerateOptions = {},
): Promise<z.infer<T>> {
    const { model = DEFAULT_MODEL, system = DEFAULT_SYSTEM_PROMPT, maxTokens, temperature } = options;
    const { object } = await generateObject({
        model: ai(model),
        prompt,
        schema,
        system,
        maxOutputTokens: maxTokens,
        temperature,
    });
    return object;
}
