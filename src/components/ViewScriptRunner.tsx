'use client';

import { useEffect } from 'react';
import { initViewScript } from '@/scripts/viewScript';

/**
 * Client component that runs the Audio-to-Color Web Audio pipeline after hydration.
 * Renders nothing — just wires up the audio engine and draws to canvases.
 */
export default function ViewScriptRunner() {
    useEffect(() => {
        return initViewScript();
    }, []);

    return null;
}
