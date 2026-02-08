'use client';

import { useState } from 'react';
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

export default function InsightsDashboard({ analysisResults }: InsightsDashboardProps) {
  const [activeTab, setActiveTab] = useState
    'overview' | 'distributions' | 'relationships' | 'quality' | 'advanced'
  >('overview');

  if (!analysisResults || !analysisResults.analysis) {
    return null;
  }

  const { analysis } = analysisResults;
  const chartData = analysis.chart_data || {};

  return (
    <div className="bg-white rounded-lg shadow-lg border-2 border-purple-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">📊 Data Insights Dashboard</h2>
            <p className="text-purple-100">
              Comprehensive visualization and analysis of your dataset
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">
              {analysis.data_quality?.quality_score || 0}
            </div>
            <div className="text-sm text-purple-100">Quality Score</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="flex space-x-1 p-2">
          <TabButton
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
            icon="📋"
            label="Overview"
          />
          <TabButton
            active={activeTab === 'distributions'}
            onClick={() => setActiveTab('distributions')}
            icon="📊"
            label="Distributions"
          />
          <TabButton
            active={activeTab === 'relationships'}
            onClick={() => setActiveTab('relationships')}
            icon="🔗"
            label="Relationships"
          />
          <TabButton
            active={activeTab === 'quality'}
            onClick={() => setActiveTab('quality')}
            icon="✨"
            label="Data Quality"
          />
          <TabButton
            active={activeTab === 'advanced'}
            onClick={() => setActiveTab('advanced')}
            icon="🎯"
            label="Advanced"
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
        {activeTab === 'advanced' && (
          <AdvancedTab chartData={chartData} />
        )}
      </div>
    </div>
  );
}

// Tab Button Component
function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all
        ${
          active
            ? 'bg-white text-purple-600 shadow-md'
            : 'text-gray-600 hover:bg-gray-100'
        }
      `}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// Overview Tab
function OverviewTab({ analysis, chartData }: any) {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        <MetricCard
          icon="📊"
          label="Total Rows"
          value={analysis.basic_info.num_rows.toLocaleString()}
          color="blue"
        />
        <MetricCard
          icon="📋"
          label="Total Columns"
          value={analysis.basic_info.num_columns}
          color="purple"
        />
        <MetricCard
          icon="🔢"
          label="Numeric Columns"
          value={analysis.basic_info.numeric_columns}
          color="green"
        />
        <MetricCard
          icon="📝"
          label="Categorical Columns"
          value={analysis.basic_info.categorical_columns}
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
function DistributionsTab({ chartData }: any) {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">
        Distribution Analysis
      </h3>

      {/* Numeric Distributions */}
      {chartData.distributions && chartData.distributions.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-gray-800 mb-3">
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
          <h4 className="text-lg font-semibold text-gray-800 mb-3 mt-6">
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
          <h4 className="text-lg font-semibold text-gray-800 mb-3 mt-6">
            Box Plots - Outlier Detection
          </h4>
          <BoxPlotChart data={chartData.box_plots} />
        </div>
      )}
    </div>
  );
}

// Relationships Tab
function RelationshipsTab({ chartData }: any) {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">
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
          <h4 className="text-lg font-semibold text-gray-800 mb-3 mt-6">
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
function QualityTab({ analysis, chartData }: any) {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Data Quality Analysis</h3>

      {/* Quality Score Card */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Overall Quality Score
            </h4>
            <p className="text-gray-600">
              Based on missing values, duplicates, and data consistency
            </p>
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold text-green-600">
              {analysis.data_quality.quality_score}
            </div>
            <div className="text-sm text-gray-600">out of 100</div>
          </div>
        </div>
      </div>

      {/* Issues */}
      {analysis.data_quality.issues && analysis.data_quality.issues.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-yellow-900 mb-3">
            ⚠️ Issues Found
          </h4>
          <ul className="space-y-2">
            {analysis.data_quality.issues.map((issue: string, idx: number) => (
              <li key={idx} className="flex items-start space-x-2 text-yellow-800">
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-blue-900 mb-3">
            💡 Recommendations
          </h4>
          <ul className="space-y-2">
            {analysis.recommendations.map((rec: string, idx: number) => (
              <li key={idx} className="flex items-start space-x-2 text-blue-800">
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
function AdvancedTab({ chartData }: any) {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Advanced Analysis</h3>

      {/* Time Series */}
      {chartData.time_series && chartData.time_series.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-gray-800 mb-3">
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
          <h4 className="text-lg font-semibold text-gray-800 mb-3 mt-6">
            Outlier Detection
          </h4>
          <BoxPlotChart data={chartData.box_plots} />
        </div>
      )}

      {!chartData.time_series?.length && !chartData.box_plots?.length && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-3">📊</div>
          <p>No advanced visualizations available for this dataset</p>
        </div>
      )}
    </div>
  );
}

// Metric Card Component
function MetricCard({ icon, label, value, color }: any) {
  const colors = {
    blue: 'from-blue-50 to-blue-100 border-blue-200 text-blue-600',
    purple: 'from-purple-50 to-purple-100 border-purple-200 text-purple-600',
    green: 'from-green-50 to-green-100 border-green-200 text-green-600',
    yellow: 'from-yellow-50 to-yellow-100 border-yellow-200 text-yellow-600',
  };

  return (
    <div
      className={`bg-gradient-to-br ${colors[color]} border-2 rounded-lg p-4`}
    >
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-75">{label}</div>
    </div>
  );
}