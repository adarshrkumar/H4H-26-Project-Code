/**
 * View-page (Audio to Color) client-side logic.
 * Extracted from src/scripts/ViewScript.astro.
 *
 * Call `initViewScript()` once the page DOM is ready (e.g. inside useEffect).
 * Returns a cleanup function that stops the audio pipeline.
 */

import { METRICS } from '@/lib/metrics';

export function initViewScript(): () => void {
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

        const energy = (sum / N) / 255;

        const logCentroid = totalAmplitude > 0 ? weightedLogSum / totalAmplitude : 0;
        const brightness  = logCentroid / Math.log2(N);

        let spreadSum = 0;
        for (let i = 1; i < N; i++) {
            const d = Math.log2(i) - logCentroid;
            spreadSum += d * d * dataArray[i];
        }
        const spread = Math.min(1, totalAmplitude > 0
            ? Math.sqrt(spreadSum / totalAmplitude) / Math.log2(N) : 0);

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

        let flatness = 0;
        if (totalAmplitude > 0) {
            const n = N - 1;
            let logSum = 0;
            for (let i = 1; i < N; i++) logSum += Math.log(dataArray[i] + 1);
            const geoMean   = Math.exp(logSum / n);
            const arithMean = (totalAmplitude + n) / n;
            flatness = Math.min(1, geoMean / arithMean);
        }

        const bassEnd = Math.max(1, Math.floor(N * 0.10));
        let bassSum = 0;
        for (let i = 0; i < bassEnd; i++) bassSum += dataArray[i];
        const bassRatio = totalAmplitude > 0 ? Math.min(1, bassSum / totalAmplitude) : 0;

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

        let rolloff = 1;
        if (totalAmplitude > 0) {
            let cumulative = 0;
            const threshold = totalAmplitude * 0.85;
            for (let i = 0; i < N; i++) {
                cumulative += dataArray[i];
                if (cumulative >= threshold) { rolloff = i / N; break; }
            }
        }

        const subBassEnd = hz2bin(80);
        let subBassSum = 0;
        for (let i = 1; i <= subBassEnd; i++) subBassSum += dataArray[i];
        const subBass = totalAmplitude > 0 ? Math.min(1, subBassSum / totalAmplitude) : 0;

        const midStart = hz2bin(250), midEnd = hz2bin(4000);
        let midSum = 0;
        for (let i = midStart; i <= midEnd; i++) midSum += dataArray[i];
        const midRatio = totalAmplitude > 0 ? Math.min(1, midSum / totalAmplitude) : 0;

        const highStart = hz2bin(8000);
        let highSum = 0;
        for (let i = highStart; i < N; i++) highSum += dataArray[i];
        const highRatio = totalAmplitude > 0 ? Math.min(1, highSum / totalAmplitude) : 0;

        let rms = 0;
        if (timeDomainArray) {
            let sq = 0;
            for (let i = 0; i < timeDomainArray.length; i++) {
                const c = (timeDomainArray[i] - 128) / 128;
                sq += c * c;
            }
            rms = Math.sqrt(sq / timeDomainArray.length);
        }

        let crestFactor = 0;
        if (timeDomainArray && rms > 0.001) {
            let peak = 0;
            for (let i = 0; i < timeDomainArray.length; i++) {
                const a = Math.abs(timeDomainArray[i] - 128) / 128;
                if (a > peak) peak = a;
            }
            crestFactor = Math.min(1, (peak / rms) / 14);
        }

        let dynamicRange = 0;
        if (timeDomainArray) {
            let maxA = 0, minA = 255;
            for (let i = 0; i < timeDomainArray.length; i++) {
                if (timeDomainArray[i] > maxA) maxA = timeDomainArray[i];
                if (timeDomainArray[i] < minA) minA = timeDomainArray[i];
            }
            dynamicRange = (maxA - minA) / 255;
        }

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

        let harmonicRatio = 0;
        {
            const searchEnd = Math.floor(N * 0.25);
            let fundBin = 1, fundEnergy = 0;
            for (let i = 2; i < searchEnd; i++) {
                if (dataArray[i] > fundEnergy) { fundEnergy = dataArray[i]; fundBin = i; }
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
            if (chroma[i] > chromaMax) { chromaMax = chroma[i]; chromaMaxIdx = i; }
        }
        const chromaMean     = chromaTotal / 12;
        const chromaStrength = chromaMean > 0 ? Math.min(1, (chromaMax / chromaMean) / 4) : 0;
        const dominantPitch  = chromaMaxIdx / 11;

        let pitch = 0;
        {
            const pitchMinBin = hz2bin(50);
            const pitchMaxBin = hz2bin(2000);
            let peakBin = pitchMinBin, peakVal = 0;
            for (let i = pitchMinBin; i <= pitchMaxBin; i++) {
                if (dataArray[i] > peakVal) { peakVal = dataArray[i]; peakBin = i; }
            }
            if (peakVal > 20) {
                const hz = peakBin * sr / fftSz;
                pitch = Math.min(1, Math.max(0,
                    (Math.log2(hz) - Math.log2(50)) / (Math.log2(2000) - Math.log2(50))));
            }
        }

        state.energyHistory.push(energy);
        if (state.energyHistory.length > ENERGY_HISTORY) state.energyHistory.shift();
        let maxRise = 0;
        for (let i = 1; i < state.energyHistory.length; i++) {
            const rise = Math.max(0, state.energyHistory[i] - state.energyHistory[i - 1]);
            if (rise > maxRise) maxRise = rise;
        }
        const attackTime = Math.min(1, maxRise * 8);

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

        let roughness = 0;
        {
            let roughSum = 0;
            for (let i = 1; i < N - 1; i++) {
                if (dataArray[i] > 25 && dataArray[i - 1] > 25)
                    roughSum += Math.min(dataArray[i], dataArray[i - 1]);
            }
            roughness = totalAmplitude > 0 ? Math.min(1, roughSum / totalAmplitude) : 0;
        }

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
        const canvas = document.getElementById(`graph-${key}`) as HTMLCanvasElement | null;
        if (canvas) metricCtx[key] = canvas.getContext('2d')!;
        const valEl = document.getElementById(`val-${key}`);
        if (valEl) metricValEls[key] = valEl;
    }

    const FRAME_INTERVAL_MS = 1000 / 60;
    let   lastFrameTime     = 0;

    // ── Audio setup ───────────────────────────────────────────────────────────

    const audioFileInput  = document.getElementById('audioFile') as HTMLInputElement | null;
    const speakerStartBtn = document.getElementById('speakerStartBtn') as HTMLButtonElement | null;
    const speakerStopBtn  = document.getElementById('speakerStopBtn') as HTMLButtonElement | null;
    const micStartBtn     = document.getElementById('micStartBtn') as HTMLButtonElement | null;
    const micStopBtn      = document.getElementById('micStopBtn') as HTMLButtonElement | null;

    let audioContext:     AudioContext | null = null;
    let analyser:         AnalyserNode | null = null;
    let dataArray:        Uint8Array<ArrayBuffer> | null = null;
    let timeDomainArray:  Uint8Array<ArrayBuffer> | null = null;
    let animationFrameId: number | null = null;
    let sourceNode:       MediaStreamAudioSourceNode | null = null;
    let bufferSource:     AudioBufferSourceNode | null = null;
    let silentGain:       GainNode | null = null;
    let mediaStream:      MediaStream | null = null;

    async function ensureAudioContext() {
        if (!audioContext || audioContext.state === 'closed') {
            audioContext = new AudioContext();
            state.sampleRate = audioContext.sampleRate;
        }
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
    }

    function setupAnalyser() {
        analyser = audioContext!.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.78;
        dataArray       = new Uint8Array(analyser.frequencyBinCount);
        timeDomainArray = new Uint8Array(analyser.fftSize);
    }

    function resetMetricBars() {
        for (const { key } of METRICS) {
            metricHistory[key] = [];
            const ctx = metricCtx[key];
            if (ctx) {
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            }
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

    // ── Capture control ───────────────────────────────────────────────────────

    function stopCapture() {
        if (bufferSource) {
            try { bufferSource.stop(); } catch {}
            bufferSource.disconnect();
            bufferSource = null;
        }
        if (sourceNode)  { sourceNode.disconnect();  sourceNode  = null; }
        if (silentGain)  { silentGain.disconnect();  silentGain  = null; }
        if (analyser)    { analyser.disconnect();    analyser    = null; }
        if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
        if (audioContext) audioContext.onstatechange = null;
        if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; }

        dataArray       = null;
        timeDomainArray = null;

        if (speakerStartBtn) speakerStartBtn.disabled = false;
        if (speakerStopBtn)  speakerStopBtn.disabled  = true;
        if (micStartBtn)     micStartBtn.disabled     = false;
        if (micStopBtn)      micStopBtn.disabled      = true;

        state.energyHistory.length = 0;
        resetMetricBars();
    }

    // ── Tab switching ─────────────────────────────────────────────────────────

    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const mode = (tab as HTMLElement).dataset.mode;
            if ((tab as HTMLElement).dataset.state === 'active') return;
            stopCapture();
            document.querySelectorAll('.tab').forEach(t =>
                ((t as HTMLElement).dataset.state = t === tab ? 'active' : ''));
            document.querySelectorAll('.ctrl-panel').forEach(p =>
                ((p as HTMLElement).dataset.state = p.id === `ctrl-${mode}` ? 'active' : ''));
            if (audioFileInput) audioFileInput.value = '';
        });
    });

    // ── File input ────────────────────────────────────────────────────────────

    audioFileInput?.addEventListener('change', async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        stopCapture();
        try {
            await ensureAudioContext();
            setupAnalyser();
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const audioBuffer = await audioContext!.decodeAudioData(e.target!.result as ArrayBuffer);
                    bufferSource = audioContext!.createBufferSource();
                    bufferSource.buffer = audioBuffer;
                    bufferSource.connect(analyser!);
                    analyser!.connect(audioContext!.destination);
                    bufferSource.start(0);
                    bufferSource.onended = () => {
                        if (bufferSource) { bufferSource.disconnect(); bufferSource = null; }
                    };
                    if (!animationFrameId) drawVisualization();
                } catch (err) {
                    console.error('Audio decode error:', err);
                    alert('Could not decode this audio file. Try MP3, WAV, or OGG.');
                }
            };
            reader.onerror = () => alert('Could not read the selected file.');
            reader.readAsArrayBuffer(file);
        } catch (err) {
            console.error('Audio setup error:', err);
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
            await ensureAudioContext();
            setupAnalyser();
            sourceNode = audioContext!.createMediaStreamSource(mediaStream);
            sourceNode.connect(analyser!);
            audioTracks[0].onended = stopCapture;
            if (speakerStartBtn) speakerStartBtn.disabled = true;
            if (speakerStopBtn)  speakerStopBtn.disabled  = false;
            if (!animationFrameId) drawVisualization();
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
            await ensureAudioContext();
            setupAnalyser();
            sourceNode = audioContext!.createMediaStreamSource(mediaStream);
            silentGain = audioContext!.createGain();
            silentGain.gain.value = 0;
            sourceNode.connect(analyser!);
            analyser!.connect(silentGain);
            silentGain.connect(audioContext!.destination);
            audioContext!.onstatechange = () => {
                if (audioContext && audioContext.state === 'suspended') audioContext.resume();
            };
            mediaStream.getAudioTracks()[0].onended = stopCapture;
            if (micStartBtn) micStartBtn.disabled = true;
            if (micStopBtn)  micStopBtn.disabled  = false;
            if (!animationFrameId) drawVisualization();
        } catch (err: unknown) {
            if ((err as { name?: string }).name !== 'NotAllowedError') {
                console.error('Microphone error:', err);
                alert('Could not access the microphone.');
            }
        }
    });

    micStopBtn?.addEventListener('click', stopCapture);

    // ── Draw loop ─────────────────────────────────────────────────────────────

    function drawVisualization(timestamp = 0) {
        if (!analyser || (!bufferSource && !sourceNode)) {
            if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; }
            resetMetricBars();
            return;
        }

        animationFrameId = requestAnimationFrame(drawVisualization);

        if (timestamp - lastFrameTime < FRAME_INTERVAL_MS) return;
        lastFrameTime = timestamp;

        analyser.getByteFrequencyData(dataArray!);
        analyser.getByteTimeDomainData(timeDomainArray!);

        const features = getAudioFeatures(dataArray!, timeDomainArray!);
        const { isBeat: _isBeat, ...numericFeatures } = features;
        updateMetricBars(numericFeatures);
    }

    // ── Cleanup ───────────────────────────────────────────────────────────────

    return () => {
        stopCapture();
        if (audioContext && audioContext.state !== 'closed') {
            audioContext.close().catch(() => {});
        }
    };
}
