# gem — AI Music Composer & Audio Visualizer

A hackathon project that lets you compose original AI-generated music and visualize audio as living color in real time.

---

## What it does

**gem** combines two core experiences:

### 1. Music Composer (`/`)
An interactive, mood-driven song builder. You guide every section of a song — Intro, Verse 1, Chorus, Verse 2, Bridge, Outro — by picking an emotional mood and an energy pattern, then optionally writing or auto-generating lyrics. When you're ready, the app sends a structured composition plan to ElevenLabs and streams back a full MP3 track, which is uploaded to cloud storage and saved to the database.

### 2. Audio to Color Visualizer (`/view`)
A real-time audio analysis engine that extracts 25 audio features from any sound source — file upload, browser tab/speaker capture, or microphone — and maps them onto a single perceptual **OKLch** color rendered on canvas. Features include energy, brightness, tempo, spectral flux, bass/mid/high ratios, ZCR, RMS, crest factor, harmonic ratio, chroma strength, pitch, MFCC-1, Tonnetz, and more.

> *"An orchestra for the deaf."*

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Astro 5 (SSR via `@astrojs/vercel`) |
| Language | TypeScript |
| Styling | SCSS + OpenProps design tokens |
| Database | Convex (real-time) |
| File storage | UploadThing |
| Music generation | ElevenLabs Music API |
| AI text/lyrics | OpenAI via Vercel AI SDK Gateway |
| Web search | Exa |
| Testing | Playwright (E2E, all browsers) |
| Deployment | Vercel |

---

## Getting started

### Prerequisites
- Node.js ≥ 18
- A Convex account

### Environment variables

Copy `.env.example` and fill in your keys:

```env
# Required
PUBLIC_CONVEX_URL=        # Your Convex deployment URL
OPENAI_API_KEY=           # OpenAI key (used via Vercel AI Gateway)

# Optional
ELEVENLABS_API_KEY=       # ElevenLabs key for music generation
UPLOADTHING_TOKEN=        # UploadThing token for audio file storage
EXA_API_KEY=              # Exa search API key
BETTER_AUTH_SECRET=       # Auth secret
BETTER_AUTH_URL=          # Auth URL
VERCEL_API_KEY=           # If using managed Vercel AI Gateway
```

### Development

Run both servers simultaneously in separate terminals:

```bash
npm run dev       # Astro dev server → http://localhost:4321
npm run convex    # Convex backend dev server
```

### Build & check

```bash
npm run build           # Type-check + build
npm run check           # Type-check + stylelint + build (full CI)
npm run stylelint:fix   # Auto-fix SCSS issues
```

### Testing

```bash
npm run test                  # All browsers (Chromium, Firefox, WebKit)
npm run test:chrome           # Chromium headed
npm run test:nopause:chrome   # Chromium headless
```

---

## Project structure

```
src/
├── pages/
│   ├── index.astro              # Music Composer UI
│   ├── view.astro               # Audio to Color Visualizer UI
│   └── api/
│       ├── generate.ts          # POST /api/generate — full song generation
│       └── generate-section.ts  # POST /api/generate-section — per-section generation
├── scripts/
│   ├── IndexScript.astro        # Client-side composer logic (mood/energy selection, API calls)
│   └── ViewScript.astro         # Web Audio API engine (feature extraction → OKLch color)
├── lib/
│   ├── ai-service.ts            # Vercel AI SDK wrapper (generate, chat, stream, structured)
│   ├── eleven-labs.ts           # ElevenLabs Music API client
│   ├── generate-and-save.ts     # Orchestrates: compose plan → generate audio → upload → save
│   ├── generate-section-plan.ts # AI prompt builder for per-section plans
│   ├── exa-search.ts            # Exa web search integration
│   ├── uploadthing.ts           # File upload/URL helpers
│   ├── metrics.ts               # Audio metric definitions
│   └── config.ts                # App configuration
├── db/
│   ├── initialize.ts            # Convex HTTP client init
│   ├── helpers.ts               # Convex CRUD helpers (saveTrack, etc.)
│   └── validations.ts           # Zod schemas for track data
├── components/
│   └── Card.astro
├── layouts/
│   └── Layout.astro
└── styles/                      # SCSS (no inline styles in components)
convex/
├── schema.ts                    # Convex schema — `tracks` table
└── tracks.ts                    # Convex functions (CRUD + file URL resolution)
```

---

## Path aliases

```
@/*           → src/*
@db/*         → src/db/*
@styles/*     → src/styles/*
@components/* → src/components/*
```

---

## Key design decisions

- **No inline `<style>` tags** — all styles live in `src/styles/`
- **No utility classes** — semantic SCSS class names with data-attribute variants
- **OKLch color space** — perceptually uniform, so mapped audio features feel natural as color
- **Structured composition plans** — instead of a single text prompt, the UI builds a per-section JSON plan that ElevenLabs uses to maintain musical coherence across the whole track
- **Non-fatal DB writes** — Convex persistence failures are logged but don't fail the generation request

---

## Deployment

Deploy to Vercel and set the environment variables listed above in your project settings.
