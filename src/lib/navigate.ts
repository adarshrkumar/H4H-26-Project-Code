export function navigateTo(page: 'compose' | 'view') {
    window.location.hash = page === 'view' ? '#/view' : '';
}
