import { db } from './initialize';
import { music } from './schema';
import { eq } from 'drizzle-orm';
import type { CreateMusicInput, UpdateMusicInput } from './validations';

export async function createRecording(data: CreateMusicInput) {
    return await db.insert(music).values(data).returning();
}

export async function updateRecording(
    id: string,
    fields: Partial<CreateMusicInput>
) {
    return await db
        .update(music)
        .set({ ...fields, updatedAt: new Date() })
        .where(eq(music.id, id))
        .returning();
}

export async function getRecording(id: string) {
    return await db.query.music.findFirst({
        where: eq(music.id, id),
    });
}

export async function deleteRecording(id: string) {
    return await db.delete(music).where(eq(music.id, id)).returning();
}
