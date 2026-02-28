import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import type { MusicPrompt, SongSection } from '@elevenlabs/elevenlabs-js';

const client = new ElevenLabsClient({
    apiKey: import.meta.env.ELEVENLABS_API_KEY,
});

export type GeneratedSection = {
    sectionName: string;
    durationMs: number;
    positiveLocalStyles: string[];
    file: File;
    objectUrl: string; // for immediate <audio> playback
};

export type GenerationResult = {
    prompt: string;
    compositionPlan: MusicPrompt;
    sections: GeneratedSection[];
    generatedAt: number;
};

/**
 * Converts a ReadableStream<Uint8Array> from the ElevenLabs API into a File.
 */
async function streamToFile(stream: ReadableStream<Uint8Array>, fileName: string): Promise<File> {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }

    const blob = new Blob(chunks, { type: 'audio/mpeg' });
    return new File([blob], fileName, { type: 'audio/mpeg' });
}

/**
 * Wraps a single SongSection in a full MusicPrompt so it can be composed individually.
 */
function sectionToPlan(section: SongSection, globalPlan: MusicPrompt): MusicPrompt {
    return {
        positiveGlobalStyles: globalPlan.positiveGlobalStyles,
        negativeGlobalStyles: globalPlan.negativeGlobalStyles,
        sections: [section],
    };
}

/**
 * Generates a full song broken into individually playable section files.
 *
 * Steps:
 * 1. Create a composition plan from the prompt (free, no credits used).
 * 2. For each section in the plan, compose it as a separate audio file.
 * 3. Return an array of GeneratedSection — one File per section.
 *
 * @param prompt - Natural language description of the song to generate.
 * @param musicLengthMs - Optional total song length in ms (3000–600000). ElevenLabs chooses if omitted.
 * @param onSave - Optional async callback called with each section's File as it finishes.
 *                 Use this to hook in Convex uploads without coupling this file to the DB layer.
 */
export async function generateAndSave(
    prompt: string,
    musicLengthMs?: number,
    onSave?: (file: File, section: SongSection, index: number) => Promise<void>
): Promise<GenerationResult> {
    // Step 1: Build composition plan (no credits deducted)
    const compositionPlan = await client.music.compositionPlan.create({
        prompt,
        ...(musicLengthMs !== undefined && { musicLengthMs }),
    });

    // Step 2: Generate each section individually, in parallel
    const sectionResults = await Promise.all(
        compositionPlan.sections.map(async (section, index) => {
            const singleSectionPlan = sectionToPlan(section, compositionPlan);

            const stream = await client.music.compose({ compositionPlan: singleSectionPlan });

            const safeTitle = section.sectionName.replace(/\s+/g, '-').toLowerCase();
            const fileName = `${safeTitle}-${Date.now()}-${index}.mp3`;
            const file = await streamToFile(stream, fileName);
            const objectUrl = URL.createObjectURL(file);

            // Step 3: Auto-save via callback if provided
            if (onSave) {
                await onSave(file, section, index);
            }

            return {
                sectionName: section.sectionName,
                durationMs: section.durationMs,
                positiveLocalStyles: section.positiveLocalStyles,
                file,
                objectUrl,
            } satisfies GeneratedSection;
        })
    );

    return {
        prompt,
        compositionPlan,
        sections: sectionResults,
        generatedAt: Date.now(),
    };
}
