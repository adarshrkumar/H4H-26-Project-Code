/**
 * Root Next.js layout — converted from src/layouts/Layout.astro.
 * Handles the full HTML shell, global styles, and per-page title via
 * Next.js Metadata API (each page can export its own `metadata` object).
 */

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import config from '@/lib/config';
import '@/styles/global.scss';

export const metadata: Metadata = {
    title: {
        default: config.name,
        template: `%s | ${config.name}`,
    },
    description: config.description,
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en">
            <head>
                {/* Favicons */}
                <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

                {/* PWA manifest */}
                <link rel="manifest" href="/manifest.webmanifest" />
            </head>
            <body>{children}</body>
        </html>
    );
}
