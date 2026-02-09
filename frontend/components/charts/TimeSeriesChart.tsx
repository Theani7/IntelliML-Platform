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

import { downloadChart } from '@/lib/downloadChart';

export default function TimeSeriesChart({ data }: TimeSeriesChartProps) {
  const chartId = `chart-ts-${data.date_column}-${data.value_column}`.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '');

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
    <div id={chartId} className="bg-white rounded-[24px] border border-[#FFEDC1] p-5 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-lg font-bold text-[#470102] flex items-center gap-2">
            <span className="w-1 h-5 bg-[#FEB229] rounded-full"></span>
            Time Series Analysis
          </h4>
          <p className="text-xs text-[#8A5A5A] ml-3">{data.value_column} over {data.date_column}</p>
        </div>
        <button
          onClick={() => downloadChart(chartId, `timeseries-${data.value_column}`)}
          className="p-2 hover:bg-[#FFEDC1]/50 rounded-lg text-[#8A5A5A] hover:text-[#470102] transition-colors"
          title="Download Chart"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={sampledData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#8A5A5A' }}
            angle={-45}
            textAnchor="end"
            height={60}
            stroke="#CBD5E1"
          />
          <YAxis tick={{ fontSize: 11, fill: '#8A5A5A' }} stroke="#CBD5E1" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #FFEDC1',
              borderRadius: '12px',
              color: '#470102',
              boxShadow: '0 4px 6px -1px rgba(71, 1, 2, 0.05)',
            }}
            itemStyle={{ color: '#8A5A5A' }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="value"
            fill="#FEB229"
            fillOpacity={0.1}
            stroke="none"
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#FEB229"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, strokeWidth: 0, fill: '#470102' }}
            name={data.value_column}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}