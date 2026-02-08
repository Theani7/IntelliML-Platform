'use client';

import { useState } from 'react';
import { trainModels } from '@/lib/api';

interface ModelTrainingProps {
  columns: string[];
  onTrainingComplete?: (results: any) => void;
}

export default function ModelTraining({ columns, onTrainingComplete }: ModelTrainingProps) {
  const [targetColumn, setTargetColumn] = useState('');
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
      const result = await trainModels(targetColumn);
      
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
    <div className="card">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">
        🤖 Train ML Models
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Target Column (what to predict)
          </label>
          <select
            value={targetColumn}
            onChange={(e) => setTargetColumn(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            disabled={isTraining}
          >
            <option value="">-- Choose column --</option>
            {columns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleTrain}
          disabled={isTraining || !targetColumn}
          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isTraining ? (
            <span className="flex items-center justify-center">
              <span className="animate-spin mr-2">⚙️</span>
              Training Models...
            </span>
          ) : (
            'Start Training'
          )}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-800 text-sm">⚠️ {error}</p>
          </div>
        )}

        {isTraining && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm mb-2">
              Training multiple models in parallel...
            </p>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse w-3/4"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}