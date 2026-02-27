'use client';

import { useState } from 'react';
import { uploadDataFile } from '@/lib/api';

interface FileUploaderProps {
  onUploadSuccess?: (data: unknown) => void;
}

// --- Icons ---
const CloudUploadIcon = () => (
  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
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
  <svg className="w-10 h-10 animate-spin text-[#470102]" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

// --- Component ---

export default function FileUploader({ onUploadSuccess }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isPreparingPreview, setIsPreparingPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);
  const [columnTypes, setColumnTypes] = useState<Record<string, string>>({});
  const [estimatedRows, setEstimatedRows] = useState(0);
  const [detectedDelimiter, setDetectedDelimiter] = useState(',');
  const [detectedEncoding, setDetectedEncoding] = useState<'utf-8' | 'latin1'>('utf-8');
  const [fixTrimHeaders, setFixTrimHeaders] = useState(true);
  const [fixSnakeCaseHeaders, setFixSnakeCaseHeaders] = useState(false);
  const [fixDropEmptyRows, setFixDropEmptyRows] = useState(true);
  const [progress, setProgress] = useState(0);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) await preparePreview(files[0]);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) await preparePreview(files[0]);
  };

  const parseCsvLine = (line: string, delimiter: string): string[] => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      const next = line[i + 1];

      if (ch === '"' && inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === delimiter && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }

    cells.push(current.trim());
    return cells.map((cell) => cell.replace(/^"(.*)"$/, '$1'));
  };

  const detectDelimiter = (line: string): string => {
    const candidates = [',', ';', '\t', '|'];
    let best = ',';
    let maxCount = -1;
    for (const cand of candidates) {
      const count = line.split(cand).length - 1;
      if (count > maxCount) {
        maxCount = count;
        best = cand;
      }
    }
    return best;
  };

  const inferType = (values: string[]): string => {
    const cleaned = values.map((v) => v.trim()).filter((v) => v !== '');
    if (cleaned.length === 0) return 'empty';
    const numericCount = cleaned.filter((v) => !Number.isNaN(Number(v))).length;
    const dateCount = cleaned.filter((v) => !Number.isNaN(Date.parse(v))).length;
    if (numericCount / cleaned.length > 0.8) return 'numeric';
    if (dateCount / cleaned.length > 0.8) return 'datetime';
    return 'categorical';
  };

  const preparePreview = async (file: File) => {
    setUploadError(null);
    setUploadedFile(null);
    setPreviewRows([]);
    setPreviewColumns([]);
    setColumnTypes({});
    setSelectedFile(null);
    setEstimatedRows(0);

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setUploadError('Preview supports CSV files. Please select a .csv file.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setUploadError('File is too large. Max supported size is 50MB.');
      return;
    }

    setIsPreparingPreview(true);
    try {
      const bytes = await file.arrayBuffer();
      let text = '';
      let encoding: 'utf-8' | 'latin1' = 'utf-8';
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      } catch {
        text = new TextDecoder('latin1').decode(bytes);
        encoding = 'latin1';
      }

      const lines = text
        .split(/\r?\n/)
        .filter((line) => line.trim().length > 0);

      if (lines.length < 1) {
        setUploadError('Selected CSV appears to be empty.');
        return;
      }

      const delimiter = detectDelimiter(lines[0]);
      const headers = parseCsvLine(lines[0], delimiter);
      const rows = lines.slice(1, 6).map((line) => {
        const values = parseCsvLine(line, delimiter);
        const row: Record<string, string> = {};
        headers.forEach((header, idx) => {
          row[header || `column_${idx + 1}`] = values[idx] ?? '';
        });
        return row;
      });

      const inferredTypes: Record<string, string> = {};
      headers.forEach((header, idx) => {
        const colValues = lines.slice(1, Math.min(lines.length, 30)).map((line) => parseCsvLine(line, delimiter)[idx] ?? '');
        inferredTypes[header || `column_${idx + 1}`] = inferType(colValues);
      });

      setPreviewColumns(headers);
      setPreviewRows(rows);
      setColumnTypes(inferredTypes);
      setSelectedFile(file);
      setEstimatedRows(Math.max(lines.length - 1, 0));
      setDetectedDelimiter(delimiter);
      setDetectedEncoding(encoding);
    } catch (error) {
      console.error('Preview generation failed:', error);
      setUploadError('Could not generate preview for this file.');
    } finally {
      setIsPreparingPreview(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError(null);
    setProgress(0);

    // Simulate progress for better UX
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + 10, 90));
    }, 200);

    try {
      let uploadFile = selectedFile;
      if (fixTrimHeaders || fixSnakeCaseHeaders || fixDropEmptyRows) {
        const text = await selectedFile.text();
        const lines = text.split(/\r?\n/);
        const nonEmpty = lines.filter((line) => line.trim().length > 0);
        const delimiter = detectDelimiter(nonEmpty[0] || ',');
        const parsed = nonEmpty.map((line) => parseCsvLine(line, delimiter));
        if (parsed.length > 0) {
          let headers = parsed[0];
          if (fixTrimHeaders) {
            headers = headers.map((h) => h.trim());
          }
          if (fixSnakeCaseHeaders) {
            headers = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''));
          }
          const rows = parsed.slice(1).filter((row) => {
            if (!fixDropEmptyRows) return true;
            return row.some((cell) => cell.trim() !== '');
          });
          const escape = (v: string) => (v.includes(delimiter) || v.includes('"') || v.includes('\n')
            ? `"${v.replace(/"/g, '""')}"`
            : v);
          const csv = [
            headers.map(escape).join(delimiter),
            ...rows.map((r) => r.map((c) => escape(c)).join(delimiter)),
          ].join('\n');
          uploadFile = new File([csv], selectedFile.name, { type: 'text/csv' });
        }
      }

      const result = await uploadDataFile(uploadFile);
      clearInterval(interval);
      setProgress(100);
      setUploadedFile(selectedFile.name);
      setSelectedFile(null);
      setPreviewRows([]);
      setPreviewColumns([]);

      // Slight delay to show 100% before success callback
      setTimeout(() => {
        if (onUploadSuccess) onUploadSuccess(result);
      }, 500);

    } catch (error: unknown) {
      clearInterval(interval);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
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
          accept=".csv"
          onChange={handleFileSelect}
          disabled={isUploading || isPreparingPreview}
        />

        <label htmlFor="file-upload" className="block relative z-10 cursor-pointer">

          {/* Default State */}
          {!isUploading && !uploadedFile && !selectedFile && !isPreparingPreview && (
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
              </div>
            </div>
          )}

          {/* Preparing Preview */}
          {isPreparingPreview && (
            <div className="py-8">
              <div className="mb-6 flex justify-center text-[#470102]"><SpinnerIcon /></div>
              <h3 className="text-xl font-bold text-[#470102] mb-2">Preparing preview...</h3>
              <p className="text-sm text-[#8A5A5A]">Reading first rows from your CSV file</p>
            </div>
          )}

          {/* Preview State */}
          {!isUploading && selectedFile && (
            <div className="space-y-4 text-left">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-[#470102]">Preview before upload</h3>
                  <p className="text-sm text-[#8A5A5A]">{selectedFile.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewRows([]);
                    setPreviewColumns([]);
                  }}
                  className="text-xs font-bold text-[#8A5A5A] hover:text-[#470102]"
                >
                  Choose another file
                </button>
              </div>

              <div className="max-h-64 overflow-auto rounded-xl border border-[#FFEDC1] bg-white">
                <table className="w-full text-xs">
                  <thead className="bg-[#FFF7EA] text-[#470102]">
                    <tr>
                      {previewColumns.map((col) => (
                        <th key={col} className="px-3 py-2 text-left font-bold border-b border-[#FFEDC1]">
                          <div>{col}</div>
                          <div className="text-[10px] text-[#8A5A5A] font-medium normal-case">{columnTypes[col] || 'unknown'}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, index) => (
                      <tr key={index} className="border-b border-[#FFEDC1]/70">
                        {previewColumns.map((col) => (
                          <td key={`${index}-${col}`} className="px-3 py-2 text-[#8A5A5A]">{row[col]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg border border-[#FFEDC1] bg-[#FFF7EA] p-3">
                  <p className="font-bold text-[#470102]">Detected format</p>
                  <p className="text-[#8A5A5A] mt-1">Delimiter: <span className="font-mono">{detectedDelimiter === '\t' ? '\\t' : detectedDelimiter}</span></p>
                  <p className="text-[#8A5A5A]">Encoding: <span className="font-mono">{detectedEncoding}</span></p>
                  <p className="text-[#8A5A5A]">Rows: <span className="font-mono">{estimatedRows}</span> | Columns: <span className="font-mono">{previewColumns.length}</span></p>
                </div>
                <div className="rounded-lg border border-[#FFEDC1] bg-[#FFF7EA] p-3 space-y-1.5">
                  <p className="font-bold text-[#470102]">Quick fixes before upload</p>
                  <label className="flex items-center gap-2 text-[#8A5A5A]"><input type="checkbox" checked={fixTrimHeaders} onChange={(e) => setFixTrimHeaders(e.target.checked)} /> Trim header spaces</label>
                  <label className="flex items-center gap-2 text-[#8A5A5A]"><input type="checkbox" checked={fixSnakeCaseHeaders} onChange={(e) => setFixSnakeCaseHeaders(e.target.checked)} /> Convert headers to snake_case</label>
                  <label className="flex items-center gap-2 text-[#8A5A5A]"><input type="checkbox" checked={fixDropEmptyRows} onChange={(e) => setFixDropEmptyRows(e.target.checked)} /> Remove empty rows</label>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFileUpload}
                className="w-full rounded-xl bg-[#470102] px-4 py-3 text-sm font-bold uppercase tracking-wider text-[#FFEDC1] transition-colors hover:bg-[#5D0203]"
              >
                Upload this dataset
              </button>
            </div>
          )}

          {/* Uploading State */}
          {isUploading && (
            <div className="py-8 animate-pulse">
              <div className="mb-6 flex justify-center text-[var(--primary)]"><SpinnerIcon /></div>
              <h3 className="text-xl font-bold text-[#470102] mb-2">Processing Data...</h3>
              <div className="w-64 mx-auto h-1.5 bg-[#FFEDC1] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#470102] to-[#FEB229] transition-all duration-300"
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
              <h3 className="text-xl font-bold text-[#470102] mb-1">Upload Complete!</h3>
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
