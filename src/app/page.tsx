import type { Metadata } from 'next';
import config from '@/lib/config';
import ComposePageContent from '@/components/ComposePageContent';

export const metadata: Metadata = { title: config.name };

export default function ComposePage() {
    return <ComposePageContent />;
}
