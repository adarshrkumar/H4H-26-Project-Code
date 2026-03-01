/**
 * Card component — migrated from src/components/Card.astro.
 * Renders either an <a> or a <div> depending on whether `href` is provided.
 */

import type { ReactNode } from 'react';
import '@/styles/components/card.scss';

interface CardProps {
    title?: string;
    href?: string;
    className?: string;
    children?: ReactNode;
}

export default function Card({ title, href, className = '', children }: CardProps) {
    const inner = (
        <>
            {title && <h3 className="card-component__title">{title}</h3>}
            <div className="card-component__content">{children}</div>
        </>
    );

    if (href) {
        return (
            <a href={href} className={`card-component ${className}`}>
                {inner}
            </a>
        );
    }

    return (
        <div className={`card-component ${className}`}>
            {inner}
        </div>
    );
}
