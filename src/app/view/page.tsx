import type { Metadata } from 'next';
import config from '@/lib/config';
import ClientOnly from '@/components/ClientOnly';
import ViewPageContent from '@/components/ViewPageContent';

export const metadata: Metadata = { title: config.name };

export default function ViewPage() {
    return <ClientOnly><ViewPageContent /></ClientOnly>;
}
