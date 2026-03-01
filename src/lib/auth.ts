import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@db/initialize";
import { user, session, account, verification } from "@db/auth-schema";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: { user, session, account, verification },
    }),
    emailAndPassword: {
        enabled: true,
    },
    baseURL: import.meta.env.BETTER_AUTH_URL || process.env.BETTER_AUTH_URL,
    secret: import.meta.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET,
});
