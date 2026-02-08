'use client';

import { useState, useCallback } from 'react';
import { uploadFile } from '@/lib/api';

interface FileUploaderProps {
  onUploadSuccess?: (data: any) => void;
}

export default function FileUploader({ onUploadSuccess }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);

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
    if (files.length > 0) {
      await handleFileUpload(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileUpload(files[0]);
    }
  }, []);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const result = await uploadFile('/api/upload', file);
      setUploadedFile(file.name);
      
      if (onUploadSuccess) {
        onUploadSuccess(result);
      }
      
    } catch (error: any) {
      setUploadError(error.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center
          transition-all duration-200
          ${isDragging 
            ? 'border-purple-500 bg-purple-50' 
            : 'border-gray-300 bg-white hover:border-purple-400'
          }
          ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
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

        <label htmlFor="file-upload" className="cursor-pointer">
          <div className="text-6xl mb-4">📁</div>
          
          {isUploading ? (
            <div>
              <p className="text-lg font-semibold text-purple-600 mb-2">
                Uploading...
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 max-w-xs mx-auto">
                <div className="bg-purple-600 h-2 rounded-full animate-pulse w-3/4"></div>
              </div>
            </div>
          ) : uploadedFile ? (
            <div>
              <p className="text-lg font-semibold text-green-600 mb-2">
                ✓ {uploadedFile}
              </p>
              <p className="text-sm text-gray-500">
                Click or drag to upload a different file
              </p>
            </div>
          ) : (
            <div>
              <p className="text-lg font-semibold text-gray-700 mb-2">
                Drop your file here or click to browse
              </p>
              <p className="text-sm text-gray-500">
                Supported formats: CSV, Excel (.xlsx, .xls), JSON
              </p>
            </div>
          )}
        </label>
      </div>

      {uploadError && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">⚠️ {uploadError}</p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl mb-1">📊</div>
          <div className="text-xs text-gray-600">CSV Files</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl mb-1">📈</div>
          <div className="text-xs text-gray-600">Excel Files</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl mb-1">📋</div>
          <div className="text-xs text-gray-600">JSON Files</div>
        </div>
      </div>
    </div>
  );
}