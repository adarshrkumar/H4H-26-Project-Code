# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this Astro repository.

## Commands

```bash
# Development
npm run dev          # Astro dev server on port 4321

# Build & Check
npm run build        # astro check && astro build
npm run check        # astro check && stylelint && astro build
npm run stylelint:fix  # Auto-fix SCSS lint issues

# Testing (Playwright E2E)
npm run test                    # All browsers
npm run test:chrome             # Chromium headed
npm run test:nopause:chrome     # Chromium headless (single test file)

# One-off TypeScript execution
npm run ts <file.ts>            # node --experimental-strip-types
```

## Architecture

**Stack (ATSDC)**: Astro 5 + TypeScript + SCSS + Drizzle

**Rendering**: Server-side (`output: 'server'`) via `@astrojs/vercel` adapter.

**Database**: Drizzle ORM with Neon PostgreSQL. Schema is in `src/db/schema.ts` with `music` table. Database functions live in `src/db/helpers.ts`. The Drizzle client is initialized in `src/db/initialize.ts`.

**AI**: Vercel AI SDK for text and structured generation.

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

## Code Formatting Guidelines

**Indentation & Comments:**

- Use **4 spaces** for indentation (all files: TypeScript, JavaScript, SCSS)
- Use **single-line comments** only: `// Comment` (never `/** */` or `/* */` for comments with only one line of content)

**Function Definitions:**

- **1–2 parameters**: Keep on single line `function getName(arg1: Type): Return {`
- **3+ parameters**: Split across multiple lines with proper indentation

**Function Calls:**

- Multi-line formatting as needed for readability; no strict single-line rule

**Control Structures (if/else, for, while, try/catch):**

- Opening brace `{` on same line as keyword
- Closing brace `}` on its own line
- Continuations (`else`, `else if`, `catch`) on same line after closing brace
- Multi-line blocks properly indented with 4 spaces

```typescript
if (condition) {
    content
} else if (other) {
    content
} else {
    content
}

for (let i = 0; i < 10; i++) {
    content
}

while (condition) {
    content
}

do {
    content
} while (condition);

try {
    content
} catch (err: unknown) {
    content
}

switch (value) {
    case 'a': {
        content
        break;
    }
    case 'b': {
        content
        break;
    }
    default: {
        content
    }
}
```

**TypeScript:**

- Never use `any` type; use proper typing (e.g., `Record<string, unknown>`, `z.ZodType`, etc.)
- Use `unknown` in catch clauses: `catch (err: unknown) {`

**Imports & Exports:**

- Keep imports on single lines when possible

## Core Application

The flagship feature is an **Audio to Color visualizer** (`src/pages/index.astro` + `src/pages/IndexScript.astro`). The client-side engine in `IndexScript.astro` uses the Web Audio API to extract features (energy, brightness, tempo, flux, spectral spread/flatness, bass ratio, zero-crossing rate), classifies them into 30+ moods, and generates HSL colors in real time. Supports three input modes: file upload, speaker/tab capture, and microphone.

## Required Environment Variables

See `.env.example`. Minimum for local dev: `DATABASE_URL`, `OPENAI_API_KEY`. File storage (`UPLOADTHING_TOKEN`) is optional unless that feature is exercised.
