import { Music, ElevenLabsError } from '@elevenlabs/elevenlabs-js';
import type { MusicPrompt, SongSection } from '@elevenlabs/elevenlabs-js';

// Use the Music wrapper class directly — client.music returns the generated MusicClient
// which gives ReadableStream, while Music.composeDetailed() returns MultipartResponse (Buffer + metadata).
const music = new Music({
    apiKey: import.meta.env.ELEVENLABS_API_KEY,
});

// mp3_44100_128 = 44.1kHz, 128kbps — good quality, broad browser support
const OUTPUT_FORMAT = 'mp3_44100_128' as const;

// --- Error types -----------------------------------------------------------

/**
 * Thrown when the prompt contains a banned artist name or copyrighted lyrics.
 * The `suggestion` field contains an ElevenLabs-provided clean alternative.
 * Re-throw or surface this to the UI so the user can adjust their prompt.
 */
export class CopyrightPromptError extends Error {
    readonly suggestion: string | null;
    constructor(message: string, suggestion: string | null) {
        super(message);
        this.name = 'CopyrightPromptError';
        this.suggestion = suggestion;
    }
}

/**
 * Thrown when a section's style descriptors contain copyrighted material.
 * The `sectionName` identifies which section failed.
 * The `suggestedPlan` is the ElevenLabs-corrected composition plan.
 */
export class CopyrightPlanError extends Error {
    readonly sectionName: string;
    readonly suggestedPlan: MusicPrompt | null;
    constructor(message: string, sectionName: string, suggestedPlan: MusicPrompt | null) {
        super(message);
        this.name = 'CopyrightPlanError';
        this.sectionName = sectionName;
        this.suggestedPlan = suggestedPlan;
    }
}

// --- Helpers ---------------------------------------------------------------

/**
 * Extracts the `error` code and any suggestion fields from an ElevenLabsError body.
 * The SDK types BadRequestErrorBody as { error?, message? } but the actual API
 * response also includes prompt_suggestion / composition_plan_suggestion.
 */
function parseErrorBody(err: ElevenLabsError): {
    code: string | null;
    promptSuggestion: string | null;
    planSuggestion: MusicPrompt | null;
} {
    const body = err.body as Record<string, unknown> | null | undefined;
    return {
        code: (body?.error as string) ?? null,
        promptSuggestion: (body?.prompt_suggestion as string) ?? null,
        planSuggestion: (body?.composition_plan_suggestion as MusicPrompt) ?? null,
    };
}

/**
 * Wraps a single SongSection in a full MusicPrompt for individual composition.
 */
function sectionToPlan(section: SongSection, globalPlan: MusicPrompt): MusicPrompt {
    return {
        positiveGlobalStyles: globalPlan.positiveGlobalStyles,
        negativeGlobalStyles: globalPlan.negativeGlobalStyles,
        sections: [section],
    };
}

// --- Types -----------------------------------------------------------------

export type GeneratedSection = {
    sectionName: string;
    durationMs: number;
    positiveLocalStyles: string[];
    /** Suggested filename from ElevenLabs (e.g. "intro-cool-track.mp3") */
    filename: string;
    /** Song title/genres returned by ElevenLabs for this section */
    metadata: {
        title: string;
        description: string;
        genres: string[];
        languages: string[];
    };
    /** Raw audio buffer — convert to File on the server, or base64 for transport */
    audioBuffer: Buffer;
};

export type GenerationResult = {
    prompt: string;
    compositionPlan: MusicPrompt;
    sections: GeneratedSection[];
    generatedAt: number;
};

// --- Main export -----------------------------------------------------------

/**
 * Generates a full song split into individually playable section files.
 *
 * Steps:
 * 1. Create a composition plan from the prompt (free — no credits used).
 * 2. For each section in the plan, call composeDetailed() — returns audio Buffer + metadata.
 * 3. Optionally auto-save each section via the onSave callback.
 *
 * Constraints (from ElevenLabs API):
 * - musicLengthMs per section: 3,000ms – 600,000ms
 * - Section durationMs: 3,000ms – 120,000ms
 * - Output format: mp3_44100_128 (44.1kHz, 128kbps)
 *
 * @throws {CopyrightPromptError} If the prompt contains a banned artist name or lyrics.
 *   Check `error.suggestion` for a clean alternative prompt from ElevenLabs.
 * @throws {CopyrightPlanError} If a section's styles contain copyrighted material.
 *   Check `error.suggestedPlan` for a corrected composition plan.
 *
 * @param prompt - Natural language description of the song to generate.
 * @param musicLengthMs - Optional total song length in ms. ElevenLabs chooses if omitted.
 * @param onSave - Optional async callback for each section. Receives a File object ready for
 *                 upload, plus the section metadata. Hook in Convex uploads here to avoid
 *                 coupling this file to the DB layer.
 */
export async function generateAndSave(
    prompt: string,
    musicLengthMs?: number,
    onSave?: (file: File, section: GeneratedSection, index: number) => Promise<void>
): Promise<GenerationResult> {
    // Step 1: Build composition plan (no credits deducted)
    let compositionPlan: MusicPrompt;
    try {
        compositionPlan = await music.compositionPlan.create({
            prompt,
            ...(musicLengthMs !== undefined && { musicLengthMs }),
        });
    } catch (err) {
        if (err instanceof ElevenLabsError) {
            const { code, promptSuggestion } = parseErrorBody(err);
            if (code === 'bad_prompt') {
                throw new CopyrightPromptError(
                    `Prompt contains copyrighted material. ${promptSuggestion ? 'A suggestion is available.' : 'No suggestion provided (harmful content).'}`,
                    promptSuggestion
                );
            }
        }
        throw err;
    }

    // Step 2: Generate each section individually in parallel
    const sections = await Promise.all(
        compositionPlan.sections.map(async (section: SongSection, index: number) => {
            const singleSectionPlan = sectionToPlan(section, compositionPlan);

            let audio: Buffer;
            let filename: string;
            let json: { songMetadata: { title?: string; description?: string; genres: string[]; languages: string[] } };

            try {
                ({ audio, filename, json } = await music.composeDetailed({
                    compositionPlan: singleSectionPlan,
                    outputFormat: OUTPUT_FORMAT,
                }));
            } catch (err) {
                if (err instanceof ElevenLabsError) {
                    const { code, planSuggestion } = parseErrorBody(err);
                    if (code === 'bad_composition_plan') {
                        throw new CopyrightPlanError(
                            `Section "${section.sectionName}" contains copyrighted style descriptors. ${planSuggestion ? 'A corrected plan is available.' : 'No suggestion provided (harmful content).'}`,
                            section.sectionName,
                            planSuggestion
                        );
                    }
                }
                throw err;
            }

            const generatedSection: GeneratedSection = {
                sectionName: section.sectionName,
                durationMs: section.durationMs,
                positiveLocalStyles: section.positiveLocalStyles,
                filename,
                metadata: {
                    title: json.songMetadata.title ?? section.sectionName,
                    description: json.songMetadata.description ?? '',
                    genres: json.songMetadata.genres,
                    languages: json.songMetadata.languages,
                },
                audioBuffer: audio,
            };

            // Step 3: Auto-save via callback if provided
            if (onSave) {
                const file = new File([new Uint8Array(audio)], filename, { type: 'audio/mpeg' });
                await onSave(file, generatedSection, index);
            }

            return generatedSection;
        })
    );

    return {
        prompt,
        compositionPlan,
        sections,
        generatedAt: Date.now(),
    };
}

/**
 * Converts a GeneratedSection's audioBuffer into a File object.
 * Use this in API routes before returning data to the browser.
 */
export function sectionToFile(section: GeneratedSection): File {
    return new File([new Uint8Array(section.audioBuffer)], section.filename, { type: 'audio/mpeg' });
}
