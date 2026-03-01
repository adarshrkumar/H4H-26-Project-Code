/**
 * Next.js Edge Middleware — replaces src/middleware.ts (Astro).
 *
 * The Astro version injected session data into context.locals so pages could
 * read it synchronously. In Next.js, session data is fetched directly in
 * Server Components and Route Handlers via:
 *
 *   import { auth } from '@/lib/auth';
 *   const session = await auth.api.getSession({ headers: request.headers });
 *
 * This middleware is intentionally minimal. Extend it here if you need
 * edge-level route protection (e.g. redirect unauthenticated users).
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(_request: NextRequest) {
    return NextResponse.next();
}

export const config = {
    // Run on all routes except static files and Next.js internals.
    matcher: ['/((?!_next/static|_next/image|favicon\\.svg|.*\\.(?:png|ico|webmanifest)).*)'],
};
