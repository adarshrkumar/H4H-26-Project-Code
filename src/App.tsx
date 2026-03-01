import { useState, useEffect } from 'react';
import ComposePageContent from './components/ComposePageContent';
import ViewPageContent from './components/ViewPageContent';

export type Page = 'compose' | 'view';

function isViewLocationPath(path: string): boolean {
    const normalized = path.toLowerCase().replace(/\/+$/, '');
    return normalized === '/view' || normalized.endsWith('/view');
}

function resolvePageFromLocation(): Page {
    const path = window.location.pathname || '/';
    const hashValue = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash;
    const hashPath = hashValue ? (hashValue.startsWith('/') ? hashValue : `/${hashValue}`) : '/';

    return isViewLocationPath(path) || isViewLocationPath(hashPath) ? 'view' : 'compose';
}

export default function App() {
    const [page, setPage] = useState<Page>('compose');

    useEffect(() => {
        const handler = () => setPage(resolvePageFromLocation());
        handler();
        window.addEventListener('hashchange', handler);
        window.addEventListener('popstate', handler);
        return () => {
            window.removeEventListener('hashchange', handler);
            window.removeEventListener('popstate', handler);
        };
    }, []);

    return page === 'view' ? <ViewPageContent /> : <ComposePageContent />;
}
