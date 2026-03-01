export function navigateTo(page: 'generate'): void;
export function navigateTo(page: 'view', id: string): void;
export function navigateTo(page: 'generate' | 'view', id?: string): void {
    if (page === 'view' && id) {
        window.location.hash = `/view?id=${encodeURIComponent(id)}`;
    } else {
        window.location.hash = '/';
    }
}
