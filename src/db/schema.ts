import { pgTable, text, varchar, timestamp } from 'drizzle-orm/pg-core';

export const music = pgTable('music', {
    id:        text('id').primaryKey(),
    title:     varchar('title', { length: 255 }),
    artist:    varchar('artist', { length: 255 }),
    mimeType:  text('mime_type'),
    fileKey:   text('file_key'),
    fileUrl:   text('file_url'),
    uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
});
