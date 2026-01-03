'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            const data = await res.json();

            if (data.success) {
                router.push('/');
                router.refresh();
            } else {
                setError('Incorrect password');
            }
        } catch {
            setError('Something went wrong');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <h1 className="font-display text-3xl text-white mb-2">Crypto Mafia</h1>
                    <p className="text-white/40 text-sm">Enter password to continue</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
                            autoFocus
                        />
                    </div>

                    {error && (
                        <p className="text-red-400 text-sm text-center">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !password}
                        className="w-full py-3 bg-gradient-to-r from-amber-500 to-coral-500 text-[#0B0B0F] font-semibold rounded-lg hover:from-amber-400 hover:to-coral-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {loading ? 'Checking...' : 'Enter'}
                    </button>
                </form>
            </div>
        </div>
    );
}
