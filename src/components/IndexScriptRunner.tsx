import { useEffect } from 'react';
import { initIndexScript } from '@/scripts/indexScript';

/**
 * Client component that runs the compose-page DOM logic after hydration.
 * Renders nothing — just attaches event listeners.
 */
export default function IndexScriptRunner() {
    useEffect(() => {
        return initIndexScript();
    }, []);

    return null;
}
