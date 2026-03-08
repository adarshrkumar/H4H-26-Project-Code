# Huephonic - Business Judge Deck (Pre-Launch)

Use this version for business-pitch judges when you do **not** have public traction numbers yet.

Target length: 5 minutes + 3 minutes Q&A.

## Slide 1 - Positioning
- **Huephonic**
- *A product that turns music into a visual language, while also helping creators generate music faster.*
- Team: `[Name 1]`, `[Name 2]`, `[Name 3]`

Speaker note:
- "We are pre-launch, so this pitch focuses on product strength, implementation depth, and commercial path."

---

## Slide 2 - Problem
- Music is emotional, but many deaf and hard-of-hearing users lack meaningful ways to interpret it.
- Most visualizers are decorative, not informative.
- Music ideation tools are fragmented: generation in one place, interpretation in another.

Speaker note:
- "The gap is not just accessibility, it is workflow fragmentation."

---

## Slide 3 - Solution
- Huephonic connects **creation** and **interpretation**:
1. Generate music from guided prompts.
2. Immediately play and visualize that music in a feature-grounded way.

- Input modes for visualization: file, tab/speaker, microphone.

Speaker note:
- "We remove handoff friction between making music and understanding music."

---

## Slide 4 - Product Walkthrough (Simple)
1. User sets mood/energy per song section.
2. System generates section-level music output.
3. User opens the visualizer page and plays generated audio.
4. Visualization reacts in real time to frequency and dynamics.

Speaker note:
- "One continuous loop: describe -> generate -> play -> understand."

---

## Slide 5 - How It Works: Prompt -> Music Pipeline
- Frontend collects user mood, structure, lyrics, and style input.
- API builds section plans and sends composition request.
- **ElevenLabs** generates music from the prompt/plan.
- **UploadThing** stores the generated audio file and returns a file key/url.
- **Neon + Drizzle** persist track metadata and file references.
- API returns track ID so it can be opened in `/view`.

Speaker note:
- "This is a production-style pipeline, not a static demo."

---

## Slide 6 - Next Page: `/view` DSP Visualization
- `/view?id=...` loads generated audio and starts real-time analysis.
- We use a **4-band DSP filter**:
  - `bass` (20-200 Hz)
  - `low-mid` (200-800 Hz)
  - `mid` (800 Hz-3 kHz)
  - `treble/high` (3-20 kHz)
- Low-latency DSP envelope filtering (attack/release) stabilizes signal response.
- Visual latency today:
  - file/mic: ~80-170 ms (median)
  - screen/tab capture: ~180-400 ms (median, higher variance)
- Separate sine-wave layers react to each band in real time.
- Metrics panel provides additional interpretable features for transparency.

Speaker note:
- "The visuals are mapped to measurable audio bands, not random animation."

---

## Slide 7 - Latency Benchmark, Limitations, and Upgrade Options
- **Benchmark method (internal):**
  - inject a sharp transient (click/clap), then measure time delta to first visible peak
  - run 20 trials per input mode; report median + p95
- **Current benchmark envelope (early internal estimate):**
  - file/mic visual response (median): ~80-170 ms
  - tab/screen-capture visual response (median): ~180-400 ms
- **Why lag exists:**
  - FFT analysis window and smoothing
  - browser/OS buffering in `getDisplayMedia`
  - render cadence (~16 ms at 60 FPS)
- **Limitations today:**
  - screen/tab capture path can feel delayed for beat-precise visuals
  - high smoothing improves stability but increases lag
  - latency variance is higher in screen capture than file/mic mode
- **Improvement options:**
1. low-latency toggle (smaller FFT + lower smoothing)
2. AudioWorklet-based band extraction with smaller frame blocks
3. manual latency offset/calibration per input mode
4. lower-frequency metrics refresh path to reduce render load

Speaker note:
- "We are explicit about latency tradeoffs and we have clear technical options to reduce delay."

---

## Slide 8 - Why It Is Marketable
- Accessibility value + creator utility in one product.
- Immediate visual feedback makes content shareable and demo-friendly.
- Usable in education, therapy, creator workflows, and live visuals.

Speaker note:
- "This is a dual-value product: social impact and practical creator tooling."

---

## Slide 9 - Business Model (Pre-Launch Framing)
- **Creator Pro tier**:
  - advanced generation limits
  - saved presets
  - export/share workflows
- **Institutional tier**:
  - education and accessibility organizations
  - workshop/therapy usage
- **Long-term platform**:
  - API-based integrations for partners

Speaker note:
- "We start with clear value packages, then expand into platform revenue."

---

## Slide 10 - Go-To-Market (Without Vanity Metrics)
- Launch with creator demos and accessibility storytelling.
- Build pilot relationships with schools and accessibility communities.
- Convert pilots into repeat institutional usage.
- Use creator content as the top-of-funnel growth engine.

Speaker note:
- "We can prove demand through pilots before scaling paid acquisition."

---

## Slide 11 - Roadmap
- **Phase 1**: polish onboarding and shareability.
- **Phase 2**: collaborative workflows and stronger preset systems.
- **Phase 3**: institutional packaging + partner integrations.

Speaker note:
- "Roadmap is focused on commercialization milestones, not feature bloat."

---

## Slide 12 - Team
- `[Name]` - `[role]` - `[strength]`
- `[Name]` - `[role]` - `[strength]`
- `[Name]` - `[role]` - `[strength]`

Speaker note:
- "Emphasize ability to ship quickly across AI, backend, and product design."

---

## Slide 13 - Ask
- We are asking for:
1. Pilot introductions (education/accessibility/music partners)
2. Strategic mentorship on pricing and distribution
3. Funding/prize support to accelerate pilot execution

Speaker note:
- "Our immediate goal is converting product readiness into pilot validation."

---

## Judge Q&A Backup

### Q1 - Why no user numbers yet?
- Product is pre-launch and recently completed.
- We are intentionally seeking early pilots before broad public release.

### Q2 - Why this can become a business?
- Clear user value in creation and accessibility.
- Multiple monetization paths: creator tier, institutional tier, API later.

### Q3 - What proves technical depth?
- End-to-end working pipeline from prompt -> generated audio -> persisted track -> live DSP visualization.

### Q4 - What is the immediate next proof point?
- Pilot usage with at least one accessibility-focused and one education-focused partner.
