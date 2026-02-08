'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts';

interface TimeSeriesChartProps {
  data: {
    date_column: string;
    value_column: string;
    dates: string[];
    values: number[];
  };
}

export default function TimeSeriesChart({ data }: TimeSeriesChartProps) {
  const chartData = data.dates.map((date, idx) => ({
    date: date,
    value: data.values[idx],
  }));

  // Sample data if too many points
  const sampledData =
    chartData.length > 100
      ? chartData.filter((_, idx) => idx % Math.ceil(chartData.length / 100) === 0)
      : chartData;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h4 className="text-lg font-semibold text-gray-900 mb-4">
        Time Series: {data.value_column} over {data.date_column}
      </h4>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={sampledData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
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
          <Area
            type="monotone"
            dataKey="value"
            fill="#8b5cf6"
            fillOpacity={0.2}
            stroke="none"
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={false}
            name={data.value_column}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}