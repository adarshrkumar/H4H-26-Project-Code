# ATDSS Stack Application

This is the main Astro application for the ATDSS Stack (Astro, TypeScript, Drizzle, SCSS, Vercel AI SDK).

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- Neon PostgreSQL account (database)
- API keys for Better Auth, OpenAI, ElevenLabs, and UploadThing

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure your .env file with your credentials
```

### Environment Variables

Create a `.env` file with the following variables:

```env
# Neon PostgreSQL (database)
DATABASE_URL="postgresql://user:password@host/database"

# Better Auth Authentication
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="http://localhost:4321"

# OpenAI (for Vercel AI SDK)
OPENAI_API_KEY="sk-..."

# ElevenLabs (music generation)
ELEVENLABS_API_KEY="sk_..."

# UploadThing (file storage)
UPLOADTHING_TOKEN="..."

# Optional
VITE_APP_URL="http://localhost:5173"
```

### Development

```bash
# Start dev server
npm run dev
```

Visit `http://localhost:4321`

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run astro` - Run Astro CLI commands
- `npm run test` - Run E2E tests

## 📁 Project Structure

```text
src/
├── components/         # Reusable Astro components
├── db/                 # Database client and types
│   ├── initialize.ts   # Drizzle client with Neon HTTP
│   ├── schema.ts       # Drizzle table definitions
│   ├── helpers.ts      # Database query helpers
│   └── validations.ts  # Zod schemas
├── layouts/            # Page layouts
│   └── Layout.astro
├── lib/                # Utility libraries
│   ├── config.ts       # App configuration
│   ├── content-converter.ts # Markdown/HTML conversion
│   └── dom-utils.ts    # DOM manipulation
├── pages/              # Routes and pages
│   ├── api/            # API endpoints
│   └── index.astro     # Home page
└── styles/             # SCSS stylesheets
    ├── variables/      # SCSS variables and mixins
    ├── components/     # Component styles
    ├── pages/          # Page styles
    ├── reset.scss      # CSS reset
    └── global.scss     # Global styles
```

## 🎨 SCSS Architecture

This app uses a strict SCSS architecture:

- **No inline `<style>` tags** in `.astro` files
- **All styles in external SCSS files** for better maintainability
- **Data attributes for modifiers** (preferred over BEM)
- **Semantic class names** (no utility classes)

Example:

```astro
---
import '@/styles/components/button.scss';
---
<button class="btn" data-variant="primary" data-size="lg">
    Click Me
</button>
```

## 🗄️ Database

Database is handled by Drizzle ORM with Neon PostgreSQL. Define your schema in `src/db/schema.ts`:

```typescript
import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const music = pgTable('music', {
    id: text('id').primaryKey(),
    title: text('title'),
    duration: integer('duration'),
    createdAt: timestamp('created_at').defaultNow(),
});
```

Query and mutate data using helpers in `src/db/helpers.ts`.

## 🔐 Authentication

Authentication is handled by Better Auth. Configure in your `.env`:

```env
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="http://localhost:4321"
```

## 🤖 AI Features

### Vercel AI SDK

Chat and text generation powered by Vercel AI SDK.

### Music Generation

ElevenLabs API for music generation.

### File Storage

UploadThing for reliable file uploads and storage.

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Make sure to set these environment variables in your Vercel project settings:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`
- `UPLOADTHING_TOKEN`

## 📚 Documentation

- [Astro Documentation](https://docs.astro.build)
- [Drizzle ORM](https://orm.drizzle.team)
- [Neon PostgreSQL](https://neon.tech/docs)
- [Better Auth](https://www.better-auth.com/docs)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Zod](https://zod.dev)

## 🛠️ Utilities

### Content Conversion

```typescript
import { htmlToMarkdown, markdownToHtml } from '@/lib/content-converter';

const markdown = htmlToMarkdown('<h1>Hello</h1>');
const html = markdownToHtml('# Hello');
```

### Database Queries

```typescript
import { createRecording, getRecording, updateRecording } from '@/db/helpers';

const music = await createRecording(data);
const existing = await getRecording(id);
await updateRecording(id, updates);
```

## 📄 License

MIT
