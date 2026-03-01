import 'dotenv/config';
import { generateObject } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import type { SectionPrompt } from './generate-and-save';

export interface GenerateSectionPlanInput {
    sectionId: string;
    sectionName: string;
    musicalRole: string;
    energyValue: string;
    lyrics: string;
    customText: string;
    songConcept: string;
    songStyle: string;
    mood: string;
}

const sectionPromptSchema = z.object({
    positiveLocalStyles: z.array(z.string()).describe('3-5 musical direction strings for this section'),
    negativeLocalStyles: z.array(z.string()).describe('2-3 things to avoid in this section'),
    durationMs: z.number().int().min(3000).max(120000).describe('appropriate duration in milliseconds for this section'),
    lines: z.array(z.string()).describe('formatted lyric lines for this section'),
});

function getAnthropic() {
    const apiKey =
        (import.meta as unknown as { env: Record<string, string> }).env?.ANTHROPIC_API_KEY ??
        process.env.ANTHROPIC_API_KEY;
    return createAnthropic({ apiKey });
}

export async function generateSectionPlan(input: GenerateSectionPlanInput): Promise<SectionPrompt> {
    const anthropic = getAnthropic();

    const contextParts: string[] = [];
    if (input.mood) contextParts.push(`mood: ${input.mood}`);
    if (input.songStyle) contextParts.push(`style: ${input.songStyle}`);
    if (input.songConcept) contextParts.push(`concept: ${input.songConcept}`);

    const userParts: string[] = [];
    if (input.energyValue) userParts.push(`energy: ${input.energyValue}`);
    if (input.customText) userParts.push(`additional details: ${input.customText}`);
    if (input.lyrics) userParts.push(`lyrics:\n${input.lyrics}`);

    const prompt = `You are a professional music composer and lyricist. Generate a structured musical plan for a single song section.

Song context: ${contextParts.length > 0 ? contextParts.join(', ') : 'no specific context'}

Section: ${input.sectionName}
Musical role: ${input.musicalRole}
${userParts.length > 0 ? '\nUser inputs:\n' + userParts.join('\n') : ''}

Generate:
- positiveLocalStyles: 3-5 specific musical directions for this section (instruments, techniques, dynamics, feel). Be concrete and actionable.
- negativeLocalStyles: 2-3 specific things to avoid in this section.
- durationMs: Appropriate duration in milliseconds. Typical: intro 15000-30000, verse 30000-45000, chorus 20000-35000, bridge 15000-25000, outro 15000-30000.
- lines: The lyric lines to sing. Use the provided lyrics if given, otherwise generate fitting lyrics. Each line should be a separate string.`;

    const { object } = await generateObject({
        model: anthropic('claude-haiku-4-5-20251001'),
        schema: sectionPromptSchema,
        prompt,
    });

    return {
        sectionName: input.sectionName,
        positiveLocalStyles: object.positiveLocalStyles,
        negativeLocalStyles: object.negativeLocalStyles,
        durationMs: object.durationMs,
        lines: object.lines,
    };
}
