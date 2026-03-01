import { convex } from './initialize';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

export async function saveTrack(fields: {
    id: string;
    title?: string;
    artist?: string;
    mimeType?: string;
    fileKey?: string;
    fileUrl?: string;
}) {
    return await convex.mutation(api.music.createMusic, {
        id: fields.id,
        title: fields.title,
        artist: fields.artist,
        mimeType: fields.mimeType,
        ...(fields.fileKey && fields.fileUrl
            ? { file: { key: fields.fileKey, url: fields.fileUrl } }
            : {}),
    });
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
