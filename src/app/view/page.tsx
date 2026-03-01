import type { Metadata } from 'next';
import config from '@/lib/config';
import ViewPageContent from '@/components/ViewPageContent';

export const metadata: Metadata = { title: config.name };

export default function ViewPage() {
    return <ViewPageContent />;
}
