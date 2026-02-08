'use client';

interface VoiceWaveformProps {
  isRecording: boolean;
}

export default function VoiceWaveform({ isRecording }: VoiceWaveformProps) {
  if (!isRecording) return null;

  return (
    <div className="flex items-center justify-center space-x-2 h-16">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="w-1 bg-purple-500 rounded-full animate-pulse"
          style={{
            height: `${Math.random() * 40 + 10}px`,
            animationDuration: `${Math.random() * 0.5 + 0.5}s`,
            animationDelay: `${i * 0.05}s`,
          }}
        />
      ))}
    </div>
  );
}