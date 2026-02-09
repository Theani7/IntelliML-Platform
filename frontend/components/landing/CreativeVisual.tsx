'use client';

import { useEffect, useState } from 'react';

export default function CreativeVisual() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className="relative w-full h-full flex items-center justify-center">
            {/* Central Core - Breathing Glow */}
            <div className="absolute w-32 h-32 bg-gradient-to-br from-[#FEB229] to-[#470102] rounded-full blur-2xl animate-pulse opacity-60"></div>
            <div className="relative z-10 w-24 h-24 bg-[#470102] rounded-full flex items-center justify-center shadow-lg shadow-[#FEB229]/20 border border-[#FEB229]/50">
                <div className="w-16 h-16 bg-[#FEB229] rounded-full opacity-20 animate-ping"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-10 h-10 text-[#FFEDC1] animate-spin-slow" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                </div>
            </div>

            {/* Orbit 1 - Fast */}
            <div className="absolute w-64 h-64 border border-[#FFEDC1]/30 rounded-full animate-spin-slow-reverse">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-[#FEB229] rounded-full shadow-[0_0_10px_#FEB229]"></div>
            </div>

            {/* Orbit 2 - Medium */}
            <div className="absolute w-96 h-96 border border-[#470102]/10 rounded-full animate-spin-slow [animation-duration:15s]">
                <div className="absolute bottom-0 right-1/2 translate-x-1/2 translate-y-1/2 w-4 h-4 bg-[#470102] rounded-full border border-[#FFEDC1]"></div>
            </div>

            {/* Orbit 3 - Elliptical / Tilted */}
            <div className="absolute w-[120%] h-[60%] border border-[#8A5A5A]/20 rounded-[100%] animate-spin-slow [animation-duration:20s] [transform:rotate(45deg)]"></div>
            <div className="absolute w-[60%] h-[120%] border border-[#8A5A5A]/20 rounded-[100%] animate-spin-slow [animation-duration:25s] [transform:rotate(-45deg)]"></div>


            {/* Floating Particles */}
            {[...Array(10)].map((_, i) => (
                <div
                    key={i}
                    className="absolute w-1.5 h-1.5 bg-[#FEB229]/60 rounded-full animate-float"
                    style={{
                        top: `${Math.random() * 100}%`,
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 5}s`,
                        animationDuration: `${5 + Math.random() * 5}s`
                    }}
                ></div>
            ))}
        </div>
    );
}
