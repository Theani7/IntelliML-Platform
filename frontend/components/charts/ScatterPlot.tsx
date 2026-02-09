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

import { downloadChart } from '@/lib/downloadChart';

export default function ScatterPlot({ data }: ScatterPlotProps) {
  const chartId = `chart-scatter-${data.x_column}-${data.y_column}`.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '');

  const chartData = data.x_values.map((x, idx) => ({
    x: x,
    y: data.y_values[idx],
  }));

  const correlationColor =
    Math.abs(data.correlation) > 0.7
      ? 'text-green-400'
      : Math.abs(data.correlation) > 0.4
        ? 'text-yellow-400'
        : 'text-gray-400';

  return (
    <div id={chartId} className="bg-white rounded-xl border border-[#FFEDC1] p-5 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-lg font-bold text-[#470102] flex items-center gap-2">
            <span className="w-1 h-5 bg-[#FEB229] rounded-full"></span>
            {data.x_column} vs {data.y_column}
          </h4>
          <div className={`text-xs font-bold mt-1 ${correlationColor} flex items-center gap-1`}>
            Correlation: {data.correlation.toFixed(3)}
          </div>
        </div>
        <button
          onClick={() => downloadChart(chartId, `scatter-${data.x_column}-${data.y_column}`)}
          className="p-2 hover:bg-[#FFF7EA] rounded-lg text-[#8A5A5A] hover:text-[#470102] transition-colors"
          title="Download Chart"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            type="number"
            dataKey="x"
            name={data.x_column}
            tick={{ fontSize: 11, fill: '#8A5A5A' }}
            stroke="#cbd5e1"
            label={{
              value: data.x_column,
              position: 'insideBottom',
              offset: -5,
              fill: '#470102',
              fontSize: 10
            }}
            height={40}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={data.y_column}
            tick={{ fontSize: 11, fill: '#8A5A5A' }}
            stroke="#cbd5e1"
            label={{
              value: data.y_column,
              angle: -90,
              position: 'insideLeft',
              fill: '#470102',
              fontSize: 10
            }}
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3', stroke: '#cbd5e1' }}
            contentStyle={{
              backgroundColor: '#FFF7EA',
              border: '1px solid #FFEDC1',
              borderRadius: '8px',
              color: '#470102',
            }}
            itemStyle={{ color: '#8A5A5A' }}
          />
          <Legend />
          <Scatter
            name="Data Points"
            data={chartData}
            fill="#8b5cf6"
            fillOpacity={0.6}
            shape="circle"
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}