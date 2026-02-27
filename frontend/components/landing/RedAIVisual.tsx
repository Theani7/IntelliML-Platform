'use client';

type Tendril = {
    d: string;
    animationDelay: string;
    rotation: string;
};

type Particle = {
    cx: number;
    cy: number;
    r: number;
    animationDelay: string;
};

const pseudoRandom = (seed: number) => {
    const x = Math.sin(seed * 9999) * 10000;
    return x - Math.floor(x);
};

const TENDRILS: Tendril[] = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 30 * Math.PI) / 180;
    const controlX = 100 + Math.cos(angle) * 80;
    const controlY = 100 + Math.sin(angle) * (60 + (i % 5) * 8);
    const endX = 100 + Math.cos(angle) * 120;

    return {
        d: `M 100 100 Q ${controlX.toFixed(3)} ${controlY.toFixed(3)} ${endX.toFixed(3)} 200`,
        animationDelay: `${(i * 0.2).toFixed(1)}s`,
        rotation: `${i * 30}deg`,
    };
});

const PARTICLES: Particle[] = Array.from({ length: 8 }, (_, i) => ({
    cx: Number((80 + pseudoRandom(i + 1) * 40).toFixed(3)),
    cy: Number((80 + pseudoRandom(i + 101) * 40).toFixed(3)),
    r: Number((1 + pseudoRandom(i + 201) * 2).toFixed(3)),
    animationDelay: `${(i * 0.5).toFixed(1)}s`,
}));

export default function RedAIVisual() {
    return (
        <div className="relative w-full h-full flex items-center justify-center">
            {/* Background Pulse */}
            <div className="absolute w-[80%] h-[80%] bg-red-600/20 blur-[120px] rounded-full animate-pulse"></div>

            {/* Central Glowing Entity (Jellyfish-like abstract) */}
            <div className="relative z-10 w-[60%] aspect-square">
                <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-[0_0_30px_rgba(255,59,59,0.8)]">
                    <defs>
                        <radialGradient id="entityGradient" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#FF3B3B" />
                            <stop offset="60%" stopColor="#CC0000" />
                            <stop offset="100%" stopColor="#330000" />
                        </radialGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>

                    {/* Base Sphere */}
                    <circle cx="100" cy="100" r="45" fill="url(#entityGradient)" className="animate-pulse" />

                    {/* Animated "Tendrils" */}
                    {TENDRILS.map((tendril, i) => (
                        <path
                            key={i}
                            d={tendril.d}
                            stroke="#FF3B3B"
                            strokeWidth="0.5"
                            fill="none"
                            opacity="0.3"
                            className="animate-tendril"
                            style={{
                                animationDelay: tendril.animationDelay,
                                '--rotation': tendril.rotation
                            } as any}
                        />
                    ))}

                    {/* Core Particles */}
                    {PARTICLES.map((particle, i) => (
                        <circle
                            key={`p-${i}`}
                            cx={particle.cx}
                            cy={particle.cy}
                            r={particle.r}
                            fill="white"
                            className="animate-ping"
                            style={{ animationDelay: particle.animationDelay }}
                        />
                    ))}
                </svg>
            </div>
        </div>
    );
}
