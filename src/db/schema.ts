import { pgTable, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const music = pgTable('music', {
    id: text('id').primaryKey(),
    title: text('title'),
    prompt: text('prompt'),
    artist: text('artist'),
    duration: integer('duration'),
    file: jsonb('file'),
    source: text('source'),
    mimeType: text('mime_type'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
