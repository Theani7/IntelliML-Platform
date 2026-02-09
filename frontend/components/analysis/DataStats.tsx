'use client';

interface DataStatsProps {
  analysis: any;
}

// Icon components
const ChartIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const ColumnsIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const SparkleIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
  </svg>
);

export default function DataStats({ analysis }: DataStatsProps) {
  if (!analysis?.basic_info || !analysis?.data_quality || !analysis?.missing_values) {
    return null;
  }

  const { basic_info, data_quality, missing_values } = analysis;

  return (
    <div className="grid md:grid-cols-4 gap-4">
      <StatCard
        icon={<ChartIcon />}
        label="Total Rows"
        value={basic_info.num_rows.toLocaleString()}
        gradient="from-blue-500 to-cyan-500"
      />
      <StatCard
        icon={<ColumnsIcon />}
        label="Total Columns"
        value={basic_info.num_columns}
        gradient="from-indigo-500 to-purple-500"
      />
      <StatCard
        icon={<AlertIcon />}
        label="Missing Values"
        value={missing_values.total_missing.toLocaleString()}
        gradient={missing_values.total_missing > 0 ? "from-amber-500 to-orange-500" : "from-green-500 to-emerald-500"}
      />
      <StatCard
        icon={<SparkleIcon />}
        label="Quality Score"
        value={`${data_quality.quality_score}/100`}
        gradient={data_quality.quality_score > 80 ? "from-green-500 to-emerald-500" : "from-amber-500 to-orange-500"}
      />
    </div>
  );
}

function StatCard({ icon, label, value, gradient }: { icon: React.ReactNode; label: string; value: string | number; gradient: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#FFEDC1] p-5 shadow-sm hover:shadow-md transition-all group">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white mb-3 shadow-md group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-[#470102] mb-1">{value}</div>
      <div className="text-sm text-[#8A5A5A]">{label}</div>
    </div>
  );
}