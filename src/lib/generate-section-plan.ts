import { z } from 'zod';
import { structured } from './ai-service';
import type { SectionPrompt } from './generate-and-save';

// ── Song Blueprint ─────────────────────────────────────────────────────────────

const blueprintSchema = z.object({
    key:             z.string().describe('Musical key, e.g. "A minor" or "C major"'),
    bpm:             z.number().int().min(60).max(200).describe('Tempo in beats per minute'),
    coreInstruments: z.array(z.string()).describe('3-5 instruments that appear throughout the entire song'),
    sonicCharacter:  z.string().describe('1-2 sentence description of the overall sonic identity of the song'),
});

export type SongBlueprint = z.infer<typeof blueprintSchema>;

export async function generateSongBlueprint(input: {
    mood: string;
    songStyle: string;
    songConcept: string;
}): Promise<SongBlueprint> {
    const context = [
        input.mood       && `mood: ${input.mood}`,
        input.songStyle  && `style: ${input.songStyle}`,
        input.songConcept && `concept: ${input.songConcept}`,
    ].filter(Boolean).join(', ') || 'no specific context';

    const prompt = `You are a music producer defining the shared musical identity for a full song before individual sections are written.

Song context: ${context}

Define the consistent musical blueprint that ALL sections of this song must follow:
- key: The musical key the entire song stays in (e.g. "A minor", "E major")
- bpm: A single tempo in BPM that the entire song uses
- coreInstruments: 3-5 instruments that appear consistently across all sections (the sonic backbone)
- sonicCharacter: 1-2 sentences describing the overall sound and feel that ties every section together

Be specific and concrete. This blueprint will be used to ensure all sections feel like one cohesive song.`;

    return await structured(prompt, blueprintSchema, { temperature: 0.7 });
}

// ── Section Plan ───────────────────────────────────────────────────────────────

export interface GenerateSectionPlanInput {
    sectionId:   string;
    sectionName: string;
    musicalRole: string;
    energyValue: string;
    lyrics:      string;
    customText:  string;
    songConcept: string;
    songStyle:   string;
    mood:        string;
    blueprint?:  SongBlueprint;
}

const sectionPromptSchema = z.object({
    positiveLocalStyles: z.array(z.string()).describe('3-5 musical direction strings for this section'),
    negativeLocalStyles: z.array(z.string()).describe('2-3 things to avoid in this section'),
    durationMs:          z.number().int().min(3000).max(120000).describe('appropriate duration in milliseconds for this section'),
    lines:               z.array(z.string()).describe('formatted lyric lines for this section'),
});

export async function generateSectionPlan(input: GenerateSectionPlanInput): Promise<SectionPrompt> {
    console.log('[generate-section-plan] start', {
        sectionId:  input.sectionId,
        sectionName: input.sectionName,
        mood:        input.mood,
        energyValue: input.energyValue,
        hasLyrics:   !!input.lyrics,
        hasConcept:  !!input.songConcept,
        hasStyle:    !!input.songStyle,
        hasBlueprint: !!input.blueprint,
    });

    const contextParts: string[] = [];
    if (input.mood)        contextParts.push(`mood: ${input.mood}`);
    if (input.songStyle)   contextParts.push(`style: ${input.songStyle}`);
    if (input.songConcept) contextParts.push(`concept: ${input.songConcept}`);

    const userParts: string[] = [];
    if (input.energyValue) userParts.push(`energy: ${input.energyValue}`);
    if (input.customText)  userParts.push(`additional details: ${input.customText}`);
    if (input.lyrics)      userParts.push(`lyrics:\n${input.lyrics}`);

    const blueprintBlock = input.blueprint ? `
Song blueprint (MUST be respected to keep all sections sounding like one cohesive song):
- Key: ${input.blueprint.key}
- BPM: ${input.blueprint.bpm}
- Core instruments (use these throughout): ${input.blueprint.coreInstruments.join(', ')}
- Sonic character: ${input.blueprint.sonicCharacter}
` : '';

    const prompt = `You are a professional music composer and lyricist. Generate a structured musical plan for a single section of a song.

Song context: ${contextParts.length > 0 ? contextParts.join(', ') : 'no specific context'}
${blueprintBlock}
Section: ${input.sectionName}
Musical role: ${input.musicalRole}
${userParts.length > 0 ? '\nUser inputs:\n' + userParts.join('\n') : ''}

Generate:
- positiveLocalStyles: 3-5 specific musical directions for THIS section (dynamics, feel, how the core instruments are used here). Must stay consistent with the song blueprint above.
- negativeLocalStyles: 2-3 specific things to avoid in this section.
- durationMs: Appropriate duration in milliseconds. Typical: intro 15000-30000, verse 30000-45000, chorus 20000-35000, bridge 15000-25000, outro 15000-30000.
- lines: The lyric lines to sing. Use the provided lyrics if given, otherwise generate fitting lyrics. Each line should be a separate string.`;

    let object: z.infer<typeof sectionPromptSchema>;
    try {
        object = await structured(prompt, sectionPromptSchema, { temperature: 1 });
        console.log('[generate-section-plan] structured output', JSON.stringify(object, null, 2));
    } catch (err) {
        console.error('[generate-section-plan] structured() failed', err);
        throw err;
    }

    return {
        sectionName:         input.sectionName,
        positiveLocalStyles: object.positiveLocalStyles,
        negativeLocalStyles: object.negativeLocalStyles,
        durationMs:          object.durationMs,
        lines:               object.lines,
    };
}
