'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { SpinnerIcon } from '@/components/icons/Icons';

interface LoginPageProps {
    onSwitchToSignup: () => void;
    onBack?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSwitchToSignup, onBack }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const formData = new FormData();
            formData.append('username', username);
            formData.append('password', password);

            const response = await fetch(`/api/proxy/api/auth/login`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                await login(data.access_token);
            } else {
                const errData = await response.json();
                setError(errData.detail || 'Login failed. Please check your credentials.');
            }
        } catch (err) {
            setError('Connection error. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#FFF7EA]">
            <div className="w-full max-w-md sm:rounded-2xl md:rounded-3xl border border-[#FFEDC1] bg-white p-6 sm:p-8 shadow-xl">
                <div className="mb-6 sm:mb-8">
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] text-[#8A5A5A]">IntelliML Access</p>
                    <h1 className="mt-2 text-3xl sm:text-4xl font-display font-bold text-[#470102]">Sign In</h1>
                    <p className="mt-2 text-xs sm:text-sm text-[#8A5A5A]">Welcome back. Continue your analysis.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm text-rose-700">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="mb-1 block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#8A5A5A]">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full rounded-xl border border-[#FFEDC1] bg-[#FFF7EA] px-4 py-3 text-sm sm:text-base text-[#470102] placeholder-[#8A5A5A] outline-none transition-colors focus:border-[#FEB229]"
                            placeholder="Enter your username"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#8A5A5A]">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-xl border border-[#FFEDC1] bg-[#FFF7EA] px-4 py-3 text-sm sm:text-base text-[#470102] placeholder-[#8A5A5A] outline-none transition-colors focus:border-[#FEB229]"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="mt-2 w-full rounded-xl bg-[#470102] px-4 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#FFEDC1] transition-colors hover:bg-[#5D0203] disabled:opacity-60"
                    >
                        {isSubmitting ? <SpinnerIcon /> : 'Sign In'}
                    </button>
                </form>

                <div className="mt-6 flex items-center justify-between text-sm">
                    <button
                        onClick={onSwitchToSignup}
                        className="font-semibold text-[#470102] underline decoration-[#FEB229] decoration-2 underline-offset-4"
                    >
                        Create account
                    </button>
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="font-semibold text-[#8A5A5A] hover:text-[#470102]"
                        >
                            Back
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
