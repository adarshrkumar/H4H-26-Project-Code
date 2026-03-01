import { useEffect } from 'react';
import { initIndexScript } from '@/scripts/indexScript';

/**
 * Client component that runs the generate-page DOM logic after hydration.
 * Renders nothing — just attaches event listeners.
 */
export default function IndexScriptRunner() {
    useEffect(() => {
        return initIndexScript();
    }, []);

    return null;
}
