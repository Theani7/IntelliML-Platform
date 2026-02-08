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

export default function MissingValuesChart({ data }: MissingValuesChartProps) {
  if (!data || !data.columns || data.columns.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div className="text-4xl mb-2">✓</div>
        <p className="text-green-800 font-semibold">No Missing Values Found!</p>
        <p className="text-sm text-green-600 mt-1">Your dataset is complete.</p>
      </div>
    );
  }

  const chartData = data.columns.map((col, idx) => ({
    column: col.length > 15 ? col.substring(0, 15) + '...' : col,
    count: data.counts[idx],
    percentage: data.percentages[idx],
  }));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h4 className="text-lg font-semibold text-gray-900 mb-4">
        Missing Values Analysis
      </h4>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="column"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #ddd',
              borderRadius: '8px',
            }}
            formatter={(value: any, name: string) => {
              if (name === 'percentage') {
                return `${value.toFixed(2)}%`;
              }
              return value;
            }}
          />
          <Legend />
          <Bar dataKey="count" fill="#ef4444" name="Missing Count" />
          <Bar dataKey="percentage" fill="#f97316" name="Missing %" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}