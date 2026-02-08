/**
 * API Client for IntelliML Backend
 * Production-ready with comprehensive error handling
 */

function getApiBaseUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // In the browser, use the same host as the frontend to avoid 127.0.0.1 mismatches.
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    // Avoid IPv6 localhost resolution issues by forcing IPv4.
    const resolvedHost = hostname === 'localhost' ? '127.0.0.1' : hostname;
    return `${protocol}//${resolvedHost}:8000`;
  }

  // Server-side fallback
  return 'http://127.0.0.1:8000';
}

const API_BASE_URL = getApiBaseUrl();

// Custom error class for better error handling
export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Generic API call function for JSON requests
 */
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  console.log(`[API] ${options.method || 'GET'} ${url}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || errorData.error || `API Error: ${response.status} ${response.statusText}`;

      // Suppress 404 errors from console.error as they are often handled by the UI (session expiry)
      if (response.status !== 404) {
        console.error(`[API Error] ${response.status}:`, errorMessage);
      } else {
        console.warn(`[API Info] ${response.status}:`, errorMessage);
      }

      throw new APIError(
        errorMessage,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    console.log(`[API Success] ${endpoint}`, data);
    return data;
  } catch (error) {
    if (error instanceof APIError) throw error;
    console.error('[API] Network error:', error);
    throw new APIError('Network error or server unavailable');
  }
}

/**
 * File upload with robust error handling and validation
 */
export async function uploadFile<T>(
  endpoint: string,
  file: Blob,
  fieldName: string = 'audio',
  fileName?: string
): Promise<T> {
  // Validate input
  if (!file) {
    throw new APIError('No file provided');
  }

  if (file.size === 0) {
    throw new APIError('File is empty');
  }

  // Set default filename based on blob type
  const defaultFileName = fileName || `recording.${getExtensionFromMimeType(file.type)}`;

  const url = `${API_BASE_URL}${endpoint}`;
  const formData = new FormData();
  formData.append(fieldName, file, defaultFileName);

  console.log(`[API] Uploading to ${url}`, {
    fieldName,
    fileName: defaultFileName,
    size: file.size,
    type: file.type
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type - browser handles multipart/form-data boundary
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Upload failed';
      let errorDetails;

      try {
        const errorJson = JSON.parse(errorText);

        // Handle FastAPI validation errors
        if (errorJson.detail) {
          if (Array.isArray(errorJson.detail)) {
            // Validation error array
            errorMessage = errorJson.detail
              .map((err: any) => `${err.loc?.join('.')}: ${err.msg}`)
              .join('; ');
            errorDetails = errorJson.detail;
          } else if (typeof errorJson.detail === 'string') {
            // Simple error message
            errorMessage = errorJson.detail;
          }
        } else if (errorJson.error) {
          errorMessage = errorJson.error;
        }
      } catch {
        // If JSON parsing fails, use the raw text
        errorMessage = errorText.substring(0, 200); // Limit length
      }

      console.error(`[API Upload Error] ${response.status}:`, errorMessage);
      throw new APIError(errorMessage, response.status, errorDetails);
    }

    const data = await response.json();
    console.log(`[API Upload Success]`, data);
    return data;

  } catch (error) {
    if (error instanceof APIError) throw error;
    console.error('[API Upload] Network error:', error);
    throw new APIError('Network error or server unavailable');
  }
}

/**
 * Helper: Get file extension from MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
  const mimeMap: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'text/csv': 'csv',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  };

  return mimeMap[mimeType] || 'webm';
}

/**
 * Health check - test if backend is running
 */
export async function checkBackendHealth() {
  try {
    return await apiCall<{ message: string; version: string; status: string }>('/health');
  } catch (error) {
    console.error('[Health Check] Failed:', error);
    throw error;
  }
}

/**
 * Test Groq API connection
 */
export async function testGroqConnection() {
  return apiCall<{ status: string; message: string; response: string }>(
    '/test-groq'
  );
}

/**
 * Upload audio file for transcription
 */
export async function transcribeAudio(
  audioBlob: Blob
): Promise<{ text: string; success: boolean }> {
  return uploadFile<{ text: string; success: boolean }>(
    '/api/voice/transcribe',
    audioBlob,
    'audio'
  );
}

/**
 * Process voice command (transcribe + understand intent)
 */
export async function processVoiceCommand(
  audioBlob: Blob
): Promise<{
  transcription: string;
  intent: any;
  success: boolean;
}> {
  return uploadFile<{
    transcription: string;
    intent: any;
    success: boolean;
  }>(
    '/api/voice/process',
    audioBlob,
    'audio'
  );
}

/**
 * Upload data file (CSV, Excel, etc.)
 */
export async function uploadDataFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  // Get URL at request time to ensure correct browser context
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/data/upload`;

  console.log(`[API] Uploading data file to ${url}`, {
    name: file.name,
    size: file.size,
    type: file.type,
    baseUrl: baseUrl
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || errorData.error || 'File upload failed';

      console.error(`[API Upload Error] ${response.status}:`, errorMessage);

      throw new APIError(
        errorMessage,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    console.log('[API Upload Success]', data);
    return data;
  } catch (error) {
    if (error instanceof APIError) throw error;
    console.error('[API Upload] Network error:', error);
    throw new APIError('Network error or server unavailable');
  }
}

/**
 * Get current dataset info
 */
export async function getDatasetInfo() {
  return apiCall<any>('/api/data/info');
}

/**
 * Get dataset columns
 */
export async function getDatasetColumns() {
  return apiCall<{ columns: string[] }>('/api/data/columns');
}

/**
 * Get data quality analysis
 */
export async function getDataQuality() {
  return apiCall<any>('/api/data/quality');
}

/**
 * Clean data
 */
export async function cleanData(operation: string, params: any = {}) {
  return apiCall<any>('/api/data/clean', {
    method: 'POST',
    body: JSON.stringify({ operation, params }),
  });
}

/**
 * Analyze dataset
 */
export async function analyzeData() {
  return apiCall<any>('/api/data/analyze', {
    method: 'GET',
  });
}



/**
 * Train models
 */
export async function trainModels(
  targetColumn: string,
  modelTypes?: string[],
  testSize: number = 0.2,
  cvFolds: number = 5,
  enableTuning: boolean = false
) {
  return apiCall<any>('/api/models/train', {
    method: 'POST',
    body: JSON.stringify({
      target_column: targetColumn,
      model_types: modelTypes,
      test_size: testSize,
      cv_folds: cvFolds,
      enable_tuning: enableTuning
    }),
  });
}

/**
 * Get training status (if you have a separate endpoint)
 */
export async function getTrainingStatus(jobId: string) {
  return apiCall<any>(`/api/models/status/${jobId}`);
}

/**
 * Get model results (if you have a separate endpoint)
 */
export async function getModelResults(jobId: string) {
  return apiCall<any>(`/api/models/results/${jobId}`);
}

/**
 * Get SHAP explanations
 */
export async function getExplanations(jobId: string, modelName?: string) {
  const endpoint = modelName
    ? `/api/data/explain/${jobId}?model=${modelName}`
    : `/api/data/explain/${jobId}`;

  return apiCall<any>(endpoint);
}

/**
 * Download EDA Report
 */
export async function downloadReport() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/data/report`, {
      method: 'GET',
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('No dataset loaded. Please upload a file first.');
      }
      throw new Error('Failed to download report');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'eda_report.pdf';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error: any) {
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      throw new Error('Unable to connect to server. The backend might be restarting.');
    }
    throw error;
  }
}

/**
 * Test data endpoint
 */
export async function testData() {
  return apiCall<any>('/api/data/test-data');
}

// ============================================
// AI Data Chat API
// ============================================

export interface ChatResponse {
  text: string;
  code: string | null;
  output: string | null;
  visualization: string | null;
  error: boolean;
}

export interface VisualizationSuggestion {
  type: string;
  title: string;
  description: string;
  code: string;
}

/**
 * Send a message to the AI data assistant
 */
export async function sendChatMessage(message: string): Promise<ChatResponse> {
  return apiCall<ChatResponse>('/api/chat/message', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

/**
 * Get AI-suggested visualizations based on the dataset
 */
export async function getVisualizationSuggestions(): Promise<{ suggestions: VisualizationSuggestion[] }> {
  return apiCall<{ suggestions: VisualizationSuggestion[] }>('/api/chat/suggestions');
}

/**
 * Clear chat history
 */
export async function clearChatHistory(): Promise<void> {
  return apiCall<void>('/api/chat/clear', { method: 'POST' });
}
