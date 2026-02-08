'use client';

interface BoxPlotChartProps {
  data: {
    column: string;
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
    outliers: number[];
  }[];
}

export default function BoxPlotChart({ data }: BoxPlotChartProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h4 className="text-lg font-semibold text-gray-900 mb-4">
        Box Plots - Distribution Overview
      </h4>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((boxData, idx) => (
          <SingleBoxPlot key={idx} data={boxData} />
        ))}
      </div>
    </div>
  );
}

function SingleBoxPlot({ data }: { data: any }) {
  const range = data.max - data.min;
  const height = 200;

  const getY = (value: number) => {
    return height - ((value - data.min) / range) * (height - 40);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <h5 className="text-sm font-semibold text-gray-700 mb-2 truncate">
        {data.column}
      </h5>

      <svg width="100%" height={height} className="overflow-visible">
        {/* Whiskers */}
        <line
          x1="50%"
          y1={getY(data.min)}
          x2="50%"
          y2={getY(data.q1)}
          stroke="#6b7280"
          strokeWidth="2"
          strokeDasharray="4"
        />
        <line
          x1="50%"
          y1={getY(data.q3)}
          x2="50%"
          y2={getY(data.max)}
          stroke="#6b7280"
          strokeWidth="2"
          strokeDasharray="4"
        />

        {/* Box */}
        <rect
          x="30%"
          y={getY(data.q3)}
          width="40%"
          height={getY(data.q1) - getY(data.q3)}
          fill="#8b5cf6"
          fillOpacity="0.3"
          stroke="#8b5cf6"
          strokeWidth="2"
        />

        {/* Median line */}
        <line
          x1="30%"
          y1={getY(data.median)}
          x2="70%"
          y2={getY(data.median)}
          stroke="#8b5cf6"
          strokeWidth="3"
        />

        {/* Min/Max caps */}
        <line
          x1="40%"
          y1={getY(data.min)}
          x2="60%"
          y2={getY(data.min)}
          stroke="#6b7280"
          strokeWidth="2"
        />
        <line
          x1="40%"
          y1={getY(data.max)}
          x2="60%"
          y2={getY(data.max)}
          stroke="#6b7280"
          strokeWidth="2"
        />

        {/* Outliers */}
        {data.outliers.slice(0, 20).map((outlier: number, idx: number) => (
          <circle
            key={idx}
            cx="50%"
            cy={getY(outlier)}
            r="3"
            fill="#ef4444"
            opacity="0.6"
          />
        ))}
      </svg>

      <div className="mt-2 text-xs text-gray-600 space-y-1">
        <div className="flex justify-between">
          <span>Max:</span>
          <span className="font-semibold">{data.max.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Q3:</span>
          <span className="font-semibold">{data.q3.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Median:</span>
          <span className="font-semibold text-purple-600">{data.median.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Q1:</span>
          <span className="font-semibold">{data.q1.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Min:</span>
          <span className="font-semibold">{data.min.toFixed(2)}</span>
        </div>
        {data.outliers.length > 0 && (
          <div className="flex justify-between text-red-600">
            <span>Outliers:</span>
            <span className="font-semibold">{data.outliers.length}</span>
          </div>
        )}
      </div>
    </div>
  );
}