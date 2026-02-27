/**
 * SectionHeader — consistent section heading with subtitle and optional action.
 * Used across all main tab views for uniform layout.
 */

import React from 'react';

interface SectionHeaderProps {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
}

export default function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
    return (
        <div className="text-center mb-10">
            <h2 className="text-5xl font-medium tracking-tight text-display mb-3 text-[#470102]">
                {title}
            </h2>
            {subtitle && (
                <p className="text-lg text-[#8A5A5A] max-w-2xl mx-auto">{subtitle}</p>
            )}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
