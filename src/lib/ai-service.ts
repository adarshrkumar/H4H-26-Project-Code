import { generateText, generateObject } from 'ai';
import type { LanguageModel } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

// Use Vercel AI Gateway if API key is available, otherwise fall back to direct OpenAI
const getModel = (): LanguageModel => {
    const vercelApiKey = (import.meta.env as Record<string, string | undefined>)?.AI_GATEWAY_API_KEY || process.env.AI_GATEWAY_API_KEY;
    const openaiApiKey = (import.meta.env as Record<string, string | undefined>)?.OPENAI_API_KEY || process.env.OPENAI_API_KEY;

    if (vercelApiKey) {
        // Use Vercel AI Gateway
        return createOpenAI({
            apiKey: vercelApiKey,
            baseURL: 'https://ai-gateway.vercel.sh/v3/ai',
        })('gpt-4o-mini');
    }

    if (openaiApiKey) {
        // Use direct OpenAI
        return createOpenAI({
            apiKey: openaiApiKey,
        })('gpt-4o-mini');
    }

    throw new Error('Either AI_GATEWAY_API_KEY or OPENAI_API_KEY must be set');
};

const model: LanguageModel = getModel();

/**
 * Generate text using AI
 */
export async function generateAIText(
    prompt: string,
    options?: {
        maxTokens?: number;
        temperature?: number;
    }
): Promise<string> {
    try {
        const {
            text,
        } = await generateText({
            model,
            prompt,
            temperature: options?.temperature ?? 0.7,
        });

        return text;
    } catch (err) {
        console.error('[ai-service] generateAIText error:', err);
        throw new Error('Failed to generate text');
    }
}

/**
 * Generate structured data using AI
 */
export async function generateAIObject<T extends z.ZodType>(
    prompt: string,
    schema: T,
    options?: {
        maxTokens?: number;
        temperature?: number;
    }
): Promise<z.infer<T>> {
    try {
        const {
            object,
        } = await generateObject({
            model,
            prompt,
            schema,
            temperature: options?.temperature ?? 0.7,
        });

        return object;
    } catch (err) {
        console.error('[ai-service] generateAIObject error:', err);
        throw new Error('Failed to generate structured data');
    }
}

/**
 * Analyze mood from text
 */
export async function analyzeTextMood(
    text: string
): Promise<{
    mood: string;
    confidence: number;
    analysis: string;
}> {
    const schema = z.object({
        mood: z.string().describe('The dominant mood or emotion'),
        confidence: z.number().min(0).max(1).describe('Confidence score 0-1'),
        analysis: z.string().describe('Brief analysis of the mood'),
    });

    const result = await generateAIObject(
        `Analyze the mood/emotion in this text: "${text}"`,
        schema
    );

    return result;
}

/**
 * Generate a music prompt description
 */
export async function generateMusicPromptDescription(
    userPrompt: string
): Promise<string> {
    const description = await generateAIText(
        `Based on this music description: "${userPrompt}", expand it into a detailed music generation prompt for an AI music generator. Make it descriptive and specific about the genre, mood, instruments, and style.`,
        {
            temperature: 0.8,
        }
    );

    return description;
}

/**
 * Generate song metadata
 */
export async function generateSongMetadata(
    prompt: string
): Promise<{
    title: string;
    artist: string;
    genre: string;
    description: string;
}> {
    const schema = z.object({
        title: z.string().describe('Song title'),
        artist: z.string().describe('Artist name'),
        genre: z.string().describe('Music genre'),
        description: z.string().describe('Short description of the song'),
    });

    const result = await generateAIObject(
        `Generate metadata for a song based on this prompt: "${prompt}"`,
        schema
    );

    return result;
}

/**
 * Generate song lyrics
 */
export async function generateSongLyrics(
    prompt: string,
    options?: {
        verses?: number;
        chorus?: boolean;
    }
): Promise<string> {
    const verseCount = options?.verses ?? 2;
    const hasChorus = options?.chorus ?? true;

    const lyricsPrompt = `Generate original song lyrics based on this prompt: "${prompt}"

    Requirements:
    - Number of verses: ${verseCount}
    - Include chorus: ${hasChorus}
    - Make the lyrics poetic and meaningful
    - Ensure the lyrics fit the mood/theme of the prompt

    Format the output clearly with [Verse 1], [Chorus], etc.`;

    const lyrics = await generateAIText(
        lyricsPrompt,
        {
            temperature: 0.9,
        }
    );

    return lyrics;
}
