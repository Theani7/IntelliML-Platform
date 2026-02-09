'use client';

import { useState, useEffect } from 'react';
import { getExperiments } from '@/lib/api';

interface Experiment {
    job_id: string;
    timestamp: string;
    target_column: string;
    problem_type: string;
    best_model: string;
    score: number;
    metric: string;
    models_trained: number;
}

const ClockIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const HistoryIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const DownloadIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);


export default function ExperimentLeaderboard() {
    const [experiments, setExperiments] = useState<Experiment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadExperiments();
    }, []);

    const loadExperiments = async () => {
        try {
            const data = await getExperiments();
            setExperiments(data);
        } catch (error) {
            console.error("Failed to load experiments", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center p-12 text-[#8A5A5A]">
            <div className="animate-spin mr-3">
                <HistoryIcon />
            </div>
            Loading history...
        </div>
    );

    if (experiments.length === 0) {
        return (
            <div className="bg-[#FFF7EA] border border-[#FFEDC1] rounded-xl p-8 text-center shadow-sm">
                <div className="w-12 h-12 bg-[#FEB229]/20 rounded-xl flex items-center justify-center mx-auto mb-4 text-[#470102]">
                    <HistoryIcon />
                </div>
                <h3 className="text-lg font-bold text-[#470102] mb-2">No Past Experiments</h3>
                <p className="text-[#8A5A5A]">Train a model to see your experiment history here!</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-[#FFEDC1] shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#FFF7EA] rounded-lg flex items-center justify-center text-[#470102] border border-[#FFEDC1]">
                        <ClockIcon />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-[#470102]">Experiment History</h3>
                        <p className="text-xs text-[#8A5A5A]">Track your model training progress over time</p>
                    </div>
                </div>
                <button
                    onClick={loadExperiments}
                    className="text-sm text-[#470102] hover:text-[#FEB229] font-medium transition-colors flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[#FFF7EA]"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                </button>
            </div>

            <div className="bg-white rounded-xl border border-[#FFEDC1] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#FFF7EA] border-b border-[#FFEDC1]">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-[#8A5A5A] uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-xs font-bold text-[#8A5A5A] uppercase tracking-wider">Target</th>
                                <th className="px-6 py-4 text-xs font-bold text-[#8A5A5A] uppercase tracking-wider">Best Model</th>
                                <th className="px-6 py-4 text-xs font-bold text-[#8A5A5A] uppercase tracking-wider">Score</th>
                                <th className="px-6 py-4 text-xs font-bold text-[#8A5A5A] uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#FFEDC1]">
                            {experiments.map((exp) => (
                                <tr key={exp.job_id} className="hover:bg-[#FFF7EA]/50 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-[#470102]">{new Date(exp.timestamp).toLocaleDateString()}</div>
                                        <div className="text-xs text-[#8A5A5A]">
                                            {new Date(exp.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="bg-[#FFF7EA] text-[#470102] px-2 py-1 rounded text-xs font-medium border border-[#FFEDC1]">
                                            {exp.target_column}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-[#470102] flex items-center gap-2">
                                            {exp.best_model}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${exp.score > 0.8 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                    exp.score > 0.5 ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                        'bg-rose-50 text-rose-700 border-rose-100'
                                                }`}>
                                                {exp.score.toFixed(3)}
                                            </span>
                                            <span className="text-[10px] text-[#8A5A5A] uppercase font-bold tracking-wider">{exp.metric}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <a
                                            href={`http://localhost:8000/api/models/export/${exp.job_id}`}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#FFEDC1] hover:border-[#FEB229] rounded-lg text-xs font-bold text-[#470102] transition-colors shadow-sm hover:shadow"
                                            download
                                        >
                                            <DownloadIcon />
                                            Download
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
