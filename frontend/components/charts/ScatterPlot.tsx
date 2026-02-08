'use client';

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ScatterPlotProps {
  data: {
    x_column: string;
    y_column: string;
    x_values: number[];
    y_values: number[];
    correlation: number;
  };
}

export default function ScatterPlot({ data }: ScatterPlotProps) {
  const chartData = data.x_values.map((x, idx) => ({
    x: x,
    y: data.y_values[idx],
  }));

  const correlationColor =
    Math.abs(data.correlation) > 0.7
      ? 'text-red-600'
      : Math.abs(data.correlation) > 0.4
      ? 'text-yellow-600'
      : 'text-green-600';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-900">
          {data.x_column} vs {data.y_column}
        </h4>
        <div className={`text-sm font-bold ${correlationColor}`}>
          Correlation: {data.correlation.toFixed(3)}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            type="number"
            dataKey="x"
            name={data.x_column}
            tick={{ fontSize: 12 }}
            label={{
              value: data.x_column,
              position: 'insideBottom',
              offset: -5,
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={data.y_column}
            tick={{ fontSize: 12 }}
            label={{
              value: data.y_column,
              angle: -90,
              position: 'insideLeft',
            }}
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #ddd',
              borderRadius: '8px',
            }}
          />
          <Legend />
          <Scatter
            name="Data Points"
            data={chartData}
            fill="#8b5cf6"
            fillOpacity={0.6}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}