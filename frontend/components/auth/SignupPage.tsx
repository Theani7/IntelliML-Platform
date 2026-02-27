'use client';

import React, { useState } from 'react';
import { SpinnerIcon } from '@/components/icons/Icons';

interface SignupPageProps {
    onSwitchToLogin: () => void;
    onSignupSuccess: () => void;
    onBack?: () => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ onSwitchToLogin, onSignupSuccess, onBack }) => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const response = await fetch(`/api/proxy/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    email,
                    password,
                    full_name: fullName || undefined,
                }),
            });

            if (response.ok) {
                onSignupSuccess();
            } else {
                const errData = await response.json();
                setError(errData.detail || 'Registration failed. Please try again.');
            }
        } catch (err) {
            setError('Connection error. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#FFF7EA]">
            <div className="w-full max-w-md rounded-3xl border border-[#FFEDC1] bg-white p-8 shadow-xl">
                <div className="mb-8">
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#8A5A5A]">Create Workspace Access</p>
                    <h1 className="mt-2 text-4xl font-display font-bold text-[#470102]">Sign Up</h1>
                    <p className="mt-2 text-sm text-[#8A5A5A]">Create your IntelliML account and start building models.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="rounded-xl border border-[#FFEDC1] bg-[#FFF7EA] px-4 py-3 text-[#470102] placeholder-[#8A5A5A] outline-none transition-colors focus:border-[#FEB229]"
                            placeholder="Full name"
                        />
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="rounded-xl border border-[#FFEDC1] bg-[#FFF7EA] px-4 py-3 text-[#470102] placeholder-[#8A5A5A] outline-none transition-colors focus:border-[#FEB229]"
                            placeholder="Username"
                            required
                        />
                    </div>

                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-xl border border-[#FFEDC1] bg-[#FFF7EA] px-4 py-3 text-[#470102] placeholder-[#8A5A5A] outline-none transition-colors focus:border-[#FEB229]"
                        placeholder="Email address"
                        required
                    />

                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-xl border border-[#FFEDC1] bg-[#FFF7EA] px-4 py-3 text-[#470102] placeholder-[#8A5A5A] outline-none transition-colors focus:border-[#FEB229]"
                        placeholder="Password"
                        required
                    />

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="mt-2 w-full rounded-xl bg-[#470102] px-4 py-3 text-sm font-bold uppercase tracking-wider text-[#FFEDC1] transition-colors hover:bg-[#5D0203] disabled:opacity-60"
                    >
                        {isSubmitting ? <SpinnerIcon /> : 'Create Account'}
                    </button>
                </form>

                <div className="mt-6 flex items-center justify-between text-sm">
                    <button
                        onClick={onSwitchToLogin}
                        className="font-semibold text-[#470102] underline decoration-[#FEB229] decoration-2 underline-offset-4"
                    >
                        Already have an account?
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
