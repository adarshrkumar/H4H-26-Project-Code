import { useEffect, useState } from 'react';
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
    const hash = window.location.hash; // e.g. #/view?id=abc123
    const qIndex = hash.indexOf('?');
    if (qIndex === -1) return null;
    const params = new URLSearchParams(hash.slice(qIndex + 1));
    return params.get('id');
}

export default function ViewPageContent() {
    const [track, setTrack] = useState<Track | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const id = getIdFromHash();
        if (!id) {
            setError('No track ID provided.');
            setLoading(false);
            return;
        }
        fetch(`/api/track/${encodeURIComponent(id)}`)
            .then(r => r.ok ? r.json() : r.json().then((e: { error: string }) => Promise.reject(e.error)))
            .then((data: Track) => { setTrack(data); setLoading(false); })
            .catch((e: unknown) => { setError(typeof e === 'string' ? e : 'Failed to load track.'); setLoading(false); });
    }, []);

    return (
        <div className="view-page">
            <div className="view-page__glass" enable-xr={true} />

            <a className="view-page__back" href="#/">← Back</a>

            {loading && <p className="view-page__state">Loading track…</p>}

            {error && <p className="view-page__state view-page__state--error">{error}</p>}

            {track && (
                <div className="view-page__card">
                    <div className="view-page__meta">
                        <h1 className="view-page__title">{track.title ?? 'Untitled'}</h1>
                        {track.artist && <p className="view-page__artist">{track.artist}</p>}
                    </div>

                    {track.fileUrl ? (
                        <audio
                            className="view-page__audio"
                            src={track.fileUrl}
                            controls
                            autoPlay
                        />
                    ) : (
                        <p className="view-page__state">No audio file available.</p>
                    )}
                </div>
            )}
        </div>
    );
}
