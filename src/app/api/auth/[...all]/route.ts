/**
 * BetterAuth catch-all handler — converted from src/pages/api/auth/[...all].ts.
 * Handles both GET and POST (sessions, sign-in, sign-out, etc.).
 */

import { auth } from '@/lib/auth';

export async function GET(request: Request) {
    return auth.handler(request);
}

export async function POST(request: Request) {
    return auth.handler(request);
}
