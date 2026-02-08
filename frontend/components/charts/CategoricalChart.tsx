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

export default function CategoricalChart({ data }: CategoricalChartProps) {
  const chartData = data.categories.map((cat, idx) => ({
    category: cat.length > 20 ? cat.substring(0, 20) + '...' : cat,
    count: data.counts[idx],
  }));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h4 className="text-lg font-semibold text-gray-900 mb-4">
        Top Categories: {data.column}
      </h4>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis
            dataKey="category"
            type="category"
            width={150}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #ddd',
              borderRadius: '8px',
            }}
          />
          <Legend />
          <Bar dataKey="count" name="Count">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}