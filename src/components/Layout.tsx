/**
 * Layout wrapper component — migrated from src/layouts/Layout.astro.
 *
 * In Next.js App Router the HTML shell lives in src/app/layout.tsx.
 * This component is kept for pages that want an explicit wrapper import;
 * it simply renders its children.
 */

import type { ReactNode } from 'react';

interface LayoutProps {
    children: ReactNode;
    /** Unused in Next.js — set page titles via `export const metadata` instead. */
    pageTitle?: string | string[];
}

export default function Layout({ children }: LayoutProps) {
    return <>{children}</>;
}
