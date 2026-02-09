'use client';

import { useState, useEffect } from 'react';
import { cleanData, getDataQuality } from '@/lib/api';
// --- Icons ---
const TableCellsIcon = ({ className }: { className?: string }) => (
    <svg className={className || "w-6 h-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const ExclamationTriangleIcon = ({ className }: { className?: string }) => (
    <svg className={className || "w-6 h-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);

const BeakerIcon = ({ className }: { className?: string }) => (
    <svg className={className || "w-6 h-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
);

const MagicIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
);

interface DataPrepStudioProps {
    data: any;
    onDataUpdate: (newData: any) => void;
}

type PrepMode = 'cleaning' | 'outliers' | 'features';

export default function DataPrepStudio({ data, onDataUpdate }: DataPrepStudioProps) {
    const [activeMode, setActiveMode] = useState<PrepMode>('cleaning');
    const [selectedColumn, setSelectedColumn] = useState<string>('');
    const [qualityReport, setQualityReport] = useState<any>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // --- Shared State ---
    const columns = data?.columns || [];
    const preview = data?.preview || [];

    // --- Initial Analysis ---
    useEffect(() => {
        if (data) fetchQuality();
    }, [data]);

    const fetchQuality = async () => {
        setIsAnalyzing(true);
        try {
            const report = await getDataQuality();
            setQualityReport(report);
        } catch (err) {
            console.error("Failed to fetch quality report", err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-140px)] gap-0 animate-fadeIn overflow-hidden rounded-2xl border border-[#FFEDC1] bg-white">

            {/* 1. Left Nav Rail (Icons Only) */}
            <div className="w-16 flex flex-col items-center py-4 gap-4 border-r border-[#FFEDC1] bg-[#FFF7EA]">
                <NavRailItem
                    active={activeMode === 'cleaning'}
                    onClick={() => setActiveMode('cleaning')}
                    icon={<TableCellsIcon className="w-6 h-6" />}
                    tooltip="Data Cleaning"
                />
                <NavRailItem
                    active={activeMode === 'outliers'}
                    onClick={() => setActiveMode('outliers')}
                    icon={<ExclamationTriangleIcon className="w-6 h-6" />}
                    tooltip="Outliers"
                />
                <NavRailItem
                    active={activeMode === 'features'}
                    onClick={() => setActiveMode('features')}
                    icon={<BeakerIcon className="w-6 h-6" />}
                    tooltip="Feature Engineering"
                />

                <div className="mt-auto flex flex-col gap-3">
                    <HealthDot label="Missing" hasIssue={qualityReport?.missing_summary?.length > 0} color="bg-amber-400" />
                    <HealthDot label="Outliers" hasIssue={qualityReport?.outlier_summary?.length > 0} color="bg-rose-400" />
                </div>
            </div>

            {/* 2. Center: Data Preview (Flex-1) */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[#FFF7EA]/30">
                <div className="h-12 border-b border-[#FFEDC1] flex items-center px-4 justify-between bg-white">
                    <h3 className="font-semibold text-[#470102] text-sm flex items-center gap-2">
                        Dataset Preview
                    </h3>
                    <span className="text-xs text-[#8A5A5A] font-mono">
                        {data?.rows} rows × {columns.length} cols
                    </span>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left text-sm text-[#8A5A5A]">
                        <thead className="bg-[#FFF7EA] text-[#470102] sticky top-0 z-10 font-medium shadow-sm">
                            <tr>
                                {columns.map((col: string) => {
                                    const hasIssues = qualityReport?.missing_summary?.find((x: any) => x.column === col);
                                    return (
                                        <th
                                            key={col}
                                            className={`px-4 py-2 border-b border-[#FFEDC1] cursor-pointer hover:bg-white transition-colors whitespace-nowrap ${selectedColumn === col ? 'bg-[#FEB229]/20 text-[#470102] border-b-[#FEB229]' : ''}`}
                                            onClick={() => setSelectedColumn(col === selectedColumn ? '' : col)}
                                        >
                                            <div className="flex items-center gap-2">
                                                {col}
                                                {hasIssues && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#FFEDC1]">
                            {preview.slice(0, 100).map((row: any, i: number) => (
                                <tr key={i} className="hover:bg-[#FFF7EA] transition-colors">
                                    {columns.map((col: string) => (
                                        <td key={`${i}-${col}`} className={`px-4 py-1.5 whitespace-nowrap border-b border-[#FFEDC1] ${selectedColumn === col ? 'bg-[#FEB229]/5' : ''}`}>
                                            {row[col] === null ? <span className="text-red-400/50 italic text-xs">null</span> : <span className="text-[#470102]">{String(row[col])}</span>}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 3. Right: Inspector Panel (Fixed Width) */}
            <div className="w-[400px] border-l border-[#FFEDC1] bg-white flex flex-col overflow-hidden">
                {activeMode === 'cleaning' && (
                    <CleaningPanel
                        selectedColumn={selectedColumn}
                        onDataUpdate={onDataUpdate}
                        fetchQuality={fetchQuality}
                    />
                )}
                {activeMode === 'outliers' && (
                    <OutlierPanel
                        onDataUpdate={onDataUpdate}
                    />
                )}
                {activeMode === 'features' && (
                    <FeaturePanel
                        columns={columns}
                        onDataUpdate={onDataUpdate}
                    />
                )}
            </div>
        </div>
    );
}

import CleaningPanel from './CleaningPanel';
import OutlierPanel from './OutlierPanel';
import FeaturePanel from './FeaturePanel';

// --- Sub-Components ---

// --- Helper Components ---
function NavRailItem({ active, onClick, icon, tooltip }: any) {
    return (
        <button
            onClick={onClick}
            className={`p-3 rounded-xl transition-all relative group ${active
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
            title={tooltip}
        >
            {icon}
            {/* Tooltip (optional if title attr isn't enough) */}
        </button>
    );
}

function HealthDot({ label, hasIssue, color }: any) {
    if (!hasIssue) return null;
    return (
        <div className="w-2 h-2 rounded-full relative group" title={label}>
            <span className={`absolute inset-0 rounded-full ${color} animate-ping opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${color}`}></span>
        </div>
    );
}
