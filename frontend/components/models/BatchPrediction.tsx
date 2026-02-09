'use client';

import { useState, useRef } from 'react';

// Icons
const UploadIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
);

const DownloadIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const CheckCircleIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);

const ErrorIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
);


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
        <div className="bg-[#FFF7EA] rounded-xl border border-[#FFEDC1] p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-white border border-[#FFEDC1] flex items-center justify-center text-[#470102] shadow-sm">
                    <UploadIcon />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-[#470102]">Batch Prediction</h3>
                    <p className="text-xs text-[#8A5A5A]">Upload CSV and get predictions for all rows</p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 px-6 py-2.5 bg-[#470102] hover:bg-[#5D0203] rounded-lg text-[#FFEDC1] text-sm font-bold cursor-pointer transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5">
                    {isUploading ? (
                        <svg className="animate-spin h-4 w-4 text-[#FFEDC1]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <UploadIcon />
                    )}

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

                <div className="h-8 w-px bg-[#FFEDC1]"></div>

                {status === 'success' && (
                    <span className="text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 text-sm flex items-center gap-2 font-medium">
                        <CheckCircleIcon />
                        Downloaded predictions!
                    </span>
                )}
                {status === 'error' && (
                    <span className="text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 text-sm flex items-center gap-2 font-medium">
                        <ErrorIcon />
                        Prediction failed. Check file format.
                    </span>
                )}
                {!status && (
                    <span className="text-xs text-[#8A5A5A] italic">
                        Supports CSV files with same columns as training data.
                    </span>
                )}
            </div>
        </div>
    );
}
