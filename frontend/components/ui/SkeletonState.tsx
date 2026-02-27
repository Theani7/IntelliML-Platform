'use client';

export default function SkeletonState({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-[#FFEDC1] bg-white p-6 animate-pulse">
      <div className="h-5 w-40 bg-[#FFF7EA] rounded mb-4" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-4 w-full bg-[#FFF7EA] rounded" />
        ))}
      </div>
    </div>
  );
}
