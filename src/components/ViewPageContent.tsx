import { useEffect, useRef, useState } from 'react';
import '@/styles/pages/view.scss';

interface Track {
    id: string;
    title: string | null;
    artist: string | null;
    mimeType: string | null;
    fileUrl: string | null;
    uploadedAt: string;
}

function getIdFromHash(): string | null {
    const hash = window.location.hash;
    const qIndex = hash.indexOf('?');
    if (qIndex === -1) return null;
    return new URLSearchParams(hash.slice(qIndex + 1)).get('id');
}

type InputMode = 'file' | 'speaker' | 'mic';

export default function ViewPageContent() {
    // ── DB track (when id is in URL) ──────────────────────────────────────────
    const [track, setTrack] = useState<Track | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const hasId = !!getIdFromHash();

    useEffect(() => {
        const id = getIdFromHash();
        if (!id) { setLoading(false); return; }

        fetch(`/api/track/${encodeURIComponent(id)}`)
            .then(r => r.ok ? r.json() : r.json().then((e: { error: string }) => Promise.reject(e.error)))
            .then((data: Track) => { setTrack(data); setLoading(false); })
            .catch((e: unknown) => {
                setLoadError(typeof e === 'string' ? e : 'Failed to load track.');
                setLoading(false);
            });
    }, []);

    // ── Manual input (when no id) ─────────────────────────────────────────────
    const [mode, setMode] = useState<InputMode>('file');
    const audioRef = useRef<HTMLAudioElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    function stopStream() {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (audioRef.current) {
            audioRef.current.srcObject = null;
            audioRef.current.pause();
        }
    }

    function switchMode(m: InputMode) {
        stopStream();
        if (audioRef.current) audioRef.current.src = '';
        setMode(m);
    }

    function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file || !audioRef.current) return;
        audioRef.current.srcObject = null;
        audioRef.current.src = URL.createObjectURL(file);
        audioRef.current.play();
    }

    async function startSpeaker() {
        try {
            stopStream();
            const stream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: false } as DisplayMediaStreamOptions);
            streamRef.current = stream;
            if (audioRef.current) { audioRef.current.src = ''; audioRef.current.srcObject = stream; audioRef.current.play(); }
        } catch { /* user cancelled */ }
    }

    async function startMic() {
        try {
            stopStream();
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            if (audioRef.current) { audioRef.current.src = ''; audioRef.current.srcObject = stream; audioRef.current.play(); }
        } catch { /* user cancelled */ }
    }

    // Clean up streams on unmount
    useEffect(() => () => stopStream(), []);

    return (
        <div className="view-page">
            <div className="view-page__glass" enable-xr={true} />
            <a className="view-page__back" href="#/">← Back</a>

            {/* ── DB track player ─────────────────────────────────────── */}
            {loading && <p className="view-page__state">Loading track…</p>}
            {loadError && <p className="view-page__state view-page__state--error">{loadError}</p>}

            {!loading && track && (
                <div className="view-page__card">
                    <div className="view-page__meta">
                        <h1 className="view-page__title">{track.title ?? 'Untitled'}</h1>
                        {track.artist && <p className="view-page__artist">{track.artist}</p>}
                    </div>
                    {track.fileUrl
                        ? <audio className="view-page__audio" src={track.fileUrl} controls autoPlay />
                        : <p className="view-page__state">No audio file available.</p>
                    }
                </div>
            )}

            {/* ── Manual input (no id in URL) ──────────────────────────── */}
            {!loading && !hasId && (
                <div className="view-page__card">
                    <div className="view-page__meta">
                        <h1 className="view-page__title">Audio Player</h1>
                        <p className="view-page__artist">Choose a source to get started</p>
                    </div>

                    <div className="view-tabs">
                        {(['file', 'speaker', 'mic'] as InputMode[]).map(m => (
                            <button
                                key={m}
                                type="button"
                                className={`view-tab${mode === m ? ' view-tab--active' : ''}`}
                                onClick={() => switchMode(m)}
                            >
                                {m === 'file' ? '📁 File' : m === 'speaker' ? '🔊 Tab Audio' : '🎙 Microphone'}
                            </button>
                        ))}
                    </div>

                    <div className="view-input-panel">
                        {mode === 'file' && (
                            <label className="view-file-label">
                                <span className="sr-only">Choose audio file</span>
                                <input type="file" accept="audio/*" onChange={handleFile} className="view-file-input" aria-label="Choose audio file" />
                            </label>
                        )}
                        {mode === 'speaker' && (
                            <div className="view-input-panel__actions">
                                <button type="button" className="btn" onClick={startSpeaker}>Share Tab Audio</button>
                                <button type="button" className="btn secondary" onClick={stopStream}>Stop</button>
                            </div>
                        )}
                        {mode === 'mic' && (
                            <div className="view-input-panel__actions">
                                <button type="button" className="btn" onClick={startMic}>Use Microphone</button>
                                <button type="button" className="btn secondary" onClick={stopStream}>Stop</button>
                            </div>
                        )}
                    </div>

                    <audio ref={audioRef} className="view-page__audio" controls />
                </div>
            )}
        </div>
    );
}
