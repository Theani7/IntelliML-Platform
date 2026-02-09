'use client';

// Icons
const ChartIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const DocumentIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);


interface SHAPPlotsProps {
  explanations: any;
}

export default function SHAPPlots({ explanations }: SHAPPlotsProps) {
  if (!explanations) {
    return (
      <div className="bg-white rounded-xl border border-[#FFEDC1] p-8 text-center shadow-sm">
        <div className="text-4xl mb-3 grayscale opacity-50">📊</div>
        <h3 className="text-lg font-bold text-[#470102] mb-2">
          Explanations Not Available
        </h3>
        <p className="text-[#8A5A5A]">
          Model explanations could not be generated at this time.
        </p>
      </div>
    );
  }

  const { shap_results, explanation, model_name } = explanations;

  if (!shap_results) {
    return (
      <div className="bg-white rounded-xl border border-[#FFEDC1] p-8 text-center shadow-sm">
        <div className="text-4xl mb-3 grayscale opacity-50">⚠️</div>
        <h3 className="text-lg font-bold text-[#470102] mb-2">
          No SHAP Results
        </h3>
        <p className="text-[#8A5A5A]">
          SHAP analysis could not be performed on this model.
        </p>
      </div>
    );
  }

  const { feature_importance, plots } = shap_results;

  return (
    <div className="space-y-6">
      {/* Natural Language Explanation */}
      {explanation && (
        <div className="bg-[#FFF7EA] border border-[#FFEDC1] rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#FEB229] flex items-center justify-center text-[#470102] shadow-sm">
              <DocumentIcon />
            </div>
            <h3 className="text-lg font-bold text-[#470102]">
              Model Interpretation
            </h3>
          </div>
          <div className="bg-white p-4 rounded-lg border border-[#FFEDC1]">
            <p className="text-[#470102] text-sm leading-relaxed whitespace-pre-wrap font-medium">{explanation}</p>
          </div>
        </div>
      )}

      {/* Feature Importance Table */}
      {feature_importance && feature_importance.length > 0 && (
        <div className="bg-white rounded-xl border border-[#FFEDC1] p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-[#470102] flex items-center justify-center text-[#FFEDC1] shadow-sm">
              <ChartIcon />
            </div>
            <h3 className="text-lg font-bold text-[#470102]">
              Feature Importance Breakdown
            </h3>
          </div>

          <div className="space-y-3">
            {feature_importance.slice(0, 10).map((feature: any, idx: number) => (
              <div key={idx} className="flex items-center space-x-3 p-2 hover:bg-[#FFF7EA] rounded-lg transition-colors">
                <div className="w-8 text-center text-sm font-bold text-[#FEB229] bg-[#470102] rounded py-0.5">
                  #{idx + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-[#470102]">
                      {feature.feature}
                    </span>
                    <span className="text-xs font-mono text-[#8A5A5A]">
                      {feature.importance.toFixed(4)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden border border-gray-200">
                    <div
                      className="bg-[#FEB229] h-full rounded-full"
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
        <div className="bg-white rounded-xl border border-[#FFEDC1] p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-[#470102] flex items-center justify-center text-[#FFEDC1] shadow-sm">
              <ChartIcon />
            </div>
            <h3 className="text-lg font-bold text-[#470102]">
              Advanced Visualizations
            </h3>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {plots.summary && (
              <div className="border border-[#FFEDC1] rounded-xl p-4 bg-[#FFF7EA]/30">
                <h4 className="text-sm font-bold text-[#8A5A5A] mb-3 uppercase tracking-wider">
                  Summary Plot
                </h4>
                <div className="bg-white rounded-lg border border-[#FFEDC1] p-2">
                  <img
                    src={plots.summary}
                    alt="SHAP Summary Plot"
                    className="w-full rounded"
                  />
                </div>
              </div>
            )}

            {plots.bar && (
              <div className="border border-[#FFEDC1] rounded-xl p-4 bg-[#FFF7EA]/30">
                <h4 className="text-sm font-bold text-[#8A5A5A] mb-3 uppercase tracking-wider">
                  Feature Importance Bar Plot
                </h4>
                <div className="bg-white rounded-lg border border-[#FFEDC1] p-2">
                  <img
                    src={plots.bar}
                    alt="SHAP Bar Plot"
                    className="w-full rounded"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}