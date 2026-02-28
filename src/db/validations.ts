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

export type CreateTrackInput = z.infer<typeof createTrackSchema>;
export type UpdateTrackInput = z.infer<typeof updateTrackSchema>;
export type TrackQueryInput = z.infer<typeof trackQuerySchema>;
