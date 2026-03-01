'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export default function AuthForm() {
    const router = useRouter();
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (mode === 'login') {
                const { error: err } = await authClient.signIn.email({ email, password });
                if (err) { setError(err.message ?? 'Login failed'); return; }
            } else {
                const { error: err } = await authClient.signUp.email({ name, email, password });
                if (err) { setError(err.message ?? 'Sign up failed'); return; }
            }
            router.push('/');
            router.refresh();
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-card">
            <div className="auth-card__tabs">
                <button
                    className={`auth-card__tab${mode === 'login' ? ' auth-card__tab--active' : ''}`}
                    type="button"
                    onClick={() => { setMode('login'); setError(''); }}
                >
                    Log in
                </button>
                <button
                    className={`auth-card__tab${mode === 'signup' ? ' auth-card__tab--active' : ''}`}
                    type="button"
                    onClick={() => { setMode('signup'); setError(''); }}
                >
                    Sign up
                </button>
            </div>

            <form className="auth-card__form form" onSubmit={handleSubmit} noValidate>
                {mode === 'signup' && (
                    <div className="form-group">
                        <label className="form-label" htmlFor="auth-name">Name</label>
                        <input
                            id="auth-name"
                            className="form-input"
                            type="text"
                            autoComplete="name"
                            required
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Your name"
                        />
                    </div>
                )}

                <div className="form-group">
                    <label className="form-label" htmlFor="auth-email">Email</label>
                    <input
                        id="auth-email"
                        className="form-input"
                        type="email"
                        autoComplete={mode === 'login' ? 'email' : 'new-email'}
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com"
                    />
                </div>

                <div className="form-group">
                    <label className="form-label" htmlFor="auth-password">Password</label>
                    <input
                        id="auth-password"
                        className="form-input"
                        type="password"
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder={mode === 'signup' ? 'Min 8 characters' : '••••••••'}
                    />
                </div>

                {error && <p className="auth-card__error">{error}</p>}

                <button
                    className="btn primary full"
                    type="submit"
                    data-state={loading ? 'loading' : undefined}
                    disabled={loading}
                >
                    {mode === 'login' ? 'Log in' : 'Create account'}
                </button>
            </form>
        </div>
    );
}
