import { z } from 'zod';

export const createTrackSchema = z.object({
    title: z.string().min(1).max(255).trim().optional().nullable(),
    prompt: z.string().min(1).max(5000).trim().optional().nullable(),
    artist: z.string().max(255).optional().nullable(),
    album: z.string().max(255).optional().nullable(),
    duration: z.number().positive().optional().nullable(),
    storageId: z.string().optional().nullable(),
    uploadThingKey: z.string().optional().nullable(),
    uploadThingUrl: z.string().url().optional().nullable(),
    source: z.string().max(255).optional().nullable(),
    mimeType: z.string().min(1).optional().nullable(),
});

export const updateTrackSchema = createTrackSchema.partial().extend({
    id: z.string().min(1, 'Track ID is required'),
});

export const trackQuerySchema = z.object({
    artist: z.string().optional(),
});

export type CreateTrackInput = z.infer<typeof createTrackSchema>;
export type UpdateTrackInput = z.infer<typeof updateTrackSchema>;
export type TrackQueryInput = z.infer<typeof trackQuerySchema>;
