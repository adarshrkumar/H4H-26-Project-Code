import { convex } from './initialize';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

export async function createRecording(prompt: string) {
    return await convex.mutation(api.tracks.createTrack, { prompt });
}

export async function updateRecording(
    id: Id<'tracks'>,
    fields: {
        title?: string;
        fileKey?: string;
        fileUrl?: string;
    }
) {
    return await convex.mutation(api.tracks.updateTrack, {
        id,
        title: fields.title,
        uploadThingKey: fields.fileKey,
        uploadThingUrl: fields.fileUrl,
    });
}
