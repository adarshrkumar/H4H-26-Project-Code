/**
 * Index-page (Compose) client-side logic.
 * Extracted from src/scripts/IndexScript.astro.
 *
 * Call `initIndexScript()` once the page DOM is ready (e.g. inside useEffect).
 * Returns a cleanup function for React's useEffect contract.
 */

export function initIndexScript(): () => void {
    // ── Constants ──────────────────────────────────────────────────────────────

    const SECTION_IDS = ['intro', 'verse1', 'chorus', 'verse2', 'bridge', 'outro'] as const;
    type SectionId = typeof SECTION_IDS[number];

    const SECTION_LABELS: Record<SectionId, string> = {
        intro: 'Intro', verse1: 'Verse 1', chorus: 'Chorus',
        verse2: 'Verse 2', bridge: 'Bridge', outro: 'Outro',
    };

    const SECTION_MUSICAL_ROLE: Record<SectionId, string> = {
        intro:  'INTRO/OPENING: establish the mood and musical theme gradually, build anticipation, do NOT reach full chorus energy yet — hint at what is coming',
        verse1: 'VERSE 1: melodic foundation, moderate and steady energy, storytelling feel, build tension toward the chorus',
        chorus: 'CHORUS/REFRAIN: the emotional and musical PEAK of the song, full energy release, strong memorable hook, this must be the most impactful part',
        verse2: 'VERSE 2: similar structure to verse 1 but slightly more developed and intense, building back toward the chorus',
        bridge: 'BRIDGE: contrasting section, different feel from verses and chorus, create musical tension and surprise before the final chorus',
        outro:  'OUTRO/ENDING: bring the song to a natural close, resolve musical tension, wind down or fade — do NOT introduce new high-energy peaks',
    };

    const LYRICS_BY_ENERGY: Record<string, Record<SectionId, string>> = {
        rise: {
            intro:  'Something stirs in the silence\nA feeling starts to rise\nThe story opens slowly\nOpening tired eyes',
            verse1: "I've been standing at this edge\nFeeling it begin to grow\nSlowly finding footing\nLearning as I go",
            chorus: 'Rising through the noise\nRising through the fall\nThis is the moment building\nWaiting for the call',
            verse2: 'Deeper still it rises\nGathering its strength\nPushing through the layers\nGoing to great lengths',
            bridge: 'Before the final breaking\nEverything holds still\nThe tension keeps on climbing\nPushing past the thrill',
            outro:  'Slowly coming down now\nThe feeling starts to ease\nEverything we built up\nReleased into the breeze',
        },
        explode: {
            intro:  "Can't contain what's coming\nSomething's about to break\nEvery wall around me\nShaking in its wake",
            verse1: 'Running through the fire\nNothing holds me back\nAll the words come pouring\nOff the beaten track',
            chorus: 'Break it all wide open\nLet the chaos fly\nThis is the explosion\nWatch the sparks defy',
            verse2: "Nothing can contain it\nSecond wave hits hard\nPushing through the limits\nEvery single shard",
            bridge: 'Silence before the shockwave\nEverything goes still\nThen the world erupts again\nWith impossible will',
            outro:  'After all the thunder\nAfter all the fire\nWhat remains is silence\nAnd something even higher',
        },
        minimal: {
            intro:  'Just a note, just a breath\nJust the bare bones of a feeling\nStripped of all the extra\nJust the truth revealing',
            verse1: 'Less is more than enough\nIn the space between the words\nSomething speaks more clearly\nThan anything you heard',
            chorus: 'Simple and exact\nEvery word counts\nNothing more is needed\nThan what love amounts',
            verse2: 'Back to what is real\nBack to quiet truth\nStripped back to the layers\nLike the days of youth',
            bridge: 'In the stillness now\nEverything is clear\nNothing left to hide behind\nEverything right here',
            outro:  'One last quiet note\nOne last moment held\nEverything was simple\nEverything was felt',
        },
        steady: {
            intro:  'Beat by beat it enters\nPulse by pulse it grows\nSteady as the heartbeat\nEveryone already knows',
            verse1: 'One foot then the other\nOne step at a time\nThe rhythm holds me steady\nFalling into rhyme',
            chorus: 'Steady in the storm\nSteady through the night\nPulse the center constant\nKeeping rhythm right',
            verse2: 'Still the beat continues\nConsistent all the way\nSomething you can count on\nEvery single day',
            bridge: "Even in the tension\nThe pulse does not break\nSteady through the shifting\nFor everyone's sake",
            outro:  'The beat slows gently\nBut never fully stops\nThe rhythm lives inside you\nLong after it drops',
        },
        chaos: {
            intro:  'Everything is spinning\nNothing stays in place\nWelcome to the madness\nRunning this dark race',
            verse1: 'Words come out in fragments\nThoughts break into pieces\nIn the beautiful disorder\nEverything releases',
            chorus: 'Chaos is the answer\nWild is the way\nEverything unpredictable\nNone of it okay',
            verse2: 'Deeper in the spiral\nFaster through the blur\nEverything is happening\nNothing as it were',
            bridge: 'In the eye of chaos\nFor one second still\nThen the storm comes back\nWith a violent thrill',
            outro:  'After all the chaos\nComes a kind of peace\nAll the broken pieces\nCome to a release',
        },
        smooth: {
            intro:  'Like water finding its way\nLike a river to the sea\nEverything flows gently\nSmooth as it can be',
            verse1: 'Moving without friction\nGliding through the air\nEvery word a current\nCarrying me there',
            chorus: 'Smooth and unbroken\nFlowing to the end\nEverything connected\nEvery single bend',
            verse2: 'Still the river carries\nStill the current flows\nDeeper now and smoother\nOnly the river knows',
            bridge: 'A pause in the flowing\nA moment without motion\nThen the wave continues\nAcross the endless ocean',
            outro:  'The stream slows to a whisper\nThe river meets the sea\nEverything flows back now\nBack to what is meant to be',
        },
    };

    function getLyricsSuggestion(sectionId: SectionId, energyPattern: string): string {
        return LYRICS_BY_ENERGY[energyPattern]?.[sectionId]
            ?? LYRICS_BY_ENERGY['smooth']?.[sectionId]
            ?? '';
    }

    // ── State ──────────────────────────────────────────────────────────────────

    let selectedMood = '';
    let selectedMoodColor = '#e94560';

    // ── CSS variable helpers ───────────────────────────────────────────────────

    function hexToRgb(hex: string): [number, number, number] {
        return [
            parseInt(hex.slice(1, 3), 16),
            parseInt(hex.slice(3, 5), 16),
            parseInt(hex.slice(5, 7), 16),
        ];
    }

    function setMoodColor(color: string) {
        const [r, g, b] = hexToRgb(color);
        document.documentElement.style.setProperty('--mood-color', color);
        document.documentElement.style.setProperty('--mood-r', String(r));
        document.documentElement.style.setProperty('--mood-g', String(g));
        document.documentElement.style.setProperty('--mood-b', String(b));
    }

    // ── Mood: hover shifts atmosphere, click locks it in ──────────────────────

    document.querySelectorAll<HTMLButtonElement>('.mood-btn').forEach(btn => {
        const color = btn.dataset.color ?? '#e94560';

        btn.addEventListener('mouseenter', () => setMoodColor(color));
        btn.addEventListener('mouseleave', () => setMoodColor(selectedMoodColor));

        btn.addEventListener('click', () => {
            document.querySelectorAll('.mood-btn').forEach(b => {
                b.classList.remove('selected');
                b.setAttribute('aria-pressed', 'false');
            });
            btn.classList.add('selected');
            btn.setAttribute('aria-pressed', 'true');
            selectedMood = btn.dataset.mood ?? '';
            selectedMoodColor = color;
            setMoodColor(color);
            // Share mood color with the visualizer page
            localStorage.setItem('viz-mood-color', color);
        });
    });

    // ── Energy cards: single-select per section ────────────────────────────────

    document.querySelectorAll<HTMLButtonElement>('.energy-card').forEach(card => {
        card.addEventListener('click', () => {
            const sectionId = card.dataset.section as SectionId;
            document.querySelectorAll<HTMLButtonElement>(`.energy-card[data-section="${sectionId}"]`).forEach(c => {
                c.classList.remove('selected');
                c.setAttribute('aria-pressed', 'false');
            });
            const isNowSelected = !card.classList.contains('selected');
            if (isNowSelected) {
                card.classList.add('selected');
                card.setAttribute('aria-pressed', 'true');

                const lyricsEl = document.getElementById(`lyrics-${sectionId}`) as HTMLTextAreaElement | null;
                if (lyricsEl && !lyricsEl.value.trim()) {
                    lyricsEl.value = getLyricsSuggestion(sectionId, card.dataset.pattern ?? 'smooth');
                }

                updateMapSegment(sectionId);
                const statusEl = document.getElementById(`status-${sectionId}`);
                if (statusEl) setStatus(statusEl, 'done', '✓ Configured');
            } else {
                const customText = (document.getElementById(`text-${sectionId}`) as HTMLTextAreaElement | null)?.value.trim();
                const lyrics     = (document.getElementById(`lyrics-${sectionId}`) as HTMLTextAreaElement | null)?.value.trim();
                if (!customText && !lyrics) {
                    const statusEl = document.getElementById(`status-${sectionId}`);
                    if (statusEl) setStatus(statusEl, 'idle', '○ Not yet shaped');
                    const seg = document.getElementById(`map-${sectionId}`);
                    if (seg) delete seg.dataset.state;
                }
            }
        });
    });

    // "Refresh lyrics" button
    SECTION_IDS.forEach(id => {
        document.getElementById(`lyrics-suggest-${id}`)?.addEventListener('click', () => {
            const lyricsEl = document.getElementById(`lyrics-${id}`) as HTMLTextAreaElement | null;
            if (!lyricsEl) return;
            const selected = document.querySelector<HTMLButtonElement>(`.energy-card[data-section="${id}"].selected`);
            lyricsEl.value = getLyricsSuggestion(id, selected?.dataset.pattern ?? 'smooth');
        });
    });

    // ── Generate Full Song ─────────────────────────────────────────────────────

    document.getElementById('generate-song-btn')?.addEventListener('click', generateFullSong);

    type Blueprint = { key: string; bpm: number; coreInstruments: string[]; sonicCharacter: string };

    async function generateBlueprint(globals: { songConcept: string; songStyle: string; mood: string }): Promise<Blueprint | null> {
        try {
            const res = await fetch('/api/generate-blueprint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(globals),
            });
            if (!res.ok) return null;
            return await res.json() as Blueprint;
        } catch {
            return null;
        }
    }

    async function generateSection(sectionId: SectionId, globals: { songConcept: string; songStyle: string; mood: string }, blueprint: Blueprint | null): Promise<{ url: string; id: string }> {
        const selectedEnergy = document.querySelector<HTMLButtonElement>(`.energy-card[data-section="${sectionId}"].selected`);
        const energyValue = selectedEnergy?.dataset.value ?? '';
        const lyrics      = (document.getElementById(`lyrics-${sectionId}`) as HTMLTextAreaElement | null)?.value.trim() ?? '';
        const customText  = (document.getElementById(`text-${sectionId}`) as HTMLTextAreaElement | null)?.value.trim() ?? '';

        const res = await fetch('/api/generate-section', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sectionId,
                sectionName:  SECTION_LABELS[sectionId],
                musicalRole:  SECTION_MUSICAL_ROLE[sectionId],
                energyValue,
                lyrics,
                customText,
                songConcept:  globals.songConcept,
                songStyle:    globals.songStyle,
                mood:         globals.mood,
                blueprint,
            }),
        });

        const body = await res.json().catch(() => ({})) as Record<string, unknown>;
        if (!res.ok) {
            const message = typeof body.error === 'string' ? body.error : 'Generation failed.';
            throw new Error(message);
        }

        const audioUrl = (body.file as Record<string, unknown> | undefined)?.url as string ?? '';
        const trackId  = typeof body.id === 'string' ? body.id : '';
        if (!audioUrl) throw new Error('No audio URL returned.');
        return { url: audioUrl, id: trackId };
    }

    async function generateFullSong() {
        const btn      = document.getElementById('generate-song-btn') as HTMLButtonElement | null;
        const resultEl = document.getElementById('combine-result') as HTMLElement | null;
        if (!btn || !resultEl) return;

        const songConcept = (document.getElementById('song-concept') as HTMLInputElement | null)?.value.trim() ?? '';
        const songStyle   = (document.getElementById('song-style')   as HTMLInputElement | null)?.value.trim() ?? '';
        const globals = { songConcept, songStyle, mood: selectedMood };

        btn.disabled = true;
        resultEl.innerHTML = '';
        resultEl.hidden = false;
        btn.textContent = '⟳ Building song blueprint…';

        const blueprint = await generateBlueprint(globals);

        let doneCount  = 0;
        let errorCount = 0;
        const generatedIds: { sectionId: SectionId; trackId: string }[] = [];

        for (const id of SECTION_IDS) {
            const statusEl = document.getElementById(`status-${id}`);
            if (statusEl) setStatus(statusEl, 'loading', '⟳ Generating…');
            btn.textContent = `⟳ Generating ${SECTION_LABELS[id]}…`;

            try {
                const { url, id: trackId } = await generateSection(id, globals, blueprint);
                doneCount++;
                if (trackId) generatedIds.push({ sectionId: id, trackId });

                if (statusEl) setStatus(statusEl, 'done', '✓ Ready');
                updateMapSegment(id);

                const blockEl = document.getElementById(`block-${id}`);
                if (blockEl) {
                    const playerDiv = document.createElement('div');
                    playerDiv.className = 'section-audio-player';
                    playerDiv.innerHTML = `
                        <audio class="section-result__audio" controls src="${url}" preload="metadata"></audio>
                        <div class="section-audio-actions">
                            <a class="btn secondary small section-result__download"
                               href="${url}" download="${id}.mp3">⬇ Download</a>
                            ${trackId ? `<a class="btn secondary small" href="#/view?id=${encodeURIComponent(trackId)}">▶ Open in Player</a>` : ''}
                        </div>
                    `;
                    blockEl.querySelector('.section-audio-player')?.remove();
                    blockEl.appendChild(playerDiv);
                }
            } catch (err) {
                errorCount++;
                const message = err instanceof Error ? err.message : 'Error';
                if (statusEl) setStatus(statusEl, 'error', `⚠ ${message}`);
            }
        }

        const lastId = generatedIds.at(-1)?.trackId ?? '';
        const viewBtn = lastId
            ? `<a class="btn view-page-btn" href="#/view?id=${encodeURIComponent(lastId)}">🎧 Listen to Full Song</a>`
            : '';

        if (errorCount === 0) {
            resultEl.innerHTML = `<div class="section-result"><p class="section-result__label">All ${doneCount} sections generated.</p>${viewBtn}</div>`;
            btn.textContent = '✨ Regenerate All Sections';
        } else if (doneCount === 0) {
            resultEl.innerHTML = `<div class="section-result error"><p class="section-result__error-msg">⚠ All sections failed to generate.</p></div>`;
            btn.textContent = '✨ Try Again';
        } else {
            resultEl.innerHTML = `<div class="section-result"><p class="section-result__label">${doneCount} section(s) ready, ${errorCount} failed.</p>${viewBtn}</div>`;
            btn.textContent = '✨ Regenerate All Sections';
        }

        btn.disabled = false;
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    function setStatus(el: HTMLElement, state: 'idle' | 'loading' | 'done' | 'error', text: string) {
        el.dataset.state = state;
        el.textContent = text;
    }

    function updateMapSegment(sectionId: SectionId) {
        const seg = document.getElementById(`map-${sectionId}`);
        if (seg) seg.dataset.state = 'done';
    }

    // No persistent listeners to clean up — React unmount handles DOM removal.
    return () => {};
}
