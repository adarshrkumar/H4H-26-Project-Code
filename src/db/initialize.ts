import { drizzle } from 'drizzle-orm/neon-http';

import { neon } from "@neondatabase/serverless";

type DbClient = ReturnType<typeof drizzle>;

const databaseUrl = process.env.DATABASE_URL;
let db: DbClient | null = null;

if (databaseUrl) {
    const sql = neon(databaseUrl);
    db = drizzle({ client: sql });
} else {
    console.warn('[db] DATABASE_URL is not set; running without persistent DB.');
}

export { db };
