'use client';

interface AIInsightsProps {
  insights: string | { insights: string; timestamp: string } | null;
}

const BotIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H6a2 2 0 01-2-2v-1H3a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2zM9 16a1 1 0 100-2 1 1 0 000 2zm6 0a1 1 0 100-2 1 1 0 000 2z" />
  </svg>
);

export default function AIInsights({ insights }: AIInsightsProps) {
  if (!insights) return null;

  const insightText = typeof insights === 'string' ? insights : insights?.insights;

  if (!insightText) return null;

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-[24px] border border-[#FFEDC1] p-6 shadow-sm relative overflow-hidden group">
      {/* Ambient Glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#FEB229]/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-[#FEB229]/20 transition-colors duration-500"></div>

      <div className="flex items-center gap-4 mb-5 relative z-10">
        <div className="w-10 h-10 rounded-xl bg-[#FFF7EA] border border-[#FFEDC1] flex items-center justify-center text-[#FEB229] shadow-sm">
          <BotIcon />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#470102] tracking-wide">
            AI-Generated Insights
          </h3>
          <p className="text-xs text-[#8A5A5A] font-medium uppercase tracking-wider">
            Automated Analysis
          </p>
        </div>
      </div>

      <div className="prose prose-sm max-w-none relative z-10">
        <p className="text-[#470102] whitespace-pre-wrap leading-relaxed font-normal">
          {insightText}
        </p>
      </div>
    </div>
  );
}