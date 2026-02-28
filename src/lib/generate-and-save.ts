import 'dotenv/config';
import { Music } from '@elevenlabs/elevenlabs-js';
import type { MusicPrompt, SongSection } from '@elevenlabs/elevenlabs-js';

// Lazy client — initialized on first use so the API key is read at request time,
// not at module-load time when import.meta.env may not be populated yet.
let _music: Music | null = null;
function getMusic(): Music {
    if (!_music) {
        const apiKey =
            (import.meta as unknown as { env: Record<string, string> }).env?.ELEVENLABS_API_KEY ??
            process.env.ELEVENLABS_API_KEY;
        _music = new Music({ apiKey });
    }
    return _music;
}

// mp3_44100_128 = 44.1kHz, 128kbps — good quality, broad browser support
const OUTPUT_FORMAT = 'mp3_44100_128' as const;

// --- Error types -----------------------------------------------------------

/**
 * Thrown when the prompt contains a banned artist name or copyrighted lyrics.
 * The `suggestion` field contains an ElevenLabs-provided clean alternative.
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
 * Duck-types an unknown error as an ElevenLabs API error.
 * Avoids instanceof which breaks under Vite's CJS/ESM interop.
 */
function isElevenLabsError(err: unknown): err is { statusCode: number; body: Record<string, unknown> } {
    return (
        err !== null &&
        typeof err === 'object' &&
        'statusCode' in err &&
        'body' in err &&
        typeof (err as Record<string, unknown>).body === 'object'
    );
}

function parseErrorBody(err: { body: Record<string, unknown> }): {
    code: string | null;
    promptSuggestion: string | null;
    planSuggestion: MusicPrompt | null;
} {
    const body = err.body;
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
 * - musicLengthMs: 3,000ms – 600,000ms
 * - Section durationMs: 3,000ms – 120,000ms
 * - Output format: mp3_44100_128 (44.1kHz, 128kbps)
 *
 * @throws {CopyrightPromptError} If the prompt contains a banned artist name or lyrics.
 * @throws {CopyrightPlanError} If a section's styles contain copyrighted material.
 *
 * @param prompt - Natural language description of the song to generate.
 * @param musicLengthMs - Optional total song length in ms. ElevenLabs chooses if omitted.
 * @param onSave - Optional callback called with each section's File as it finishes.
 */
export async function generateAndSave(
    prompt: string,
    musicLengthMs?: number,
    onSave?: (file: File, section: GeneratedSection, index: number) => Promise<void>
): Promise<GenerationResult> {
    // Step 1: Build composition plan (no credits deducted)
    let compositionPlan: MusicPrompt;
    try {
        compositionPlan = await getMusic().compositionPlan.create({
            prompt,
            ...(musicLengthMs !== undefined && { musicLengthMs }),
        });
    } catch (err) {
        if (isElevenLabsError(err)) {
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
                ({ audio, filename, json } = await getMusic().composeDetailed({
                    compositionPlan: singleSectionPlan,
                    outputFormat: OUTPUT_FORMAT,
                }));
            } catch (err) {
                if (isElevenLabsError(err)) {
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
