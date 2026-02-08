'use client';

import { useMemo } from 'react';

interface CorrelationHeatmapProps {
  data: {
    columns: string[];
    values: number[][];
  };
}

export default function CorrelationHeatmap({ data }: CorrelationHeatmapProps) {
  if (!data || !data.columns || data.columns.length === 0) {
    return null;
  }

  const getColor = (value: number) => {
    // Color scale from red (negative) to white (zero) to blue (positive)
    if (value > 0) {
      const intensity = Math.floor(value * 255);
      return `rgb(${255 - intensity}, ${255 - intensity}, 255)`;
    } else {
      const intensity = Math.floor(Math.abs(value) * 255);
      return `rgb(255, ${255 - intensity}, ${255 - intensity})`;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h4 className="text-lg font-semibold text-gray-900 mb-4">
        Correlation Heatmap
      </h4>

      <div className="overflow-x-auto">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="p-2 border border-gray-300 bg-gray-50"></th>
              {data.columns.map((col, idx) => (
                <th
                  key={idx}
                  className="p-2 border border-gray-300 bg-gray-50 text-xs font-medium text-gray-700"
                  style={{ minWidth: '80px' }}
                >
                  <div className="transform -rotate-45 origin-left">
                    {col.length > 10 ? col.substring(0, 10) + '...' : col}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.values.map((row, rowIdx) => (
              <tr key={rowIdx}>
                <td className="p-2 border border-gray-300 bg-gray-50 text-xs font-medium text-gray-700">
                  {data.columns[rowIdx].length > 10
                    ? data.columns[rowIdx].substring(0, 10) + '...'
                    : data.columns[rowIdx]}
                </td>
                {row.map((value, colIdx) => (
                  <td
                    key={colIdx}
                    className="p-2 border border-gray-300 text-center text-xs font-semibold"
                    style={{
                      backgroundColor: getColor(value),
                      color: Math.abs(value) > 0.5 ? 'white' : 'black',
                    }}
                    title={`${data.columns[rowIdx]} vs ${data.columns[colIdx]}: ${value.toFixed(3)}`}
                  >
                    {value.toFixed(2)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-center space-x-4 text-xs text-gray-600">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-300 border border-gray-300"></div>
          <span>Negative</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-white border border-gray-300"></div>
          <span>Zero</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-300 border border-gray-300"></div>
          <span>Positive</span>
        </div>
      </div>
    </div>
  );
}