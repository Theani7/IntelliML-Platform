'use client';

import { useState, useRef } from 'react';

interface BatchPredictionProps {
    jobId: string | null;
}

export default function BatchPrediction({ jobId }: BatchPredictionProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !jobId) return;

        setIsUploading(true);
        setStatus(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`http://localhost:8000/api/models/predict-batch/${jobId}`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Batch prediction failed');
            }

            // Download the result
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `predictions_${jobId}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();

            setStatus('success');
        } catch (error) {
            console.error('Batch prediction failed:', error);
            setStatus('error');
        }
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    if (!jobId) {
        return null;
    }

    return (
        <div className="bg-slate-900 rounded-xl border border-white/5 p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Batch Prediction</h3>
                    <p className="text-xs text-gray-500">Upload CSV and get predictions for all rows</p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white text-sm font-medium cursor-pointer transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {isUploading ? 'Processing...' : 'Upload CSV for Prediction'}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        className="hidden"
                    />
                </label>

                {status === 'success' && (
                    <span className="text-emerald-400 text-sm flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Downloaded predictions!
                    </span>
                )}
                {status === 'error' && (
                    <span className="text-rose-400 text-sm">
                        Prediction failed. Check file format.
                    </span>
                )}
            </div>

            <p className="text-xs text-gray-500 mt-3">
                Upload a CSV with the same columns as your training data. Results will download automatically.
            </p>
        </div>
    );
}
