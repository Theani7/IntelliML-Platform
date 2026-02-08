'use client';

interface DataStatsProps {
  analysis: any;
}

export default function DataStats({ analysis }: DataStatsProps) {
  if (!analysis) return null;

  const { basic_info, data_quality, missing_values } = analysis;

  return (
    <div className="grid md:grid-cols-4 gap-4">
      <StatCard
        icon="📊"
        label="Total Rows"
        value={basic_info.num_rows.toLocaleString()}
        color="blue"
      />
      <StatCard
        icon="📋"
        label="Total Columns"
        value={basic_info.num_columns}
        color="purple"
      />
      <StatCard
        icon="⚠️"
        label="Missing Values"
        value={missing_values.total_missing.toLocaleString()}
        color={missing_values.total_missing > 0 ? "yellow" : "green"}
      />
      <StatCard
        icon="✨"
        label="Quality Score"
        value={`${data_quality.quality_score}/100`}
        color={data_quality.quality_score > 80 ? "green" : "yellow"}
      />
    </div>
  );
}

function StatCard({ icon, label, value, color }: any) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    purple: 'bg-purple-50 border-purple-200 text-purple-800',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    green: 'bg-green-50 border-green-200 text-green-800',
  };

  return (
    <div className={`border-2 rounded-lg p-4 ${colors[color]}`}>
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-75">{label}</div>
    </div>
  );
}