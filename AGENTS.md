# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Next.js dev server on port 3000

# Build & Deploy
npm run build        # Next.js production build
npm run start        # Start production server

# Linting
npm run lint         # next lint + stylelint (full check)
npm run lint:scss    # Stylelint only (src/**/*.scss)

# Testing (Playwright E2E)
npm run test         # All browsers
npm run test:chrome  # Chromium headed
npm run test:firefox # Firefox headed
npm run test:safari  # WebKit headed

# One-off TypeScript execution
npm run ts <file.ts> # node --experimental-strip-types
```

## Architecture

**Stack**: Next.js 15 + React 19 + TypeScript + SCSS + Drizzle ORM + Neon PostgreSQL + BetterAuth + ElevenLabs + UploadThing + Vercel AI SDK

**Rendering**: App Router (`src/app/`), Server Components by default. Client components opt in with `'use client'`.

**Database**: Drizzle ORM + Neon PostgreSQL. App schema in `src/db/schema.ts` (`music` table: id, title, artist, mimeType, fileKey, fileUrl, uploadedAt). Auth schema in `src/db/auth-schema.ts` (user/session/account/verification tables). DB client in `src/db/initialize.ts`. CRUD helpers in `src/db/helpers.ts` (`saveTrack`).

**Auth**: BetterAuth integration is currently not part of the active Vite runtime path.

**AI / Music Generation**:

- `src/lib/ai-service.ts` — Vercel AI SDK gateway wrapper (`generate`, `chat`, `stream`, `structured`). Uses `openai/gpt-4.1-mini` by default via `@ai-sdk/gateway`.
- `src/lib/config.ts` — app config (name: `'Huephonic'`, AI model, system prompt).
- `src/lib/eleven-labs.ts` — ElevenLabs music generation (`generateCompositionPlan`, `generateMusic`).
- `src/lib/generate-section-plan.ts` — per-section musical plans (`generateSongBlueprint`, `generateSectionPlan`).
- `src/lib/generate-and-save.ts` — end-to-end pipeline: composition plan → ElevenLabs → UploadThing → Neon.
- API routes: `src/app/api/generate/route.ts`, `src/app/api/generate-blueprint/route.ts`, `src/app/api/generate-section/route.ts`.

**File Storage**: UploadThing (`src/lib/uploadthing.ts`) — `uploadFile`, `uploadFileByUrl`, `getFileUrl`, `deleteFile`, `listFiles`.

## File Map

| Path | Description |
| --- | --- |
| `src/App.tsx` | Root app router logic (`compose` vs `view`) |
| `src/components/ComposePageContent.tsx` | Compose page UI shell |
| `src/components/ViewPageContent.tsx` | View page UI shell |
| `src/components/IndexScriptRunner.tsx` | `'use client'` runner for compose page |
| `src/components/ViewScriptRunner.tsx` | `'use client'` runner for audio page |
| `src/components/ViewSpatialSpheres.tsx` | 3D spatial spheres for XR `/view` |
| `src/scripts/indexScript.ts` | `initIndexScript()` — all compose-page DOM/fetch logic |
| `src/scripts/viewScript.ts` | `initViewScript()` — Web Audio pipeline, returns cleanup fn |

**Key path aliases** (from `tsconfig.json`):

- `@/*` → `src/*`
- `@db/*` → `src/db/*`
- `@styles/*` → `src/styles/*`
- `@components/*` → `src/components/*`

## SCSS Conventions

- **No inline `style` props** in components. All styles go in `src/styles/`.
- **No utility classes** (Tailwind-style). Use semantic BEM class names.
- **Data attributes** for variants: `data-variant="primary"`, `data-size="sm"`, etc.
- Global SCSS variables/mixins from `src/styles/variables/` are **auto-injected** into every file via `next.config.ts` (`sassOptions.additionalData`). Do not import them manually.
- Design tokens come from **OpenProps** (`open-props`) — use `--size-*`, `--shadow-*`, etc.
- Linting: `npm run lint:scss` (stylelint with `stylelint-config-standard-scss`, BEM pattern enforced).

## Core Application

**Huephonic** (`/view`) — Audio-to-color visualizer. The Web Audio API engine extracts 25 audio features (energy, brightness, tempo, flux, spectral spread/flatness/contrast/rolloff, bass/sub-bass/mid/high ratios, ZCR, RMS, crest factor, dynamic range, harmonic ratio, chroma strength, dominant pitch, pitch, attack time, beat regularity, roughness, MFCC-1, Tonnetz) and renders them as real-time metric graphs. Three input modes: file upload, speaker/tab capture, microphone.

**Compose** (`/`) — AI-driven music generation. User describes mood/concept → GPT-4.1-mini generates a song blueprint and per-section plans → ElevenLabs `composeDetailed` generates audio → UploadThing stores the file → Neon persists the track record.

## Required Environment Variables

- `DATABASE_URL` — Neon PostgreSQL connection string
- `BETTER_AUTH_SECRET` — BetterAuth secret key
- `BETTER_AUTH_URL` — Server-side auth base URL
- `NEXT_PUBLIC_BETTER_AUTH_URL` — Client-side auth base URL
- `OPENAI_API_KEY` — for AI service (Vercel AI SDK BYOK mode)
- `ELEVENLABS_API_KEY` — for music generation
- `UPLOADTHING_TOKEN` — for file storage

Optional:

- `VERCEL_API_KEY` — switches AI gateway from BYOK to managed Vercel AI Gateway
