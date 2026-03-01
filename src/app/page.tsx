import type { Metadata } from 'next';
import config from '@/lib/config';
import ClientOnly from '@/components/ClientOnly';
import ComposePageContent from '@/components/ComposePageContent';

export const metadata: Metadata = { title: config.name };

export default function ComposePage() {
    return <ClientOnly><ComposePageContent /></ClientOnly>;
}
