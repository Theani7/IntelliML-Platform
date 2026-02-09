'use client';

import { useMemo } from 'react';

interface CorrelationHeatmapProps {
  data: {
    columns: string[];
    values: number[][];
  };
}

import { downloadChart } from '@/lib/downloadChart';

export default function CorrelationHeatmap({ data }: CorrelationHeatmapProps) {
  if (!data || !data.columns || data.columns.length === 0) {
    return null;
  }

  const chartId = 'chart-correlation-heatmap';
  const size = 500;
  const margin = { top: 80, right: 30, bottom: 30, left: 80 };
  const width = size - margin.left - margin.right;
  const height = size - margin.top - margin.bottom;
  const cellSize = Math.min(width / data.columns.length, height / data.columns.length);

  const getColor = (value: number) => {
    // Warm Retro theme colors
    // Positive: Maroon
    // Negative: Muted Teal/Grey
    if (value > 0) {
      // Maroon scale
      const opacity = Math.abs(value);
      return `rgba(71, 1, 2, ${opacity})`; // Maroon #470102
    } else {
      // Teal scale for contrast
      const opacity = Math.abs(value);
      return `rgba(20, 184, 166, ${opacity})`; // Teal-500
    }
  };

  return (
    <div id={chartId} className="bg-white rounded-xl border border-[#FFEDC1] p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="text-lg font-bold text-[#470102] flex items-center gap-2">
            <span className="w-1 h-5 bg-[#FEB229] rounded-full"></span>
            Correlation Matrix
          </h4>
          <p className="text-xs text-[#8A5A5A] ml-3">Feature Relationships</p>
        </div>
        <button
          onClick={() => downloadChart(chartId, 'correlation-heatmap')}
          className="p-2 hover:bg-[#FFF7EA] rounded-lg text-[#8A5A5A] hover:text-[#470102] transition-colors"
          title="Download Chart"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      </div>

      <div className="overflow-x-auto flex justify-center">
        <svg width={size} height={size} className="overflow-visible">
          <g transform={`translate(${margin.left},${margin.top})`}>
            {data.values.map((row, rowIdx) => (
              <g key={`row-${rowIdx}`}>
                {/* Y Axis Label */}
                <text
                  x={-10}
                  y={rowIdx * cellSize + cellSize / 2}
                  dy=".32em"
                  textAnchor="end"
                  className="text-[10px] fill-[#8A5A5A] font-medium"
                >
                  {data.columns[rowIdx].length > 12
                    ? data.columns[rowIdx].substring(0, 10) + '..'
                    : data.columns[rowIdx]}
                </text>

                {row.map((value, colIdx) => (
                  <g key={`cell-${rowIdx}-${colIdx}`}>
                    {/* X Axis Label (only for first row) */}
                    {rowIdx === 0 && (
                      <text
                        x={colIdx * cellSize + cellSize / 2}
                        y={-10}
                        transform={`rotate(-45, ${colIdx * cellSize + cellSize / 2}, -10)`}
                        textAnchor="start"
                        className="text-[10px] fill-[#8A5A5A] font-medium"
                      >
                        {data.columns[colIdx].length > 12
                          ? data.columns[colIdx].substring(0, 10) + '..'
                          : data.columns[colIdx]}
                      </text>
                    )}

                    {/* Cell Rect */}
                    <rect
                      x={colIdx * cellSize}
                      y={rowIdx * cellSize}
                      width={cellSize - 2}
                      height={cellSize - 2}
                      rx={2}
                      fill={getColor(value)}
                      stroke="#FFEDC1"
                      strokeWidth={1}
                      className="transition-all hover:opacity-80"
                    />

                    {/* Value Text - only show if large enough */}
                    {cellSize > 25 && (
                      <text
                        x={colIdx * cellSize + cellSize / 2}
                        y={rowIdx * cellSize + cellSize / 2}
                        dy=".35em"
                        textAnchor="middle"
                        className="text-[9px] fill-white font-mono pointer-events-none shadow-black drop-shadow-md"
                        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                      >
                        {Math.abs(value).toFixed(1).replace('0.', '.')}
                      </text>
                    )}

                    {/* Tooltip Title */}
                    <title>{`${data.columns[rowIdx]} vs ${data.columns[colIdx]}: ${value.toFixed(3)}`}</title>
                  </g>
                ))}
              </g>
            ))}
          </g>
        </svg>
      </div>

      <div className="mt-4 flex items-center justify-center gap-6 text-xs text-[#8A5A5A] border-t border-[#FFEDC1] pt-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            <div className="w-2 h-2 rounded-sm bg-teal-500/20" />
            <div className="w-2 h-2 rounded-sm bg-teal-500/60" />
            <div className="w-2 h-2 rounded-sm bg-teal-500" />
          </div>
          <span>Negative</span>
        </div>
        <span className="text-[#FFEDC1]">|</span>
        <div className="flex items-center gap-2">
          <span>Positive</span>
          <div className="flex gap-0.5">
            <div className="w-2 h-2 rounded-sm bg-[#470102]/20" />
            <div className="w-2 h-2 rounded-sm bg-[#470102]/60" />
            <div className="w-2 h-2 rounded-sm bg-[#470102]" />
          </div>
        </div>
      </div>
    </div>
  );
}