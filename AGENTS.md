# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Astro dev server on port 4321

# Build & Check
npm run build        # type-check + build (no SCSS lint)
npm run check        # type-check + stylelint + build (full CI check)
npm run stylelint:fix  # Auto-fix SCSS lint issues

# Testing (Playwright E2E)
npm run test                    # All browsers
npm run test:chrome             # Chromium headed
npm run test:nopause:chrome     # Chromium headless (single test file)

# One-off TypeScript execution
npm run ts <file.ts>            # node --experimental-strip-types
```

## Architecture

**Stack**: Astro 5 + TypeScript + Drizzle ORM + Neon PostgreSQL + BetterAuth + ElevenLabs + UploadThing + Vercel AI SDK + SCSS

**Rendering**: Server-side (`output: 'server'`) via `@astrojs/vercel` adapter.

**Database**: Drizzle ORM + Neon PostgreSQL. App schema in `src/db/schema.ts` (`music` table: id, title, artist, mimeType, fileKey, fileUrl, uploadedAt). Auth schema in `src/db/auth-schema.ts` (user/session/account/verification tables). DB client initialized in `src/db/initialize.ts` (`drizzle` over `neon-http`). CRUD helpers in `src/db/helpers.ts` (`saveTrack`). Drizzle config references both schemas via `drizzle.config.ts`.

**Auth**: BetterAuth with Drizzle adapter (emailAndPassword enabled).

- `src/lib/auth.ts` — server auth instance
- `src/lib/auth-client.ts` — client-side `authClient` (`createAuthClient`)
- `src/pages/api/auth/[...all].ts` — catch-all handler
- `src/middleware.ts` — injects `locals.user` / `locals.session` on every request
- `src/env.d.ts` — declares `App.Locals` with `user: User | null` and `session: Session | null`

**AI / Music Generation**:

- `src/lib/ai-service.ts` — Vercel AI SDK gateway wrapper (`generate`, `chat`, `stream`, `structured`). Uses `openai/gpt-4.1-mini` by default via `@ai-sdk/gateway`.
- `src/lib/config.ts` — app config (AI model, system prompt).
- `src/lib/eleven-labs.ts` — ElevenLabs music generation (`generateCompositionPlan`, `generateMusic`).
- `src/lib/generate-section-plan.ts` — generates per-section musical plans (`generateSongBlueprint`, `generateSectionPlan`) using the AI service.
- `src/lib/generate-and-save.ts` — end-to-end pipeline: composition plan → ElevenLabs `composeDetailed` → UploadThing upload → Neon save.
- API routes: `src/pages/api/generate.ts`, `src/pages/api/generate-blueprint.ts`, `src/pages/api/generate-section.ts`.

**File Storage**: UploadThing (`src/lib/uploadthing.ts`) — `uploadFile`, `uploadFileByUrl`, `getFileUrl`, `deleteFile`, `listFiles`.

**Key path aliases** (from `tsconfig.json`):

- `@/*` → `src/*`
- `@db/*` → `src/db/*`
- `@styles/*` → `src/styles/*`
- `@components/*` → `src/components/*`

## SCSS Conventions

- **No inline `<style>` tags** in Astro components. All styles go in `src/styles/`.
- **No utility classes** (Tailwind-style). Use semantic class names.
- **Data attributes** for variants: `data-variant="primary"`, `data-size="sm"`, etc.
- Global SCSS variables from `src/styles/variables/globals.scss` are **auto-injected** into every file via `astro.config.mjs` (`additionalData`). Do not import them manually.
- Design tokens come from **OpenProps** (`open-props`) — use `--size-*`, `--shadow-*`, etc.
- Breakpoint mixins live in `src/styles/variables/mixins.scss`: `@include tablet`, `@include desktop`, etc.

## Core Application

The flagship feature is an **Audio to Color visualizer** (`src/pages/index.astro`). The client-side engine uses the Web Audio API to extract 25 audio features (energy, brightness, tempo, flux, spectral spread/flatness/contrast/rolloff, bass/sub-bass/mid/high ratios, ZCR, RMS, crest factor, dynamic range, harmonic ratio, chroma strength, dominant pitch, pitch, attack time, beat regularity, roughness, MFCC-1, Tonnetz), and renders the result as an **OKLch** color on a canvas in real time. Supports three input modes: file upload, speaker/tab capture, and microphone.

A secondary feature is **AI-driven music generation**: a multi-step pipeline where a user describes a mood/concept → GPT-4.1-mini generates a song blueprint and per-section plans → ElevenLabs `composeDetailed` generates the audio → UploadThing stores the file → Neon persists the track record.

## Required Environment Variables

See `.env.example`. Required for local dev:

- `DATABASE_URL` — Neon PostgreSQL connection string
- `OPENAI_API_KEY` — for AI service (Vercel AI SDK BYOK mode)
- `ELEVENLABS_API_KEY` — for music generation
- `UPLOADTHING_TOKEN` — for file storage

Optional:

- `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` / `PUBLIC_BETTER_AUTH_URL` — required only if auth features are exercised
- `VERCEL_API_KEY` — switches AI gateway from BYOK to managed Vercel AI Gateway
- `EXA_API_KEY` — for Exa search features
