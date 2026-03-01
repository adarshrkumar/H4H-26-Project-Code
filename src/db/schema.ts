import { pgTable, text, varchar, jsonb, timestamp } from 'drizzle-orm/pg-core';

export interface SongFile {
    fileKey: string;
    fileUrl: string;
}

export const music = pgTable('music', {
    id:         text('id').primaryKey(),
    title:      varchar('title', { length: 255 }),
    artist:     varchar('artist', { length: 255 }),
    files:      jsonb('files').$type<SongFile[]>().notNull().default([]),
    uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
});
