import { pgTable, text, varchar, integer, timestamp } from 'drizzle-orm/pg-core';

// A song (one generation session; groups multiple section files)
export const music = pgTable('music', {
    id:         text('id').primaryKey(),           // UUID generated at song creation
    title:      varchar('title', { length: 255 }),
    artist:     varchar('artist', { length: 255 }),
    uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
});

// Individual audio files belonging to a song
export const musicFiles = pgTable('music_files', {
    id:          text('id').primaryKey(),           // = UploadThing fileKey
    musicId:     text('music_id').notNull().references(() => music.id, { onDelete: 'cascade' }),
    fileKey:     text('file_key').notNull(),
    fileUrl:     text('file_url'),
    mimeType:    text('mime_type'),
    sectionName: varchar('section_name', { length: 100 }),
    position:    integer('position').default(0).notNull(),
    uploadedAt:  timestamp('uploaded_at').defaultNow().notNull(),
});
