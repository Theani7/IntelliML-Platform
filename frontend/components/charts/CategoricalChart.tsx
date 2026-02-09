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
  Cell,
} from 'recharts';

interface CategoricalChartProps {
  data: {
    column: string;
    categories: string[];
    counts: number[];
  };
}

const COLORS = [
  '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#84cc16'
];

import { downloadChart } from '@/lib/downloadChart';

export default function CategoricalChart({ data }: CategoricalChartProps) {
  const chartId = `chart-cat-${data.column.replace(/\s+/g, '-')}`;

  const chartData = data.categories.map((cat, idx) => ({
    category: cat.length > 20 ? cat.substring(0, 20) + '...' : cat,
    count: data.counts[idx],
  }));

  return (
    <div id={chartId} className="bg-white rounded-xl border border-[#FFEDC1] p-5 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-lg font-bold text-[#470102] flex items-center gap-2">
            <span className="w-1 h-5 bg-[#FEB229] rounded-full"></span>
            {data.column}
          </h4>
          <p className="text-xs text-[#8A5A5A] ml-3">Top Categories</p>
        </div>
        <button
          onClick={() => downloadChart(chartId, `categories-${data.column}`)}
          className="p-2 hover:bg-[#FFF7EA] rounded-lg text-[#8A5A5A] hover:text-[#470102] transition-colors"
          title="Download Chart"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#8A5A5A' }} stroke="#cbd5e1" />
          <YAxis
            dataKey="category"
            type="category"
            width={100}
            tick={{ fontSize: 11, fill: '#8A5A5A' }}
            stroke="#cbd5e1"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFF7EA',
              border: '1px solid #FFEDC1',
              borderRadius: '8px',
              color: '#470102',
            }}
            itemStyle={{ color: '#8A5A5A' }}
            cursor={{ fill: 'rgba(71, 1, 2, 0.05)' }}
          />
          <Legend />
          <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}