import { useState, useEffect } from 'react';
import ComposePageContent from './components/ComposePageContent';
import ViewPageContent from './components/ViewPageContent';

export type Page = 'compose' | 'view';

export default function App() {
    const [page, setPage] = useState<Page>('compose');

    useEffect(() => {
        const handler = () => setPage(window.location.hash === '#/view' ? 'view' : 'compose');
        window.addEventListener('hashchange', handler);
        return () => window.removeEventListener('hashchange', handler);
    }, []);

    return page === 'view' ? <ViewPageContent /> : <ComposePageContent />;
}
