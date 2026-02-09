import React from 'react';

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    hoverEffect?: boolean;
    onClick?: () => void;
}

export const GlassCard = ({ children, className = '', hoverEffect = false, onClick }: GlassCardProps) => {
    return (
        <div
            onClick={onClick}
            className={`
        relative overflow-hidden
        bg-white/80 backdrop-blur-2xl
        border border-white/40
        shadow-xl shadow-black/5
        transition-all duration-300
        ${hoverEffect ? 'hover:scale-[1.02] hover:bg-white hover:shadow-2xl hover:border-white/60 cursor-pointer' : ''}
        ${className}
      `}
        >


            {/* Content */}
            <div className="relative z-10">
                {children}
            </div>

            {/* Subtle Gradient Glow - Reduced opacity for light theme */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none mix-blend-multiply"></div>
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none mix-blend-multiply"></div>
        </div>
    );
};
