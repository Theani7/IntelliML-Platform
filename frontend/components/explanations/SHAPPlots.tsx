'use client';

interface SHAPPlotsProps {
  explanations: any;
}

export default function SHAPPlots({ explanations }: SHAPPlotsProps) {
  if (!explanations) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="text-4xl mb-3">📊</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Explanations Not Available
          </h3>
          <p className="text-gray-600">
            Model explanations could not be generated at this time.
          </p>
        </div>
      </div>
    );
  }

  const { shap_results, explanation, model_name } = explanations;

  if (!shap_results) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="text-4xl mb-3">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No SHAP Results
          </h3>
          <p className="text-gray-600">
            SHAP analysis could not be performed on this model.
          </p>
        </div>
      </div>
    );
  }

  const { feature_importance, plots } = shap_results;

  return (
    <div className="space-y-6">
      {/* Natural Language Explanation */}
      {explanation && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-2xl">🔍</span>
            <h3 className="text-lg font-semibold text-gray-900">
              Model Explanation: {model_name}
            </h3>
          </div>
          <p className="text-gray-700 whitespace-pre-wrap">{explanation}</p>
        </div>
      )}

      {/* Feature Importance Table */}
      {feature_importance && feature_importance.length > 0 && (
        <div className="card">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            📊 Feature Importance
          </h3>
          
          <div className="space-y-3">
            {feature_importance.slice(0, 10).map((feature: any, idx: number) => (
              <div key={idx} className="flex items-center space-x-3">
                <div className="w-8 text-center text-sm font-semibold text-gray-500">
                  #{idx + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {feature.feature}
                    </span>
                    <span className="text-sm text-gray-600">
                      {feature.importance.toFixed(4)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{
                        width: `${(feature.importance / feature_importance[0].importance) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SHAP Plots */}
      {plots && Object.keys(plots).length > 0 && (
        <div className="card">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            📈 SHAP Visualizations
          </h3>
          
          <div className="space-y-6">
            {plots.summary && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Summary Plot
                </h4>
                <img
                  src={plots.summary}
                  alt="SHAP Summary Plot"
                  className="w-full rounded-lg border border-gray-200"
                />
              </div>
            )}
            
            {plots.bar && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Feature Importance Bar Plot
                </h4>
                <img
                  src={plots.bar}
                  alt="SHAP Bar Plot"
                  className="w-full rounded-lg border border-gray-200"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}