'use client';

interface ModelComparisonProps {
  results: any;
}

export default function ModelComparison({ results }: ModelComparisonProps) {
  if (!results || !results.results) return null;

  const { results: models, best_model, problem_type, explanation } = results;

  return (
    <div className="space-y-6">
      {/* AI Explanation */}
      {explanation && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-3">
            <span className="text-2xl">✨</span>
            <h3 className="text-lg font-semibold text-gray-900">
              AI Explanation
            </h3>
          </div>
          <p className="text-gray-700">{explanation}</p>
        </div>
      )}

      {/* Model Comparison Table */}
      <div className="card">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          📊 Model Comparison
        </h3>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Test Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  CV Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {models.map((model: any, idx: number) => (
                <tr
                  key={idx}
                  className={idx === 0 ? 'bg-green-50' : 'hover:bg-gray-50'}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {idx === 0 ? '🏆' : `#${idx + 1}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {model.model_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900">
                      {(model.test_score * 100).toFixed(2)}%
                    </div>
                    <div className="text-xs text-gray-500">
                      {model.metric_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(model.cv_score * 100).toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {idx === 0 && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Best Model
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Model Details */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card">
          <div className="text-sm text-gray-600 mb-1">Problem Type</div>
          <div className="text-2xl font-bold text-purple-600 capitalize">
            {problem_type}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600 mb-1">Best Model</div>
          <div className="text-2xl font-bold text-green-600">
            {best_model?.model_name}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600 mb-1">Best Score</div>
          <div className="text-2xl font-bold text-blue-600">
            {(best_model?.test_score * 100).toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  );
}