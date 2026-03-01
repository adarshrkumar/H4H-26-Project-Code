import { useState, useEffect } from 'react';
import ComposePageContent from './components/ComposePageContent';
import ViewPageContent from './components/ViewPageContent';
import { registerNavigator } from './lib/navigate';

export type Page = 'compose' | 'view';

export default function App() {
    const [page, setPage] = useState<Page>('compose');

    useEffect(() => {
        registerNavigator(setPage);
        const handler = (e: Event) => setPage((e as CustomEvent<Page>).detail);
        window.addEventListener('spa-navigate', handler);
        return () => {
            window.removeEventListener('spa-navigate', handler);
        };
    }, []);

    return (
        <>
            <div style={{ display: page === 'compose' ? undefined : 'none' }}>
                <ComposePageContent />
            </div>
            <div style={{ display: page === 'view' ? undefined : 'none' }}>
                <ViewPageContent />
            </div>
        </>
    );
}
