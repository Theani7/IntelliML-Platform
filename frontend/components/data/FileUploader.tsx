'use client';

import { useState, useCallback } from 'react';
import { uploadDataFile } from '@/lib/api';

interface FileUploaderProps {
  onUploadSuccess?: (data: any) => void;
}

// --- Icons ---
const CloudUploadIcon = () => (
  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const FileIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-12 h-12 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="w-10 h-10 animate-spin text-cyan-400" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

// --- Component ---

export default function FileUploader({ onUploadSuccess }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) await handleFileUpload(files[0]);
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) await handleFileUpload(files[0]);
  }, []);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    setProgress(0);

    // Simulate progress for better UX
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + 10, 90));
    }, 200);

    try {
      const result = await uploadDataFile(file);
      clearInterval(interval);
      setProgress(100);
      setUploadedFile(file.name);

      // Slight delay to show 100% before success callback
      setTimeout(() => {
        if (onUploadSuccess) onUploadSuccess(result);
      }, 500);

    } catch (error: any) {
      clearInterval(interval);
      setUploadError(error.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative overflow-hidden group
          rounded-[24px] p-12 text-center
          transition-all duration-500 ease-out
          border-2 border-dashed
          ${isDragging
            ? 'border-[#FEB229] bg-[#FFF7EA] scale-[1.02] shadow-xl shadow-[#FEB229]/10'
            : 'border-[#470102]/20 bg-[#FFF7EA]/50 hover:border-[#FEB229]/50 hover:bg-[#FFF7EA] hover:shadow-xl hover:shadow-[#FEB229]/5'
          }
          ${isUploading ? 'opacity-90 cursor-wait' : 'cursor-pointer'}
        `}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept=".csv,.xlsx,.xls,.json"
          onChange={handleFileSelect}
          disabled={isUploading}
        />

        <label htmlFor="file-upload" className="block relative z-10 cursor-pointer">

          {/* Default State */}
          {!isUploading && !uploadedFile && (
            <div className="space-y-6 animate-fade-in-up">
              <div className={`
                w-24 h-24 mx-auto rounded-full
                bg-[#FFF7EA] border border-[#FFEDC1] shadow-lg shadow-[#FEB229]/10
                flex items-center justify-center 
                text-[#FEB229] group-hover:scale-110
                transition-all duration-500
              `}>
                <CloudUploadIcon />
              </div>

              <div>
                <h3 className="text-2xl font-bold text-[#470102] mb-2">
                  Upload your dataset
                </h3>
                <p className="text-[#8A5A5A] text-lg">
                  Drag & drop or <span className="text-[#FEB229] underline decoration-[#FFEDC1] hover:decoration-[#FEB229] underline-offset-4 transition-all">browse</span>
                </p>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <FileTypeBadge ext="CSV" color="bg-[#FEB229]/10 text-[#470102] border-[#FEB229]/20" />
                <FileTypeBadge ext="Excel" color="bg-emerald-500/10 text-emerald-700 border-emerald-500/20" />
                <FileTypeBadge ext="JSON" color="bg-[#8A5A5A]/10 text-[#470102] border-[#8A5A5A]/20" />
              </div>
            </div>
          )}

          {/* Uploading State */}
          {isUploading && (
            <div className="py-8 animate-pulse">
              <div className="mb-6 flex justify-center text-[var(--primary)]"><SpinnerIcon /></div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Processing Data...</h3>
              <div className="w-64 mx-auto h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Success State */}
          {uploadedFile && !isUploading && (
            <div className="py-4 animate-scale-in">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center text-green-500 border border-green-100 shadow-sm">
                <CheckCircleIcon />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">Upload Complete!</h3>
              <p className="text-green-600 font-mono text-sm bg-green-50 py-1 px-3 rounded-full inline-block border border-green-100">
                {uploadedFile}
              </p>
            </div>
          )}
        </label>
      </div>

      {/* Error Message */}
      {uploadError && (
        <div className="mt-6 mx-auto max-w-md bg-rose-950/30 border border-rose-500/30 rounded-xl p-4 flex items-center gap-3 animate-shake">
          <AlertIcon />
          <span className="text-rose-200 text-sm font-medium">{uploadError}</span>
        </div>
      )}
    </div>
  );
}

function FileTypeBadge({ ext, color }: { ext: string, color: string }) {
  return (
    <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${color} uppercase tracking-wider`}>
      {ext}
    </span>
  );
}