'use client';

interface AIInsightsProps {
  insights: string;
}

export default function AIInsights({ insights }: AIInsightsProps) {
  if (!insights) return null;

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-6">
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-2xl">🤖</span>
        <h3 className="text-lg font-semibold text-gray-900">
          AI-Generated Insights
        </h3>
      </div>
      
      <div className="prose prose-sm max-w-none">
        <p className="text-gray-700 whitespace-pre-wrap">
          {insights}
        </p>
      </div>
    </div>
  );
}