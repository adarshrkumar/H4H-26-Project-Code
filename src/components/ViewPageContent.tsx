/**
 * Audio-to-Color page shell for the Vite app.
 * ViewScriptRunner hydrates the client-side audio engine.
 */

import { METRICS } from '@/lib/metrics';
import { VIEW_MOODS, VIEW_LAYERS } from '@/lib/config';
import ViewScriptRunner from '@/components/ViewScriptRunner';
import ViewSpatialSpheres from '@/components/ViewSpatialSpheres';
import '@/styles/pages/view.scss';
import { useEffect, useState } from 'react';

interface SongFile { fileKey: string; fileUrl: string; }
interface Song { id: string; title: string | null; artist: string | null; files: SongFile[]; }

function getIdFromHash(): string | null {
    const hash = window.location.hash;
    const q = hash.indexOf('?');
    if (q === -1) return null;
    return new URLSearchParams(hash.slice(q + 1)).get('id');
}

function loadUrlIntoVisualizer(url: string) {
    // Fetch the audio as a blob then trigger the file input change so
    // viewScript's existing file-handler picks it up.
    fetch(url)
        .then(r => r.blob())
        .then(blob => {
            const input = document.getElementById('vizFileInput') as HTMLInputElement | null;
            if (!input) return;
            const file = new File([blob], 'track.mp3', { type: blob.type || 'audio/mpeg' });
            const dt = new DataTransfer();
            dt.items.add(file);
            input.files = dt.files;
            input.dispatchEvent(new Event('change', { bubbles: true }));
        })
        .catch(() => {/* silently ignore */});
}

export default function ViewPageContent() {
    const [hasUserInteracted, setHasUserInteracted] = useState(false);
    const [song, setSong] = useState<Song | null>(null);
    const isXrTransparentView =
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('xr') === '1';

    useEffect(() => {
        const id = getIdFromHash();
        if (!id) return;
        fetch(`/api/track/${encodeURIComponent(id)}`)
            .then(r => r.ok ? r.json() : null)
            .then((data: Song | null) => { if (data) setSong(data); })
            .catch(() => {/* ignore */});
    }, []);

    useEffect(() => {
        const bodyClass = 'view-xr-transparent';
        if (isXrTransparentView) document.body.classList.add(bodyClass);
        else document.body.classList.remove(bodyClass);
        return () => document.body.classList.remove(bodyClass);
    }, [isXrTransparentView]);

    useEffect(() => {
        if (!isXrTransparentView || hasUserInteracted) return;

        const markInteracted = () => setHasUserInteracted(true);
        window.addEventListener('pointerdown', markInteracted, { once: true, passive: true });
        window.addEventListener('keydown', markInteracted, { once: true });

        return () => {
            window.removeEventListener('pointerdown', markInteracted);
            window.removeEventListener('keydown', markInteracted);
        };
    }, [isXrTransparentView, hasUserInteracted]);

    return (
        <div className="view-scene-wrapper">
            <div className={`view-page${isXrTransparentView ? ' view-page--xr' : ''}`}>
                <div className="viz-page">

                    {/* ── Top bar ─────────────────────────────────────────── */}
                    <header className="viz-topbar">
                        <span className="viz-topbar__title">Huephonic</span>
                        <span className="viz-topbar__meta">Vite + API backend</span>

                        <nav className="viz-moods" aria-label="Override mood color">
                            {VIEW_MOODS.map(m => (
                                <button
                                    key={m.id}
                                    type="button"
                                    className="viz-mood-btn"
                                    data-mood={m.id}
                                    data-hue={m.hue}
                                    aria-pressed="false"
                                >
                                    <span className="viz-mood-btn__icon">{m.icon}</span>
                                    <span className="viz-mood-btn__label">{m.label}</span>
                                </button>
                            ))}
                        </nav>

                        <div className="viz-input-bar">
                            <div className="viz-tabs" role="tablist" aria-label="Audio source">
                                <button type="button" className="viz-tab" data-state="active" data-mode="file"    role="tab" aria-selected="true">File</button>
                                <button type="button" className="viz-tab" data-mode="speaker"                     role="tab" aria-selected="false">Speaker / Tab</button>
                                <button type="button" className="viz-tab" data-mode="mic"                         role="tab" aria-selected="false">Microphone</button>
                            </div>

                            <div className="viz-input-panels">
                                <div id="panel-file" className="viz-input-panel" data-state="active">
                                    <label htmlFor="vizFileInput" className="sr-only">Audio file</label>
                                    <input type="file" id="vizFileInput" accept="audio/*" />
                                </div>
                                <div id="panel-speaker" className="viz-input-panel">
                                    <button type="button" className="viz-btn" id="speakerStartBtn">Share Tab Audio</button>
                                    <button type="button" className="viz-btn viz-btn--ghost" id="speakerStopBtn" disabled>Stop</button>
                                </div>
                                <div id="panel-mic" className="viz-input-panel">
                                    <button type="button" className="viz-btn" id="micStartBtn">Use Microphone</button>
                                    <button type="button" className="viz-btn viz-btn--ghost" id="micStopBtn" disabled>Stop</button>
                                </div>
                            </div>
                        </div>

                        <div className="viz-playback">
                            <button type="button" className="viz-btn" id="vizPauseBtn" disabled>Pause</button>
                            <button type="button" className="viz-btn viz-btn--ghost" id="vizResetBtn">Reset</button>
                        </div>
                    </header>

                    {/* ── DB track banner (when id is in URL) ─────────────── */}
                    {song && (
                        <div className="viz-track-banner">
                            <span className="viz-track-banner__title">{song.title ?? 'Untitled'}</span>
                            {song.files.map((f, i) => (
                                <button
                                    key={f.fileKey}
                                    type="button"
                                    className="viz-btn"
                                    onClick={() => loadUrlIntoVisualizer(f.fileUrl)}
                                >
                                    ▶ Part {i + 1}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* ── Main ────────────────────────────────────────────── */}
                    <main className="viz-main">

                        {/* Left: Energy layer toggles */}
                        <aside className="viz-panel viz-panel--left" aria-label="Energy layers">
                            <p className="viz-panel__title">Energy Layers</p>
                            <p className="viz-panel__hint">Toggle each layer to show or hide its frequency band in the visualization.</p>
                            {VIEW_LAYERS.map(l => (
                                <div key={l.id} className="viz-layer" id={`layer-wrap-${l.id}`} data-active="true">
                                    <input
                                        type="checkbox"
                                        className="viz-layer__toggle"
                                        id={`toggle-${l.id}`}
                                        data-layer={l.id}
                                        defaultChecked
                                    />
                                    <label htmlFor={`toggle-${l.id}`}>
                                        <span className="viz-layer__icon">{l.icon}</span>
                                        <div className="viz-layer__text">
                                            <span className="viz-layer__name">{l.name}</span>
                                            <span className="viz-layer__freq">{l.freq}</span>
                                        </div>
                                        <div className="viz-layer__preview" aria-hidden="true">
                                            {Array.from({ length: 5 }, (_, i) => <span key={i} />)}
                                        </div>
                                    </label>
                                </div>
                            ))}
                        </aside>

                        {/* Center: canvas */}
                        <div className="viz-canvas-wrap">
                            <canvas id="viz-canvas" />
                            <div id="viz-am-hidden" aria-hidden="true" />
                            <div className="viz-overlay" id="vizOverlay" data-state="idle">
                                <p className="viz-overlay__text">Choose a source above to begin</p>
                            </div>
                            <div className="viz-hint" id="vizHint">
                                <p><strong>Wave Bands</strong> react separately to bass, low, mid, high, and treble.</p>
                            </div>
                            {isXrTransparentView && hasUserInteracted ? <ViewSpatialSpheres /> : null}
                            <div className="viz-sphere-labels" aria-label="Wave band levels">
                                <div className="viz-sphere-label" data-band="bass">
                                    <span className="viz-sphere-dot" aria-hidden="true" />
                                    <span className="viz-sphere-name">BASS</span>
                                    <span className="viz-sphere-value" id="sphere-val-bass">0%</span>
                                </div>
                                <div className="viz-sphere-label" data-band="lowmid">
                                    <span className="viz-sphere-dot" aria-hidden="true" />
                                    <span className="viz-sphere-name">LOWMID</span>
                                    <span className="viz-sphere-value" id="sphere-val-lowmid">0%</span>
                                </div>
                                <div className="viz-sphere-label" data-band="mid">
                                    <span className="viz-sphere-dot" aria-hidden="true" />
                                    <span className="viz-sphere-name">MID</span>
                                    <span className="viz-sphere-value" id="sphere-val-mid">0%</span>
                                </div>
                                <div className="viz-sphere-label" data-band="treble-high">
                                    <span className="viz-sphere-dot" aria-hidden="true" />
                                    <span className="viz-sphere-name">TREBLE/HIGH</span>
                                    <span className="viz-sphere-value" id="sphere-val-treble-high">0%</span>
                                </div>
                            </div>
                        </div>

                        {/* Right: visual options + metrics */}
                        <aside className="viz-panel viz-panel--right" aria-label="Visual options">
                            <div className="viz-panel__header">
                                <p className="viz-panel__title">Visual Options</p>
                                <button
                                    type="button"
                                    id="vizHelpBtn"
                                    className="viz-help-btn"
                                    aria-expanded="false"
                                    aria-controls="vizHelpDrop"
                                    title="What do these controls do?"
                                >?</button>
                            </div>

                            <div className="viz-help-drop" id="vizHelpDrop">
                                <div className="viz-help-section">
                                    <p className="viz-help-heading">Quick guide</p>
                                    <dl className="viz-help-list">
                                        <dt>Wave Bands</dt>
                                        <dd>Each sine wave maps to one band: bass, low, mid, high, or treble.</dd>
                                        <dt>Bars</dt>
                                        <dd>Longer bars mean stronger energy in that band.</dd>
                                        <dt>Beat Accent</dt>
                                        <dd>Adds an extra beat-synced flash layer.</dd>
                                    </dl>
                                </div>
                            </div>

                            <label className="viz-opt-toggle">
                                <input type="checkbox" className="viz-switch" id="sparkRingToggle" defaultChecked />
                                <span>Beat Accent</span>
                            </label>
                            <label className="viz-opt-toggle">
                                <input type="checkbox" className="viz-switch" id="highContrast" />
                                <span>High Contrast</span>
                            </label>
                            <label className="viz-opt-toggle">
                                <input type="checkbox" className="viz-switch" id="colorblindMode" />
                                <span>Colorblind Mode</span>
                            </label>
                            <label className="viz-opt-toggle">
                                <input type="checkbox" className="viz-switch" id="reduceMotion" />
                                <span>Reduce Motion</span>
                            </label>
                            <label className="viz-opt-toggle">
                                <input type="checkbox" className="viz-switch" id="smoothMode" />
                                <span>Smooth Mode</span>
                            </label>

                            <div className="viz-pulse-wrap">
                                <span className="viz-panel__title">Beat Pulse</span>
                                <div className="viz-pulse-preview" id="vizPulsePreview" aria-hidden="true" />
                            </div>

                            {!isXrTransparentView ? (
                                <>
                                    <p className="viz-panel__title">Metrics</p>
                                    <div id="metrics" className="metrics">
                                        {METRICS.map(({ key, label }) => (
                                            <div key={key} className="metric-panel">
                                                <div className="metric-panel__header">
                                                    <span className="metric-label" data-metric={key}>{label}</span>
                                                    <span className="metric-value" id={`val-${key}`}>0.00</span>
                                                </div>
                                                <canvas className="metric-graph" id={`graph-${key}`} width={400} height={60} />
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : null}
                        </aside>

                    </main>
                </div>

                <ViewScriptRunner />
            </div>
        </div>
    );
}
