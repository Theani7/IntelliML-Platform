'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';

interface ModelComparisonProps {
  results: any;
}

const SparkleIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const TrophyIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
  </svg>
);

const TargetIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const LightBulbIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const ChevronIcon = ({ isOpen }: { isOpen: boolean }) => (
  <svg
    className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export default function ModelComparison({ results }: ModelComparisonProps) {
  const [featureInputs, setFeatureInputs] = useState<{ [key: string]: string }>({});
  const [prediction, setPrediction] = useState<any>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<{ [key: string]: boolean }>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'test_score', direction: 'desc' });
  const [shapExplanation, setShapExplanation] = useState<any>(null);

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  if (!results) return null;

  // Handle various potential API response structures
  const models = results.results?.results || results.results || [];
  const best_model = results.results?.best_model || results.best_model;
  const problem_type = results.results?.problem_type || results.problem_type || results.results?.model_type || results.model_type;
  const explanation = results.explanation;
  const suggestions = results.suggestions || results.results?.suggestions || [];
  const job_id = results.job_id || results.results?.job_id;
  const feature_names = results.results?.feature_names || [];

  const handlePredict = async () => {
    if (!job_id) return;
    setIsPredicting(true);
    setShapExplanation(null);
    try {
      const features = feature_names.map((name: string) => parseFloat(featureInputs[name] || '0'));

      // Get prediction
      const response = await fetch(`http://localhost:8000/api/models/predict/${job_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features })
      });
      const data = await response.json();
      setPrediction(data);

      // Get SHAP explanation in background
      fetch(`http://localhost:8000/api/models/explain/${job_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features })
      })
        .then(res => res.json())
        .then(shapData => setShapExplanation(shapData))
        .catch(err => console.warn('SHAP explanation failed:', err));
    } catch (error) {
      console.error('Prediction failed:', error);
    }
    setIsPredicting(false);
  };

  const handleDownloadCode = () => {
    const code = `# Python code to load and use your trained model
import joblib
import numpy as np

# Load the trained model
model = joblib.load('best_model.joblib')

# Example prediction
# Replace with your actual feature values
sample_data = np.array([[${feature_names.map(() => '0.0').join(', ')}]])  # ${feature_names.length} features

# Make prediction
prediction = model.predict(sample_data)
print(f"Prediction: {prediction}")

# Feature names: ${feature_names.join(', ') || 'N/A'}
# Best model: ${best_model?.model_name || 'N/A'}
# Problem type: ${problem_type || 'N/A'}
`;
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'model_usage.py';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!models || models.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
        <p className="text-gray-400">No model results available</p>
      </div>
    );
  }

  const isClassification = problem_type === 'classification';

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* EXPORT BUTTONS */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handleDownloadCode}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-lg text-sm text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          Download Python Code
        </button>
        {job_id && (
          <a
            href={`http://localhost:8000/api/models/export/${job_id}`}
            download
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/30 rounded-lg text-sm text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Model (.joblib)
          </a>
        )}
        <div className="text-xs text-gray-500 flex items-center">
          <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">Best: {best_model?.model_name}</span>
        </div>
      </div>

      {/* 1. KEY METRICS CARDS */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-slate-900 rounded-xl border border-white/5 p-4 shadow-lg shadow-blue-500/5 hover:border-blue-500/30 transition-all">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Best Model</div>
          <div className="flex items-center gap-2 mb-1">
            <TrophyIcon />
            <div className="text-lg font-bold text-white truncate" title={best_model.model_name}>
              {best_model.model_name}
            </div>
          </div>
          <div className="text-xs text-emerald-400 font-mono">Rank #1</div>
        </div>

        <div className="bg-slate-900 rounded-xl border border-white/5 p-4 shadow-lg shadow-blue-500/5 hover:border-blue-500/30 transition-all">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            {isClassification ? 'Accuracy' : 'R² Score'}
          </div>
          <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
            {(best_model.test_score ?? best_model.score) !== undefined
              ? ((best_model.test_score ?? best_model.score) * (isClassification ? 100 : 1)).toFixed(2)
              : 'N/A'}
            {isClassification && '%'}
          </div>
          <div className="text-xs text-gray-500 mt-1">Primary Metric</div>
        </div>

        <div className="bg-slate-900 rounded-xl border border-white/5 p-4 shadow-lg shadow-blue-500/5 hover:border-blue-500/30 transition-all">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            {isClassification ? 'F1 Score' : 'RMSE'}
          </div>
          <div className="text-2xl font-bold text-white">
            {best_model.metrics ? (
              isClassification
                ? (best_model.metrics.f1 !== undefined ? (best_model.metrics.f1 * 100).toFixed(2) + '%' : 'N/A')
                : (best_model.metrics.rmse !== undefined ? best_model.metrics.rmse.toFixed(4) : 'N/A')
            ) : 'N/A'}
          </div>
          <div className="text-xs text-gray-500 mt-1">{isClassification ? 'Weighted Average' : 'Root Mean Sq. Error'}</div>
        </div>

        <div className="bg-slate-900 rounded-xl border border-white/5 p-4 shadow-lg shadow-blue-500/5 hover:border-blue-500/30 transition-all">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            {isClassification ? 'Precision' : 'MAE'}
          </div>
          <div className="text-2xl font-bold text-white">
            {best_model.metrics ? (
              isClassification
                ? (best_model.metrics.precision !== undefined ? (best_model.metrics.precision * 100).toFixed(2) + '%' : 'N/A')
                : (best_model.metrics.mae !== undefined ? best_model.metrics.mae.toFixed(4) : 'N/A')
            ) : 'N/A'}
          </div>
          <div className="text-xs text-gray-500 mt-1">{isClassification ? 'Weighted Precision' : 'Mean Abs. Error'}</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">

        {/* 2. CONFUSION MATRIX (Classification Only) */}
        {isClassification && best_model.confusion_matrix && (
          <div className="bg-slate-900 rounded-xl border border-white/5 p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                <TargetIcon />
              </div>
              <h3 className="text-lg font-bold text-white">Confusion Matrix</h3>
            </div>

            <div className="overflow-x-auto">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-white/5 border border-white/5">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500 bg-slate-950"></th>
                      {best_model.confusion_matrix_labels?.map((label: string, i: number) => (
                        <th key={i} className="px-3 py-2 text-xs font-medium text-gray-400 bg-slate-950 uppercase">
                          Pred: {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {best_model.confusion_matrix.map((row: any, i: number) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-xs font-medium text-gray-400 bg-slate-950 uppercase whitespace-nowrap">
                          Actual: {row.Actual}
                        </td>
                        {best_model.confusion_matrix_labels?.map((colLabel: string, j: number) => {
                          const val = row[colLabel];
                          // Simple heatmap intensity logic
                          const maxVal = Math.max(...best_model.confusion_matrix.map((r: any) =>
                            Math.max(...best_model.confusion_matrix_labels.map((c: string) => r[c]))
                          ));
                          const intensity = val / maxVal;
                          const bg = `rgba(6, 182, 212, ${intensity * 0.5})`; // cyan base

                          return (
                            <td key={j} className="px-3 py-2 text-sm text-center text-white" style={{ backgroundColor: val > 0 ? bg : 'transparent' }}>
                              {val}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 3. ROC CURVE (Classification Only) */}
        {isClassification && best_model.roc_curve && best_model.roc_curve.length > 0 && (
          <div className="bg-slate-900 rounded-xl border border-white/5 p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                <ChartIcon />
              </div>
              <h3 className="text-lg font-bold text-white">ROC Curve</h3>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={best_model.roc_curve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis
                    dataKey="x"
                    type="number"
                    domain={[0, 1]}
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    label={{ value: 'False Positive Rate', position: 'insideBottom', offset: -5, fill: '#6b7280', fontSize: 10 }}
                  />
                  <YAxis
                    domain={[0, 1]}
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    label={{ value: 'True Positive Rate', angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ color: '#9ca3af' }}
                    formatter={(value: number) => value.toFixed(3)}
                  />
                  <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke="#6b7280" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="y"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    dot={false}
                    name="ROC"
                    activeDot={{ r: 6, fill: '#fff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* CV SCORE COMPARISON - Train vs Test */}
      {models.length > 0 && (
        <div className="bg-slate-900 rounded-xl border border-white/5 p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
              <ChartIcon />
            </div>
            <h3 className="text-lg font-bold text-white">Train vs Test Score Comparison</h3>
            <span className="text-xs text-gray-500">CV Mean (Train) vs Test Set</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={models.slice(0, 8).map((m: any) => ({
                  name: m.model_name.length > 12 ? m.model_name.slice(0, 12) + '...' : m.model_name,
                  cv_score: m.cv_score_mean || m.cv_score || 0,
                  test_score: m.test_score || 0,
                }))}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  angle={-30}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  domain={[0, 1]}
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  label={{ value: 'Score', angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                  formatter={(value: number) => value.toFixed(3)}
                />
                <Legend />
                <Bar dataKey="cv_score" name="CV Score (Train)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="test_score" name="Test Score" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Large gaps between CV and Test scores may indicate overfitting or data leakage.
          </p>
        </div>
      )}

      {/* FEATURE IMPORTANCE */}
      {best_model.feature_importance && best_model.feature_importance.length > 0 && (
        <div className="bg-slate-900 rounded-xl border border-white/5 p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ChartIcon />
            </div>
            <h3 className="text-lg font-bold text-white">Feature Importance</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={best_model.feature_importance
                  .map((val: number, idx: number) => ({
                    feature: feature_names[idx] || `Feature ${idx + 1}`,
                    importance: val
                  }))
                  .sort((a: any, b: any) => b.importance - a.importance)
                  .slice(0, 10)
                }
                layout="vertical"
                margin={{ left: 100 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis dataKey="feature" type="category" tick={{ fill: '#9ca3af', fontSize: 11 }} width={90} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                  formatter={(value: number) => value.toFixed(4)}
                />
                <Bar dataKey="importance" fill="#10b981" radius={[0, 4, 4, 0]}>
                  {best_model.feature_importance.map((_: any, idx: number) => (
                    <Cell key={idx} fill={idx === 0 ? '#06b6d4' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 4. SUGGESTIONS */}
      {suggestions.length > 0 && (
        <div className="bg-gradient-to-r from-amber-950/30 to-slate-900 border border-amber-500/20 rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500 animate-pulse">
              <LightBulbIcon />
            </div>
            <h3 className="text-lg font-bold text-white">
              Suggestions for Improvement
            </h3>
          </div>
          <ul className="space-y-3">
            {suggestions.map((tip: string, idx: number) => (
              <li key={idx} className="flex items-start gap-3 text-sm text-gray-300">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 5. FULL COMPARISON TABLE */}
      <div className="bg-slate-900 rounded-xl border border-blue-500/10 overflow-hidden shadow-lg shadow-blue-500/5">
        <div className="flex items-center gap-3 p-5 border-b border-white/5 bg-slate-950/50">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <ChartIcon />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              Model Comparison
            </h3>
            <p className="text-xs text-gray-500">Full performance breakdown</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-950">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Model Architecture
                </th>
                <th
                  onClick={() => handleSort('test_score')}
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                >
                  {isClassification ? 'Accuracy' : 'R² Score'}
                  {sortConfig.key === 'test_score' && (
                    <span className="ml-1">{sortConfig.direction === 'desc' ? '↓' : '↑'}</span>
                  )}
                </th>
                <th
                  onClick={() => handleSort('f1')}
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                >
                  {isClassification ? 'F1 Score' : 'RMSE'}
                  {sortConfig.key === 'f1' && (
                    <span className="ml-1">{sortConfig.direction === 'desc' ? '↓' : '↑'}</span>
                  )}
                </th>
                <th
                  onClick={() => handleSort('precision')}
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                >
                  {isClassification ? 'Precision' : 'MAE'}
                  {sortConfig.key === 'precision' && (
                    <span className="ml-1">{sortConfig.direction === 'desc' ? '↓' : '↑'}</span>
                  )}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-slate-900">
              {[...models].sort((a: any, b: any) => {
                let aVal = sortConfig.key === 'test_score' ? (a.test_score ?? a.score ?? 0) : (a.metrics?.[sortConfig.key] ?? 0);
                let bVal = sortConfig.key === 'test_score' ? (b.test_score ?? b.score ?? 0) : (b.metrics?.[sortConfig.key] ?? 0);
                return sortConfig.direction === 'desc' ? bVal - aVal : aVal - bVal;
              }).map((model: any, idx: number) => (
                <tr
                  key={idx}
                  className={idx === 0 ? 'bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors' : 'hover:bg-slate-800 transition-colors'}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {idx === 0 ? (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                        <TrophyIcon />
                      </div>
                    ) : (
                      <span className="text-gray-500 font-mono ml-2">#{idx + 1}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-white">
                      {model.model_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden max-w-[100px]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                          style={{ width: `${(model.test_score ?? model.score ?? 0) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-white min-w-[60px]">
                        {isClassification
                          ? ((model.test_score ?? model.score ?? 0) * 100).toFixed(1) + '%'
                          : Number(model.test_score ?? model.score ?? 0).toFixed(3)
                        }
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {model.metrics ? (
                      isClassification
                        ? (model.metrics.f1 !== undefined ? (model.metrics.f1 * 100).toFixed(2) + '%' : '-')
                        : (model.metrics.rmse !== undefined ? model.metrics.rmse.toFixed(4) : '-')
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {model.metrics ? (
                      isClassification
                        ? (model.metrics.precision !== undefined ? (model.metrics.precision * 100).toFixed(2) + '%' : '-')
                        : (model.metrics.mae !== undefined ? model.metrics.mae.toFixed(4) : '-')
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Explanation Text */}
      {explanation && (
        <div className="bg-gradient-to-r from-indigo-950/50 to-slate-900 border border-indigo-500/20 rounded-xl p-6 shadow-lg shadow-indigo-500/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <SparkleIcon />
            </div>
            <h3 className="text-lg font-bold text-white">
              AI Explanation
            </h3>
          </div>
          <p className="text-gray-300 leading-relaxed text-sm md:text-base">{explanation}</p>
        </div>
      )}

      {/* PREDICTION PREVIEW */}
      {feature_names.length > 0 && job_id && (
        <div className="bg-slate-900 rounded-xl border border-white/5 p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
              <TargetIcon />
            </div>
            <h3 className="text-lg font-bold text-white">Prediction Preview</h3>
            <span className="text-xs text-gray-500">Test your model with sample inputs</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
            {feature_names.map((name: string) => (
              <div key={name}>
                <label className="block text-xs text-gray-400 mb-1">{name}</label>
                <input
                  type="number"
                  step="any"
                  value={featureInputs[name] || ''}
                  onChange={(e) => setFeatureInputs({ ...featureInputs, [name]: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                  placeholder="0.0"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handlePredict}
              disabled={isPredicting}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
            >
              {isPredicting ? 'Predicting...' : 'Predict'}
            </button>

            {prediction && (
              <div className="flex items-center gap-3">
                <span className="text-gray-400">Result:</span>
                <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                  {prediction.prediction}
                </span>
                {prediction.probability && (
                  <span className="text-xs text-gray-500">
                    (confidence: {(Math.max(...prediction.probability) * 100).toFixed(1)}%)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* SHAP Explanation */}
          {shapExplanation?.explanations && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex items-center gap-2 mb-4">
                <LightBulbIcon />
                <h4 className="text-sm font-semibold text-white">Why This Prediction?</h4>
                <span className="text-xs text-gray-500">(SHAP Feature Contributions)</span>
              </div>
              <div className="space-y-2">
                {shapExplanation.explanations.map((exp: any, idx: number) => {
                  const maxVal = Math.max(...shapExplanation.explanations.map((e: any) => Math.abs(e.shap_value)));
                  const widthPercent = (Math.abs(exp.shap_value) / maxVal) * 100;
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-28 text-xs text-gray-400 truncate text-right" title={exp.feature}>
                        {exp.feature}
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 h-5 bg-slate-800 rounded relative overflow-hidden">
                          <div
                            className={`absolute h-full rounded transition-all ${exp.shap_value > 0 ? 'bg-emerald-500/70 left-1/2' : 'bg-rose-500/70 right-1/2'}`}
                            style={{ width: `${widthPercent / 2}%` }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-px h-full bg-white/20" />
                          </div>
                        </div>
                        <span className={`text-xs w-16 ${exp.shap_value > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {exp.shap_value > 0 ? '+' : ''}{exp.shap_value.toFixed(3)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                <span className="text-emerald-400">Green (+)</span> pushes prediction higher, <span className="text-rose-400">Red (-)</span> pushes it lower.
              </p>
            </div>
          )}
        </div>
      )}


    </div>
  );
}