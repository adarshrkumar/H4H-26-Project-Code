import { db } from './initialize';
import { music } from './schema';

export async function saveTrack(fields: {
    id: string;
    title?: string;
    artist?: string;
    mimeType?: string;
    fileKey?: string;
    fileUrl?: string;
}) {
    return await db
        .insert(music)
        .values({
            id:       fields.id,
            title:    fields.title,
            artist:   fields.artist,
            mimeType: fields.mimeType,
            fileKey:  fields.fileKey,
            fileUrl:  fields.fileUrl,
        })
        .onConflictDoUpdate({
            target: music.id,
            set: {
                title:    fields.title,
                artist:   fields.artist,
                mimeType: fields.mimeType,
                fileKey:  fields.fileKey,
                fileUrl:  fields.fileUrl,
            },
        });
}
