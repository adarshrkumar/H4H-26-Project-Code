---
marp: true
paginate: true
size: 16:9
theme: default
style: |
  section {
    font-family: "Avenir Next", "Segoe UI", "Inter", sans-serif;
    color: #eaf1ff;
    background: radial-gradient(circle at 20% 20%, #16234f 0%, #0b1230 48%, #060918 100%);
    padding: 56px 72px;
  }
  h1, h2 {
    color: #ffffff;
    letter-spacing: 0.2px;
    margin-bottom: 0.3em;
  }
  h1 { font-size: 64px; }
  h2 { font-size: 46px; }
  p, li { font-size: 27px; line-height: 1.35; }
  strong { color: #8ee6ff; }
  code {
    color: #9de8ff;
    background: rgba(17, 38, 80, 0.65);
    border: 1px solid rgba(104, 165, 255, 0.45);
    border-radius: 8px;
    padding: 0.1em 0.35em;
  }
  .kpi {
    display: inline-block;
    padding: 10px 18px;
    margin-right: 10px;
    border-radius: 12px;
    background: rgba(16, 39, 88, 0.75);
    border: 1px solid rgba(122, 190, 255, 0.5);
    font-weight: 700;
  }
  .panel {
    background: rgba(8, 21, 53, 0.75);
    border: 1px solid rgba(100, 163, 255, 0.45);
    border-radius: 18px;
    padding: 18px 22px;
  }
  .small { font-size: 21px; color: #b9d4ff; }
---

# Huephonic
## Business Pitch Deck (Judge Version)

<div class="panel">
  <p><strong>We turn music into a visual language and simplify music creation-to-interpretation in one product.</strong></p>
  <p class="small">Pre-launch pitch: product depth + market direction (without fabricated metrics).</p>
</div>

![bg right:44%](./pitch-assets/view-dashboard.png)

---

## The Problem Worth Solving

- Deaf and hard-of-hearing audiences are underserved by emotionally rich music interfaces.
- Existing visualizers are mostly decorative, not interpretable.
- Creators and educators need faster, coherent music ideation workflows.

<div class="panel small">
  This is both an accessibility problem and a workflow/productivity problem.
</div>

![bg right:41%](./pitch-assets/generate-hero.png)

---

## Product Wedge

- **Compose page**: guided section-by-section prompt flow.
- **View page**: real-time audio analysis and reactive visuals.
- Product loop: <code>Describe -> Generate -> Play -> Visualize -> Iterate</code>

<div class="panel small">
  Differentiator: one integrated workflow instead of disconnected tools.
</div>

![bg right:40%](./pitch-assets/generate-mid.png)

---

## Pipeline: Prompt -> Music File

1. User provides mood/style/section inputs.
2. Backend creates structured section prompts.
3. **ElevenLabs** generates audio from prompt/composition plan.
4. **UploadThing** stores audio and returns file key/url.
5. **Neon + Drizzle** store track metadata.
6. API returns track ID for playback and visualization.

<div class="panel small">
  This is a real implementation pipeline, not a mock.
</div>

![bg right:44%](./pitch-assets/architecture-flow.svg)

---

## Next Page: `/view` DSP Visualization

- Open <code>#/view?id=...</code> to play generated music.
- We use a <strong>4-band DSP filter</strong>:
  - bass (20-200 Hz)
  - low-mid (200-800 Hz)
  - mid (800 Hz-3 kHz)
  - treble/high (3-20 kHz)
- Low-latency DSP envelope filtering stabilizes response.
- Visual latency profile:
  - file/mic response: ~80-170 ms (median)
  - tab/screen-capture response: ~180-400 ms (median, higher variance)
- Separate sine-wave layers are driven by each band (no center orb dependency).

<div class="panel small">
  Visual mapping is feature-grounded, not random animation.
</div>

![bg right:40%](./pitch-assets/view-canvas.png)

---

## Latency Benchmark + Limitations

- **Benchmark method (internal):**
  - inject a sharp transient (click/clap), then measure delta to first visible peak
  - 20 trials per input mode, report median + p95
- **Current benchmark envelope (early internal estimate):**
  - file/mic response (median): ~80-170 ms
  - tab/screen-capture response (median): ~180-400 ms
- **Why lag happens:**
  - FFT windowing + smoothing
  - browser/OS buffering in screen audio capture
  - render cadence (~16 ms at 60 FPS)
- **Current limitation:**
  - screen/tab capture can feel less beat-locked than direct file/mic input
  - latency spread is wider for capture mode than file/mic

<div class="panel small">
  Tradeoff today: stable visuals first, ultra-low latency second.
</div>

---

## Latency Improvement Options

1. Add explicit low-latency mode (smaller FFT, lower smoothing)
2. Move band extraction to AudioWorklet with smaller frame blocks
3. Add per-input calibration offset for sync correction
4. Decouple heavy metrics from every render frame

<div class="panel small">
  This gives a clear technical roadmap from “good” to “broadcast-grade” responsiveness.
</div>

---

## Why It Is Marketable

- Clear value in two categories:
  - accessibility experience
  - creator workflow utility
- Fast demoability makes it strong for content sharing and adoption.
- Works across education, therapy, creators, and live visual performance contexts.

![bg right:40%](./pitch-assets/view-overview.png)

---

## Business Model (No Public Metrics Yet)

<div class="panel">
  <p><strong>Creator Pro</strong>: advanced generation, presets, export/share features</p>
  <p><strong>Institutional</strong>: education and accessibility programs</p>
  <p><strong>Platform Later</strong>: partner/API integrations</p>
</div>

<div class="panel small">
  Pre-launch stage: focus is pilot conversion and product validation, not vanity numbers.
</div>

![bg right:40%](./pitch-assets/market-funnel.svg)

---

## Go-To-Market (Simplified)

1. Launch creator-facing demos and short content loops.
2. Start pilot conversations with education/accessibility groups.
3. Convert pilots into repeat institutional usage.

<div class="panel small">
  Distribution strategy: product-led top funnel + partnership-led conversion.
</div>

---

## Team and Why Us

- `[Name]` - `[role]` - `[domain credibility]`
- `[Name]` - `[role]` - `[technical delivery strength]`
- `[Name]` - `[role]` - `[go-to-market/ops strength]`

<div class="panel small">
  Emphasize founder-market fit, shipping speed, and pilot execution ability.
</div>

---

## The Ask

1. Pilot introductions in accessibility, education, and creator networks
2. Strategic guidance on pricing and channel partnerships
3. Funding/prize support to accelerate pilot execution

<div class="panel">
  <p><strong>Near-term goal</strong>: turn technical readiness into real pilot usage and conversion.</p>
</div>

---

## Closing

# Huephonic
### Music should be experienced by everyone, not just heard.

Contact: `[email]` | `[website]` | `[github]`

![bg right:42%](./pitch-assets/view-dashboard.png)
