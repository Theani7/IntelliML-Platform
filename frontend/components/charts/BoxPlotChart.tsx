'use client';

interface BoxPlotChartProps {
  data: {
    column: string;
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
    outliers: number[];
  }[];
}

import { downloadChart } from '@/lib/downloadChart';

export default function BoxPlotChart({ data }: BoxPlotChartProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-[#FFEDC1] p-5 shadow-sm">
      <h4 className="text-lg font-bold text-[#470102] mb-6 flex items-center gap-2">
        <span className="w-1 h-5 bg-[#FEB229] rounded-full"></span>
        Box Plots - Distribution Overview
      </h4>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((boxData, idx) => (
          <SingleBoxPlot key={idx} data={boxData} index={idx} />
        ))}
      </div>
    </div>
  );
}

function SingleBoxPlot({ data, index }: { data: any; index: number }) {
  const chartId = `box-plot-${index}-${data.column.replace(/\s+/g, '-')}`;
  const range = data.max - data.min;
  const height = 200;

  const getY = (value: number) => {
    return height - ((value - data.min) / range) * (height - 40);
  };

  return (
    <div id={chartId} className="border border-[#FFEDC1] rounded-xl p-4 bg-[#FFF7EA] hover:bg-[#FFF7EA]/80 transition-colors relative group">
      <div className="flex justify-between items-start mb-4">
        <h5 className="text-sm font-semibold text-[#8A5A5A] truncate pr-8">
          {data.column}
        </h5>
        <button
          onClick={() => downloadChart(chartId, `boxplot-${data.column}`)}
          className="absolute top-2 right-2 p-1.5 hover:bg-[#FFEDC1] rounded-lg text-[#8A5A5A] hover:text-[#470102] transition-colors opacity-0 group-hover:opacity-100"
          title="Download Plot"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      </div>

      <svg width="100%" height={height} className="overflow-visible">
        {/* Whiskers */}
        <line
          x1="50%"
          y1={getY(data.min)}
          x2="50%"
          y2={getY(data.q1)}
          stroke="#64748b"
          strokeWidth="2"
          strokeDasharray="4"
        />
        <line
          x1="50%"
          y1={getY(data.q3)}
          x2="50%"
          y2={getY(data.max)}
          stroke="#64748b"
          strokeWidth="2"
          strokeDasharray="4"
        />

        {/* Box */}
        <rect
          x="30%"
          y={getY(data.q3)}
          width="40%"
          height={getY(data.q1) - getY(data.q3)}
          fill="#8b5cf6"
          fillOpacity="0.2"
          stroke="#a78bfa"
          strokeWidth="2"
        />

        {/* Median line */}
        <line
          x1="30%"
          y1={getY(data.median)}
          x2="70%"
          y2={getY(data.median)}
          stroke="#ddd6fe"
          strokeWidth="3"
        />

        {/* Min/Max caps */}
        <line
          x1="40%"
          y1={getY(data.min)}
          x2="60%"
          y2={getY(data.min)}
          stroke="#64748b"
          strokeWidth="2"
        />
        <line
          x1="40%"
          y1={getY(data.max)}
          x2="60%"
          y2={getY(data.max)}
          stroke="#64748b"
          strokeWidth="2"
        />

        {/* Outliers */}
        {data.outliers.slice(0, 20).map((outlier: number, idx: number) => (
          <circle
            key={idx}
            cx="50%"
            cy={getY(outlier)}
            r="3"
            fill="#ef4444"
            opacity="0.8"
          />
        ))}
      </svg>

      <div className="mt-4 text-[10px] text-[#8A5A5A] space-y-1.5 font-mono">
        <div className="flex justify-between border-b border-[#FFEDC1] pb-1">
          <span>Max</span>
          <span className="font-medium text-[#470102]">{data.max.toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-b border-[#FFEDC1] pb-1">
          <span>Q3</span>
          <span className="font-medium text-[#470102]">{data.q3.toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-b border-[#FFEDC1] pb-1">
          <span className="text-[#470102] font-bold">Median</span>
          <span className="font-bold text-[#470102]">{data.median.toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-b border-[#FFEDC1] pb-1">
          <span>Q1</span>
          <span className="font-medium text-[#470102]">{data.q1.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Min</span>
          <span className="font-medium text-[#470102]">{data.min.toFixed(2)}</span>
        </div>
        {data.outliers.length > 0 && (
          <div className="flex justify-between text-red-400 pt-1">
            <span>Outliers</span>
            <span className="font-bold">{data.outliers.length}</span>
          </div>
        )}
      </div>
    </div>
  );
}