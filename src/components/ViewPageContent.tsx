/**
 * Audio-to-Color page shell for the Vite app.
 * ViewScriptRunner hydrates the client-side audio engine.
 */

import { METRICS } from '@/lib/metrics';
import { VIEW_MOODS, VIEW_LAYERS } from '@/lib/config';
import ViewScriptRunner from '@/components/ViewScriptRunner';
import '@/styles/pages/view.scss';

export default function ViewPageContent() {
    return (
        <div className="view-scene-wrapper">
            <div className="view-page">
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
                                <p><strong>Sphere size</strong> = loudness &nbsp;·&nbsp; <strong>Sphere edge</strong> = smooth (bass) or jagged (treble)</p>
                                <p><strong>Bottom dots</strong> = rhythm pattern &nbsp;·&nbsp; <strong>Left bars</strong> = frequency energy</p>
                            </div>
                            <div className="viz-sphere-labels" aria-label="Sphere bands">
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
                                    <p className="viz-help-heading">Toggles</p>
                                    <dl className="viz-help-list">
                                        <dt>Spark Ring</dt>
                                        <dd>Iridescent rings burst outward from the center circle on every detected beat.</dd>
                                        <dt>High Contrast</dt>
                                        <dd>Boosts brightness of all colors — good for bright rooms or low-vision users.</dd>
                                        <dt>Colorblind Mode</dt>
                                        <dd>Shifts all colors to a deuteranopia-safe blue / orange / purple palette.</dd>
                                        <dt>Reduce Motion</dt>
                                        <dd>Freezes wave animations, beat flashes, and expanding rings. Beat grid and bars still react.</dd>
                                        <dt>Smooth Mode</dt>
                                        <dd>Slows beat detection — fewer triggers, better for calm or ambient music.</dd>
                                    </dl>
                                </div>
                                <div className="viz-help-section">
                                    <p className="viz-help-heading">Canvas elements</p>
                                    <dl className="viz-help-list">
                                        <dt>Center Circle</dt>
                                        <dd>Size = overall loudness. Jagged edge = treble energy. Smooth edge = bass-heavy or quiet.</dd>
                                        <dt>Freq Bars (left)</dt>
                                        <dd>BASS at bottom → AIR at top. Bar length = energy in that range. Bright mark = recent peak.</dd>
                                        <dt>Beat Grid (bottom dots)</dt>
                                        <dd>16 slots grouped in 4s. A glowing dot means a beat fired in that time window.</dd>
                                    </dl>
                                </div>
                                <div className="viz-help-section">
                                    <p className="viz-help-heading">Energy Layers (left panel)</p>
                                    <dl className="viz-help-list">
                                        <dt>Unchecking a layer</dt>
                                        <dd>Removes that frequency band from the circle, bars, and beat detection entirely.</dd>
                                    </dl>
                                </div>
                            </div>

                            <label className="viz-opt-toggle">
                                <input type="checkbox" className="viz-switch" id="sparkRingToggle" defaultChecked />
                                <span>Spark Ring</span>
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
                        </aside>

                    </main>
                </div>

                <ViewScriptRunner />
            </div>
        </div>
    );
}
