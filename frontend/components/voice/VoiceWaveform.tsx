'use client';

interface VoiceWaveformProps {
  isRecording: boolean;
}

const pseudoRandom = (seed: number) => {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
};

const BARS = Array.from({ length: 20 }, (_, i) => ({
  height: `${pseudoRandom(i + 1) * 40 + 10}px`,
  animationDuration: `${pseudoRandom(i + 21) * 0.5 + 0.5}s`,
  animationDelay: `${i * 0.05}s`,
}));

export default function VoiceWaveform({ isRecording }: VoiceWaveformProps) {

  if (!isRecording) return null;

  return (
    <div className="flex items-center justify-center space-x-2 h-16">
      {BARS.map((bar, i) => (
        <div
          key={i}
          className="w-1 bg-cyan-500 rounded-full animate-pulse"
          style={bar}
        />
      ))}
    </div>
  );
}
