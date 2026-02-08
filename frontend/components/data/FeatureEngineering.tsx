'use client';

import { useState } from 'react';

interface FeatureEngineeringProps {
    columns: string[];
}

export default function FeatureEngineering({ columns }: FeatureEngineeringProps) {
    const [operation, setOperation] = useState<string>('polynomial');
    const [selectedCols, setSelectedCols] = useState<string[]>([]);
    const [degree, setDegree] = useState(2);
    const [bins, setBins] = useState(5);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<any>(null);

    const numericColumns = columns.filter(c => !c.includes('_binned') && !c.includes('_log') && !c.includes('_pow'));

    const handleColumnToggle = (col: string) => {
        if (selectedCols.includes(col)) {
            setSelectedCols(selectedCols.filter(c => c !== col));
        } else {
            if (operation === 'interaction' && selectedCols.length >= 2) return;
            setSelectedCols([...selectedCols, col]);
        }
    };

    const applyEngineering = async () => {
        if (selectedCols.length === 0) return;

        setIsProcessing(true);
        setResult(null);

        try {
            const params: any = {};
            if (operation === 'polynomial') params.degree = degree;
            if (operation === 'binning') params.bins = bins;

            const response = await fetch('http://localhost:8000/api/data/engineer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    operation,
                    columns: selectedCols,
                    params
                })
            });
            const data = await response.json();
            setResult(data);
            setSelectedCols([]);
        } catch (error) {
            console.error('Feature engineering failed:', error);
        }
        setIsProcessing(false);
    };

    return (
        <div className="bg-slate-900 rounded-xl border border-white/5 p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Feature Engineering</h3>
                    <p className="text-xs text-gray-500">Create new features from existing columns</p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                {['polynomial', 'log', 'interaction', 'binning'].map((op) => (
                    <button
                        key={op}
                        onClick={() => { setOperation(op); setSelectedCols([]); }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${operation === op
                                ? 'bg-violet-600 text-white'
                                : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
                            }`}
                    >
                        {op === 'polynomial' && 'Polynomial (x²)'}
                        {op === 'log' && 'Log Transform'}
                        {op === 'interaction' && 'Interaction (A×B)'}
                        {op === 'binning' && 'Binning'}
                    </button>
                ))}
            </div>

            {operation === 'polynomial' && (
                <div className="mb-4">
                    <label className="text-xs text-gray-400 block mb-1">Degree</label>
                    <select
                        value={degree}
                        onChange={(e) => setDegree(parseInt(e.target.value))}
                        className="bg-slate-800 border border-white/10 rounded px-3 py-2 text-white text-sm"
                    >
                        <option value={2}>2 (Squared)</option>
                        <option value={3}>3 (Cubed)</option>
                    </select>
                </div>
            )}

            {operation === 'binning' && (
                <div className="mb-4">
                    <label className="text-xs text-gray-400 block mb-1">Number of Bins</label>
                    <input
                        type="number"
                        value={bins}
                        onChange={(e) => setBins(parseInt(e.target.value))}
                        min={2}
                        max={20}
                        className="bg-slate-800 border border-white/10 rounded px-3 py-2 text-white text-sm w-24"
                    />
                </div>
            )}

            <div className="mb-4">
                <label className="text-xs text-gray-400 block mb-2">
                    Select Columns {operation === 'interaction' && '(exactly 2)'}
                </label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {numericColumns.slice(0, 20).map((col) => (
                        <button
                            key={col}
                            onClick={() => handleColumnToggle(col)}
                            className={`px-2 py-1 rounded text-xs transition-colors ${selectedCols.includes(col)
                                    ? 'bg-violet-600 text-white'
                                    : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
                                }`}
                        >
                            {col}
                        </button>
                    ))}
                </div>
            </div>

            <button
                onClick={applyEngineering}
                disabled={isProcessing || selectedCols.length === 0 || (operation === 'interaction' && selectedCols.length !== 2)}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
            >
                {isProcessing ? 'Creating...' : 'Create Features'}
            </button>

            {result && result.new_columns?.length > 0 && (
                <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                    <p className="text-emerald-400 text-sm">
                        ✓ Created {result.new_columns.length} new feature(s): {result.new_columns.join(', ')}
                    </p>
                </div>
            )}
        </div>
    );
}
