# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Vite dev server on port 5173
npm run dev:api      # Express API server on port 3001

# Build & Deploy
npm run build        # tsc + vite build
npm run preview      # Preview production build

# Linting
npm run lint:scss    # Stylelint only (src/**/*.scss)
npm run stylelint:fix # Stylelint with auto-fix

# WebSpatial (visionOS)
npm run spatial:dev  # Vite dev server bound to 127.0.0.1:5173
npm run spatial:run  # Launch visionOS spatial app (simulator/device)
npm run spatial:build # Build visionOS spatial app
npm run spatial:up   # Start spatial:dev if not running, then spatial:run

# One-off TypeScript execution
npx tsx <file.ts>
```

## Architecture

**Stack**: Vite 6 + React 19 + TypeScript + SCSS + Drizzle ORM + Neon PostgreSQL + BetterAuth + ElevenLabs + UploadThing + Vercel AI SDK + WebSpatial SDK (visionOS)

**Rendering**: Vite SPA (`src/main.tsx` → `src/App.tsx`). Hash-based routing via `window.location.hash` / `hashchange`. Pages: `generate` (default) and `view` (`#/view?id=...`).

**Database**: Drizzle ORM + Neon PostgreSQL. App schema in `src/db/schema.ts` (`music` table: id, title, artist, mimeType, fileKey, fileUrl, uploadedAt). Auth schema in `src/db/auth-schema.ts` (user/session/account/verification tables). DB client in `src/db/initialize.ts`. CRUD helpers in `src/db/helpers.ts` (`saveTrack`, `getSongWithFiles`).

**Auth**: BetterAuth configured in `src/lib/auth.ts` (drizzle adapter, emailAndPassword). Mounted in Express at `app.all('/api/auth/*', toNodeHandler(auth))`.

**AI / Music Generation**:

- `src/lib/ai-service.ts` — Vercel AI SDK gateway wrapper (`generate`, `chat`, `stream`, `structured`). Uses `openai/gpt-4.1-mini` by default via `@ai-sdk/gateway`.
- `src/lib/config.ts` — app config (name: `'Huephonic'`, AI model, system prompt).
- `src/lib/eleven-labs.ts` — ElevenLabs music generation (`generateCompositionPlan`, `generateMusic`).
- `src/lib/generate-section-plan.ts` — per-section musical plans (`generateSongBlueprint`, `generateSectionPlan`).
- `src/lib/generate-and-save.ts` — end-to-end pipeline: composition plan → ElevenLabs → UploadThing → Neon.
- API routes in `server/index.ts`: `POST /api/generate`, `POST /api/generate-blueprint`, `POST /api/generate-section`, `GET /api/track/:id`.

**File Storage**: UploadThing (`src/lib/uploadthing.ts`) — `uploadFile`, `uploadFileByUrl`, `getFileUrl`, `deleteFile`, `listFiles`.

**Server**: Express 4 (`server/index.ts`) — runs on port 3001 in dev; deployed as Vercel serverless function (`api/` directory) in production. Vite proxies `/api` → `http://localhost:3001`.

## File Map

| Path | Description |
| --- | --- |
| `src/App.tsx` | SPA router — hashchange → `generate` or `view` page |
| `src/main.tsx` | React entry point |
| `src/components/GeneratePageContent.tsx` | Generate page UI shell |
| `src/components/ViewPageContent.tsx` | View (audio-to-color) page UI shell |
| `src/components/IndexScriptRunner.tsx` | Client runner for generate page |
| `src/components/Card.tsx` | Reusable card component |
| `src/components/Layout.tsx` | Shared page layout wrapper |
| `src/scripts/indexScript.ts` | `initIndexScript()` — all generate-page DOM/fetch logic |
| `src/lib/navigate.ts` | `navigateTo(page, id?)` — hash-based navigation helper |
| `src/lib/metrics.ts` | Audio metrics definitions |
| `server/index.ts` | Express API server (generate, blueprint, section, auth routes) |
| `vite.config.ts` | Vite config — WebSpatial JSX, SCSS globals, /api proxy |

**Key path aliases** (from `tsconfig.json`):

- `@/*` → `src/*`
- `@db/*` → `src/db/*`
- `@styles/*` → `src/styles/*`
- `@components/*` → `src/components/*`

## SCSS Conventions

- **No inline `style` props** in components. All styles go in `src/styles/`.
- **No utility classes** (Tailwind-style). Use semantic BEM class names.
- **Data attributes** for variants: `data-variant="primary"`, `data-size="sm"`, etc.
- Global SCSS variables/mixins from `src/styles/variables/` are **auto-injected** into every file via `vite.config.ts` (`css.preprocessorOptions.scss.additionalData`). Do not import them manually.
- Design tokens come from **OpenProps** (`open-props`) — use `--size-*`, `--shadow-*`, etc.
- Linting: `npm run lint:scss` (stylelint with `stylelint-config-standard-scss`, BEM pattern enforced).

## WebSpatial (visionOS)

All JSX goes through `@webspatial/react-sdk` (set via `jsxImportSource` in both `vite.config.ts` and `tsconfig.json`).

- Only elements with `enable-xr={true}` prop become native visionOS spatial windows.
- `--xr-background-material` CSS property only affects `enable-xr` elements (or `html` for main window).
- `--xr-back` (CSS custom prop) = Z-depth offset: positive = toward viewer, **negative = behind main window**.

**Background glass panel pattern** (used on both pages):

- Inert `position: absolute; inset: 0` child div with `enable-xr={true}`
- `--xr-background-material: translucent` and **`--xr-back: -10`** (negative pushes behind main window)
- `pointer-events: none` prevents click interference
- Without negative `--xr-back`, the glass window covers all content → blank panel bug

**Floating elements**: use positive `--xr-back` values (e.g. `30` for mood buttons, `20` for tabs). Do NOT add `enable-xr` to containers with interactive content — it intercepts child click events.

## Core Application

**Huephonic** (`#/view?id=...`) — Audio-to-color visualizer. The Web Audio API engine extracts 25 audio features (energy, brightness, tempo, flux, spectral spread/flatness/contrast/rolloff, bass/sub-bass/mid/high ratios, ZCR, RMS, crest factor, dynamic range, harmonic ratio, chroma strength, dominant pitch, pitch, attack time, beat regularity, roughness, MFCC-1, Tonnetz) and renders them as real-time metric graphs. Three input modes: file upload, speaker/tab capture, microphone.

**Generate** (`/`, `#/generate`) — AI-driven music generation. User describes mood/concept → GPT-4.1-mini generates a song blueprint and per-section plans → ElevenLabs `composeDetailed` generates audio → UploadThing stores the file → Neon persists the track record.

## Required Environment Variables

- `DATABASE_URL` — Neon PostgreSQL connection string
- `BETTER_AUTH_SECRET` — BetterAuth secret key
- `BETTER_AUTH_URL` — Server-side auth base URL
- `NEXT_PUBLIC_BETTER_AUTH_URL` — Client-side auth base URL
- `OPENAI_API_KEY` — for AI service (Vercel AI SDK BYOK mode)
- `ELEVENLABS_API_KEY` — for music generation
- `UPLOADTHING_TOKEN` — for file storage
- `VITE_APP_URL` — CORS origin for Express (defaults to `http://localhost:5173`)

Optional:

- `VERCEL_API_KEY` — switches AI gateway from BYOK to managed Vercel AI Gateway
