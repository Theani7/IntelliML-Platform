'use client';

import { useState } from 'react';
import { trainModels } from '@/lib/api';

interface ModelTrainingProps {
  columns: string[];
  onTrainingComplete?: (results: any) => void;
}

const BrainIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const AlertIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export default function ModelTraining({ columns, onTrainingComplete }: ModelTrainingProps) {
  const [targetColumn, setTargetColumn] = useState('');
  const [testSize, setTestSize] = useState(0.2);
  const [cvFolds, setCvFolds] = useState(5);
  const [enableTuning, setEnableTuning] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTrain = async () => {
    if (!targetColumn) {
      setError('Please select a target column');
      return;
    }

    setIsTraining(true);
    setError(null);

    try {
      const result = await trainModels(targetColumn, undefined, testSize, cvFolds, enableTuning);

      if (onTrainingComplete) {
        onTrainingComplete(result);
      }

    } catch (err: any) {
      setError(err.message || 'Training failed');
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-blue-500/10 p-6 shadow-lg shadow-blue-500/5">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
          <BrainIcon />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Train ML Models</h3>
          <p className="text-sm text-gray-400">Select a target column to predict</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Target Column
          </label>
          <div className="relative">
            <select
              value={targetColumn}
              onChange={(e) => setTargetColumn(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent appearance-none cursor-pointer hover:bg-slate-800 transition-colors"
              disabled={isTraining}
            >
              <option value="" className="bg-slate-900 text-gray-400">-- Choose target variable --</option>
              {columns.map((col) => (
                <option key={col} value={col} className="bg-slate-900 text-white">
                  {col}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <ChevronDownIcon />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            The column you want the AI to learn to predict.
          </p>
        </div>

        {/* Test Size Configuration */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-300">
              Test Set Size: <span className="text-cyan-400">{Math.round(testSize * 100)}%</span>
            </label>
            <span className="text-xs text-gray-500">
              Training: {100 - Math.round(testSize * 100)}%
            </span>
          </div>

          <input
            type="range"
            min="0.1"
            max="0.5"
            step="0.05"
            value={testSize}
            onChange={(e) => setTestSize(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            disabled={isTraining}
          />

          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>10%</span>
            <span>50%</span>
          </div>

          <div className="mt-2 text-xs">
            {testSize > 0.3 ? (
              <div className="flex items-start gap-2 text-amber-400 bg-amber-500/10 p-2 rounded">
                <AlertIcon />
                <span>Warning: Large test set. This leaves less data for training, which might reduce model performance.</span>
              </div>
            ) : (
              <p className="text-gray-500">Recommended: 20%. Defines how much data is set aside for validation.</p>
            )}
          </div>
        </div>

        {/* Cross-Validation Folds */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Cross-Validation Folds
          </label>
          <div className="flex gap-2">
            {[3, 5, 10].map((folds) => (
              <button
                key={folds}
                onClick={() => setCvFolds(folds)}
                disabled={isTraining}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${cvFolds === folds
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
                  } disabled:opacity-50`}
              >
                {folds}-Fold
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Higher folds = more reliable scores but slower training.
          </p>
        </div>

        {/* Hyperparameter Tuning Toggle */}
        <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
          <div>
            <label className="text-sm font-medium text-gray-300">Hyperparameter Tuning</label>
            <p className="text-xs text-gray-500">Automatically optimize model parameters (slower)</p>
          </div>
          <button
            onClick={() => setEnableTuning(!enableTuning)}
            disabled={isTraining}
            className={`relative w-12 h-6 rounded-full transition-colors ${enableTuning ? 'bg-cyan-600' : 'bg-slate-700'
              } disabled:opacity-50`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${enableTuning ? 'translate-x-6' : 'translate-x-0'
                }`}
            />
          </button>
        </div>

        <button
          onClick={handleTrain}
          disabled={isTraining || !targetColumn}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transform hover:scale-[1.01] active:scale-[0.99]"
        >
          {isTraining ? (
            <>
              <SpinnerIcon />
              <span>Training Models...</span>
            </>
          ) : (
            'Start Training'
          )}
        </button>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 animate-fadeIn">
            <div className="text-red-400 shrink-0">
              <AlertIcon />
            </div>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {isTraining && (
          <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-5 animate-fadeIn">
            <div className="flex items-center justify-between mb-3">
              <p className="text-cyan-300 text-sm font-medium">
                Training in progress...
              </p>
              <span className="text-xs text-blue-400 animate-pulse">Running</span>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-4">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2 rounded-full animate-progress w-full origin-left"></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { name: 'Random Forest', color: 'bg-emerald-500' },
                { name: 'XGBoost', color: 'bg-amber-500' },
                { name: 'LightGBM', color: 'bg-blue-500' }
              ].map((model, idx) => (
                <div key={idx} className="bg-slate-900/50 rounded-lg p-2 flex items-center gap-2 border border-white/5">
                  <div className={`w-2 h-2 rounded-full ${model.color} animate-ping`}></div>
                  <span className="text-xs text-gray-300">{model.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}