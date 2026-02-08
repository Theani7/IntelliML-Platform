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

export default function DistributionChart({ data }: DistributionChartProps) {
  // Transform data for Recharts
  const chartData = data.bins.map((bin, idx) => ({
    bin: bin.toFixed(2),
    count: data.counts[idx],
    binValue: bin,
  }));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-900">
          Distribution: {data.column}
        </h4>
        <div className="flex items-center space-x-4 text-sm">
          <span className="text-blue-600">
            Mean: <strong>{data.mean.toFixed(2)}</strong>
          </span>
          <span className="text-green-600">
            Median: <strong>{data.median.toFixed(2)}</strong>
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="bin"
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
          />
          <Legend />
          <Bar dataKey="count" fill="#8b5cf6" name="Frequency" />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="Trend"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}