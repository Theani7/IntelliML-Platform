import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { SparklesIcon, ChartIcon, TargetIcon, SpinnerIcon } from '@/components/icons/Icons';
import { getSimulationSchema, runSimulation } from '@/lib/api';
import SkeletonState from '@/components/ui/SkeletonState';

interface SimulateProps {
    jobId: string;
}

type SensitivityLevel = 'high' | 'medium' | 'low';

const SENSITIVITY_CONFIG: Record<SensitivityLevel, {
    label: string;
    border: string;
    bg: string;
    badgeBg: string;
    badgeText: string;
    glow: string;
}> = {
    high: {
        label: 'High Impact',
        border: 'border-l-[#470102]',
        bg: 'bg-[#FFF7EA]',
        badgeBg: 'bg-[#FEB229]/20',
        badgeText: 'text-[#470102]',
        glow: 'shadow-[0_0_20px_rgba(220,38,38,0.1)]',
    },
    medium: {
        label: 'Medium Impact',
        border: 'border-l-[#FFEDC1]',
        bg: 'bg-[#FFF7EA]/70',
        badgeBg: 'bg-[#FFEDC1]',
        badgeText: 'text-[#8A5A5A]',
        glow: '',
    },
    low: {
        label: 'Low Impact',
        border: 'border-l-transparent',
        bg: 'bg-transparent',
        badgeBg: 'bg-transparent',
        badgeText: 'text-[#8A5A5A]',
        glow: '',
    },
};

export default function Simulate({ jobId }: SimulateProps) {
    const [schema, setSchema] = useState<any[]>([]);
    const [targetColumn, setTargetColumn] = useState<string>('');
    const [features, setFeatures] = useState<Record<string, any>>({});

    const [prediction, setPrediction] = useState<any>(null);
    const [probability, setProbability] = useState<number | null>(null);
    const [baseValue, setBaseValue] = useState<number>(0);
    const [explanations, setExplanations] = useState<any[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isSimulating, setIsSimulating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    const sensitivityMap = useMemo(() => {
        const map: Record<string, number> = {};
        if (explanations.length === 0) return map;

        for (const exp of explanations) {
            const originalName = schema.find(s => s.name === exp.feature)?.name;
            if (originalName) {
                map[originalName] = (map[originalName] || 0) + Math.abs(exp.shap_value);
            } else {
                const baseName = exp.feature.split('_').slice(0, -1).join('_');
                const match = schema.find(s => s.name === baseName);
                if (match) {
                    map[match.name] = (map[match.name] || 0) + Math.abs(exp.shap_value);
                }
            }
        }
        return map;
    }, [explanations, schema]);

    const getSensitivityLevel = (featureName: string): SensitivityLevel => {
        const values = Object.values(sensitivityMap);
        if (values.length === 0) return 'low';

        const maxSens = Math.max(...values, 0.001);
        const val = sensitivityMap[featureName] || 0;
        const ratio = val / maxSens;

        if (ratio >= 0.5) return 'high';
        if (ratio >= 0.15) return 'medium';
        return 'low';
    };

    const sortedSchema = useMemo(() => {
        if (Object.keys(sensitivityMap).length === 0) return schema;
        return [...schema].sort((a, b) => {
            return (sensitivityMap[b.name] || 0) - (sensitivityMap[a.name] || 0);
        });
    }, [schema, sensitivityMap]);

    useEffect(() => {
        if (!jobId) return;

        const fetchSchema = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const data = await getSimulationSchema(jobId);

                setSchema(data.schema);
                setTargetColumn(data.target_column);

                const defaults: Record<string, any> = {};
                data.schema.forEach((field: any) => {
                    if (field.type === 'numeric') {
                        defaults[field.name] = Number(field.mean.toFixed(2));
                    } else {
                        defaults[field.name] = field.categories?.[0] ?? '';
                    }
                });

                setFeatures(defaults);
                triggerSimulation(defaults);
            } catch (err: any) {
                console.error('Failed to load simulation schema:', err);
                setError(err.message || 'Failed to load simulation schema');
            } finally {
                setIsLoading(false);
            }
        };

        fetchSchema();
    }, [jobId]);

    const triggerSimulation = async (currentFeatures: Record<string, any>) => {
        if (!jobId) return;

        try {
            setIsSimulating(true);
            const result = await runSimulation(jobId, currentFeatures);

            setPrediction(result.prediction);
            setProbability(result.probability);
            setBaseValue(result.base_value);
            setExplanations(result.explanations);
        } catch (err: any) {
            console.error('Simulation failed:', err);
        } finally {
            setIsSimulating(false);
        }
    };

    const handleFeatureChange = (name: string, value: any) => {
        const newFeatures = { ...features, [name]: value };
        setFeatures(newFeatures);

        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = setTimeout(() => {
            triggerSimulation(newFeatures);
        }, 300);
    };

    if (isLoading) {
        return (
            <div className="space-y-8 animate-fadeIn">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        <SkeletonState rows={10} />
                    </div>
                    <div className="lg:col-span-2 space-y-6">
                        <SkeletonState rows={4} />
                        <SkeletonState rows={8} />
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <GlassCard className="p-12 text-center border-[#FFEDC1] bg-[#FFF7EA]">
                <div className="text-[#470102] mb-6 flex justify-center">
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 className="text-2xl font-bold text-[#470102]">Could not load simulation</h3>
                <p className="text-sm text-[#8A5A5A] mt-3">{error}</p>
            </GlassCard>
        );
    }

    const maxAbsShap = Math.max(
        0.001,
        ...explanations.map(e => Math.abs(e.shap_value))
    );

    const sensitivityCounts = { high: 0, medium: 0, low: 0 };
    sortedSchema.forEach(f => { sensitivityCounts[getSensitivityLevel(f.name)] += 1; });

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in zoom-in-95">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-[#470102] tracking-tight flex items-center gap-3">
                        <SparklesIcon className="w-8 h-8 text-[#FEB229]" />
                        What-If Simulation
                    </h2>
                    <p className="text-sm text-[#8A5A5A] mt-1">Adjust feature values and see how the prediction changes in real time.</p>
                </div>

                {isSimulating && (
                    <div className="w-fit flex items-center gap-3 text-xs text-[#470102] font-semibold bg-[#FFF7EA] px-5 py-2 rounded-full border border-[#FFEDC1]">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#FEB229] animate-pulse" />
                        Updating prediction...
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <GlassCard className="p-5 md:p-8 rounded-[1.75rem] md:rounded-[3.5rem] md:h-[calc(100vh-280px)] overflow-y-auto border-[#FFEDC1] bg-white custom-scrollbar">
                        <h3 className="text-lg font-bold text-[#470102] mb-6 flex items-center gap-3">
                            <WrenchIcon className="w-6 h-6 text-[#FEB229]" />
                            Input Controls
                        </h3>

                        {explanations.length > 0 && (
                            <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-8 text-xs font-semibold border-b border-[#FFEDC1] pb-6">
                                <span className="flex items-center gap-2 text-[#470102]">
                                    <div className="w-1 h-1 bg-[#470102] rounded-full" /> High ({sensitivityCounts.high})
                                </span>
                                <span className="flex items-center gap-2 text-[#8A5A5A]">
                                    <div className="w-1 h-1 bg-[#8A5A5A] rounded-full" /> Medium ({sensitivityCounts.medium})
                                </span>
                                <span className="text-[#8A5A5A] italic">Sorted by model impact</span>
                            </div>
                        )}

                        <div className="space-y-4">
                            {sortedSchema.map((field) => {
                                const level = getSensitivityLevel(field.name);
                                const config = SENSITIVITY_CONFIG[level];

                                return (
                                    <div
                                        key={field.name}
                                        className={`p-4 md:p-6 rounded-[1.25rem] md:rounded-[2.5rem] border transition-all duration-300 group
                                            ${config.border} border-[#FFEDC1] ${config.bg} ${config.glow} hover:border-[#FEB229]`}
                                    >
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="min-w-0">
                                                <label className="text-xs font-semibold text-[#470102] tracking-tight truncate block mb-1">
                                                    {field.name}
                                                </label>
                                                {level !== 'low' && (
                                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border border-current ${config.badgeText}`}>
                                                        {config.label}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[11px] md:text-xs font-semibold bg-[#FFF7EA] text-[#470102] px-3 py-1 rounded-full border border-[#FFEDC1] shadow-inner">
                                                {field.type === 'numeric' ? Number(features[field.name]).toFixed(2) : features[field.name]}
                                            </span>
                                        </div>

                                        {field.type === 'numeric' ? (
                                            <div className="relative h-6 flex items-center mt-2 group/slider">
                                                <input
                                                    type="range"
                                                    min={field.min}
                                                    max={field.max}
                                                    step={field.step || 0.01}
                                                    value={features[field.name] || field.min}
                                                    onChange={(e) => handleFeatureChange(field.name, Number(e.target.value))}
                                                    className="w-full h-1 bg-[#FFEDC1] rounded-full appearance-none cursor-pointer accent-[#470102]"
                                                    disabled={field.min === field.max}
                                                />
                                                <div className="absolute top-6 left-0 right-0 flex justify-between text-[10px] font-semibold text-[#8A5A5A] opacity-0 group-hover/slider:opacity-100 transition-opacity">
                                                    <span>Min {field.min.toFixed(1)}</span>
                                                    <span>Max {field.max.toFixed(1)}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <select
                                                value={features[field.name] || ''}
                                                onChange={(e) => handleFeatureChange(field.name, e.target.value)}
                                                className="w-full bg-white border border-[#FFEDC1] rounded-2xl px-4 py-3 text-sm font-medium text-[#470102] focus:border-[#FEB229] outline-none"
                                            >
                                                {field.categories.map((cat: string) => (
                                                    <option key={cat} value={cat} className="bg-white">{cat}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </GlassCard>
                </div>

                <div className="lg:col-span-2 space-y-8">
                    <GlassCard className="p-6 md:p-10 rounded-[1.75rem] md:rounded-[3.5rem] relative overflow-hidden bg-white border-[#FFEDC1] group">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-[#FEB229]/10 blur-[100px] rounded-full -mr-40 -mt-40 transition-all duration-700 group-hover:bg-[#FEB229]/20" />

                        <div className="relative z-10">
                            <h3 className="text-xs font-semibold text-[#8A5A5A] uppercase tracking-[0.25em] mb-4">Prediction</h3>
                            <div className="flex items-end gap-4 md:gap-6 mb-4">
                                <span className="text-4xl sm:text-5xl md:text-7xl font-black text-[#470102] tracking-tighter uppercase break-all">
                                    {typeof prediction === 'number' && Number.isInteger(prediction) === false
                                        ? prediction.toFixed(3)
                                        : prediction !== null ? String(prediction) : '---'}
                                </span>
                                {probability !== null && (
                                    <div className="flex flex-col">
                                        <span className="text-xl md:text-2xl font-black text-[#470102] tracking-tighter">
                                            {(probability * 100).toFixed(1)}%
                                        </span>
                                        <span className="text-[10px] font-semibold text-[#8A5A5A] uppercase tracking-wider">Confidence</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-3 text-xs font-semibold text-[#8A5A5A] pt-6 border-t border-[#FFEDC1]">
                                <span className="text-[#470102]">Target:</span>
                                <span className="text-[#470102]">{targetColumn}</span>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-6 md:p-10 rounded-[1.75rem] md:rounded-[3.5rem] border-[#FFEDC1] bg-white">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8 md:mb-10 border-b border-[#FFEDC1] pb-6">
                            <h3 className="text-xl font-bold text-[#470102] tracking-tight flex items-center gap-3">
                                <ChartIcon className="w-6 h-6 text-[#FEB229]" />
                                Feature Contributions
                            </h3>
                            <div className="text-xs font-semibold bg-[#FFF7EA] text-[#8A5A5A] px-6 py-2 rounded-full border border-[#FFEDC1]">
                                Baseline: <span className="font-mono text-[#470102]">{baseValue.toFixed(3)}</span>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {explanations.length === 0 ? (
                                    <div className="text-center py-24">
                                        <div className="w-12 h-12 border-2 border-[#FFEDC1] border-t-[#470102] rounded-full animate-spin mx-auto mb-6" />
                                        <p className="text-sm text-[#8A5A5A] font-semibold italic">Calculating feature contributions...</p>
                                    </div>
                                ) : (
                                    explanations.map((exp, idx) => (
                                        <div key={idx} className="relative group/bar">
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-semibold text-[#470102] tracking-tight">{exp.feature}</span>
                                                    <span className="text-[10px] text-[#8A5A5A] font-semibold bg-[#FFF7EA] px-2 py-0.5 rounded-full border border-[#FFEDC1]">Value: {Number(exp.value).toFixed(2)}</span>
                                                </div>
                                            <div className={`text-xs font-semibold font-mono px-3 py-1 rounded-full ${exp.contribution === 'positive' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-red-500/10 text-red-600 border border-red-600/20'}`}>
                                                {exp.contribution === 'positive' ? '+' : ''}{exp.shap_value.toFixed(3)}
                                            </div>
                                        </div>

                                        <div className="w-full h-1 bg-[#FFEDC1] rounded-full overflow-hidden flex relative group-hover/bar:h-2 transition-all">
                                            <div className="absolute top-0 bottom-0 left-[50%] w-[1px] bg-[#8A5A5A]/20 z-10" />

                                            {exp.contribution === 'positive' ? (
                                                <>
                                                    <div className="w-[50%]" />
                                                    <div
                                                        className="h-full bg-emerald-500 rounded-r-full shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all duration-500"
                                                        style={{ width: `${(Math.abs(exp.shap_value) / maxAbsShap) * 50}%` }}
                                                    />
                                                </>
                                            ) : (
                                                <>
                                                    <div
                                                        className="h-full bg-red-600 rounded-l-full ml-auto shadow-[0_0_10px_rgba(220,38,38,0.3)] transition-all duration-500"
                                                        style={{ width: `${(Math.abs(exp.shap_value) / maxAbsShap) * 50}%` }}
                                                    />
                                                    <div className="w-[50%]" />
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-10 pt-8 border-t border-[#FFEDC1] flex justify-between text-[10px] font-semibold uppercase tracking-wider">
                            <span className="flex items-center gap-3 text-[#470102]">
                                <div className="w-2 h-2 bg-red-600 rounded-full shadow-[0_0_8px_rgba(220,38,38,0.5)]" />
                                Negative Impact
                            </span>
                            <span className="flex items-center gap-3 text-emerald-600">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                Positive Impact
                            </span>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}

const WrenchIcon = (props: any) => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);
