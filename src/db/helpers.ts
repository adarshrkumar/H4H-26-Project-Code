import { db } from './initialize';
import { music } from './schema';
import { eq, sql } from 'drizzle-orm';

export async function saveSong(fields: {
    id: string;
    title?: string;
    artist?: string;
}) {
    return db
        .insert(music)
        .values({ id: fields.id, title: fields.title, artist: fields.artist, files: [] })
        .onConflictDoUpdate({
            target: music.id,
            set: { title: fields.title, artist: fields.artist },
        });
}

export async function addFileToSong(fields: {
    musicId: string;
    fileKey: string;
    fileUrl?: string;
}) {
    const entry = JSON.stringify([{ fileKey: fields.fileKey, fileUrl: fields.fileUrl ?? '' }]);
    return db
        .update(music)
        .set({ files: sql`files || ${entry}::jsonb` })
        .where(eq(music.id, fields.musicId));
}

export async function getSongWithFiles(musicId: string) {
    const [song] = await db.select().from(music).where(eq(music.id, musicId)).limit(1);
    return song ?? null;
}
