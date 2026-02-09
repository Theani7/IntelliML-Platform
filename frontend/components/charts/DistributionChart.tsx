'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from 'recharts';

interface DistributionChartProps {
  data: {
    column: string;
    bins: number[];
    counts: number[];
    mean: number;
    median: number;
  };
}

import { downloadChart } from '@/lib/downloadChart';

export default function DistributionChart({ data }: DistributionChartProps) {
  const chartId = `chart-dist-${data.column.replace(/\s+/g, '-')}`;

  // Transform data for Recharts
  const chartData = data.bins.map((bin, idx) => ({
    bin: bin.toFixed(2),
    count: data.counts[idx],
    binValue: bin,
  }));

  return (
    <div id={chartId} className="bg-white rounded-xl border border-[#FFEDC1] p-5 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-lg font-bold text-[#470102] flex items-center gap-2">
            <span className="w-1 h-5 bg-[#FEB229] rounded-full"></span>
            {data.column}
          </h4>
          <p className="text-xs text-[#8A5A5A] ml-3">Distribution Analysis</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-3 text-xs">
            <div className="flex flex-col items-end">
              <span className="text-[#8A5A5A] uppercase tracking-wider font-bold text-[10px]">Mean</span>
              <span className="text-[#470102] font-mono font-medium">{data.mean.toFixed(2)}</span>
            </div>
            <div className="w-px h-6 bg-[#FFEDC1]"></div>
            <div className="flex flex-col items-end">
              <span className="text-[#8A5A5A] uppercase tracking-wider font-bold text-[10px]">Median</span>
              <span className="text-[#470102] font-mono font-medium">{data.median.toFixed(2)}</span>
            </div>
          </div>
          <button
            onClick={() => downloadChart(chartId, `distribution-${data.column}`)}
            className="p-2 hover:bg-[#FFF7EA] rounded-lg text-[#8A5A5A] hover:text-[#470102] transition-colors"
            title="Download Chart"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="bin"
            tick={{ fontSize: 11, fill: '#8A5A5A' }}
            angle={-45}
            textAnchor="end"
            height={60}
            stroke="#cbd5e1"
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#8A5A5A' }}
            stroke="#cbd5e1"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFF7EA',
              border: '1px solid #FFEDC1',
              borderRadius: '8px',
              color: '#470102',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
            }}
            itemStyle={{ color: '#8A5A5A' }}
            labelStyle={{ color: '#470102', marginBottom: '0.5rem' }}
          />
          <Bar dataKey="count" fill="#FEB229" opacity={0.8} radius={[4, 4, 0, 0]} name="Frequency" />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#470102"
            strokeWidth={3}
            dot={{ r: 4, fill: '#470102', strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#FFF7EA', stroke: '#470102' }}
            name="Trend"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}