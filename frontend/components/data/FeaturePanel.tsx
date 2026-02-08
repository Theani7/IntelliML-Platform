'use client';

import { useState } from 'react';
// --- Icons ---
const CalculatorIcon = ({ className }: { className?: string }) => (
    <svg className={className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
);

const VariableIcon = ({ className }: { className?: string }) => (
    <svg className={className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.75 6.75a.75.75 0 011.06 0L12 12.94l6.19-6.19a.75.75 0 111.06 1.06l-6.72 6.72a.75.75 0 01-1.06 0L4.75 7.81a.75.75 0 010-1.06z" />
    </svg>
);

const ArrowsRightLeftIcon = ({ className }: { className?: string }) => (
    <svg className={className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
);

const QueueListIcon = ({ className }: { className?: string }) => (
    <svg className={className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
);

const PlusIcon = ({ className }: { className?: string }) => (
    <svg className={className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
    </svg>
);

interface FeaturePanelProps {
    columns: string[];
    onDataUpdate: (newData: any) => void;
}

export default function FeaturePanel({ columns, onDataUpdate }: FeaturePanelProps) {
    const [operation, setOperation] = useState<string>('polynomial');
    const [selectedCols, setSelectedCols] = useState<string[]>([]);
    const [degree, setDegree] = useState(2);
    const [bins, setBins] = useState(5);
    const [isProcessing, setIsProcessing] = useState(false);

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
            if (data.dataset_info) {
                onDataUpdate(data.dataset_info);
                setSelectedCols([]);
            }
        } catch (error) {
            console.error('Feature engineering failed:', error);
        }
        setIsProcessing(false);
    };

    return (
        <div className="h-full flex flex-col p-4 animate-fadeIn bg-slate-900">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                </div>
                <h3 className="font-bold text-white">Feature Engineering</h3>
            </div>

            {/* 1. Operation Tabs */}
            <div className="mb-6">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Function</label>
                <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 rounded-xl border border-white/5">
                    {[
                        { id: 'polynomial', icon: <CalculatorIcon />, label: 'Poly' },
                        { id: 'log', icon: <VariableIcon />, label: 'Log' },
                        { id: 'interaction', icon: <ArrowsRightLeftIcon />, label: 'Inter' },
                        { id: 'binning', icon: <QueueListIcon />, label: 'Bin' },
                    ].map(op => (
                        <button
                            key={op.id}
                            onClick={() => { setOperation(op.id); setSelectedCols([]); }}
                            className={`flex flex-col items-center py-2 rounded-lg text-[10px] transition-all ${operation === op.id ? 'bg-violet-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <div className="w-4 h-4 mb-1">{op.icon}</div>
                            {op.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 2. Params & Columns (Flex-1) */}
            <div className="flex-1 flex flex-col min-h-0 bg-slate-950/50 rounded-xl border border-white/5 p-4">
                {/* Params */}
                <div className="mb-4">
                    {operation === 'polynomial' && (
                        <div>
                            <label className="text-xs text-gray-500 block mb-1.5">Degree</label>
                            <select
                                value={degree}
                                onChange={(e) => setDegree(parseInt(e.target.value))}
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white focus:border-violet-500 outline-none"
                            >
                                <option value={2}>Squared (x²)</option>
                                <option value={3}>Cubed (x³)</option>
                            </select>
                        </div>
                    )}
                    {operation === 'binning' && (
                        <div>
                            <label className="text-xs text-gray-500 block mb-1.5">Bin Count: <span className="text-white font-mono">{bins}</span></label>
                            <input
                                type="range" min="2" max="20"
                                value={bins}
                                onChange={(e) => setBins(parseInt(e.target.value))}
                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    )}
                </div>

                {/* Column Picker */}
                <div className="flex-1 flex flex-col min-h-0">
                    <label className="text-xs text-gray-500 block mb-2 flex justify-between">
                        <span>Select Inputs</span>
                        <span className="text-violet-400">{selectedCols.length} selected</span>
                    </label>
                    <div className="flex-1 overflow-y-auto custom-scrollbar border border-white/5 rounded-lg bg-black/20 p-2">
                        {numericColumns.map((col) => {
                            const isSelected = selectedCols.includes(col);
                            return (
                                <button
                                    key={col}
                                    onClick={() => handleColumnToggle(col)}
                                    className={`w-full text-left px-3 py-2 mb-1 rounded-md text-sm transition-colors flex items-center justify-between ${isSelected ? 'bg-violet-500/20 text-violet-200 border border-violet-500/30' : 'text-gray-400 hover:bg-white/5'
                                        }`}
                                >
                                    <span className="truncate mr-2">{col}</span>
                                    {isSelected && <div className="w-2 h-2 rounded-full bg-violet-500" />}
                                </button>
                            );
                        })}
                    </div>
                    {operation === 'interaction' && <p className="text-[10px] text-gray-500 mt-1 text-center">Select exactly 2 columns</p>}
                </div>
            </div>

            {/* 3. Action */}
            <div className="mt-4 pt-4 border-t border-white/5">
                <button
                    onClick={applyEngineering}
                    disabled={isProcessing || selectedCols.length === 0 || (operation === 'interaction' && selectedCols.length !== 2)}
                    className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                >
                    {isProcessing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create Feature'}
                </button>
            </div>

        </div>
    );
}
