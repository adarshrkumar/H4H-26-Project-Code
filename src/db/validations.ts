import { z } from 'zod';

export const createTrackSchema = z.object({
    title: z.string().min(1, 'Title is required').max(255).trim(),
    artist: z.string().max(255).optional().nullable(),
    album: z.string().max(255).optional().nullable(),
    duration: z.number().positive().optional().nullable(),
    storageId: z.string().optional().nullable(),
    mimeType: z.string().min(1, 'MIME type is required'),
});

export const updateTrackSchema = createTrackSchema.partial().extend({
    id: z.string().min(1, 'Track ID is required'),
});

export const trackQuerySchema = z.object({
    artist: z.string().optional(),
});

export const createAnalysisSchema = z.object({
    trackId: z.string().min(1, 'Track ID is required'),
    mood: z.string().min(1),
    color: z.string().min(1),
    energy: z.number().min(0).max(1),
    brightness: z.number().min(0).max(1),
    tempo: z.number().min(0).max(1),
    flux: z.number().min(0),
    spread: z.number().min(0).max(1),
    flatness: z.number().min(0).max(1),
    bassRatio: z.number().min(0).max(1),
    zcr: z.number().min(0).max(1),
});

export type CreateTrackInput = z.infer<typeof createTrackSchema>;
export type UpdateTrackInput = z.infer<typeof updateTrackSchema>;
export type TrackQueryInput = z.infer<typeof trackQuerySchema>;
export type CreateAnalysisInput = z.infer<typeof createAnalysisSchema>;
