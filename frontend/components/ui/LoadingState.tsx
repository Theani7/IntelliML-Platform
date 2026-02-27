'use client';

/**
 * LoadingState — reusable loading spinner with title and optional message.
 * Sizes: sm, md, lg
 */

interface LoadingStateProps {
    title?: string;
    message?: string;
    size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
    sm: { spinner: 'w-5 h-5', text: 'text-sm', gap: 'gap-2' },
    md: { spinner: 'w-8 h-8', text: 'text-base', gap: 'gap-3' },
    lg: { spinner: 'w-12 h-12', text: 'text-lg', gap: 'gap-4' },
};

export default function LoadingState({
    title = 'Loading…',
    message,
    size = 'md',
}: LoadingStateProps) {
    const s = sizeMap[size];

    return (
        <div className={`flex flex-col items-center justify-center py-8 ${s.gap} animate-fadeIn`}>
            <svg
                className={`${s.spinner} animate-spin text-[#FEB229]`}
                fill="none"
                viewBox="0 0 24 24"
            >
                <circle
                    className="opacity-25"
                    cx="12" cy="12" r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                />
                <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
            </svg>

            <span className={`${s.text} font-bold text-[#470102]`}>{title}</span>

            {message && (
                <p className="text-sm text-[#8A5A5A] max-w-md text-center">{message}</p>
            )}
        </div>
    );
}
