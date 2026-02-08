'use client';

import { useState } from 'react';
import { cleanData } from '@/lib/api';
// --- Icons ---
const TrashIcon = ({ className }: { className?: string }) => (
    <svg className={className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const PencilSquareIcon = ({ className }: { className?: string }) => (
    <svg className={className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
);

const ArrowsRightLeftIcon = ({ className }: { className?: string }) => (
    <svg className={className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
);

const ScaleIcon = ({ className }: { className?: string }) => (
    <svg className={className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
    </svg>
);

const FunnelIcon = ({ className }: { className?: string }) => (
    <svg className={className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
);

interface CleaningPanelProps {
    selectedColumn: string;
    onDataUpdate: (newData: any) => void;
    fetchQuality?: () => void;
}

export default function CleaningPanel({ selectedColumn, onDataUpdate, fetchQuality }: CleaningPanelProps) {
    const [activeOperation, setActiveOperation] = useState<string | null>(null);
    const [params, setParams] = useState<any>({});
    const [isProcessing, setIsProcessing] = useState(false);

    const handleOperation = (op: string) => {
        setActiveOperation(op);
        setParams({});
    };

    const executeCleaning = async () => {
        if (!activeOperation) return;
        if (['drop_column', 'fill_na', 'rename', 'cast', 'scale'].includes(activeOperation) && !selectedColumn) {
            alert('Please select a column first');
            return;
        }

        setIsProcessing(true);
        try {
            let finalParams = { ...params };
            if (['drop_column', 'fill_na', 'rename', 'cast', 'scale'].includes(activeOperation)) {
                finalParams.column = selectedColumn;
            }

            const result = await cleanData(activeOperation, finalParams);

            if (result.status === 'success' && result.dataset_info) {
                onDataUpdate(result.dataset_info);
                setActiveOperation(null);
                if (fetchQuality) fetchQuality();
            }
        } catch (error) {
            console.error('Cleaning failed:', error);
            alert('Operation failed. Check console for details.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="h-full flex flex-col p-4 animate-fadeIn bg-slate-900">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </div>
                <h3 className="font-bold text-white">Data Cleaning</h3>
            </div>

            {/* 1. Operation Selector (Dropdown/Grid) */}
            <div className="mb-6">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Operation</label>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { id: 'fill_na', label: 'Fill Missing', icon: <FunnelIcon /> },
                        { id: 'drop_column', label: 'Drop Column', icon: <TrashIcon /> },
                        { id: 'rename', label: 'Rename', icon: <PencilSquareIcon /> },
                        { id: 'scale', label: 'Scale', icon: <ScaleIcon /> },
                        { id: 'drop_duplicates', label: 'Dedup Rows', icon: <ArrowsRightLeftIcon /> },
                        { id: 'drop_na', label: 'Drop Rows', icon: <TrashIcon /> },
                    ].map((op) => (
                        <button
                            key={op.id}
                            onClick={() => handleOperation(op.id)}
                            className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all ${activeOperation === op.id
                                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                                    : 'bg-slate-800 border-white/5 text-gray-400 hover:bg-slate-700 hover:text-gray-200'
                                }`}
                        >
                            <div className="w-4 h-4">{op.icon}</div>
                            {op.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 2. Configuration Area (Flex-1) */}
            <div className="flex-1 flex flex-col bg-slate-950/50 rounded-xl border border-white/5 p-4 overflow-y-auto">
                {!activeOperation ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-center text-sm p-4">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                            <svg className="w-6 h-6 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                        </div>
                        Select an operation above to configure
                    </div>
                ) : (
                    <div className="space-y-4 animate-fadeIn">
                        {/* Selected Column Display */}
                        {['drop_column', 'fill_na', 'rename', 'cast', 'scale'].includes(activeOperation) && (
                            <div>
                                <label className="text-xs text-gray-500 block mb-1.5">Target Column</label>
                                <div className={`text-sm px-3 py-2 rounded-lg border ${selectedColumn ? 'bg-blue-500/10 border-blue-500/30 text-blue-200' : 'bg-red-500/10 border-red-500/30 text-red-200'}`}>
                                    {selectedColumn || 'Please select a column (click header)'}
                                </div>
                            </div>
                        )}

                        {/* Inputs */}
                        {activeOperation === 'fill_na' && (
                            <div>
                                <label className="text-xs text-gray-500 block mb-1.5">Strategy</label>
                                <select
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white focus:border-blue-500 outline-none"
                                    onChange={(e) => setParams({ ...params, method: e.target.value })}
                                >
                                    <option value="">Select...</option>
                                    <option value="mean">Mean</option>
                                    <option value="median">Median</option>
                                    <option value="mode">Mode</option>
                                    <option value="zero">Constant (0)</option>
                                </select>
                            </div>
                        )}

                        {activeOperation === 'rename' && (
                            <div>
                                <label className="text-xs text-gray-500 block mb-1.5">New Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white focus:border-blue-500 outline-none"
                                    placeholder="e.g. customer_id..."
                                    onChange={(e) => setParams({ ...params, new_name: e.target.value })}
                                />
                            </div>
                        )}

                        {activeOperation === 'scale' && (
                            <div>
                                <label className="text-xs text-gray-500 block mb-1.5">Method</label>
                                <select
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white focus:border-blue-500 outline-none"
                                    onChange={(e) => setParams({ ...params, method: e.target.value })}
                                >
                                    <option value="">Select...</option>
                                    <option value="standard">Standard (Z-Score)</option>
                                    <option value="minmax">Min-Max (0-1)</option>
                                </select>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 3. Action Button */}
            {activeOperation && (
                <div className="mt-4 pt-4 border-t border-white/5">
                    <button
                        onClick={executeCleaning}
                        disabled={isProcessing || (['drop_column', 'fill_na', 'rename', 'scale'].includes(activeOperation) && !selectedColumn)}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                    >
                        {isProcessing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Apply Change'}
                    </button>
                </div>
            )}
        </div>
    );
}
