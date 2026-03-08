# Huephonic Judge Pitch Script (5 Minutes)

Use this as your direct speaking script with [docs/pitch-deck-business-judge.md](/Users/amritladhar/Documents/GitHub/H4H-26-Project-Code/docs/pitch-deck-business-judge.md).

## Slide 1 - Positioning
"Hello judges, we are Huephonic.  
Huephonic turns music into a visual language, while also helping creators generate music faster.  
I’m [Your Name], and with me are [Teammate 1] and [Teammate 2].  
We’re pre-launch, so this pitch focuses on product depth, implementation quality, and a clear business path."

## Slide 2 - Problem
"Music is deeply emotional, but many deaf and hard-of-hearing users still don’t have meaningful ways to interpret it.  
Most visualizers today are decorative, not informative.  
At the same time, creators face fragmented workflows, where music generation happens in one tool and interpretation happens somewhere else.  
So the core problem is twofold: accessibility gap plus workflow fragmentation."

## Slide 3 - Solution
"Huephonic connects creation and interpretation in one loop.  
First, users generate music from guided prompts.  
Second, they immediately play and visualize that music with feature-grounded DSP analysis.  
We support file input, tab or speaker capture, and microphone input.  
The key value is removing friction between making music and understanding music."

## Slide 4 - Product Walkthrough
"The user flow is simple.  
One: the user sets mood and energy for each song section.  
Two: our system generates section-based music output.  
Three: the user opens the view page and plays that generated track.  
Four: the visualization reacts in real time to frequency and dynamics.  
So the experience is: describe, generate, play, understand, then iterate."

## Slide 5 - Prompt to Music Pipeline
"Under the hood, this is a real production-style pipeline.  
The frontend collects mood, structure, lyrics, and style input.  
Our API builds section plans and sends a composition request.  
ElevenLabs generates the audio from that plan.  
UploadThing stores the generated file and returns a file key and URL.  
Neon plus Drizzle persist metadata and file references.  
Then we return a track ID that opens directly in the visualization page."

## Slide 6 - DSP Visualization
"On the next page, `/view?id=...`, we load the track and start real-time analysis.  
We map frequency energy into bands: bass or low, lowmid, mid, and treble or high.  
We apply low-latency DSP envelope filtering, using attack and release behavior, so the response is stable but still reactive.  
The center visual and surrounding motion are driven directly by those band values.  
So what users see is tied to measurable audio features, not random animation."

## Slide 7 - Latency, Limitations, and Improvement
"We also measured responsiveness internally.  
Our method is simple: inject a sharp transient like a click or clap, then measure the time to first visible peak, across 20 trials per input mode.  
Current early estimates are about 80 to 170 milliseconds for file and mic input, and about 180 to 400 milliseconds for tab or screen-capture input.  
The lag mainly comes from FFT windowing and smoothing, browser and OS buffering in screen capture, and normal render cadence.  
Current limitation: capture mode is less beat-locked than direct file or mic mode.  
The improvement roadmap is clear: low-latency mode, AudioWorklet-based extraction, per-input sync calibration, and decoupling heavier metrics from every frame."

## Slide 8 - Why It Is Marketable
"Huephonic is marketable because it creates dual value in a single product: accessibility impact and creator utility.  
It is highly demoable, visually shareable, and easy to understand in under a minute.  
That makes it well suited for education, therapy settings, creator workflows, and live visual performance contexts."

## Slide 9 - Business Model
"Our pre-launch business model has three layers.  
First, Creator Pro: advanced generation limits, presets, and export workflows.  
Second, Institutional tier: schools and accessibility-focused organizations.  
Third, long-term platform expansion through API integrations for partners.  
So we start with clear product packages, then expand into platform revenue."

## Slide 10 - Go-to-Market
"Our go-to-market is pilot-first.  
We start with creator demos and accessibility storytelling content.  
Then we build pilot relationships with schools and accessibility communities.  
Then we convert pilot usage into repeat institutional adoption.  
This gives us demand validation before scaling paid acquisition."

## Slide 11 - Roadmap
"Roadmap is execution-focused.  
Phase 1: polish onboarding and sharing.  
Phase 2: collaboration and stronger preset systems.  
Phase 3: institutional packaging and partner integrations.  
Each phase is tied to commercialization, not feature bloat."

## Slide 12 - Team
"Our team combines product, AI implementation, backend systems, and UX delivery.  
We can ship quickly across the full stack, and we already built an end-to-end working system from generation to storage to real-time DSP visualization.  
That shipping velocity is one of our strongest advantages at this stage."

## Slide 13 - Ask
"Today, we are asking for three things.  
One: pilot introductions in accessibility, education, and creator networks.  
Two: strategic mentorship on pricing and distribution.  
Three: funding or prize support to accelerate pilot execution.  
Our near-term goal is turning technical readiness into pilot validation and repeat usage.  
Thank you."

---

## 30-Second Closing Line (Use If Time Is Cut)
"Huephonic connects AI music generation and interpretable real-time visualization in one product, serving both accessibility and creator workflows.  
We are pre-launch, technically functional, and now focused on pilot conversion with the right partners."

