'use client';

export default function Header() {
  return (
    <header className="bg-[#FFF7EA]/90 backdrop-blur-md border-b border-[#FFEDC1] sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl text-display font-medium text-[#470102] tracking-tight">
                IntelliML
              </h1>
              <p className="text-xs text-[var(--primary)] font-medium">Voice-Activated AutoML</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 font-medium">
              v1.0.0
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}