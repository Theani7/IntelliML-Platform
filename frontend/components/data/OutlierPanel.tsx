'use client';

import { useState } from 'react';
// --- Icons ---
const FunnelIcon = ({ className }: { className?: string }) => (
    <svg className={className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
);

const TrashIcon = ({ className }: { className?: string }) => (
    <svg className={className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const ExclamationTriangleIcon = ({ className }: { className?: string }) => (
    <svg className={className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);

interface OutlierResult {
    column: string;
    outlier_count: number;
    percentage: number;
    sample_values: number[];
}

interface OutlierResponse {
    total_outlier_rows: number;
    details: OutlierResult[];
}

interface OutlierPanelProps {
    onDataUpdate: (newData: any) => void;
}

export default function OutlierPanel({ onDataUpdate }: OutlierPanelProps) {
    const [method, setMethod] = useState<'iqr' | 'zscore'>('iqr');
    const [threshold, setThreshold] = useState(1.5);
    const [results, setResults] = useState<OutlierResponse | null>(null);
    const [isDetecting, setIsDetecting] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);

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
            if (data.dataset_info) {
                onDataUpdate(data.dataset_info);
            }
            setResults(null); // Clear results after removal
        } catch (error) {
            console.error('Outlier removal failed:', error);
        }
        setIsRemoving(false);
    };

    return (
        <div className="h-full flex flex-col p-4 animate-fadeIn bg-slate-900">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <h3 className="font-bold text-white">Outlier Detection</h3>
            </div>

            {/* 1. Settings Area */}
            <div className="bg-slate-950/50 p-4 rounded-xl border border-white/5 mb-4">
                <div className="mb-4">
                    <label className="text-xs text-gray-500 block mb-1.5">Method</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setMethod('iqr')}
                            className={`text-xs py-2 rounded-lg font-medium transition-colors border ${method === 'iqr' ? 'bg-rose-600 border-rose-500 text-white' : 'bg-slate-900 border-white/10 text-gray-400'}`}
                        >
                            IQR
                        </button>
                        <button
                            onClick={() => setMethod('zscore')}
                            className={`text-xs py-2 rounded-lg font-medium transition-colors border ${method === 'zscore' ? 'bg-rose-600 border-rose-500 text-white' : 'bg-slate-900 border-white/10 text-gray-400'}`}
                        >
                            Z-Score
                        </button>
                    </div>
                </div>

                <div className="mb-4">
                    <label className="text-xs text-gray-500 block mb-1.5">Threshold ({method === 'iqr' ? '1.5 - 3.0' : '2.0 - 5.0'})</label>
                    <div className="flex items-center gap-3">
                        <input
                            type="range"
                            min="0.5" max="5" step="0.1"
                            value={threshold}
                            onChange={(e) => setThreshold(parseFloat(e.target.value))}
                            className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="font-mono text-sm text-rose-300 w-8 text-right">{threshold}</span>
                    </div>
                </div>

                <button
                    onClick={detectOutliers}
                    disabled={isDetecting}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                >
                    {isDetecting ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Run Scan'}
                </button>
            </div>

            {/* 2. Results List (Scrollable) */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Results</label>

                {!results ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 border border-dashed border-white/5 rounded-xl bg-slate-900/50">
                        <p className="text-sm">No analysis run yet.</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                        {results.details.length === 0 ? (
                            <div className="text-center py-8 text-emerald-400 text-sm">No outliers found! 🎉</div>
                        ) : (
                            results.details.map((detail) => (
                                <div key={detail.column} className="bg-white/5 rounded-lg p-3">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-sm font-medium text-white break-all">{detail.column}</span>
                                        <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">{detail.outlier_count}</span>
                                    </div>
                                    <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden mb-2">
                                        <div className="h-full bg-rose-500" style={{ width: `${Math.min(detail.percentage, 100)}%` }} />
                                    </div>
                                    <div className="text-[10px] text-gray-500">
                                        {detail.percentage}% of data
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* 3. Action (Remove) */}
            {results && results.total_outlier_rows > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5">
                    <button
                        onClick={removeOutliers}
                        disabled={isRemoving}
                        className="w-full py-3 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold rounded-xl shadow-lg shadow-rose-900/20 transition-all flex items-center justify-center gap-2"
                    >
                        {isRemoving ? 'Removing...' : `Remove ${results.total_outlier_rows} Rows`}
                    </button>
                </div>
            )}
        </div>
    );
}
