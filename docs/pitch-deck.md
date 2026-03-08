# Huephonic Pitch Deck

Use this as a 5-7 minute pitch script and slide blueprint.

## Slide 1 - Title
- **Huephonic**
- *An orchestra for the deaf: music you can see and feel*
- Team: `[Name 1]`, `[Name 2]`, `[Name 3]`
- Hackathon / date: `[Event] - [Date]`

Visual:
- Dark background with a screenshot of the center reactive circle and band labels.

Speaker note:
- "We built Huephonic so music is not locked behind hearing. We turn sound into visual and spatial language in real time."

---

## Slide 2 - Problem
- Music is deeply emotional, but many deaf and hard-of-hearing people experience limited access to that emotion.
- Existing visualizers are often decorative, not meaningfully informative.
- Creators also struggle to prototype emotionally coherent songs quickly.

Visual:
- 3 short pain-point cards: `Access`, `Expression`, `Creation speed`.

Speaker note:
- "The gap is not just accessibility playback, it is emotional translation and creative control."

---

## Slide 3 - Solution
- Huephonic has **two connected experiences**:
1. **Compose**: AI-assisted section-by-section music generation.
2. **View**: Real-time audio-to-color and audio-to-motion visualization.
- Input modes: file upload, shared tab/speaker audio, microphone.

Visual:
- Split-screen image: left = compose workflow, right = visualizer.

Speaker note:
- "You can generate music, then immediately experience it through a live visual language."

---

## Slide 4 - Live Demo Flow
- Step 1: Select mood and section energy on `/`.
- Step 2: Generate sections (intro, verse, chorus, bridge, outro).
- Step 3: Open `#/view?id=...` and visualize generated tracks.
- Step 4: Switch source to mic/tab and show real-time response.

Visual:
- Numbered 1-4 flow with short GIFs/screenshots.

Speaker note:
- "In one loop: create, play, and interpret emotion live."

---

## Slide 5 - Product Experience
- **Frequency layers**: bass, lowmid, mid, treble/high.
- **Center circle**: low-latency DSP-filtered, sine-wave-driven deformation.
- **Metrics panel**: 25 extracted features (tempo, flux, RMS, pitch, tonal features, etc.).
- **Spatial mode** (visionOS): floating 3D spheres driven by band events.

Visual:
- Annotated screenshot labeling each UI zone.

Speaker note:
- "This is not random animation. Each movement maps to measurable audio properties."

---

## Slide 6 - Technical Architecture
- Frontend: Vite + React + TypeScript + SCSS.
- Audio engine: Web Audio API + AudioMotionAnalyzer + custom DSP envelope filtering.
- Backend: Express API + Zod validation.
- Generation pipeline: Vercel AI SDK -> section plans -> ElevenLabs music -> UploadThing -> Neon PostgreSQL (Drizzle).

Visual:
- Left-to-right architecture diagram.

Speaker note:
- "We built an end-to-end pipeline from prompt to persisted, playable, visualizable tracks."

---

## Slide 7 - Why We Win (Moat)
- **Accessibility-first design**: feature-grounded visualization, not cosmetic waveform art.
- **Structured generation**: per-section musical planning for coherence.
- **Cross-platform path**: web first, spatial extension for visionOS.
- **Composable engine**: can support haptics and assistive experiences next.

Visual:
- 4-column comparison vs "basic visualizer apps".

Speaker note:
- "Our moat is translation quality plus full-stack creation-to-experience workflow."

---

## Slide 8 - Users and Use Cases
- Deaf and hard-of-hearing listeners.
- Music educators and therapists.
- Artists/producers exploring mood-to-sound ideation.
- Live visual installations and performance VJ tooling.

Visual:
- Persona cards with one sentence each.

Speaker note:
- "This starts as accessibility, but expands into creative and educational tooling."

---

## Slide 9 - Business / GTM
- **Phase 1**: Free web product + creator community.
- **Phase 2**: Pro subscription (advanced generation, exports, collaboration, presets).
- **Phase 3**: B2B licensing for education, events, and assistive tech partners.

Metrics placeholders:
- Waitlist/users: `[X]`
- Session time: `[Y min]`
- Songs generated: `[Z]`

Speaker note:
- "We can lead with a product-led growth loop and layer paid creator and institutional offerings."

---

## Slide 10 - Roadmap
- **0-3 months**: polish onboarding, sharing links, saved visual presets.
- **3-6 months**: haptics output and accessibility calibration profiles.
- **6-12 months**: collaborative sessions, live venue integration, APIs/SDKs.

Visual:
- Timeline bar with milestones.

Speaker note:
- "Near-term: stability and delight. Mid-term: deeper accessibility. Long-term: platform."

---

## Slide 11 - Ask
- We are looking for:
1. Pilot partners (schools, accessibility groups, creators).
2. Product/UX feedback from deaf and hard-of-hearing communities.
3. Technical mentorship and potential pre-seed conversations.

Visual:
- Clean "We are asking for..." slide with contact info.

Speaker note:
- "If this resonates, we want to partner on real-world pilots immediately."

---

## Slide 12 - Closing
- **Huephonic**
- *Music should be experienced by everyone, not just heard.*
- Contact: `[email]` | `[website]` | `[github]`

Visual:
- Strong hero screenshot + logo.

Speaker note:
- "Thank you. We’d love to show the demo live."

---

## Appendix (Optional Backup Slides)

### A1 - API Endpoints
- `POST /api/generate-blueprint`
- `POST /api/generate-section`
- `POST /api/generate`
- `GET /api/track/:id`

### A2 - Core Data Model
- `music`: `id`, `title`, `artist`, `files[]`, `uploadedAt`
- `files[]`: `{ fileKey, fileUrl }`

### A3 - Accessibility Principle
- Every animated element should map to an interpretable band/feature.
- Motion should have a "reason", not only aesthetics.
