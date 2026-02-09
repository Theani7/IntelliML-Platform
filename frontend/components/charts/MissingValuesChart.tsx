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
} from 'recharts';

interface MissingValuesChartProps {
  data: {
    columns: string[];
    counts: number[];
    percentages: number[];
  };
}

import { downloadChart } from '@/lib/downloadChart';

export default function MissingValuesChart({ data }: MissingValuesChartProps) {
  const chartId = 'chart-missing-values';

  if (!data || !data.columns || data.columns.length === 0) {
    return (
      <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-8 text-center">
        <div className="text-4xl mb-3 text-green-400">✓</div>
        <p className="text-green-300 font-bold text-lg">No Missing Values Found!</p>
        <p className="text-sm text-green-400/60 mt-2">Your dataset is clean and complete.</p>
      </div>
    );
  }

  const chartData = data.columns.map((col, idx) => ({
    column: col.length > 15 ? col.substring(0, 15) + '...' : col,
    count: data.counts[idx],
    percentage: data.percentages[idx],
  }));

  return (
    <div id={chartId} className="bg-white rounded-xl border border-[#FFEDC1] p-5 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-lg font-bold text-[#470102] flex items-center gap-2">
            <span className="w-1 h-5 bg-[#FEB229] rounded-full"></span>
            Missing Values
          </h4>
          <p className="text-xs text-[#8A5A5A] ml-3">Data Quality Analysis</p>
        </div>
        <button
          onClick={() => downloadChart(chartId, 'missing-values')}
          className="p-2 hover:bg-[#FFF7EA] rounded-lg text-[#8A5A5A] hover:text-[#470102] transition-colors"
          title="Download Chart"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="column"
            tick={{ fontSize: 11, fill: '#8A5A5A' }}
            angle={-45}
            textAnchor="end"
            height={60}
            stroke="#cbd5e1"
          />
          <YAxis tick={{ fontSize: 11, fill: '#8A5A5A' }} stroke="#cbd5e1" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFF7EA',
              border: '1px solid #FFEDC1',
              borderRadius: '8px',
              color: '#470102',
            }}
            labelStyle={{ color: '#470102' }}
            formatter={(value: any, name: string) => {
              if (name === 'percentage') {
                return [`${value.toFixed(2)}%`, 'Missing %'];
              }
              return [value, 'Missing Count'];
            }}
            cursor={{ fill: 'rgba(71, 1, 2, 0.05)' }}
          />
          <Legend />
          <Bar dataKey="count" fill="#ef4444" name="Missing Count" radius={[4, 4, 0, 0]} />
          <Bar dataKey="percentage" fill="#f97316" name="Missing %" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}