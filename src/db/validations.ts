import { z } from 'zod';

export const createMusicSchema = z.object({
    id: z.string().min(1, 'Music ID is required'),
    title: z.string().min(1).max(255).trim().optional().nullable(),
    prompt: z.string().min(1).max(5000).trim().optional().nullable(),
    artist: z.string().max(255).optional().nullable(),
    duration: z.number().positive().optional().nullable(),
    file: z.object({
        key: z.string(),
        url: z.string().url(),
    }).optional().nullable(),
    source: z.string().max(255).optional().nullable(),
    mimeType: z.string().min(1).optional().nullable(),
});

export const updateMusicSchema = createMusicSchema.partial().extend({
    id: z.string().min(1, 'Music ID is required'),
});

export const musicQuerySchema = z.object({
    artist: z.string().optional(),
});

export type CreateMusicInput = z.infer<typeof createMusicSchema>;
export type UpdateMusicInput = z.infer<typeof updateMusicSchema>;
export type MusicQueryInput = z.infer<typeof musicQuerySchema>;
