'use client';

interface DataPreviewProps {
  data: {
    columns: string[];
    rows: any[][];
    shape: [number, number];
    dtypes: Record<string, string>;
  };
}

export default function DataPreview({ data }: DataPreviewProps) {
  if (!data || !data.rows || data.rows.length === 0) {
    return null;
  }

  const [numRows, numCols] = data.shape;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Data Preview
        </h3>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>📊 {numRows} rows</span>
          <span>📋 {numCols} columns</span>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                #
              </th>
              {data.columns.map((col, idx) => (
                <th
                  key={idx}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  <div>{col}</div>
                  <div className="text-xs text-gray-400 normal-case">
                    {data.dtypes[col]}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.rows.slice(0, 10).map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-500">
                  {rowIdx + 1}
                </td>
                {row.map((cell, cellIdx) => (
                  <td
                    key={cellIdx}
                    className="px-4 py-3 text-sm text-gray-900"
                  >
                    {cell === null || cell === undefined ? (
                      <span className="text-red-400 italic">null</span>
                    ) : (
                      String(cell)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {numRows > 10 && (
        <p className="mt-2 text-sm text-gray-500 text-center">
          Showing first 10 of {numRows} rows
        </p>
      )}
    </div>
  );
}