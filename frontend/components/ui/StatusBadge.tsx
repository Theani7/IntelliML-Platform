/**
 * StatusBadge — small colored badge for status indicators.
 * Variants: success, warning, error, info, neutral
 */

type Variant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatusBadgeProps {
    label: string;
    variant?: Variant;
    dot?: boolean;
    size?: 'sm' | 'md';
}

const variantStyles: Record<Variant, string> = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    error: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    neutral: 'bg-[#FFF7EA] text-[#470102] border-[#FFEDC1]',
};

const dotColors: Record<Variant, string> = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-rose-500',
    info: 'bg-blue-500',
    neutral: 'bg-[#8A5A5A]',
};

export default function StatusBadge({
    label,
    variant = 'neutral',
    dot = false,
    size = 'sm',
}: StatusBadgeProps) {
    const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';

    return (
        <span
            className={`
        inline-flex items-center gap-1.5
        ${sizeClass}
        font-bold uppercase tracking-wider
        rounded-lg border
        ${variantStyles[variant]}
      `}
        >
            {dot && (
                <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />
            )}
            {label}
        </span>
    );
}
