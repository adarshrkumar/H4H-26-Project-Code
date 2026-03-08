/**
 * View-page (Audio to Color) client-side logic.
 * Runs in the Vite client and drives canvas + audio analysis.
 *
 * Call `initViewScript()` once the page DOM is ready (e.g. inside useEffect).
 * Returns a cleanup function that stops the audio pipeline.
 */

import AudioMotionAnalyzer from 'audiomotion-analyzer';
import { METRICS } from '@/lib/metrics';

export function initViewScript(): () => void {
    const isXrTransparentView = new URLSearchParams(window.location.search).get('xr') === '1';
    type SphereLevels = {
        bass: number;
        lowmid: number;
        mid: number;
        trebleHigh: number;
    };
    // ── Audio-feature state ───────────────────────────────────────────────────

    const state = {
        prevSpectrum:  null as Uint8Array<ArrayBuffer> | null,
        onsetTimes:    []   as number[],
        energyHistory: []   as number[],
        energyEMA:     0,
        sampleRate:    44100,
    };

    const ENERGY_HISTORY = 10;

    function getAudioFeatures(dataArray: Uint8Array<ArrayBuffer>, timeDomainArray?: Uint8Array<ArrayBuffer>) {
        const N      = dataArray.length;
        const sr     = state.sampleRate;
        const fftSz  = N * 2;
        const hz2bin = (hz: number) => Math.max(1, Math.min(N - 1, Math.round(hz * fftSz / sr)));

        // ── Pass 1: sums ─────────────────────────────────────────────────────
        let sum = 0, weightedLogSum = 0, totalAmplitude = 0;
        for (let i = 1; i < N; i++) {
            sum            += dataArray[i];
            weightedLogSum += Math.log2(i) * dataArray[i];
            totalAmplitude += dataArray[i];
        }

        // ── energy ───────────────────────────────────────────────────────────
        const energy = (sum / N) / 255;

        // ── brightness ───────────────────────────────────────────────────────
        const logCentroid = totalAmplitude > 0 ? weightedLogSum / totalAmplitude : 0;
        const brightness  = logCentroid / Math.log2(N);

        // ── spread ───────────────────────────────────────────────────────────
        let spreadSum = 0;
        for (let i = 1; i < N; i++) {
            const d = Math.log2(i) - logCentroid;
            spreadSum += d * d * dataArray[i];
        }
        const spread = Math.min(1, totalAmplitude > 0
            ? Math.sqrt(spreadSum / totalAmplitude) / Math.log2(N) : 0);

        // ── flux ─────────────────────────────────────────────────────────────
        let flux = 0;
        if (state.prevSpectrum && totalAmplitude > 0) {
            let rawFlux = 0;
            for (let i = 0; i < N; i++) {
                const diff = dataArray[i] - state.prevSpectrum[i];
                if (diff > 0) rawFlux += diff;
            }
            flux = rawFlux / totalAmplitude;
        }
        state.prevSpectrum = new Uint8Array(dataArray);

        // ── onset / tempo ────────────────────────────────────────────────────
        const now = performance.now();
        state.energyEMA = state.energyEMA * 0.88 + energy * 0.12;
        let isBeat = false;
        if (
            energy > state.energyEMA * 1.25 &&
            energy > 0.03 &&
            (state.onsetTimes.length === 0 || now - state.onsetTimes[state.onsetTimes.length - 1] > 200)
        ) {
            state.onsetTimes.push(now);
            isBeat = true;
        }
        const cutoff = now - 6000;
        while (state.onsetTimes.length > 0 && state.onsetTimes[0] < cutoff)
            state.onsetTimes.shift();
        let tempo = 0;
        if (state.onsetTimes.length >= 2) {
            let totalInterval = 0;
            for (let i = 1; i < state.onsetTimes.length; i++)
                totalInterval += state.onsetTimes[i] - state.onsetTimes[i - 1];
            const avgInterval = totalInterval / (state.onsetTimes.length - 1);
            tempo = Math.min(1, Math.max(0, (60000 / avgInterval - 40) / 140));
        }

        // ── flatness ─────────────────────────────────────────────────────────
        let flatness = 0;
        if (totalAmplitude > 0) {
            const n = N - 1;
            let logSum = 0;
            for (let i = 1; i < N; i++) logSum += Math.log(dataArray[i] + 1);
            const geoMean   = Math.exp(logSum / n);
            const arithMean = (totalAmplitude + n) / n;
            flatness = Math.min(1, geoMean / arithMean);
        }

        // ── bassRatio (bottom 10% of bins) ───────────────────────────────────
        const bassEnd = Math.max(1, Math.floor(N * 0.10));
        let bassSum = 0;
        for (let i = 0; i < bassEnd; i++) bassSum += dataArray[i];
        const bassRatio = totalAmplitude > 0 ? Math.min(1, bassSum / totalAmplitude) : 0;

        // ── ZCR ──────────────────────────────────────────────────────────────
        let zcr = 0;
        if (timeDomainArray && timeDomainArray.length > 1) {
            let crossings = 0;
            for (let i = 1; i < timeDomainArray.length; i++) {
                const prev = timeDomainArray[i - 1] - 128;
                const curr = timeDomainArray[i] - 128;
                if ((prev >= 0 && curr < 0) || (prev < 0 && curr >= 0)) crossings++;
            }
            zcr = crossings / (timeDomainArray.length - 1);
        }

        // ── rolloff (85% spectral energy threshold) ───────────────────────────
        let rolloff = 1;
        if (totalAmplitude > 0) {
            let cumulative = 0;
            const threshold = totalAmplitude * 0.85;
            for (let i = 0; i < N; i++) {
                cumulative += dataArray[i];
                if (cumulative >= threshold) {
                    rolloff = i / N;
                    break;
                }
            }
        }

        // ── subBass (20–80 Hz) ───────────────────────────────────────────────
        const subBassEnd = hz2bin(80);
        let subBassSum = 0;
        for (let i = 1; i <= subBassEnd; i++) subBassSum += dataArray[i];
        const subBass = totalAmplitude > 0 ? Math.min(1, subBassSum / totalAmplitude) : 0;

        // ── midRatio (250 Hz – 4 kHz) ────────────────────────────────────────
        const midStart = hz2bin(250), midEnd = hz2bin(4000);
        let midSum = 0;
        for (let i = midStart; i <= midEnd; i++) midSum += dataArray[i];
        const midRatio = totalAmplitude > 0 ? Math.min(1, midSum / totalAmplitude) : 0;

        // ── highRatio (8 kHz+) ────────────────────────────────────────────────
        const highStart = hz2bin(8000);
        let highSum = 0;
        for (let i = highStart; i < N; i++) highSum += dataArray[i];
        const highRatio = totalAmplitude > 0 ? Math.min(1, highSum / totalAmplitude) : 0;

        // ── RMS ───────────────────────────────────────────────────────────────
        let rms = 0;
        if (timeDomainArray) {
            let sq = 0;
            for (let i = 0; i < timeDomainArray.length; i++) {
                const c = (timeDomainArray[i] - 128) / 128;
                sq += c * c;
            }
            rms = Math.sqrt(sq / timeDomainArray.length);
        }

        // ── crestFactor (peak / RMS, normalised to ~0–1) ──────────────────────
        let crestFactor = 0;
        if (timeDomainArray && rms > 0.001) {
            let peak = 0;
            for (let i = 0; i < timeDomainArray.length; i++) {
                const a = Math.abs(timeDomainArray[i] - 128) / 128;
                if (a > peak) peak = a;
            }
            crestFactor = Math.min(1, (peak / rms) / 14);
        }

        // ── dynamicRange ──────────────────────────────────────────────────────
        let dynamicRange = 0;
        if (timeDomainArray) {
            let maxA = 0, minA = 255;
            for (let i = 0; i < timeDomainArray.length; i++) {
                if (timeDomainArray[i] > maxA) maxA = timeDomainArray[i];
                if (timeDomainArray[i] < minA) minA = timeDomainArray[i];
            }
            dynamicRange = (maxA - minA) / 255;
        }

        // ── spectralContrast (peak–valley across 6 sub-bands) ─────────────────
        let spectralContrast = 0;
        {
            const numBands = 6;
            const bandSize = Math.floor(N / numBands);
            let contrastSum = 0;
            for (let b = 0; b < numBands; b++) {
                const start = b * bandSize;
                const end   = start + bandSize;
                let peak = 0, valley = 255;
                for (let i = start; i < end; i++) {
                    if (dataArray[i] > peak)   peak   = dataArray[i];
                    if (dataArray[i] < valley) valley = dataArray[i];
                }
                contrastSum += peak - valley;
            }
            spectralContrast = Math.min(1, (contrastSum / numBands) / 255);
        }

        // ── harmonicRatio (energy at integer multiples of strongest low bin) ───
        let harmonicRatio = 0;
        {
            const searchEnd = Math.floor(N * 0.25);
            let fundBin = 1, fundEnergy = 0;
            for (let i = 2; i < searchEnd; i++) {
                if (dataArray[i] > fundEnergy) {
                    fundEnergy = dataArray[i];
                    fundBin = i;
                }
            }
            if (fundEnergy > 10) {
                let harmEnergy = 0;
                for (let h = 1; h <= 8 && fundBin * h < N; h++) {
                    const hBin = fundBin * h;
                    let best = 0;
                    for (let j = Math.max(0, hBin - 2); j <= Math.min(N - 1, hBin + 2); j++)
                        if (dataArray[j] > best) best = dataArray[j];
                    harmEnergy += best;
                }
                harmonicRatio = totalAmplitude > 0 ? Math.min(1, harmEnergy / totalAmplitude) : 0;
            }
        }

        // ── chroma (12 pitch classes) ─────────────────────────────────────────
        const chroma = new Float32Array(12);
        for (let i = 1; i < N; i++) {
            const freq = i * sr / fftSz;
            if (freq < 80 || freq > 4000) continue;
            const pc   = ((12 * Math.log2(freq / 440)) % 12 + 12) % 12;
            const lo   = Math.floor(pc);
            const hi   = (lo + 1) % 12;
            const frac = pc - lo;
            chroma[lo] += dataArray[i] * (1 - frac);
            chroma[hi] += dataArray[i] * frac;
        }
        const chromaTotal = chroma.reduce((s, v) => s + v, 0);
        let chromaMax = 0, chromaMaxIdx = 0;
        for (let i = 0; i < 12; i++) {
            if (chroma[i] > chromaMax) {
                chromaMax = chroma[i];
                chromaMaxIdx = i;
            }
        }
        const chromaMean     = chromaTotal / 12;
        const chromaStrength = chromaMean > 0 ? Math.min(1, (chromaMax / chromaMean) / 4) : 0;
        const dominantPitch  = chromaMaxIdx / 11; // 0 = C … 1 = B

        // ── pitch (dominant frequency in musical range, log-normalised) ───────
        let pitch = 0;
        {
            const pitchMinBin = hz2bin(50);
            const pitchMaxBin = hz2bin(2000);
            let peakBin = pitchMinBin, peakVal = 0;
            for (let i = pitchMinBin; i <= pitchMaxBin; i++) {
                if (dataArray[i] > peakVal) {
                    peakVal = dataArray[i];
                    peakBin = i;
                }
            }
            if (peakVal > 20) {
                const hz = peakBin * sr / fftSz;
                pitch = Math.min(1, Math.max(0,
                    (Math.log2(hz) - Math.log2(50)) / (Math.log2(2000) - Math.log2(50))));
            }
        }

        // ── attackTime (steepest energy rise over last 10 frames) ────────────
        state.energyHistory.push(energy);
        if (state.energyHistory.length > ENERGY_HISTORY) state.energyHistory.shift();
        let maxRise = 0;
        for (let i = 1; i < state.energyHistory.length; i++) {
            const rise = Math.max(0, state.energyHistory[i] - state.energyHistory[i - 1]);
            if (rise > maxRise) maxRise = rise;
        }
        const attackTime = Math.min(1, maxRise * 8);

        // ── beatRegularity (1 − coefficient of variation of onset intervals) ──
        let beatRegularity = 0;
        if (state.onsetTimes.length >= 3) {
            const intervals: number[] = [];
            for (let i = 1; i < state.onsetTimes.length; i++)
                intervals.push(state.onsetTimes[i] - state.onsetTimes[i - 1]);
            const mean     = intervals.reduce((s, v) => s + v, 0) / intervals.length;
            const variance = intervals.reduce((s, v) => s + (v - mean) ** 2, 0) / intervals.length;
            const cv       = mean > 0 ? Math.sqrt(variance) / mean : 1;
            beatRegularity = Math.max(0, 1 - Math.min(1, cv));
        }

        // ── roughness (adjacent strong-bin energy / beating) ─────────────────
        let roughness = 0;
        {
            let roughSum = 0;
            for (let i = 1; i < N - 1; i++) {
                if (dataArray[i] > 25 && dataArray[i - 1] > 25)
                    roughSum += Math.min(dataArray[i], dataArray[i - 1]);
            }
            roughness = totalAmplitude > 0 ? Math.min(1, roughSum / totalAmplitude) : 0;
        }

        // ── MFCC-1 (spectral tilt via mel filterbank + DCT) ───────────────────
        let mfcc1 = 0;
        {
            const numFilters = 13;
            const melMin     = 2595 * Math.log10(1 + 80 / 700);
            const melMax     = 2595 * Math.log10(1 + (sr / 2) / 700);
            const melFilters = new Float32Array(numFilters);
            for (let i = 1; i < N; i++) {
                const freq = i * sr / fftSz;
                const mel  = 2595 * Math.log10(1 + freq / 700);
                const idx  = (mel - melMin) / (melMax - melMin) * (numFilters - 1);
                const lo   = Math.floor(idx);
                const hi   = Math.ceil(idx);
                const frac = idx - lo;
                if (lo >= 0 && lo < numFilters) melFilters[lo] += dataArray[i] * (1 - frac);
                if (hi >= 0 && hi < numFilters) melFilters[hi] += dataArray[i] * frac;
            }
            for (let i = 0; i < numFilters; i++) melFilters[i] = Math.log(melFilters[i] + 1);
            let raw = 0;
            for (let i = 0; i < numFilters; i++)
                raw += melFilters[i] * Math.cos(Math.PI * (i + 0.5) / numFilters);
            mfcc1 = Math.min(1, Math.max(0, (raw + 50) / 100));
        }

        // ── tonnetz (fifth-related tonal coherence from chroma) ───────────────
        let tonnetz = 0;
        if (chromaTotal > 0) {
            let tCos = 0, tSin = 0;
            for (let i = 0; i < 12; i++) {
                const w = chroma[i] / chromaTotal;
                tCos += w * Math.cos(7 * i * 2 * Math.PI / 12);
                tSin += w * Math.sin(7 * i * 2 * Math.PI / 12);
            }
            tonnetz = Math.min(1, Math.sqrt(tCos * tCos + tSin * tSin));
        }

        return {
            energy, brightness, tempo, flux, spread, flatness, bassRatio, zcr,
            rolloff, subBass, midRatio, highRatio,
            rms, crestFactor, dynamicRange,
            spectralContrast, harmonicRatio,
            chromaStrength, dominantPitch,
            pitch, attackTime, beatRegularity,
            roughness, mfcc1, tonnetz,
            isBeat,
        };
    }

    // ── Metrics ───────────────────────────────────────────────────────────────

    const HISTORY_LEN = 80;
    type MetricKey = typeof METRICS[number]['key'];
    const metricHistory = {} as Record<MetricKey, number[]>;
    const metricCtx     = {} as Record<MetricKey, CanvasRenderingContext2D>;
    const metricValEls  = {} as Record<MetricKey, HTMLElement>;
    for (const { key } of METRICS) {
        metricHistory[key] = [];
        const mc = document.getElementById(`graph-${key}`) as HTMLCanvasElement | null;
        if (mc) metricCtx[key] = mc.getContext('2d')!;
        const valEl = document.getElementById(`val-${key}`);
        if (valEl) metricValEls[key] = valEl;
    }

    function resetMetricBars() {
        for (const { key } of METRICS) {
            metricHistory[key] = [];
            const mctx = metricCtx[key];
            if (mctx) mctx.clearRect(0, 0, mctx.canvas.width, mctx.canvas.height);
            if (metricValEls[key]) metricValEls[key].textContent = '0.00';
        }
    }

    function updateMetricBars(features: Record<string, number>) {
        for (const { key, color } of METRICS) {
            const v    = features[key] ?? 0;
            const hist = metricHistory[key];
            hist.push(v);
            if (hist.length > HISTORY_LEN) hist.shift();

            const ctx = metricCtx[key];
            if (!ctx) continue;
            const W   = ctx.canvas.width;
            const H   = ctx.canvas.height;

            ctx.fillStyle = '#12121f';
            ctx.fillRect(0, 0, W, H);

            if (hist.length >= 2) {
                const pad   = 3;
                const xStep = W / (HISTORY_LEN - 1);

                ctx.beginPath();
                for (let i = 0; i < hist.length; i++) {
                    const x = i * xStep;
                    const y = H - pad - hist[i] * (H - pad * 2);
                    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.lineTo((hist.length - 1) * xStep, H);
                ctx.lineTo(0, H);
                ctx.closePath();
                ctx.globalAlpha = 0.15;
                ctx.fillStyle = color;
                ctx.fill();
                ctx.globalAlpha = 1;

                ctx.beginPath();
                ctx.strokeStyle = color;
                ctx.lineWidth   = 1.5;
                ctx.lineJoin    = 'round';
                for (let i = 0; i < hist.length; i++) {
                    const x = i * xStep;
                    const y = H - pad - hist[i] * (H - pad * 2);
                    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.stroke();

                const dotX = (hist.length - 1) * xStep;
                const dotY = H - pad - v * (H - pad * 2);
                ctx.beginPath();
                ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
            }

            if (metricValEls[key]) metricValEls[key].textContent = v.toFixed(2);
        }
    }

    // ── DOM refs ──────────────────────────────────────────────────────────────

    const canvas          = document.getElementById('viz-canvas')      as HTMLCanvasElement;
    const ctx             = canvas.getContext('2d')!;
    const amDiv           = document.getElementById('viz-am-hidden')   as HTMLDivElement;
    const overlay         = document.getElementById('vizOverlay')      as HTMLElement | null;
    const vizHint         = document.getElementById('vizHint')         as HTMLElement | null;
    const pauseBtn        = document.getElementById('vizPauseBtn')     as HTMLButtonElement | null;
    const resetBtn        = document.getElementById('vizResetBtn')     as HTMLButtonElement | null;
    const pulsePreview    = document.getElementById('vizPulsePreview') as HTMLElement | null;
    const vizFileInput    = document.getElementById('vizFileInput')    as HTMLInputElement | null;
    const speakerStartBtn = document.getElementById('speakerStartBtn') as HTMLButtonElement | null;
    const speakerStopBtn  = document.getElementById('speakerStopBtn')  as HTMLButtonElement | null;
    const micStartBtn     = document.getElementById('micStartBtn')     as HTMLButtonElement | null;
    const micStopBtn      = document.getElementById('micStopBtn')      as HTMLButtonElement | null;
    const sphereLabelEls = {
        bass: document.getElementById('sphere-val-bass') as HTMLElement | null,
        lowmid: document.getElementById('sphere-val-lowmid') as HTMLElement | null,
        mid: document.getElementById('sphere-val-mid') as HTMLElement | null,
        trebleHigh: document.getElementById('sphere-val-treble-high') as HTMLElement | null,
    };

    // ── Visualization state ───────────────────────────────────────────────────

    let currentMoodId = 'calm';

    const vizState = {
        moodHue:          210,
        layers: {
            ground: { enabled: true },
            flow:   { enabled: true },
            form:   { enabled: true },
            spark:  { enabled: true },
            air:    { enabled: true },
        } as Record<string, { enabled: boolean }>,
        sparkRingEnabled: true,
        highContrast:     false,
        colorblindMode:   false,
        reduceMotion:     false,
        smoothMode:       false,
        neonGlow:         true,
        waveTrails:       true,
        hueDrift:         false,
        partyMode:        false,
        running:          false,
        paused:           false,
    };

    const COLORBLIND_MAP: Record<string, number> = {
        calm: 210, intense: 30, mysterious: 250,
        bright: 55, dreamy: 250, energetic: 200,
    };

    // ── Mood helpers ──────────────────────────────────────────────────────────

    function hexToHue(hex: string): number {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
        if (d === 0) return 210;
        let h = 0;
        if (max === r)      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (max === g) h = ((b - r) / d + 2) / 6;
        else                h = ((r - g) / d + 4) / 6;
        return Math.round(h * 360);
    }

    function applyMoodHue(hue: number) {
        vizState.moodHue = hue;
        document.documentElement.style.setProperty('--viz-hue-color', `oklch(65% 0.22 ${hue}deg)`);
    }

    const savedColor = localStorage.getItem('viz-mood-color');
    if (savedColor?.startsWith('#')) applyMoodHue(hexToHue(savedColor));

    // ── AudioMotionAnalyzer ───────────────────────────────────────────────────

    let audioMotion:     AudioMotionAnalyzer | null = null;
    let metricsAnalyser: AnalyserNode | null = null;

    const ANALYZER_LATENCY = {
        fftSize: 2048,
        smoothing: 0.22,
        metricsSmoothing: 0.16,
    } as const;

    function initAudioMotion() {
        audioMotion?.destroy();
        audioMotion = new AudioMotionAnalyzer(amDiv, {
            // Lower FFT window + smoothing = faster visual response.
            fftSize:         ANALYZER_LATENCY.fftSize,
            smoothing:       ANALYZER_LATENCY.smoothing,
            connectSpeakers: false,
            onCanvasDraw:    renderFrame,
            start:           false,
        });
        state.sampleRate = audioMotion.audioCtx.sampleRate;
        metricsAnalyser = audioMotion.audioCtx.createAnalyser();
        metricsAnalyser.fftSize = 2048;
        metricsAnalyser.smoothingTimeConstant = ANALYZER_LATENCY.metricsSmoothing;
        audioMotion.start();
    }
    initAudioMotion();

    // ── Band energy ───────────────────────────────────────────────────────────

    function getBands() {
        if (!audioMotion) return { ground: 0, flow: 0, form: 0, spark: 0, air: 0, overall: 0 };
        const v = (id: string, raw: number) => vizState.layers[id].enabled ? raw : 0;
        return {
            ground:  v('ground', audioMotion.getEnergy(20,   200)),
            flow:    v('flow',   audioMotion.getEnergy(200,  800)),
            form:    v('form',   audioMotion.getEnergy(800,  3000)),
            spark:   v('spark',  audioMotion.getEnergy(3000, 8000)),
            air:     v('air',    audioMotion.getEnergy(8000, 20000)),
            overall: audioMotion.getEnergy(),
        };
    }

    // ── Beat detection (EMA) ──────────────────────────────────────────────────

    let beatEMA = 0, lastBeatTime = 0;

    function detectBeat(energy: number, now: number): boolean {
        const alpha = vizState.smoothMode ? 0.08 : 0.18;
        beatEMA = beatEMA * (1 - alpha) + energy * alpha;
        const threshold = 1 + 0.6 * 0.8;
        if (energy > beatEMA * threshold && energy > 0.05 && now - lastBeatTime > 250) {
            lastBeatTime = now;
            return true;
        }
        return false;
    }

    // ── Canvas resize ─────────────────────────────────────────────────────────

    function resizeCanvas() {
        const wrap = canvas.parentElement!;
        canvas.width  = wrap.clientWidth;
        canvas.height = wrap.clientHeight;
    }
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas.parentElement!);
    resizeCanvas();

    // ── Beat flash + grid ─────────────────────────────────────────────────────

    let beatFlashAlpha  = 0;
    const BEAT_GRID_SIZE  = 16;
    const GRID_SLOT_MS    = 250;
    const beatGrid        = new Array<boolean>(BEAT_GRID_SIZE).fill(false);
    let   beatGridIdx     = 0;
    let   lastGridAdvance = 0;

    // ── Pulse rings ───────────────────────────────────────────────────────────

    interface PulseRing { r: number; maxR: number; life: number; maxLife: number; hue: number; }
    let pulseRings: PulseRing[] = [];

    // ── Peak hold markers ─────────────────────────────────────────────────────

    const PEAK_HOLD_MS = 1800;
    const peakHold: { val: number; heldAt: number }[] = [
        { val: 0, heldAt: 0 }, { val: 0, heldAt: 0 }, { val: 0, heldAt: 0 },
        { val: 0, heldAt: 0 }, { val: 0, heldAt: 0 },
    ];

    function spawnPulseRing(cx: number, cy: number, hue: number) {
        if (!vizState.sparkRingEnabled) return;
        const minDim = Math.min(cx, cy);
        pulseRings.push({ r: minDim * 0.12, maxR: minDim * 0.92, life: 0, maxLife: 44, hue });
    }

    function updateSphereLabels(bands: ReturnType<typeof getBands>): SphereLevels {
        const formatPercent = (value: number) => `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
        const levels = {
            bass: bands.ground,
            lowmid: bands.flow,
            mid: bands.form,
            trebleHigh: Math.max(bands.spark, bands.air),
        };

        sphereLabelEls.bass?.setAttribute('data-level', levels.bass.toFixed(2));
        sphereLabelEls.lowmid?.setAttribute('data-level', levels.lowmid.toFixed(2));
        sphereLabelEls.mid?.setAttribute('data-level', levels.mid.toFixed(2));
        sphereLabelEls.trebleHigh?.setAttribute('data-level', levels.trebleHigh.toFixed(2));

        if (sphereLabelEls.bass) sphereLabelEls.bass.textContent = formatPercent(levels.bass);
        if (sphereLabelEls.lowmid) sphereLabelEls.lowmid.textContent = formatPercent(levels.lowmid);
        if (sphereLabelEls.mid) sphereLabelEls.mid.textContent = formatPercent(levels.mid);
        if (sphereLabelEls.trebleHigh) sphereLabelEls.trebleHigh.textContent = formatPercent(levels.trebleHigh);

        return levels;
    }

    // ── Drawing helpers ───────────────────────────────────────────────────────

    let time = 0;

    // 1. Background — iridescent field (no central orb focus)
    function drawBackground(cx: number, cy: number, bands: ReturnType<typeof getBands>, hue: number) {
        const L = vizState.highContrast ? 11 + bands.overall * 18 : 4 + bands.overall * 9;
        const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        g.addColorStop(0,   `oklch(${L * 1.9}% 0.09 ${hue + 30})`);
        g.addColorStop(0.5, `oklch(${L * 1.5}% 0.07 ${hue + 120})`);
        g.addColorStop(1,   `oklch(${L * 1.3}% 0.08 ${hue + 210})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Side glows provide depth while keeping the center unobstructed.
        const leftGlow = ctx.createRadialGradient(0, cy, 0, 0, cy, canvas.width * 0.55);
        leftGlow.addColorStop(0, `oklch(${L * 2.6}% 0.18 ${hue + 20} / 0.18)`);
        leftGlow.addColorStop(1, `oklch(${L * 1.1}% 0.04 ${hue + 70} / 0)`);
        ctx.fillStyle = leftGlow;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const rightGlow = ctx.createRadialGradient(canvas.width, cy, 0, canvas.width, cy, canvas.width * 0.55);
        rightGlow.addColorStop(0, `oklch(${L * 2.7}% 0.20 ${hue + 180} / 0.16)`);
        rightGlow.addColorStop(1, `oklch(${L * 1.2}% 0.04 ${hue + 240} / 0)`);
        ctx.fillStyle = rightGlow;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 2. Beat accent — full-canvas diagonal flash
    function drawBeatFlash(W: number, H: number, hue: number) {
        if (beatFlashAlpha <= 0) return;
        const flash = ctx.createLinearGradient(0, 0, W, H);
        const a     = Math.min(1, beatFlashAlpha);
        flash.addColorStop(0,   `oklch(86% 0.36 ${hue + 25}  / ${a * 0.20})`);
        flash.addColorStop(0.5, `oklch(90% 0.44 ${hue + 120} / ${a * 0.32})`);
        flash.addColorStop(1,   `oklch(82% 0.30 ${hue + 210} / ${a * 0.18})`);
        ctx.fillStyle = flash;
        ctx.fillRect(0, 0, W, H);

        if (vizState.partyMode) {
            const stripe = ctx.createLinearGradient(0, H * 0.2, W, H * 0.8);
            stripe.addColorStop(0,   `oklch(95% 0.46 ${hue + 320} / ${a * 0.16})`);
            stripe.addColorStop(0.5, `oklch(98% 0.50 ${hue + 40}  / ${a * 0.24})`);
            stripe.addColorStop(1,   `oklch(94% 0.44 ${hue + 120} / ${a * 0.16})`);
            ctx.fillStyle = stripe;
            ctx.fillRect(0, 0, W, H);
        }
    }

    const CIRCLE_BANDS = ['ground', 'flow', 'form', 'spark', 'air'] as const;
    type CircleBand = typeof CIRCLE_BANDS[number];

    const circleBandState: Record<CircleBand, number> = {
        ground: 0,
        flow:   0,
        form:   0,
        spark:  0,
        air:    0,
    };

    type DspFilterPreset = {
        attackMs: number;
        releaseMs: number;
        noiseFloor: number;
    };

    const DSP_FILTER_PRESET: Record<'lowLatency' | 'smooth', DspFilterPreset> = {
        lowLatency: { attackMs: 8,  releaseMs: 34,  noiseFloor: 0.0030 },
        smooth:     { attackMs: 32, releaseMs: 120, noiseFloor: 0.0020 },
    };

    let lastCircleFilterTs = performance.now();

    // One-pole envelope follower: fast attack + slower release for low-latency DSP response.
    function followEnvelope(current: number, input: number, dtMs: number, preset: DspFilterPreset) {
        const attackCoef = Math.exp(-dtMs / preset.attackMs);
        const releaseCoef = Math.exp(-dtMs / preset.releaseMs);
        const coef = input > current ? attackCoef : releaseCoef;
        return input + (current - input) * coef;
    }

    function updateCircleBandState(bands: ReturnType<typeof getBands>, nowMs: number) {
        const dtMsRaw = nowMs - lastCircleFilterTs;
        const dtMs = Number.isFinite(dtMsRaw) ? Math.min(80, Math.max(8, dtMsRaw)) : 16;
        lastCircleFilterTs = nowMs;
        const preset = vizState.smoothMode ? DSP_FILTER_PRESET.smooth : DSP_FILTER_PRESET.lowLatency;
        for (const band of CIRCLE_BANDS) {
            const input = bands[band] < preset.noiseFloor ? 0 : bands[band];
            circleBandState[band] = Math.max(0, Math.min(1,
                followEnvelope(circleBandState[band], input, dtMs, preset),
            ));
        }
    }

    // 3. Multi-lane sine waves — separated by frequency band
    const SINE_WAVE_LANES: Array<{
        band: CircleBand;
        label: string;
        hueShift: number;
        cycles: number;
        speed: number;
        phase: number;
    }> = [
        { band: 'ground', label: 'BASS',   hueShift: 0,   cycles: 1.35, speed: 0.86, phase: 0.1 },
        { band: 'flow',   label: 'LOW',    hueShift: 30,  cycles: 1.60, speed: 1.00, phase: 0.9 },
        { band: 'form',   label: 'MID',    hueShift: 85,  cycles: 1.95, speed: 1.24, phase: 1.7 },
        { band: 'spark',  label: 'HIGH',   hueShift: 145, cycles: 2.40, speed: 1.58, phase: 2.6 },
        { band: 'air',    label: 'TREBLE', hueShift: 205, cycles: 2.90, speed: 1.95, phase: 3.5 },
    ];

    function drawBandSineWaves(W: number, H: number, hue: number) {
        const laneCount = SINE_WAVE_LANES.length;
        const leftX     = Math.max(120, W * 0.14);
        const rightX    = Math.min(W - 120, W * 0.86);
        const width     = Math.max(200, rightX - leftX);
        const topY      = H * 0.28;
        const bottomY   = H * 0.72;
        const spacing   = laneCount > 1 ? (bottomY - topY) / (laneCount - 1) : 0;
        const segments  = vizState.reduceMotion ? 110 : 220;
        const bandLabelX = leftX - 12;
        const tSec      = time;

        ctx.font = '700 11px system-ui';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        for (let laneIndex = 0; laneIndex < laneCount; laneIndex++) {
            const lane = SINE_WAVE_LANES[laneIndex];
            const level = circleBandState[lane.band];
            if (level <= 0.0006) continue;

            const laneY      = topY + laneIndex * spacing;
            const laneHue    = hue + lane.hueShift;
            const ampBase    = vizState.reduceMotion ? 3.5 : 6;
            const amplitude  = ampBase + level * (vizState.highContrast ? 54 : 44);
            const waveCycles = lane.cycles + level * 0.9;
            const waveSpeed  = lane.speed * (vizState.reduceMotion ? 0.45 : 1);
            const phase      = tSec * waveSpeed + lane.phase;
            const lineWidth  = (1.9 + level * 4.4) * (vizState.highContrast ? 1.3 : 1);
            const lum        = vizState.highContrast ? 64 + level * 30 : 44 + level * 34;

            const getY = (xFrac: number) => {
                const theta = xFrac * Math.PI * 2 * waveCycles + phase;
                const primary = Math.sin(theta) * amplitude;
                const secondary = Math.sin(theta * 0.5 + phase * 0.8) * amplitude * 0.25;
                return laneY + primary + secondary;
            };

            const grad = ctx.createLinearGradient(leftX, laneY, rightX, laneY);
            grad.addColorStop(0, `oklch(${lum - 8}% 0.30 ${laneHue})`);
            grad.addColorStop(0.5, `oklch(${lum + 8}% 0.40 ${laneHue + 55})`);
            grad.addColorStop(1, `oklch(${lum + 2}% 0.35 ${laneHue + 115})`);

            ctx.beginPath();
            for (let i = 0; i <= segments; i++) {
                const frac = i / segments;
                const x = leftX + frac * width;
                const y = getY(frac);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }

            if (vizState.waveTrails && !vizState.reduceMotion) {
                ctx.beginPath();
                for (let i = 0; i <= segments; i++) {
                    const frac = i / segments;
                    const x = leftX + frac * width;
                    const theta = frac * Math.PI * 2 * waveCycles + (phase - 0.95);
                    const trailPrimary = Math.sin(theta) * amplitude * 0.96;
                    const trailSecondary = Math.sin(theta * 0.5 + phase * 0.8 - 0.45) * amplitude * 0.22;
                    const y = laneY + trailPrimary + trailSecondary;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.strokeStyle = `oklch(${lum + 4}% 0.22 ${laneHue + 40} / ${0.22 + level * 0.20})`;
                ctx.lineWidth = Math.max(1.1, lineWidth * 0.66);
                ctx.stroke();
            }

            if (vizState.neonGlow) {
                ctx.save();
                ctx.globalAlpha = 0.24 + level * 0.24;
                ctx.strokeStyle = `oklch(${lum + 10}% 0.42 ${laneHue + 35})`;
                ctx.lineWidth = lineWidth * 2.2;
                ctx.stroke();
                ctx.restore();
            }

            ctx.strokeStyle = grad;
            ctx.lineWidth = lineWidth;
            ctx.stroke();

            if (!vizState.reduceMotion && vizState.neonGlow) {
                const sweep = (tSec * (0.12 + laneIndex * 0.018) + laneIndex * 0.17) % 1;
                const tipX = leftX + sweep * width;
                const tipY = getY(sweep);
                const tipGlow = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, 22 + level * 30);
                tipGlow.addColorStop(0, `oklch(96% 0.46 ${laneHue + 90} / ${0.70 + level * 0.24})`);
                tipGlow.addColorStop(1, `oklch(${lum}% 0.24 ${laneHue + 140} / 0)`);
                ctx.beginPath();
                ctx.arc(tipX, tipY, 16 + level * 14, 0, Math.PI * 2);
                ctx.fillStyle = tipGlow;
                ctx.fill();
            }

            const laneLabelLum = (vizState.highContrast ? 84 : 76) + level * 10;
            const laneText = lane.label;
            const laneMetrics = ctx.measureText(laneText);
            const lanePadX = 7;
            const lanePillH = 18;
            const lanePillW = Math.max(54, laneMetrics.width + lanePadX * 2);
            const lanePillX = bandLabelX - lanePillW - 4;
            const lanePillY = laneY - lanePillH / 2;

            ctx.beginPath();
            ctx.roundRect(lanePillX, lanePillY, lanePillW, lanePillH, 8);
            ctx.fillStyle = `oklch(15% 0.03 ${laneHue} / 0.72)`;
            ctx.fill();
            ctx.strokeStyle = `oklch(36% 0.12 ${laneHue + 20} / 0.55)`;
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.shadowColor = `oklch(${laneLabelLum}% 0.28 ${laneHue + 30} / 0.55)`;
            ctx.shadowBlur = 7;
            ctx.fillStyle = `oklch(${laneLabelLum}% 0.18 ${laneHue + 12})`;
            ctx.fillText(laneText, bandLabelX - 8, laneY);
            ctx.shadowBlur = 0;
        }

        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }

    // 4. Frequency bars — iridescent with peak hold, shimmer, tip burst
    const FREQ_BARS = [
        { id: 'air',    label: 'TREBLE/HIGH', hueShift: 80 },
        { id: 'spark',  label: 'TREBLE',      hueShift: 60 },
        { id: 'form',   label: 'MID',         hueShift: 40 },
        { id: 'flow',   label: 'LOWMID',      hueShift: 20 },
        { id: 'ground', label: 'BASS',        hueShift:  0 },
    ] as const;

    function drawFrequencyBars(W: number, H: number, bands: ReturnType<typeof getBands>, hue: number) {
        const barH    = 30;
        const gap     = 13;
        const rows    = FREQ_BARS.length;
        const totalH  = rows * (barH + gap) - gap;
        const maxBarW = Math.min(W * 0.34, 280);
        const leftX   = 14;
        const labelW  = 92;
        const barX    = leftX + labelW + 6;
        const startY  = H - 42 - totalH;
        const nowMs   = performance.now();
        const tSec    = nowMs * 0.001;

        ctx.font         = '800 11px system-ui';
        ctx.textBaseline = 'middle';

        for (let i = 0; i < rows; i++) {
            const { id, label, hueShift } = FREQ_BARS[i];
            const y      = startY + i * (barH + gap);
            const midY   = y + barH / 2;
            const energy = (bands as Record<string, number>)[id] ?? 0;
            const bHue   = hue + hueShift;
            const lum    = vizState.highContrast ? 58 + energy * 28 : 38 + energy * 40;
            const pk     = peakHold[i];

            if (energy > pk.val) {
                pk.val = energy; pk.heldAt = nowMs;
            } else if (nowMs - pk.heldAt > PEAK_HOLD_MS) {
                pk.val = Math.max(0, pk.val - 0.004);
            }

            ctx.textAlign = 'right';
            const labelX = leftX + labelW;
            const textMetrics = ctx.measureText(label);
            const textPadX = 8;
            const textPillH = 18;
            const textPillW = Math.max(56, textMetrics.width + textPadX * 2);
            const textPillX = labelX - textPillW - 3;
            const textPillY = midY - textPillH / 2;

            ctx.beginPath();
            ctx.roundRect(textPillX, textPillY, textPillW, textPillH, 8);
            ctx.fillStyle = `oklch(14% 0.03 ${bHue} / 0.78)`;
            ctx.fill();
            ctx.strokeStyle = `oklch(34% 0.11 ${bHue + 16} / 0.62)`;
            ctx.lineWidth = 1;
            ctx.stroke();

            const labelLum = (vizState.highContrast ? 86 : 76) + energy * 12;
            ctx.shadowColor = `oklch(${labelLum}% 0.24 ${bHue + 25} / 0.55)`;
            ctx.shadowBlur = 6;
            ctx.fillStyle = `oklch(${labelLum}% 0.16 ${bHue + 8})`;
            ctx.fillText(label, labelX - 7, midY);
            ctx.shadowBlur = 0;

            ctx.beginPath();
            ctx.roundRect(barX, y, maxBarW, barH, 8);
            ctx.fillStyle = `oklch(9% 0.03 ${bHue})`;
            ctx.fill();

            if (energy > 0.005) {
                const filled = maxBarW * Math.min(energy, 1);

                if (vizState.neonGlow) {
                    ctx.beginPath();
                    ctx.roundRect(barX - 3, y - 5, filled + 6, barH + 10, 10);
                    ctx.fillStyle = `oklch(${lum}% 0.38 ${bHue} / 0.30)`;
                    ctx.fill();
                }

                const barGrad = ctx.createLinearGradient(barX, 0, barX + filled, 0);
                barGrad.addColorStop(0,    `oklch(${lum}%      0.36 ${bHue})`);
                barGrad.addColorStop(0.45, `oklch(${lum + 12}% 0.46 ${bHue + 45})`);
                barGrad.addColorStop(1,    `oklch(${lum + 24}% 0.54 ${bHue + 90})`);
                ctx.beginPath();
                ctx.roundRect(barX, y, filled, barH, 8);
                ctx.fillStyle = barGrad;
                ctx.fill();

                if (!vizState.reduceMotion && vizState.neonGlow) {
                    const sweepFrac = Math.sin(tSec * 1.8 + i * 1.1) * 0.5 + 0.5;
                    const sweepX    = barX + sweepFrac * filled;
                    const shimW     = Math.max(20, Math.min(filled * 0.35, 80));
                    const sh = ctx.createLinearGradient(sweepX - shimW, 0, sweepX + shimW, 0);
                    sh.addColorStop(0,   `oklch(98% 0.40 ${bHue + 120} / 0)`);
                    sh.addColorStop(0.5, `oklch(98% 0.40 ${bHue + 120} / 0.42)`);
                    sh.addColorStop(1,   `oklch(98% 0.40 ${bHue + 120} / 0)`);
                    ctx.save();
                    ctx.beginPath();
                    ctx.roundRect(barX, y, filled, barH, 8);
                    ctx.clip();
                    ctx.fillStyle = sh;
                    ctx.fillRect(sweepX - shimW, y, shimW * 2, barH);
                    ctx.restore();
                }

                if (vizState.neonGlow && energy > 0.55) {
                    const tipAlpha = ((energy - 0.55) / 0.45) * 0.90;
                    const tipX = barX + filled;
                    const tg = ctx.createRadialGradient(tipX, midY, 0, tipX, midY, barH * 1.3);
                    tg.addColorStop(0, `oklch(98% 0.54 ${bHue + 90} / ${tipAlpha})`);
                    tg.addColorStop(1, `oklch(80% 0.34 ${bHue + 130} / 0)`);
                    ctx.beginPath();
                    ctx.arc(tipX, midY, barH * 1.3, 0, Math.PI * 2);
                    ctx.fillStyle = tg;
                    ctx.fill();
                }
            }

            if (pk.val > 0.01) {
                const pkX = barX + maxBarW * Math.min(pk.val, 1);
                const pkA = Math.min(1, pk.val * 2);
                ctx.beginPath();
                ctx.roundRect(pkX - 5, y, 9, barH, 4);
                ctx.fillStyle = `oklch(88% 0.44 ${bHue + 60} / ${pkA * 0.28})`;
                ctx.fill();
                ctx.beginPath();
                ctx.roundRect(pkX - 2, y + 4, 3, barH - 8, 2);
                ctx.fillStyle = `oklch(96% 0.52 ${bHue + 60} / ${pkA})`;
                ctx.fill();
            }
        }

        ctx.textAlign    = 'left';
        ctx.textBaseline = 'alphabetic';
    }

    // 5. Pulse rings — iridescent
    function drawPulseRings(cx: number, cy: number, hue: number) {
        pulseRings = pulseRings.filter(r => r.life < r.maxLife);
        for (const ring of pulseRings) {
            const progress = ring.life / ring.maxLife;
            const r        = ring.r + (ring.maxR - ring.r) * progress;
            const alpha    = (1 - progress) * 0.9;
            const lw       = (4 - progress * 3) * (vizState.highContrast ? 2 : 1);
            const rGrad    = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
            rGrad.addColorStop(0,   `oklch(80% 0.42 ${hue + ring.life * 4})`);
            rGrad.addColorStop(0.5, `oklch(88% 0.48 ${hue + 80 + ring.life * 3})`);
            rGrad.addColorStop(1,   `oklch(82% 0.44 ${hue + 160 + ring.life * 2})`);
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.strokeStyle = rGrad;
            ctx.lineWidth   = lw;
            ctx.globalAlpha = alpha;
            ctx.stroke();
            ctx.globalAlpha = 1;
            ring.life++;
        }
    }

    // ── Main render frame ─────────────────────────────────────────────────────

    function renderFrame() {
        const W = canvas.width, H = canvas.height;
        if (W === 0 || H === 0) return;
        ctx.clearRect(0, 0, W, H);

        // Feed metric graphs from raw analyser data; capture energy for beat detection
        let metricsEnergy = 0;
        if (metricsAnalyser) {
            const freqData = new Uint8Array(metricsAnalyser.frequencyBinCount);
            const timeData = new Uint8Array(metricsAnalyser.fftSize);
            metricsAnalyser.getByteFrequencyData(freqData);
            metricsAnalyser.getByteTimeDomainData(timeData);
            const features = getAudioFeatures(freqData, timeData);
            const { isBeat: _isBeat, ...numericFeatures } = features;
            updateMetricBars(numericFeatures);
            metricsEnergy = features.energy as number;
        }

        const cx  = W / 2, cy = H / 2;
        const now = performance.now();
        const baseHue = vizState.colorblindMode
            ? (COLORBLIND_MAP[currentMoodId] ?? vizState.moodHue)
            : vizState.moodHue;
        const driftShift = vizState.hueDrift ? (now * 0.02) % 360 : 0;
        const hue = (baseHue + driftShift) % 360;
        const bands = getBands();
        updateCircleBandState(bands, now);
        const levels = updateSphereLabels(bands);

        // Advance beat grid slot
        if (now - lastGridAdvance > GRID_SLOT_MS) {
            beatGridIdx = (beatGridIdx + 1) % BEAT_GRID_SIZE;
            beatGrid[beatGridIdx] = false;
            lastGridAdvance = now;
        }

        // Beat → accent flash + grid (use metricsAnalyser energy — same source as the metrics panel)
        if (detectBeat(metricsEnergy > 0 ? metricsEnergy : bands.overall, now)) {
            if (!vizState.reduceMotion && vizState.sparkRingEnabled) {
                beatFlashAlpha = vizState.partyMode ? 1.35 : 1;
            }
            beatGrid[beatGridIdx] = true;
            if (!vizState.reduceMotion && vizState.sparkRingEnabled && vizState.partyMode) {
                spawnPulseRing(cx, cy, hue);
            }
        }
        if (beatFlashAlpha > 0) {
            const beatDecay = vizState.partyMode ? 0.018 : 0.03;
            beatFlashAlpha = Math.max(0, beatFlashAlpha - beatDecay);
        }

        window.dispatchEvent(new CustomEvent('viz:band-levels', {
            detail: {
                ...levels,
                overall: bands.overall,
                envelope: (levels.bass + levels.lowmid + levels.mid + levels.trebleHigh) / 4,
                hitStrength: beatFlashAlpha,
                timestampSec: now * 0.001,
            },
        }));

        // Draw order
        if (!isXrTransparentView) {
            drawBackground(cx, cy, bands, hue);
        }
        if (!vizState.reduceMotion) {
            time += 0.016;
            if (!isXrTransparentView) {
                drawBeatFlash(W, H, hue);
            }
        }
        drawFrequencyBars(W, H, bands, hue);
        drawBandSineWaves(W, H, hue);
        if (vizState.partyMode) drawPulseRings(cx, cy, hue);

        if (pulsePreview) {
            pulsePreview.style.transform = `scale(${1 + bands.overall * 0.5})`;
        }
    }

    // ── Hint overlay ──────────────────────────────────────────────────────────

    let hintTimeout: ReturnType<typeof setTimeout> | null = null;

    function showHint() {
        if (!vizHint) return;
        vizHint.dataset.state = 'visible';
        if (hintTimeout) clearTimeout(hintTimeout);
        hintTimeout = setTimeout(() => { if (vizHint) delete vizHint.dataset.state; }, 7000);
    }

    function hideHint() {
        if (hintTimeout) {
            clearTimeout(hintTimeout);
            hintTimeout = null;
        }
        if (vizHint) delete vizHint.dataset.state;
    }

    // ── Capture control ───────────────────────────────────────────────────────

    let bufferSource: AudioBufferSourceNode | null = null;
    let sourceNode:   AudioNode | null = null;
    let mediaStream:  MediaStream | null = null;

    function setOverlay(s: 'idle' | 'running') {
        if (overlay) overlay.dataset.state = s;
    }

    function setRunning(on: boolean) {
        vizState.running = on;
        vizState.paused  = false;
        if (pauseBtn) {
            pauseBtn.disabled    = !on;
            pauseBtn.textContent = 'Pause';
        }
    }

    function stopCapture() {
        if (bufferSource) {
            try {
                bufferSource.stop();
            } catch (err) {
                console.error('Error stopping buffer source:', err);
            }
            bufferSource.disconnect();
            bufferSource = null;
        }
        if (sourceNode) {
            sourceNode.disconnect();
            sourceNode = null;
        }
        try {
            audioMotion?.disconnectInput();
        } catch (err) {
            console.error('Error disconnecting audio input:', err);
        }
        if (mediaStream) {
            mediaStream.getTracks().forEach(t => t.stop());
            mediaStream = null;
        }

        if (vizFileInput)    vizFileInput.value       = '';
        if (speakerStartBtn) speakerStartBtn.disabled = false;
        if (speakerStopBtn)  speakerStopBtn.disabled  = true;
        if (micStartBtn)     micStartBtn.disabled     = false;
        if (micStopBtn)      micStopBtn.disabled      = true;

        setRunning(false);
        setOverlay('idle');
        hideHint();

        pulseRings     = [];
        beatFlashAlpha = 0;
        beatEMA        = 0;
        beatGrid.fill(false);

        state.energyHistory.length = 0;
        state.prevSpectrum = null;
        state.onsetTimes.length = 0;
        state.energyEMA = 0;
        updateSphereLabels({ ground: 0, flow: 0, form: 0, spark: 0, air: 0, overall: 0 });
        resetMetricBars();
    }

    async function ensureAudioCtx() {
        if (!audioMotion) initAudioMotion();
        const actx = audioMotion!.audioCtx;
        if (actx.state === 'suspended') await actx.resume();
        return actx;
    }

    // ── File ──────────────────────────────────────────────────────────────────

    vizFileInput?.addEventListener('change', async () => {
        const file = vizFileInput.files?.[0];
        if (!file) return;
        stopCapture();
        try {
            const actx = await ensureAudioCtx();
            const audioBuffer = await actx.decodeAudioData(await file.arrayBuffer());
            bufferSource = actx.createBufferSource();
            bufferSource.buffer = audioBuffer;
            audioMotion!.connectInput(bufferSource);
            bufferSource.connect(actx.destination);
            if (metricsAnalyser) bufferSource.connect(metricsAnalyser);
            bufferSource.start(actx.currentTime + 0.05);
            bufferSource.onended = () => {
                try {
                    audioMotion?.disconnectInput(bufferSource!);
                } catch (err) {
                    console.error('Error disconnecting buffer source:', err);
                }
                bufferSource = null;
                setRunning(false);
                setOverlay('idle');
            };
            setRunning(true);
            setOverlay('running');
            showHint();
        } catch (err) {
            console.error('Audio file error:', err);
            alert('Could not decode this audio file. Try MP3, WAV, or OGG.');
        }
    });

    // ── Speaker capture ───────────────────────────────────────────────────────

    speakerStartBtn?.addEventListener('click', async () => {
        stopCapture();
        try {
            mediaStream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
            const audioTracks = mediaStream.getAudioTracks();
            if (audioTracks.length === 0) {
                alert('No audio track found. Make sure to check "Share audio" in the browser prompt.');
                mediaStream.getTracks().forEach(t => t.stop());
                mediaStream = null;
                return;
            }
            mediaStream.getVideoTracks().forEach(t => t.stop());
            const actx = await ensureAudioCtx();
            sourceNode = actx.createMediaStreamSource(mediaStream);
            audioMotion!.connectInput(sourceNode);
            if (metricsAnalyser) sourceNode.connect(metricsAnalyser);
            audioTracks[0].onended = stopCapture;
            if (speakerStartBtn) speakerStartBtn.disabled = true;
            if (speakerStopBtn)  speakerStopBtn.disabled  = false;
            setRunning(true);
            setOverlay('running');
            showHint();
        } catch (err: unknown) {
            if ((err as { name?: string }).name !== 'NotAllowedError') {
                console.error('Speaker capture error:', err);
                alert('Could not start audio capture.');
            }
        }
    });

    speakerStopBtn?.addEventListener('click', stopCapture);

    // ── Microphone ────────────────────────────────────────────────────────────

    micStartBtn?.addEventListener('click', async () => {
        stopCapture();
        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const actx = await ensureAudioCtx();
            sourceNode = actx.createMediaStreamSource(mediaStream);
            audioMotion!.connectInput(sourceNode);
            if (metricsAnalyser) sourceNode.connect(metricsAnalyser);
            mediaStream.getAudioTracks()[0].onended = stopCapture;
            if (micStartBtn) micStartBtn.disabled = true;
            if (micStopBtn)  micStopBtn.disabled  = false;
            setRunning(true);
            setOverlay('running');
            showHint();
        } catch (err: unknown) {
            if ((err as { name?: string }).name !== 'NotAllowedError') {
                console.error('Microphone error:', err);
                alert('Could not access the microphone.');
            }
        }
    });

    micStopBtn?.addEventListener('click', stopCapture);

    // ── Playback controls ─────────────────────────────────────────────────────

    pauseBtn?.addEventListener('click', () => {
        if (!audioMotion || !vizState.running) return;
        vizState.paused = !vizState.paused;
        audioMotion.toggleAnalyzer(!vizState.paused);
        if (pauseBtn) pauseBtn.textContent = vizState.paused ? 'Resume' : 'Pause';
    });
    resetBtn?.addEventListener('click', stopCapture);

    // ── Tab switching ─────────────────────────────────────────────────────────

    document.querySelectorAll<HTMLButtonElement>('.viz-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            if (tab.dataset.state === 'active') return;
            stopCapture();
            const mode = tab.dataset.mode!;
            document.querySelectorAll<HTMLElement>('.viz-tab').forEach(t => {
                t.dataset.state = '';
                t.setAttribute('aria-selected', 'false');
            });
            tab.dataset.state = 'active';
            tab.setAttribute('aria-selected', 'true');
            document.querySelectorAll<HTMLElement>('.viz-input-panel').forEach(p => {
                p.dataset.state = p.id === `panel-${mode}` ? 'active' : '';
            });
        });
    });

    // ── Mood buttons ──────────────────────────────────────────────────────────

    document.querySelectorAll<HTMLButtonElement>('.viz-mood-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll<HTMLElement>('.viz-mood-btn').forEach(b => {
                b.dataset.state = '';
                b.setAttribute('aria-pressed', 'false');
            });
            btn.dataset.state = 'active';
            btn.setAttribute('aria-pressed', 'true');
            currentMoodId = btn.dataset.mood ?? 'calm';
            applyMoodHue(Number(btn.dataset.hue ?? 210));
        });
    });

    // ── Energy layer checkboxes ───────────────────────────────────────────────

    document.querySelectorAll<HTMLInputElement>('.viz-layer__toggle').forEach(toggle => {
        toggle.addEventListener('change', () => {
            const id = toggle.dataset.layer!;
            if (vizState.layers[id]) {
                vizState.layers[id].enabled = toggle.checked;
                const wrap = document.getElementById(`layer-wrap-${id}`);
                if (wrap) wrap.dataset.active = String(toggle.checked);
            }
        });
    });

    // ── Visual option toggles ─────────────────────────────────────────────────

    function bindToggle(id: string, setter: (v: boolean) => void) {
        const el = document.getElementById(id) as HTMLInputElement | null;
        el?.addEventListener('change', e => setter((e.target as HTMLInputElement).checked));
    }
    bindToggle('sparkRingToggle', v => { vizState.sparkRingEnabled = v; });
    bindToggle('highContrast',    v => { vizState.highContrast     = v; });
    bindToggle('colorblindMode',  v => { vizState.colorblindMode   = v; });
    bindToggle('reduceMotion',    v => { vizState.reduceMotion = v; });

    // Sync reduceMotion with prefers-reduced-motion
    const motionMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
    function applyMotionMQ(matches: boolean) {
        const el = document.getElementById('reduceMotion') as HTMLInputElement | null;
        if (matches) {
            vizState.reduceMotion = true;
            if (el) el.checked = true;
        }
    }
    applyMotionMQ(motionMQ.matches);
    motionMQ.addEventListener('change', e => applyMotionMQ(e.matches));
    bindToggle('smoothMode',      v => { vizState.smoothMode        = v; });
    bindToggle('neonGlow',        v => { vizState.neonGlow          = v; });
    bindToggle('waveTrails',      v => { vizState.waveTrails        = v; });
    bindToggle('hueDrift',        v => { vizState.hueDrift          = v; });
    bindToggle('partyMode',       v => { vizState.partyMode         = v; });

    // ── Help dropdown ─────────────────────────────────────────────────────────

    document.getElementById('vizHelpBtn')?.addEventListener('click', () => {
        const drop = document.getElementById('vizHelpDrop');
        const btn  = document.getElementById('vizHelpBtn') as HTMLButtonElement | null;
        if (!drop || !btn) return;
        const isOpen = drop.dataset.state === 'open';
        drop.dataset.state = isOpen ? '' : 'open';
        btn.setAttribute('aria-expanded', String(!isOpen));
        btn.classList.toggle('active', !isOpen);
    });

    // ── Cleanup ───────────────────────────────────────────────────────────────

    return () => {
        stopCapture();
        audioMotion?.destroy();
        resizeObserver.disconnect();
    };
}
