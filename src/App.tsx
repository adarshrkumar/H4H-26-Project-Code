import { useState, useEffect } from 'react';
import GeneratePageContent from './components/GeneratePageContent';
import ViewPageContent from './components/ViewPageContent';

export type Page = 'generate' | 'view';

export default function App() {
    const [page, setPage] = useState<Page>('generate');

    useEffect(() => {
        const handler = () => setPage(window.location.hash === '#/view' ? 'view' : 'generate');
        handler(); // sync on mount in case hash is already set
        window.addEventListener('hashchange', handler);
        return () => window.removeEventListener('hashchange', handler);
    }, []);

    return page === 'view' ? <ViewPageContent /> : <GeneratePageContent />;
}
