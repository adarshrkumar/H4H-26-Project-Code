import type { Metadata } from 'next';
import AuthForm from '@/components/AuthForm';
import '@/styles/pages/auth.scss';

export const metadata: Metadata = { title: 'Sign in' };

export default function AuthPage() {
    return (
        <div className="auth-page">
            <div className="auth-page__brand">
                <span className="auth-page__logo">🎵</span>
                <h1 className="auth-page__title">Huephonic</h1>
                <p className="auth-page__subtitle">Compose. Feel. Create.</p>
            </div>
            <AuthForm />
        </div>
    );
}
