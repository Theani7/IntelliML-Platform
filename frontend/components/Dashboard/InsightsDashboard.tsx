import { useState } from 'react';
import { downloadReport } from '@/lib/api';
import DistributionChart from '../charts/DistributionChart';
import CategoricalChart from '../charts/CategoricalChart';
import CorrelationHeatmap from '../charts/CorrelationHeatmap';
import MissingValuesChart from '../charts/MissingValuesChart';
import BoxPlotChart from '../charts/BoxPlotChart';
import ScatterPlot from '../charts/ScatterPlot';
import TimeSeriesChart from '../charts/TimeSeriesChart';

interface InsightsDashboardProps {
  analysisResults: any;
}

type TabType = 'overview' | 'distributions' | 'relationships' | 'quality' | 'advanced' | 'statistics';

export default function InsightsDashboard({ analysisResults }: InsightsDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isDownloading, setIsDownloading] = useState(false);

  if (!analysisResults || !analysisResults.analysis) {
    return null;
  }

  const { analysis } = analysisResults;
  const chartData = analysis.chart_data || {};

  const handleDownloadReport = async () => {
    try {
      setIsDownloading(true);
      await downloadReport();
    } catch (error) {
      console.error("Failed to download report", error);
      alert("Failed to generate report. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="bg-slate-950 border border-blue-500/10 rounded-2xl shadow-xl shadow-blue-500/5 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 bg-slate-900/50 backdrop-blur-md border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">EDA Dashboard</h2>
            <p className="text-cyan-200/60 text-xs font-medium uppercase tracking-wider">
              Comprehensive Analysis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleDownloadReport}
            disabled={isDownloading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDownloading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Download Report</span>
              </>
            )}
          </button>

          <div className="text-right bg-white/5 px-4 py-2 rounded-xl border border-white/5">
            <div className="text-2xl font-bold text-white">
              {analysis.data_quality?.quality_score || 0}
            </div>
            <div className="text-[10px] text-cyan-200/60 uppercase tracking-widest font-bold">Quality Score</div>
          </div>
        </div>

      </div>

      {/* Tab Navigation */}
      <div className="border-b border-white/10 bg-slate-900/50">
        <div className="flex space-x-1 p-2">
          <TabButton
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
            label="Overview"
          />
          <TabButton
            active={activeTab === 'distributions'}
            onClick={() => setActiveTab('distributions')}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>}
            label="Distributions"
          />
          <TabButton
            active={activeTab === 'relationships'}
            onClick={() => setActiveTab('relationships')}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>}
            label="Relationships"
          />
          <TabButton
            active={activeTab === 'quality'}
            onClick={() => setActiveTab('quality')}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            label="Data Quality"
          />
          <TabButton
            active={activeTab === 'advanced'}
            onClick={() => setActiveTab('advanced')}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
            label="Advanced"
          />
          <TabButton
            active={activeTab === 'statistics'}
            onClick={() => setActiveTab('statistics')}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
            label="Statistics"
          />

        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <OverviewTab analysis={analysis} chartData={chartData} />
        )}
        {activeTab === 'distributions' && (
          <DistributionsTab chartData={chartData} />
        )}
        {activeTab === 'relationships' && (
          <RelationshipsTab chartData={chartData} />
        )}
        {activeTab === 'quality' && (
          <QualityTab analysis={analysis} chartData={chartData} />
        )}
        {activeTab === 'statistics' && (
          <StatisticsTab stats={analysis.descriptive_stats} />
        )}
        {activeTab === 'advanced' && (
          <AdvancedTab chartData={chartData} />
        )}

      </div>
    </div>
  );
}

// --- Sub-components ---

function StatisticsTab({ stats }: { stats: any }) {
  if (!stats || Object.keys(stats).length === 0) {
    return <div className="text-gray-400 text-center py-8">No statistics available for this dataset.</div>;
  }

  const columns = Object.keys(stats);
  const metrics = ['count', 'mean', 'std', 'min', '25%', '50%', '75%', 'max', 'skew', 'kurtosis'];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-400">
        <thead className="text-xs text-gray-300 uppercase bg-slate-900/50">
          <tr>
            <th className="px-6 py-3 rounded-tl-lg">Metric</th>
            {columns.map(col => (
              <th key={col} className="px-6 py-3 font-semibold text-white">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric, i) => (
            <tr key={metric} className={`border-b border-white/5 ${i % 2 === 0 ? 'bg-white/5' : 'bg-transparent'}`}>
              <td className="px-6 py-4 font-medium text-white bg-slate-900/30 sticky left-0 uppercase tracking-wider text-xs">
                {metric}
              </td>
              {columns.map(col => (
                <td key={`${col}-${metric}`} className="px-6 py-4 font-mono text-cyan-200">
                  {stats[col]?.[metric] !== undefined ? stats[col][metric] : '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}



// Tab Button Component
function TabButton({ active, onClick, icon, label }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all
        ${active
          ? 'bg-blue-500/10 text-cyan-400 border border-blue-500/20 shadow-lg shadow-blue-500/10'
          : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
        }
      `}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// Overview Tab
function OverviewTab({ analysis, chartData }: { analysis: any; chartData: any }) {
  // Return null if required data is missing
  if (!analysis?.basic_info) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Analysis data not available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        <MetricCard
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>}
          label="Total Rows"
          value={(analysis.basic_info.num_rows || 0).toLocaleString()}
          color="blue"
        />
        <MetricCard
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" /></svg>}
          label="Total Columns"
          value={analysis.basic_info.num_columns || 0}
          color="cyan"
        />
        <MetricCard
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>}
          label="Numeric Columns"
          value={analysis.basic_info.numeric_columns || 0}
          color="green"
        />
        <MetricCard
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>}
          label="Categorical Columns"
          value={analysis.basic_info.categorical_columns || 0}
          color="yellow"
        />
      </div>

      {/* Quick Charts Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* First Distribution */}
        {chartData.distributions?.[0] && (
          <DistributionChart data={chartData.distributions[0]} />
        )}

        {/* First Categorical */}
        {chartData.categorical_counts?.[0] && (
          <CategoricalChart data={chartData.categorical_counts[0]} />
        )}

        {/* Missing Values */}
        {chartData.missing_values_chart && (
          <MissingValuesChart data={chartData.missing_values_chart} />
        )}

        {/* First Scatter Plot */}
        {chartData.scatter_matrix?.[0] && (
          <ScatterPlot data={chartData.scatter_matrix[0]} />
        )}
      </div>
    </div>
  );
}

// Distributions Tab
function DistributionsTab({ chartData }: { chartData: any }) {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-white mb-4">
        Distribution Analysis
      </h3>

      {/* Numeric Distributions */}
      {chartData.distributions && chartData.distributions.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-white mb-3">
            Numeric Columns
          </h4>
          <div className="grid md:grid-cols-2 gap-6">
            {chartData.distributions.map((dist: any, idx: number) => (
              <DistributionChart key={idx} data={dist} />
            ))}
          </div>
        </div>
      )}

      {/* Categorical Distributions */}
      {chartData.categorical_counts && chartData.categorical_counts.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-white mb-3 mt-6">
            Categorical Columns
          </h4>
          <div className="grid md:grid-cols-2 gap-6">
            {chartData.categorical_counts.map((cat: any, idx: number) => (
              <CategoricalChart key={idx} data={cat} />
            ))}
          </div>
        </div>
      )}

      {/* Box Plots */}
      {chartData.box_plots && chartData.box_plots.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-white mb-3 mt-6">
            Box Plots - Outlier Detection
          </h4>
          <BoxPlotChart data={chartData.box_plots} />
        </div>
      )}
    </div>
  );
}

// Relationships Tab
function RelationshipsTab({ chartData }: { chartData: any }) {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-white mb-4">
        Variable Relationships
      </h3>

      {/* Correlation Heatmap */}
      {chartData.correlation_heatmap &&
        chartData.correlation_heatmap.columns?.length > 0 && (
          <CorrelationHeatmap data={chartData.correlation_heatmap} />
        )}

      {/* Scatter Plots */}
      {chartData.scatter_matrix && chartData.scatter_matrix.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-white mb-3 mt-6">
            Scatter Plot Matrix
          </h4>
          <div className="grid md:grid-cols-2 gap-6">
            {chartData.scatter_matrix.map((scatter: any, idx: number) => (
              <ScatterPlot key={idx} data={scatter} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Quality Tab
function QualityTab({ analysis, chartData }: { analysis: any; chartData: any }) {
  // Return placeholder if data_quality is missing
  if (!analysis?.data_quality) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Quality analysis data not available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-white mb-4">Data Quality Analysis</h3>

      {/* Quality Score Card */}
      <div className="bg-slate-900/50 border border-green-500/20 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-white mb-2">
              Overall Quality Score
            </h4>
            <p className="text-gray-400">
              Based on missing values, duplicates, and data consistency
            </p>
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold text-green-600">
              {analysis.data_quality.quality_score || 0}
            </div>
            <div className="text-sm text-gray-600">out of 100</div>
          </div>
        </div>
      </div>

      {/* Issues */}
      {analysis.data_quality.issues && analysis.data_quality.issues.length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-yellow-400 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            Issues Found
          </h4>
          <ul className="space-y-2">
            {analysis.data_quality.issues.map((issue: string, idx: number) => (
              <li key={idx} className="flex items-start space-x-2 text-yellow-200/80">
                <span>•</span>
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Missing Values Chart */}
      {chartData.missing_values_chart && (
        <MissingValuesChart data={chartData.missing_values_chart} />
      )}

      {/* Recommendations */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-blue-400 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
            Recommendations
          </h4>
          <ul className="space-y-2">
            {analysis.recommendations.map((rec: string, idx: number) => (
              <li key={idx} className="flex items-start space-x-2 text-blue-200/80">
                <span>•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Advanced Tab
function AdvancedTab({ chartData }: { chartData: any }) {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-white mb-4">Advanced Analysis</h3>

      {/* Time Series */}
      {chartData.time_series && chartData.time_series.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-white mb-3">
            Time Series Analysis
          </h4>
          <div className="space-y-6">
            {chartData.time_series.map((ts: any, idx: number) => (
              <TimeSeriesChart key={idx} data={ts} />
            ))}
          </div>
        </div>
      )}

      {/* Box Plots for Outlier Detection */}
      {chartData.box_plots && chartData.box_plots.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-white mb-3 mt-6">
            Outlier Detection
          </h4>
          <BoxPlotChart data={chartData.box_plots} />
        </div>
      )}

      {!chartData.time_series?.length && !chartData.box_plots?.length && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-3 text-white/20">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </div>
          <p>No advanced visualizations available for this dataset</p>
        </div>
      )}
    </div>
  );
}

// Metric Card Component
function MetricCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: 'blue' | 'cyan' | 'green' | 'yellow';
}) {
  const colors = {
    blue: 'from-blue-500/10 to-blue-600/10 border-blue-500/20 text-blue-400',
    cyan: 'from-cyan-500/10 to-cyan-600/10 border-cyan-500/20 text-cyan-400',
    green: 'from-green-500/10 to-green-600/10 border-green-500/20 text-green-400',
    yellow: 'from-yellow-500/10 to-yellow-600/10 border-yellow-500/20 text-yellow-400',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-4 flex items-center justify-between group hover:brightness-110 transition-all`}>
      <div>
        <div className="text-2xl font-bold text-white mb-1">{value}</div>
        <div className="text-xs text-gray-400 font-medium tracking-wide uppercase">{label}</div>
      </div>
      <div className="p-3 bg-white/5 rounded-lg text-white/80 group-hover:scale-110 transition-transform">{icon}</div>
    </div>
  );
}