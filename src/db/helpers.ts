import { convex } from './initialize';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

export async function createRecording(prompt: string) {
    return await convex.mutation(api.music.createMusic, { prompt });
}

export async function updateRecording(
    id: Id<'music'>,
    fields: {
        title?: string;
        fileKey?: string;
        fileUrl?: string;
    }
) {
    return await convex.mutation(api.music.updateMusic, {
        id,
        title: fields.title,
        file: fields.fileKey && fields.fileUrl
            ? { key: fields.fileKey, url: fields.fileUrl }
            : undefined,
    });
}
