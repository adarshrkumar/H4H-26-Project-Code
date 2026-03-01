# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (run both simultaneously)
npm run dev          # Astro dev server on port 4321
npm run convex       # Convex backend dev server

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

**Stack**: Astro 5 + TypeScript + Convex + SCSS

**Rendering**: Server-side (`output: 'server'`) via `@astrojs/vercel` adapter.

**Database**: Convex (real-time sync). Schema is in `convex/schema.ts` with a `tracks` table. Convex functions (CRUD + file URL resolution) live in `convex/tracks.ts`. The HTTP client is initialized in `src/db/initialize.ts`. Zod validation schemas for the tracks API live in `src/db/validations.ts`. `drizzle.config.ts` is deprecated and can be ignored.

**AI**: Exa search integration lives in `src/lib/exa-search.ts`.

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

The flagship feature is an **Audio to Color visualizer** (`src/pages/index.astro` + `src/scripts/IndexScript.astro`). The client-side engine in `IndexScript.astro` uses the Web Audio API to extract 25 audio features (energy, brightness, tempo, flux, spectral spread/flatness/contrast/rolloff, bass/sub-bass/mid/high ratios, ZCR, RMS, crest factor, dynamic range, harmonic ratio, chroma strength, dominant pitch, pitch, attack time, beat regularity, roughness, MFCC-1, Tonnetz), and renders the result as an **OKLch** color on a canvas in real time. Supports three input modes: file upload, speaker/tab capture, and microphone. File upload abstraction lives in `src/lib/uploading.ts`.

## Required Environment Variables

See `.env.example`. Minimum for local dev: `PUBLIC_CONVEX_URL`, `OPENAI_API_KEY`. Auth (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`) and search (`EXA_API_KEY`) are optional unless those features are exercised.
