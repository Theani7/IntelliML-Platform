'use client';

import { useState, useEffect } from 'react';
import { cleanData, getDataQuality } from '@/lib/api';

interface DataCleaningProps {
    data: any;
    onDataUpdate: (newData: any) => void;
}

// Icons
const TrashIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const RefreshIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

const FilterIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
);

const EditIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
);
const MagicIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
);

const AlertIcon = () => (
    <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);

export default function DataCleaning({ data, onDataUpdate }: DataCleaningProps) {
    const [selectedColumn, setSelectedColumn] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeOperation, setActiveOperation] = useState<string | null>(null);
    const [params, setParams] = useState<any>({});
    const [qualityReport, setQualityReport] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [fixConfirmation, setFixConfirmation] = useState<{ item: any, type: 'missing' | 'encoding' | 'outlier' } | null>(null);
    const [activeTab, setActiveTab] = useState<'clean' | 'schema'>('clean');
    const [historyStatus, setHistoryStatus] = useState({ can_undo: false, can_redo: false });
    const [castTypes, setCastTypes] = useState<{ [key: string]: string }>({});

    const columns = data?.columns || [];
    const preview = data?.preview || [];

    useEffect(() => {
        if (data) fetchQuality();
    }, [data]);

    const fetchQuality = async () => {
        setError(null);
        setIsAnalyzing(true);
        // setQualityReport(null); // Optional: clear old report to force skeleton? Let's keep old report + overlay for smoother UX
        try {
            const report = await getDataQuality();
            setQualityReport(report);
        } catch (err: any) {
            console.error("Failed to fetch quality report", err);
            // Handle 404 (Back-end restart cleared memory)
            if (err.message && err.message.includes('404')) {
                setError("Using cached data. Re-upload to enable AI analysis.");
            } else {
                setError("Could not load AI Health Report.");
            }
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleOperation = async (op: string) => {
        setActiveOperation(op);
        setParams({}); // Reset params
    };

    const initiateFix = (item: any, type: 'missing' | 'encoding' | 'outlier') => {
        setFixConfirmation({ item, type });
    };

    const confirmFix = async () => {
        if (!fixConfirmation) return;

        const { item, type } = fixConfirmation;
        setIsProcessing(true);
        setFixConfirmation(null); // Close modal

        try {
            const strategy = item.ai_recommendation;
            let op = '';
            let p: any = { column: item.column };

            if (type === 'missing') {
                if (strategy === 'drop_column') {
                    op = 'drop_column';
                } else if (strategy === 'drop_rows') {
                    op = 'drop_na';
                } else {
                    op = 'fill_na';
                    p.method = strategy; // mean, median, mode
                }
            } else if (type === 'encoding') {
                op = 'encode';
                p.method = strategy; // 'one_hot', 'label'
            } else if (type === 'outlier') {
                op = 'handle_outliers';
                p.method = strategy === 'drop_outliers' ? 'drop' : 'clip';
            }

            if (op) {
                const result = await cleanData(op, p);
                if (result.status === 'success' && result.dataset_info) {
                    onDataUpdate(result.dataset_info);
                    await fetchQuality(); // Update quality report
                }
            }
        } catch (e) {
            console.error(e);
            alert('Fix failed');
        } finally {
            setIsProcessing(false);
        }
    };

    const executeCleaning = async () => {
        if (!activeOperation) return;

        // Simple validation alert replacement (could be better, but quick fix for now)
        if (['drop_column', 'fill_na', 'rename', 'cast'].includes(activeOperation) && !selectedColumn) {
            alert('Please select a column first');
            return;
        }

        setIsProcessing(true);
        try {
            let finalParams = { ...params };
            if (['drop_column', 'fill_na', 'rename', 'cast'].includes(activeOperation)) {
                finalParams.column = selectedColumn;
            }

            const result = await cleanData(activeOperation, finalParams);

            if (result.status === 'success' && result.dataset_info) {
                onDataUpdate(result.dataset_info);
                if (result.history_status) setHistoryStatus(result.history_status);
                setActiveOperation(null);
                setSelectedColumn('');
                // Also refresh quality here in case manual fix affects AI suggestions
                await fetchQuality();
            }
        } catch (error) {
            console.error('Cleaning failed:', error);
            alert('Operation failed. Check console for details.');
        } finally {
            setIsProcessing(false);
        }
    };



    const handleCast = async (col: string) => {
        const targetType = castTypes[col];
        if (!targetType) return;

        setIsProcessing(true);
        try {
            const result = await cleanData('cast', { column: col, type: targetType });
            if (result.status === 'success' && result.dataset_info) {
                onDataUpdate(result.dataset_info);
                if (result.history_status) setHistoryStatus(result.history_status);
                await fetchQuality();
                setCastTypes(prev => ({ ...prev, [col]: '' })); // Reset selection
            }
        } catch (error) {
            console.error('Casting failed:', error);
            alert('Casting failed. Check console.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUndo = async () => {
        setIsProcessing(true);
        try {
            const result = await cleanData('undo', {});
            if (result.status === 'success' && result.dataset_info) {
                onDataUpdate(result.dataset_info);
                if (result.history_status) setHistoryStatus(result.history_status);
                await fetchQuality();
            }
        } catch (error) {
            console.error('Undo failed:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRedo = async () => {
        setIsProcessing(true);
        try {
            const result = await cleanData('redo', {});
            if (result.status === 'success' && result.dataset_info) {
                onDataUpdate(result.dataset_info);
                if (result.history_status) setHistoryStatus(result.history_status);
                await fetchQuality();
            }
        } catch (error) {
            console.error('Redo failed:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setActiveTab('clean')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'clean' ? 'bg-[#470102] text-[#FFF7EA] shadow-lg shadow-[#470102]/20' : 'bg-[#FFF7EA] border border-[#FFEDC1] text-[#8A5A5A] hover:bg-[#FFF7EA]/80'}`}
                    >
                        Cleaning Station
                    </button>
                    <button
                        onClick={() => setActiveTab('schema')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'schema' ? 'bg-[#470102] text-[#FFF7EA] shadow-lg shadow-[#470102]/20' : 'bg-[#FFF7EA] border border-[#FFEDC1] text-[#8A5A5A] hover:bg-[#FFF7EA]/80'}`}
                    >
                        Schema & Types
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleUndo}
                        disabled={isProcessing || !historyStatus.can_undo}
                        className="p-2 rounded-lg bg-[#FFF7EA] border border-[#FFEDC1] text-[#8A5A5A] hover:border-[#FEB229] hover:text-[#470102] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Undo"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                    </button>
                    <button
                        onClick={handleRedo}
                        disabled={isProcessing || !historyStatus.can_redo}
                        className="p-2 rounded-lg bg-[#FFF7EA] border border-[#FFEDC1] text-[#8A5A5A] hover:border-[#FEB229] hover:text-[#470102] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Redo"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                        </svg>
                    </button>
                </div>
            </div>

            {activeTab === 'schema' ? (
                <div className="bg-[#FFF7EA] rounded-2xl border border-[#FFEDC1] p-6 h-[calc(100vh-200px)] overflow-hidden flex flex-col shadow-sm">
                    <h3 className="text-lg font-bold text-[#470102] mb-4">Dataset Schema</h3>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-sm text-[#8A5A5A]">
                            <thead className="bg-[#470102] text-[#FFF7EA] sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 border-b border-[#FFEDC1]/10">Column Name</th>
                                    <th className="px-4 py-3 border-b border-[#FFEDC1]/10">Current Type</th>
                                    <th className="px-4 py-3 border-b border-[#FFEDC1]/10">Non-Null Count</th>
                                    <th className="px-4 py-3 border-b border-[#FFEDC1]/10">Convert To</th>
                                    <th className="px-4 py-3 border-b border-[#FFEDC1]/10">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {columns.map((col: string) => {
                                    const missingCount = qualityReport?.missing_summary?.find((m: any) => m.column === col)?.count || 0;
                                    const total = data?.rows || 0;
                                    const nonNull = total - missingCount;

                                    return (
                                        <tr key={col} className="hover:bg-white/5">
                                            <td className="px-4 py-3 font-medium text-white">{col}</td>
                                            <td className="px-4 py-3 font-mono text-cyan-400">{data?.dtypes?.[col] || 'unknown'}</td>
                                            <td className="px-4 py-3">
                                                {nonNull} <span className="text-gray-600">/ {total}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <select
                                                    className="bg-slate-950 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-blue-500 outline-none"
                                                    value={castTypes[col] || ''}
                                                    onChange={(e) => setCastTypes(prev => ({ ...prev, [col]: e.target.value }))}
                                                >
                                                    <option value="">Select Type...</option>
                                                    <option value="int">Integer</option>
                                                    <option value="float">Float</option>
                                                    <option value="categorical">Categorical</option>
                                                    <option value="string">String</option>
                                                    <option value="datetime">Datetime</option>
                                                </select>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => handleCast(col)}
                                                    disabled={!castTypes[col] || isProcessing}
                                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs rounded transition-colors"
                                                >
                                                    Apply
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)] relative">
                    {/* ... key={forceRemount} logic if needed, but standard React updates should work ... */}

                    {/* Modal Overlay */}
                    {fixConfirmation && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
                            <div className="bg-[#FFF7EA] border border-[#FFEDC1] rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-[#470102]/10 transform transition-all scale-100">
                                <h3 className="text-xl font-bold text-[#470102] mb-2 flex items-center gap-2">
                                    <MagicIcon /> Confirm AI Fix
                                </h3>
                                <div className="bg-[#FEB229]/10 rounded-xl p-4 mb-6 border border-[#FEB229]/20">
                                    <div className="text-sm text-[#8A5A5A] mb-1">Recommendation</div>
                                    <div className="text-lg font-semibold text-[#470102] mb-2">
                                        {fixConfirmation.item.ai_recommendation.replace(/_/g, ' ')}
                                    </div>
                                    <div className="text-sm text-[#8A5A5A] mb-1">Target Column</div>
                                    <div className="text-[#470102] font-mono text-sm bg-[#FFF7EA] border border-[#FFEDC1] px-2 py-1 rounded inline-block">
                                        {fixConfirmation.item.column}
                                    </div>
                                    <div className="mt-3 text-xs text-[#8A5A5A] italic">
                                        "{fixConfirmation.item.ai_reasoning}"
                                    </div>
                                </div>

                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={() => setFixConfirmation(null)}
                                        className="px-4 py-2 hover:bg-[#470102]/5 text-[#8A5A5A] rounded-xl transition-colors font-medium text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmFix}
                                        className="px-6 py-2 bg-[#FEB229] hover:bg-[#FEB229]/90 text-[#470102] font-bold rounded-xl shadow-lg shadow-[#FEB229]/20 transition-all text-sm"
                                    >
                                        Apply Fix
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* LEFT: Data Preview (Scrollable) */}
                    <div className="lg:col-span-2 flex flex-col gap-6 overflow-hidden h-full">

                        {/* Health Report Banner */}
                        <div className="bg-[#FFF7EA] rounded-2xl border border-[#FFEDC1] p-4 shrink-0 max-h-[300px] overflow-y-auto custom-scrollbar space-y-4 relative shadow-sm">
                            {/* Loading Overlay */}
                            {isAnalyzing && (
                                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
                                    <div className="flex flex-col items-center gap-2">
                                        <RefreshIcon className="animate-spin text-blue-400 w-6 h-6" />
                                        <span className="text-blue-200 text-sm font-medium animate-pulse">Running AI Analysis...</span>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-[#470102] flex items-center gap-2">
                                    <MagicIcon /> AI Health Report
                                </h3>
                                {qualityReport && (
                                    <button
                                        onClick={fetchQuality}
                                        disabled={isAnalyzing}
                                        className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50 flex items-center gap-1"
                                    >
                                        {isAnalyzing ? 'Analyzing...' : 'Refresh'}
                                        <RefreshIcon className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
                                    </button>
                                )}
                            </div>

                            {error && (
                                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-200 text-sm flex items-center gap-2">
                                    <AlertIcon />
                                    {error}
                                </div>
                            )}

                            {!error && !qualityReport && (
                                <div className="text-gray-400 text-sm animate-pulse">Analyzing data quality...</div>
                            )}

                            {qualityReport && (
                                <>
                                    {/* 1. Missing Values */}
                                    {qualityReport.missing_summary?.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-semibold text-[#8A5A5A] uppercase tracking-wider mb-2">Missing Values ({qualityReport.missing_summary.length})</h4>
                                            <div className="grid grid-cols-1 gap-2">
                                                {qualityReport.missing_summary.map((item: any) => (
                                                    <div key={item.column} className="bg-white rounded-lg p-3 border border-[#FFEDC1] flex justify-between items-center group hover:border-[#FEB229] transition-colors shadow-sm">
                                                        <div>
                                                            <div className="font-medium text-[#470102] flex items-center gap-2 text-sm">
                                                                {item.column}
                                                                <span className="text-[10px] text-[#470102] bg-[#FEB229]/20 px-1.5 rounded">{item.percentage}% missing</span>
                                                            </div>
                                                            <div className="text-xs text-[#8A5A5A] mt-1 flex items-center gap-1">
                                                                <span>AI: {item.ai_recommendation}</span>
                                                                <span className="text-gray-300">•</span>
                                                                <span className="text-[#8A5A5A] italic truncate max-w-[150px]">{item.ai_reasoning}</span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => initiateFix(item, 'missing')}
                                                            disabled={isProcessing}
                                                            className="px-2 py-1 bg-[#FEB229] hover:bg-[#FEB229]/90 text-[#470102] text-xs font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            Fix
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}



                                    {/* 3. Outliers */}
                                    {qualityReport.outlier_summary?.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-semibold text-[#8A5A5A] uppercase tracking-wider mb-2">Outliers Detected ({qualityReport.outlier_summary.length})</h4>
                                            <div className="grid grid-cols-1 gap-2">
                                                {qualityReport.outlier_summary.map((item: any) => (
                                                    <div key={item.column} className="bg-white rounded-lg p-3 border border-[#FFEDC1] flex justify-between items-center group hover:border-red-500/30 transition-colors shadow-sm">
                                                        <div>
                                                            <div className="font-medium text-[#470102] flex items-center gap-2 text-sm">
                                                                {item.column}
                                                                <span className="text-[10px] text-red-600 bg-red-100 px-1.5 rounded">{item.count} detected</span>
                                                            </div>
                                                            <div className="text-xs text-[#8A5A5A] mt-1 flex items-center gap-1">
                                                                <span>AI: {item.ai_recommendation}</span>
                                                                <span className="text-gray-300">•</span>
                                                                <span className="text-[#8A5A5A] italic truncate max-w-[150px]">{item.ai_reasoning}</span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => initiateFix(item, 'outlier')}
                                                            disabled={isProcessing}
                                                            className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            Fix
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {(!qualityReport.missing_summary?.length && !qualityReport.encoding_summary?.length && !qualityReport.outlier_summary?.length) && (
                                        <div className="text-center py-8 text-[#8A5A5A]">
                                            <span className="text-2xl">✨</span>
                                            <p className="mt-2 text-sm">Data looks clean! No issues detected.</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="bg-[#FFF7EA] rounded-2xl border border-[#FFEDC1] flex flex-col overflow-hidden shrink-0 shadow-sm">
                            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                                <h3 className="font-semibold text-white flex items-center gap-2">
                                    <FilterIcon /> Data Preview
                                </h3>
                                <span className="text-xs text-[#8A5A5A]">
                                    {data?.rows} rows • {columns.length} columns
                                </span>
                            </div>

                            <div className="flex-1 overflow-auto">
                                <table className="w-full text-left text-sm text-[#8A5A5A]">
                                    <thead className="bg-[#470102] text-[#FFF7EA] sticky top-0 z-10 font-medium">
                                        <tr>
                                            {columns.map((col: string) => (
                                                <th
                                                    key={col}
                                                    className={`px-4 py-3 border-b border-white/10 cursor-pointer hover:bg-white/5 transition-colors ${selectedColumn === col ? 'bg-blue-900/40 text-blue-200' : ''}`}
                                                    onClick={() => setSelectedColumn(col)}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {selectedColumn === col && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>}
                                                        {col}
                                                        {qualityReport?.missing_summary?.find((x: any) => x.column === col) && <AlertIcon />}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {preview.slice(0, 5).map((row: any, i: number) => (
                                            <tr key={i} className="hover:bg-white/5">
                                                {columns.map((col: string) => (
                                                    <td key={`${i}-${col}`} className={`px-4 py-3 whitespace-nowrap ${selectedColumn === col ? 'bg-blue-900/10' : ''}`}>
                                                        {row[col] === null ? <span className="text-red-400 italic">null</span> : String(row[col])}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Operations Panel */}
                    <div className="bg-[#FFF7EA] rounded-2xl border border-[#FFEDC1] p-6 flex flex-col h-full overflow-hidden shadow-sm">
                        <h3 className="text-lg font-bold text-[#470102] mb-6 flex items-center gap-2">
                            <EditIcon /> Cleaning Station
                        </h3>

                        {!selectedColumn ? (
                            <div className="mb-6 p-4 bg-[#FEB229]/10 border border-[#FEB229]/20 rounded-xl text-[#8A5A5A] text-sm">
                                Select a column from the left to see available operations.
                            </div>
                        ) : (
                            <div className="mb-6 p-4 bg-[#FFF7EA] border border-[#FFEDC1] rounded-xl shadow-sm">
                                <span className="text-xs text-[#8A5A5A] uppercase tracking-widest">Selected Column</span>
                                <div className="text-xl font-bold text-[#470102] mt-1">{selectedColumn}</div>
                                <div className="text-xs text-[#FEB229] mt-1">{data?.dtypes?.[selectedColumn] || 'Unknown Type'}</div>
                            </div>
                        )}

                        <div className="space-y-3 flex-1 overflow-y-auto pr-2 pb-4 custom-scrollbar">
                            {/* 1. Handling Missing Values */}
                            <div className={`p-4 rounded-xl border transition-all cursor-pointer ${activeOperation === 'fill_na' ? 'bg-[#FEB229]/10 border-[#FEB229]' : 'bg-white border-[#FFEDC1] hover:border-[#FEB229]/50'}`} onClick={() => handleOperation('fill_na')}>
                                <div className="font-semibold text-[#470102] mb-1">Fill Missing Values</div>
                                <p className="text-xs text-[#8A5A5A]">Replace nulls with Mean, Median, or 0.</p>

                                {activeOperation === 'fill_na' && (
                                    <div className="mt-3 space-y-2 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                                        <select
                                            className="w-full bg-white border border-[#FFEDC1] rounded p-2 text-sm text-[#470102]"
                                            onChange={(e) => setParams({ ...params, method: e.target.value })}
                                        >
                                            <option value="">Select Method...</option>
                                            <option value="mean">Mean (Average)</option>
                                            <option value="median">Median (Middle)</option>
                                            <option value="mode">Mode (Most Frequent)</option>
                                            <option value="zero">Fill with 0</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* 2. Drop Column */}
                            <div className={`p-4 rounded-xl border transition-all cursor-pointer ${activeOperation === 'drop_column' ? 'bg-red-50 border-red-200' : 'bg-white border-[#FFEDC1] hover:border-red-200'}`} onClick={() => handleOperation('drop_column')}>
                                <div className="font-semibold text-[#470102] mb-1">Drop Column</div>
                                <p className="text-xs text-[#8A5A5A]">Permanently remove this column.</p>
                            </div>

                            {/* 3. Rename Column */}
                            <div className={`p-4 rounded-xl border transition-all cursor-pointer ${activeOperation === 'rename' ? 'bg-[#FEB229]/10 border-[#FEB229]' : 'bg-white border-[#FFEDC1] hover:border-[#FEB229]/50'}`} onClick={() => handleOperation('rename')}>
                                <div className="font-semibold text-[#470102] mb-1">Rename Column</div>

                                {activeOperation === 'rename' && (
                                    <div className="mt-3 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="text"
                                            placeholder="New name..."
                                            className="w-full bg-white border border-[#FFEDC1] rounded p-2 text-sm text-[#470102]"
                                            onChange={(e) => setParams({ ...params, new_name: e.target.value })}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* 4. Drop Duplicates (Global) */}
                            <div className={`p-4 rounded-xl border transition-all cursor-pointer ${activeOperation === 'drop_duplicates' ? 'bg-[#FEB229]/10 border-[#FEB229]' : 'bg-white border-[#FFEDC1] hover:border-[#FEB229]/50'}`} onClick={() => handleOperation('drop_duplicates')}>
                                <div className="font-semibold text-[#470102] mb-1">Remove Duplicates</div>
                                <p className="text-xs text-[#8A5A5A]">Global operation (whole dataset).</p>
                            </div>

                            {/* 5. Drop Missing Rows (Global) */}
                            <div className={`p-4 rounded-xl border transition-all cursor-pointer ${activeOperation === 'drop_na' ? 'bg-red-50 border-red-200' : 'bg-white border-[#FFEDC1] hover:border-red-200'}`} onClick={() => handleOperation('drop_na')}>
                                <div className="font-semibold text-[#470102] mb-1">Drop Missing Rows</div>
                                <p className="text-xs text-[#8A5A5A]">Remove any row containing null values.</p>
                            </div>



                        </div>

                        <div className="mt-6 pt-6 border-t border-[#FFEDC1]">
                            <button
                                onClick={executeCleaning}
                                disabled={!activeOperation || isProcessing}
                                className="w-full py-3 bg-[#FEB229] hover:bg-[#FEB229]/90 text-[#470102] font-bold rounded-xl shadow-lg shadow-[#FEB229]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isProcessing ? (
                                    <>
                                        <RefreshIcon /> Processing...
                                    </>
                                ) : (
                                    'Apply Changes'
                                )}
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </>
    );
}
