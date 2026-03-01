import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { getSongWithFiles } from '../src/db/helpers';
import { generateAndSave, GenerateAndSaveError } from '../src/lib/generate-and-save';
import { generateSongBlueprint, generateSectionPlan, type SongBlueprint } from '../src/lib/generate-section-plan';

const app = express();
app.use(cors({ origin: process.env.VITE_APP_URL ?? 'http://localhost:5173' }));
app.use(express.json());

const apiPaths = (path: string) => [`/api${path}`, path];

// Supports both local Express (`/api/...`) and Vercel function mounts (`/...`).
app.get(apiPaths('/track/:id'), async (req, res) => {
    const song = await getSongWithFiles(req.params.id);
    if (!song) { res.status(404).json({ error: 'Track not found' }); return; }
    res.json(song);
});

const blueprintSchema = z.object({
    mood:        z.string().max(200).default(''),
    songStyle:   z.string().max(500).default(''),
    songConcept: z.string().max(500).default(''),
});

app.post(apiPaths('/generate-blueprint'), async (req, res) => {
    const parsed = blueprintSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Invalid request body' }); return; }
    try {
        const blueprint = await generateSongBlueprint(parsed.data);
        res.json(blueprint);
    } catch (err) {
        console.error('[/api/generate-blueprint]', err);
        res.status(500).json({ error: 'Failed to generate song blueprint' });
    }
});

const generateSectionSchema = z.object({
    sectionId:   z.string().min(1).max(50),
    sectionName: z.string().min(1).max(100),
    musicalRole: z.string().min(1).max(500),
    energyValue: z.string().max(200).default(''),
    lyrics:      z.string().max(2000).default(''),
    customText:  z.string().max(1000).default(''),
    songConcept: z.string().max(500).default(''),
    songStyle:   z.string().max(500).default(''),
    mood:        z.string().max(200).default(''),
    musicId:     z.string().max(100).optional(),
    position:    z.number().int().min(0).optional(),
    blueprint: z.object({
        key: z.string(), bpm: z.number().int(),
        coreInstruments: z.array(z.string()), sonicCharacter: z.string(),
    }).optional(),
});

app.post(apiPaths('/generate-section'), async (req, res) => {
    const parsed = generateSectionSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues }); return; }
    const payload = parsed.data;
    let sectionPrompt;
    try {
        sectionPrompt = await generateSectionPlan(payload);
    } catch (err) {
        console.error('[/api/generate-section] plan failed', err);
        res.status(500).json({ error: 'Failed to generate section plan' }); return;
    }
    const blueprint = payload.blueprint as SongBlueprint | undefined;
    const blueprintStyles = blueprint
        ? [`key: ${blueprint.key}`, `tempo: ${blueprint.bpm} BPM`, blueprint.sonicCharacter]
        : [];
    const plan = {
        positiveGlobalStyles: [payload.mood, payload.songStyle, payload.songConcept, ...blueprintStyles].filter(Boolean),
        negativeGlobalStyles: [] as string[],
        prompts: [sectionPrompt],
    };
    try {
        const result = await generateAndSave({
            plan,
            title:       payload.sectionName,
            musicId:     payload.musicId,
            sectionName: payload.sectionName,
            position:    payload.position,
        });
        res.status(201).json(result);
    } catch (err) {
        if (err instanceof GenerateAndSaveError) {
            const details = err.details !== null && typeof err.details === 'object' ? err.details as Record<string, unknown> : {};
            res.status(err.status).json({ error: err.message, ...details }); return;
        }
        console.error('[/api/generate-section]', err);
        res.status(500).json({ error: 'Failed to generate and save section' });
    }
});

const sectionSchema = z.object({
    sectionName:         z.string().min(1).max(100),
    positiveLocalStyles: z.array(z.string()),
    negativeLocalStyles: z.array(z.string()),
    durationMs:          z.number().int().min(3000).max(120000),
    lines:               z.array(z.string()),
});

const planSchema = z.object({
    positiveGlobalStyles: z.array(z.string()),
    negativeGlobalStyles: z.array(z.string()),
    prompts:              z.array(sectionSchema),
});

const generateSchema = z.object({
    text:          z.string().min(1).max(5000).optional(),
    plan:          planSchema.optional(),
    title:         z.string().min(1).max(255).optional(),
    artist:        z.string().min(1).max(255).optional(),
    musicLengthMs: z.number().int().min(3000).max(240000).optional(),
}).refine(d => d.text || d.plan, { message: 'Either text or plan is required' });

app.post(apiPaths('/generate'), async (req, res) => {
    const parsed = generateSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues }); return; }
    try {
        const result = await generateAndSave(parsed.data);
        res.status(201).json(result);
    } catch (err) {
        if (err instanceof GenerateAndSaveError) {
            const details = err.details !== null && typeof err.details === 'object' ? err.details as Record<string, unknown> : {};
            res.status(err.status).json({ error: err.message, ...details }); return;
        }
        console.error('[/api/generate]', err);
        res.status(500).json({ error: 'Failed to generate and save' });
    }
});

export default app;
