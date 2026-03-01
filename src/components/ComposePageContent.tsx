import IndexScriptRunner from '@/components/IndexScriptRunner';
import '@/styles/pages/index.scss';

const moods = [
    { label: 'Intense & Powerful',     emoji: '🔥', value: 'intense, powerful, forceful',         color: '#ff4500', pulse: 'sharp'  },
    { label: 'Calm & Flowing',         emoji: '🌊', value: 'calm, flowing, serene',                color: '#4a90e2', pulse: 'slow'   },
    { label: 'Mysterious & Deep',      emoji: '🌙', value: 'mysterious, deep, brooding',           color: '#7b3fc4', pulse: 'drift'  },
    { label: 'Bright & Happy',         emoji: '☀️', value: 'bright, happy, cheerful',              color: '#f5c400', pulse: 'bounce' },
    { label: 'Emotional & Reflective', emoji: '💔', value: 'emotional, reflective, heartfelt',     color: '#e94560', pulse: 'deep'   },
    { label: 'Dreamy & Floating',      emoji: '🌌', value: 'dreamy, floating, ethereal',           color: '#7b68ee', pulse: 'float'  },
    { label: 'Fast & Energetic',       emoji: '⚡', value: 'fast, energetic, electric',            color: '#00e676', pulse: 'rapid'  },
];

const energyOptions = [
    { label: 'Grow slowly',           value: 'gradually building, slow growth',      pattern: 'rise',    icon: '📈', hint: 'See the rhythm rise' },
    { label: 'Explode with energy',   value: 'explosive, sudden burst of energy',    pattern: 'explode', icon: '💥', hint: 'Feel the sudden burst' },
    { label: 'Stay minimal & quiet',  value: 'minimal, quiet, stripped back',        pattern: 'minimal', icon: '🤫', hint: 'Watch the stillness' },
    { label: 'Pulse steadily',        value: 'steady, consistent rhythmic pulsing',  pattern: 'steady',  icon: '💓', hint: 'Feel the heartbeat' },
    { label: 'Feel chaotic',          value: 'chaotic, wild, unpredictable energy',  pattern: 'chaos',   icon: '🌀', hint: 'Watch the chaos move' },
    { label: 'Feel smooth & flowing', value: 'smooth, fluid, continuous motion',     pattern: 'smooth',  icon: '〰️', hint: 'See the flow' },
];

const sections = [
    { id: 'intro',  icon: '🎬', name: 'Intro',   question: "Let's build your story. What should your Intro feel like?",  placeholder: 'Add your own details for the intro…' },
    { id: 'verse1', icon: '📖', name: 'Verse 1', question: 'What should your first Verse feel like?',                      placeholder: 'Describe your first verse further…' },
    { id: 'chorus', icon: '🎆', name: 'Chorus',  question: "What should your Chorus — the big moment — feel like?",       placeholder: 'Describe the chorus further…' },
    { id: 'verse2', icon: '📗', name: 'Verse 2', question: 'How does your second Verse evolve the story?',                 placeholder: 'Describe your second verse further…' },
    { id: 'bridge', icon: '🌉', name: 'Bridge',  question: 'What unexpected shift should your Bridge bring?',              placeholder: 'Describe the bridge further…' },
    { id: 'outro',  icon: '🌅', name: 'Outro',   question: 'How should your story end? What should the Outro feel like?', placeholder: 'Describe the outro further…' },
];

export default function ComposePageContent() {
    return (
        <>
            <div className="compose-page" enable-xr={true}>

                {/* ── Header ──────────────────────────────────────────── */}
                <header className="compose-header">
                    <h1 className="compose-header__title">🎵 Compose Your Music</h1>
                    <p className="compose-header__subtitle">Express your rhythm. Shape your feeling. Build your story — your way.</p>
                    <a href="#/view" className="btn secondary">🎨 Audio Visualizer</a>
                </header>

                {/* ── Step 1 · Mood ─────────────────────────────────── */}
                <section className="step-card" id="step-mood">
                    <div className="step-card__badge">Step 1</div>
                    <h2 className="step-card__title">What energy do you want your music to feel like today?</h2>
                    <p className="step-card__hint">Hover each card — watch how the atmosphere shifts visually.</p>

                    <div className="mood-grid" id="mood-grid">
                        {moods.map(m => (
                            <button
                                key={m.value}
                                className="mood-btn"
                                data-mood={m.value}
                                data-color={m.color}
                                data-pulse={m.pulse}
                                type="button"
                                aria-pressed="false"
                            >
                                <span className="mood-btn__emoji">{m.emoji}</span>
                                <span className="mood-btn__label">{m.label}</span>
                                <div className="mood-viz" aria-hidden="true">
                                    {Array.from({ length: 8 }).map((_, i) => (
                                        <span key={i}></span>
                                    ))}
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="song-identity">
                        <label className="song-identity__label" htmlFor="song-concept">
                            What is this song about?
                            <span className="song-identity__optional">optional — helps every section feel like one song</span>
                        </label>
                        <input type="text" id="song-concept" className="song-identity__input"
                            placeholder="e.g. a journey through loss and hope, a summer road trip, feeling weightless…"
                            maxLength={200} />
                        <label className="song-identity__label" htmlFor="song-style">
                            Musical style
                            <span className="song-identity__optional">optional — e.g. electronic, acoustic folk, hip-hop</span>
                        </label>
                        <input type="text" id="song-style" className="song-identity__input"
                            placeholder="e.g. dark electronic, cinematic orchestral, lo-fi hip-hop…"
                            maxLength={100} />
                    </div>
                </section>

                {/* ── Step 2 · Sections ─────────────────────────────── */}
                <section className="step-card" id="step-sections">
                    <div className="step-card__badge">Step 2</div>
                    <h2 className="step-card__title">Build your story, section by section</h2>
                    <p className="step-card__hint">
                        For each part, choose how it moves — then watch the visual preview show you what it feels like.
                        Each section remembers the others so they all sound like one song.
                    </p>

                    <div className="song-map" id="song-map">
                        {sections.map(s => (
                            <div key={s.id} className="song-map__seg" data-section={s.id} id={`map-${s.id}`}>
                                <span className="song-map__icon">{s.icon}</span>
                                <span className="song-map__name">{s.name}</span>
                            </div>
                        ))}
                    </div>

                    <div className="song-sections">
                        {sections.map(s => (
                            <div key={s.id} className="section-block" data-section={s.id} id={`block-${s.id}`}>
                                <div className="section-block__head">
                                    <span className="section-block__icon">{s.icon}</span>
                                    <div className="section-block__meta">
                                        <span className="section-block__name">{s.name}</span>
                                        <span className="section-block__question">{s.question}</span>
                                    </div>
                                    <span className="section-block__status" id={`status-${s.id}`} data-state="idle">○ Not yet shaped</span>
                                </div>
                                <div className="section-block__body">
                                    <p className="section-block__body-label">Do you want this part to…</p>
                                    <div className="energy-grid" data-section={s.id}>
                                        {energyOptions.map(opt => (
                                            <button key={opt.pattern} className="energy-card"
                                                data-section={s.id} data-value={opt.value} data-pattern={opt.pattern}
                                                type="button" aria-pressed="false">
                                                <span className="energy-card__icon">{opt.icon}</span>
                                                <span className="energy-card__label">{opt.label}</span>
                                                <div className="rhythm-viz" data-pattern={opt.pattern} aria-hidden="true">
                                                    {Array.from({ length: 8 }).map((_, i) => (<span key={i}></span>))}
                                                </div>
                                                <span className="energy-card__hint">{opt.hint}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="lyrics-field">
                                        <div className="lyrics-field__head">
                                            <label className="lyrics-field__label" htmlFor={`lyrics-${s.id}`}>
                                                Lyrics for {s.name}
                                                <span className="lyrics-field__note">auto-suggested — edit freely or clear to skip</span>
                                            </label>
                                            <button className="btn secondary small" data-section={s.id}
                                                id={`lyrics-suggest-${s.id}`} type="button">↺ New suggestion</button>
                                        </div>
                                        <textarea className="lyrics-field__textarea" id={`lyrics-${s.id}`} rows={4}
                                            placeholder="Select an energy style above to get lyrics — or write your own here…" />
                                    </div>
                                    <label className="section-block__label" htmlFor={`text-${s.id}`}>Extra musical details (optional):</label>
                                    <textarea className="section-block__textarea" id={`text-${s.id}`} rows={2}
                                        placeholder={s.placeholder} />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Step 3 · Generate ─────────────────────────────── */}
                <section className="step-card" id="step-combine">
                    <div className="step-card__badge">Step 3</div>
                    <h2 className="step-card__title">Generate your song</h2>
                    <p className="step-card__hint">Configure your sections above, then generate your complete song in one go.</p>
                    <div className="combine-controls" id="combine-controls">
                        <button className="btn" id="generate-song-btn" type="button">✨ Generate Full Song</button>
                    </div>
                    <div id="combine-result"></div>
                </section>

            </div>

            <IndexScriptRunner />
        </>
    );
}
