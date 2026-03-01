import { db } from './initialize';
import { music, musicFiles } from './schema';
import { eq } from 'drizzle-orm';

export async function saveSong(fields: {
    id: string;
    title?: string;
    artist?: string;
}) {
    return db
        .insert(music)
        .values({ id: fields.id, title: fields.title, artist: fields.artist })
        .onConflictDoUpdate({
            target: music.id,
            set: { title: fields.title, artist: fields.artist },
        });
}

export async function addFileToSong(fields: {
    id: string;           // fileKey (used as PK)
    musicId: string;
    fileKey: string;
    fileUrl?: string;
    mimeType?: string;
    sectionName?: string;
    position?: number;
}) {
    return db
        .insert(musicFiles)
        .values({
            id:          fields.id,
            musicId:     fields.musicId,
            fileKey:     fields.fileKey,
            fileUrl:     fields.fileUrl,
            mimeType:    fields.mimeType,
            sectionName: fields.sectionName,
            position:    fields.position ?? 0,
        })
        .onConflictDoUpdate({
            target: musicFiles.id,
            set: {
                fileUrl:     fields.fileUrl,
                mimeType:    fields.mimeType,
                sectionName: fields.sectionName,
                position:    fields.position ?? 0,
            },
        });
}

export async function getSongWithFiles(musicId: string) {
    const [song] = await db.select().from(music).where(eq(music.id, musicId)).limit(1);
    if (!song) return null;
    const files = await db
        .select()
        .from(musicFiles)
        .where(eq(musicFiles.musicId, musicId))
        .orderBy(musicFiles.position);
    return { ...song, files };
}
