import type { Page } from '@/App';

// Module-level ref — shared across all imports in the same JS context
let _navigate: ((page: Page) => void) | null = null;

export function registerNavigator(fn: (page: Page) => void) {
    _navigate = fn;
}

export function navigateTo(page: Page) {
    _navigate?.(page);
    // fallback: window event in case of spatial boundary
    window.dispatchEvent(new CustomEvent('spa-navigate', { detail: page }));
}
