'use client';

import { useState, useEffect } from 'react';
import { cleanData, getDataQuality, getDatasetInfo } from '@/lib/api';

interface FeatureEngineeringProps {
    columns: string[];
}

// Icons
const WandIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
);

const ChartBarIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);

const CodeIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
);

const ScaleIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
    </svg>
);

const MagicIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
);


export default function FeatureEngineering({ columns }: FeatureEngineeringProps) {
    const [operation, setOperation] = useState<string>('polynomial');
    const [selectedCols, setSelectedCols] = useState<string[]>([]);
    const [degree, setDegree] = useState(2);
    const [bins, setBins] = useState(5);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'transform' | 'encoding' | 'scaling'>('transform');
    const [qualityReport, setQualityReport] = useState<any>(null);
    const [encodingMethod, setEncodingMethod] = useState<string>('one_hot');
    const [scalingMethod, setScalingMethod] = useState<string>('standard');
    const [datasetInfo, setDatasetInfo] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [quality, info] = await Promise.all([
                    getDataQuality(),
                    getDatasetInfo()
                ]);
                setQualityReport(quality);
                setDatasetInfo(info);
            } catch (err) {
                console.error("Failed to load data analysis", err);
            }
        };
        fetchData();
    }, []);

    const numericColumns = columns.filter(col => {
        if (datasetInfo?.dtypes?.[col]) {
            const dtype = String(datasetInfo.dtypes[col]).toLowerCase();
            return dtype.includes('int') || dtype.includes('float');
        }
        return !col.includes('_binned') && !col.includes('_log') && !col.includes('_pow');
    });

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
                body: JSON.stringify({ operation, columns: selectedCols, params })
            });
            const data = await response.json();
            setResult(data);
            setSelectedCols([]);
        } catch (error) {
            console.error('Feature engineering failed:', error);
        }
        setIsProcessing(false);
    };

    const applyEncoding = async () => {
        if (selectedCols.length === 0) return;
        setIsProcessing(true);
        try {
            const promises = selectedCols.map(col =>
                cleanData('encode', { column: col, method: encodingMethod })
            );
            await Promise.all(promises);
            setResult({ new_columns: selectedCols.map(c => `${c}_${encodingMethod}`) });
            setSelectedCols([]);
            const report = await getDataQuality();
            setQualityReport(report);
        } catch (error) {
            console.error('Encoding failed:', error);
        }
        setIsProcessing(false);
    };

    const applyScaling = async () => {
        if (selectedCols.length === 0) return;
        setIsProcessing(true);
        try {
            const promises = selectedCols.map(col =>
                cleanData('scale', { column: col, method: scalingMethod })
            );
            await Promise.all(promises);
            setResult({ new_columns: selectedCols.map(c => `${c}_scaled`) });
            setSelectedCols([]);
        } catch (error) {
            console.error('Scaling failed:', error);
        }
        setIsProcessing(false);
    };

    return (
        <div className="space-y-6">
            <div className="bg-[#FFF7EA] rounded-2xl border border-[#FFEDC1] p-8 shadow-sm">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#FEB229]/20 flex items-center justify-center text-[#470102]">
                            <WandIcon />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-[#470102]">Feature Engineering Studio</h2>
                            <p className="text-[#8A5A5A] text-sm">Transform, encode, and scale your features to improve model performance.</p>
                        </div>
                    </div>

                    {/* Tabs / Mode Switcher */}
                    <div className="flex bg-white rounded-xl p-1.5 border border-[#FFEDC1] shadow-sm">
                        {[
                            { id: 'transform', label: 'Transform', icon: <ChartBarIcon /> },
                            { id: 'encoding', label: 'Encode', icon: <CodeIcon /> },
                            { id: 'scaling', label: 'Scale', icon: <ScaleIcon /> }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id
                                        ? 'bg-[#470102] text-[#FFEDC1] shadow-md'
                                        : 'text-[#8A5A5A] hover:bg-[#FFF7EA] hover:text-[#470102]'
                                    }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* AI Suggestions */}
                {qualityReport?.encoding_summary?.length > 0 && activeTab === 'encoding' && (
                    <div className="mb-8 p-6 bg-white rounded-xl border border-[#FFEDC1] shadow-sm">
                        <h4 className="text-lg font-bold text-[#470102] mb-4 flex items-center gap-2">
                            <div className="p-1.5 bg-[#FFF7EA] rounded-lg text-[#FEB229]"><MagicIcon /></div>
                            AI Recommendations
                        </h4>
                        <div className="grid md:grid-cols-2 gap-4">
                            {qualityReport.encoding_summary.map((item: any, i: number) => (
                                <div key={i} className="flex flex-col p-4 bg-[#FFF7EA] rounded-xl border border-[#FFEDC1]/50 hover:border-[#FEB229] transition-colors group">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-mono text-[#470102] font-semibold bg-white px-2 py-0.5 rounded border border-[#FFEDC1]">{item.column}</span>
                                        <button
                                            onClick={() => {
                                                setSelectedCols([item.column]);
                                                setEncodingMethod(item.ai_recommendation === 'one_hot_encoding' ? 'one_hot' : 'label');
                                            }}
                                            className="text-sm font-bold text-[#470102] hover:text-[#FEB229] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            Apply Fix →
                                        </button>
                                    </div>
                                    <p className="text-sm text-[#8A5A5A] line-clamp-2">{item.ai_reasoning}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                <div className="grid lg:grid-cols-12 gap-8">
                    {/* Sidebar / Options */}
                    <div className="lg:col-span-3 space-y-4">
                        {activeTab === 'transform' && (
                            <div className="bg-white rounded-xl border border-[#FFEDC1] p-4 shadow-sm">
                                <label className="text-xs font-bold text-[#8A5A5A] uppercase tracking-wider mb-3 block">Operation Type</label>
                                <div className="space-y-2">
                                    {[
                                        { id: 'polynomial', label: 'Polynomial (x²)', desc: 'Generate interaction terms' },
                                        { id: 'log', label: 'Log Transform', desc: 'Normalize skewed data' },
                                        { id: 'interaction', label: 'Interaction', desc: 'Combine two features' },
                                        { id: 'binning', label: 'Binning', desc: 'Group values into bins' },
                                    ].map((op) => (
                                        <button
                                            key={op.id}
                                            onClick={() => { setOperation(op.id); setSelectedCols([]); }}
                                            className={`w-full text-left p-3 rounded-lg transition-all border ${operation === op.id
                                                    ? 'bg-[#FFF7EA] border-[#FEB229] shadow-sm'
                                                    : 'border-transparent hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className={`font-bold ${operation === op.id ? 'text-[#470102]' : 'text-gray-600'}`}>{op.label}</div>
                                            <div className="text-xs text-[#8A5A5A] mt-0.5">{op.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'encoding' && (
                            <div className="bg-white rounded-xl border border-[#FFEDC1] p-4 shadow-sm">
                                <label className="text-xs font-bold text-[#8A5A5A] uppercase tracking-wider mb-3 block">Method</label>
                                <div className="space-y-4">
                                    <div>
                                        <label className="flex items-center gap-3 p-3 rounded-lg border border-[#FFEDC1] cursor-pointer hover:bg-[#FFF7EA] transition-colors">
                                            <input type="radio" name="encoding" value="one_hot" checked={encodingMethod === 'one_hot'} onChange={(e) => setEncodingMethod(e.target.value)} className="text-[#470102] focus:ring-[#FEB229]" />
                                            <div>
                                                <div className="font-bold text-[#470102]">One-Hot Encoding</div>
                                                <div className="text-xs text-[#8A5A5A]">For nominal categories (Apple, Banana)</div>
                                            </div>
                                        </label>
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-3 p-3 rounded-lg border border-[#FFEDC1] cursor-pointer hover:bg-[#FFF7EA] transition-colors">
                                            <input type="radio" name="encoding" value="label" checked={encodingMethod === 'label'} onChange={(e) => setEncodingMethod(e.target.value)} className="text-[#470102] focus:ring-[#FEB229]" />
                                            <div>
                                                <div className="font-bold text-[#470102]">Label Encoding</div>
                                                <div className="text-xs text-[#8A5A5A]">For ordinal rankings (Low, Med, High)</div>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'scaling' && (
                            <div className="bg-white rounded-xl border border-[#FFEDC1] p-4 shadow-sm">
                                <label className="text-xs font-bold text-[#8A5A5A] uppercase tracking-wider mb-3 block">Scaler</label>
                                <div className="space-y-4">
                                    <div>
                                        <label className="flex items-center gap-3 p-3 rounded-lg border border-[#FFEDC1] cursor-pointer hover:bg-[#FFF7EA] transition-colors">
                                            <input type="radio" name="scaling" value="standard" checked={scalingMethod === 'standard'} onChange={(e) => setScalingMethod(e.target.value)} className="text-[#470102] focus:ring-[#FEB229]" />
                                            <div>
                                                <div className="font-bold text-[#470102]">Standard Scaler</div>
                                                <div className="text-xs text-[#8A5A5A]">Zero mean, unit variance</div>
                                            </div>
                                        </label>
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-3 p-3 rounded-lg border border-[#FFEDC1] cursor-pointer hover:bg-[#FFF7EA] transition-colors">
                                            <input type="radio" name="scaling" value="minmax" checked={scalingMethod === 'minmax'} onChange={(e) => setScalingMethod(e.target.value)} className="text-[#470102] focus:ring-[#FEB229]" />
                                            <div>
                                                <div className="font-bold text-[#470102]">MinMax Scaler</div>
                                                <div className="text-xs text-[#8A5A5A]">Scale range to [0, 1]</div>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Configuration Area */}
                    <div className="lg:col-span-9">
                        <div className="bg-white rounded-xl border border-[#FFEDC1] p-6 shadow-sm h-full flex flex-col">
                            <h3 className="text-lg font-bold text-[#470102] mb-6">
                                {activeTab === 'transform' ? 'Configure Transformation' : activeTab === 'encoding' ? 'Select Features to Encode' : 'Select Features to Scale'}
                            </h3>

                            {/* Controls */}
                            {activeTab === 'transform' && (
                                <div className="mb-6 flex gap-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    {operation === 'polynomial' && (
                                        <div className="flex-1">
                                            <label className="text-xs font-bold text-[#8A5A5A] mb-1.5 block">Degree of Polynomial</label>
                                            <select
                                                value={degree}
                                                onChange={(e) => setDegree(parseInt(e.target.value))}
                                                className="w-full bg-white border border-[#FFEDC1] rounded-lg px-3 py-2 text-[#470102] focus:ring-[#FEB229] focus:border-[#FEB229]"
                                            >
                                                <option value={2}>Squared (x²)</option>
                                                <option value={3}>Cubed (x³)</option>
                                            </select>
                                        </div>
                                    )}
                                    {operation === 'binning' && (
                                        <div className="flex-1">
                                            <label className="text-xs font-bold text-[#8A5A5A] mb-1.5 block">Number of Bins</label>
                                            <input
                                                type="number"
                                                value={bins}
                                                onChange={(e) => setBins(parseInt(e.target.value))}
                                                min={2}
                                                max={20}
                                                className="w-full bg-white border border-[#FFEDC1] rounded-lg px-3 py-2 text-[#470102] focus:ring-[#FEB229] focus:border-[#FEB229]"
                                            />
                                        </div>
                                    )}
                                    <div className="flex-1 flex items-end">
                                        <div className="text-sm text-[#8A5A5A]">
                                            {operation === 'interaction' ? 'Select exactly 2 columns to combine.' : 'Select columns to apply transformation.'}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Column Selection Grid */}
                            <div className="flex-1 mb-6">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto p-1">
                                    {(activeTab === 'encoding' ? columns.filter(c => !numericColumns.includes(c)) : numericColumns).map((col) => (
                                        <button
                                            key={col}
                                            onClick={() => handleColumnToggle(col)}
                                            className={`relative px-4 py-3 rounded-lg text-sm font-medium transition-all text-left border ${selectedCols.includes(col)
                                                    ? 'bg-[#470102] text-[#FFEDC1] border-[#470102] shadow-md transform scale-[1.02]'
                                                    : 'bg-white text-gray-600 border-[#FFEDC1] hover:border-[#FEB229] hover:bg-[#FFF7EA]'
                                                }`}
                                        >
                                            <div className="truncate" title={col}>{col}</div>
                                            {selectedCols.includes(col) && (
                                                <div className="absolute top-1 right-1 w-2 h-2 bg-[#FEB229] rounded-full"></div>
                                            )}
                                        </button>
                                    ))}
                                    {(activeTab === 'encoding' ? columns.filter(c => !numericColumns.includes(c)) : numericColumns).length === 0 && (
                                        <div className="col-span-full py-10 text-center text-gray-400 italic">
                                            No compatible columns found for this operation.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Footer */}
                            <div className="flex justify-end pt-6 border-t border-[#FFEDC1]">
                                <button
                                    onClick={activeTab === 'transform' ? applyEngineering : activeTab === 'encoding' ? applyEncoding : applyScaling}
                                    disabled={isProcessing || selectedCols.length === 0 || (operation === 'interaction' && selectedCols.length !== 2)}
                                    className="px-8 py-3 bg-[#470102] hover:bg-[#5D0203] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-[#FFEDC1] text-lg font-bold shadow-lg shadow-[#470102]/20 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-3"
                                >
                                    {isProcessing ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-[#FFEDC1]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <span>Apply Changes</span>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Success Feedback */}
                {result && result.new_columns?.length > 0 && (
                    <div className="mt-8 p-6 bg-[#307B65] text-white rounded-xl shadow-lg border border-[#205A48] flex items-center gap-4 animate-slideIn">
                        <div className="p-2 bg-white/20 rounded-full">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <div>
                            <h4 className="font-bold text-lg">Success!</h4>
                            <p className="opacity-90">Created {result.new_columns.length} new feature(s): <span className="font-mono bg-black/20 px-2 py-0.5 rounded">{result.new_columns.join(', ')}</span></p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
