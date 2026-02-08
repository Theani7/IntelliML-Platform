'use client';

import { useState } from 'react';

interface OutlierResult {
    column: string;
    outlier_count: number;
    percentage: number;
    sample_values: number[];
}

interface OutlierResponse {
    method: string;
    threshold: number;
    total_outlier_rows: number;
    columns_analyzed: number;
    details: OutlierResult[];
}

export default function OutlierDetection() {
    const [method, setMethod] = useState<'iqr' | 'zscore'>('iqr');
    const [threshold, setThreshold] = useState(1.5);
    const [isDetecting, setIsDetecting] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);
    const [results, setResults] = useState<OutlierResponse | null>(null);
    const [removeResult, setRemoveResult] = useState<any>(null);

    const detectOutliers = async () => {
        setIsDetecting(true);
        setResults(null);
        try {
            const response = await fetch('http://localhost:8000/api/data/outliers/detect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ method, threshold })
            });
            const data = await response.json();
            setResults(data);
        } catch (error) {
            console.error('Outlier detection failed:', error);
        }
        setIsDetecting(false);
    };

    const removeOutliers = async () => {
        setIsRemoving(true);
        try {
            const response = await fetch('http://localhost:8000/api/data/outliers/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ method, threshold })
            });
            const data = await response.json();
            setRemoveResult(data);
            setResults(null);
        } catch (error) {
            console.error('Outlier removal failed:', error);
        }
        setIsRemoving(false);
    };

    return (
        <div className="bg-slate-900 rounded-xl border border-white/5 p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Outlier Detection</h3>
                    <p className="text-xs text-gray-500">Detect and remove extreme values</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-4 mb-4">
                <div>
                    <label className="text-xs text-gray-400 block mb-1">Method</label>
                    <select
                        value={method}
                        onChange={(e) => setMethod(e.target.value as 'iqr' | 'zscore')}
                        className="bg-slate-800 border border-white/10 rounded px-3 py-2 text-white text-sm"
                    >
                        <option value="iqr">IQR (Interquartile Range)</option>
                        <option value="zscore">Z-Score</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs text-gray-400 block mb-1">
                        Threshold ({method === 'iqr' ? 'IQR multiplier' : 'Z-score'})
                    </label>
                    <input
                        type="number"
                        value={threshold}
                        onChange={(e) => setThreshold(parseFloat(e.target.value))}
                        step={0.1}
                        min={0.5}
                        max={method === 'iqr' ? 3 : 5}
                        className="bg-slate-800 border border-white/10 rounded px-3 py-2 text-white text-sm w-24"
                    />
                </div>
                <div className="flex items-end gap-2">
                    <button
                        onClick={detectOutliers}
                        disabled={isDetecting}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
                    >
                        {isDetecting ? 'Detecting...' : 'Detect Outliers'}
                    </button>
                </div>
            </div>

            {results && (
                <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">
                            Found <span className="text-rose-400 font-bold">{results.total_outlier_rows}</span> rows with outliers
                        </span>
                        {results.total_outlier_rows > 0 && (
                            <button
                                onClick={removeOutliers}
                                disabled={isRemoving}
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
                            >
                                {isRemoving ? 'Removing...' : 'Remove Outliers'}
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {results.details.slice(0, 6).map((detail) => (
                            <div key={detail.column} className="bg-slate-800/50 rounded-lg p-3">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium text-white">{detail.column}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded ${detail.outlier_count > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                        {detail.outlier_count} outliers ({detail.percentage}%)
                                    </span>
                                </div>
                                {detail.sample_values.length > 0 && (
                                    <p className="text-xs text-gray-500">
                                        Sample: {detail.sample_values.slice(0, 3).map(v => v.toFixed(2)).join(', ')}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {removeResult && (
                <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                    <p className="text-emerald-400 text-sm">
                        ✓ Removed {removeResult.removed_rows} outlier rows. Dataset now has {removeResult.remaining_rows} rows.
                    </p>
                </div>
            )}
        </div>
    );
}
