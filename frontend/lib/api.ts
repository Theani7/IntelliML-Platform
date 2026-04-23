/**
 * API Client for IntelliML Backend
 * Production-ready with comprehensive error handling
 */

export function getApiBaseUrl() {
  // Always use same-origin Next.js proxy to avoid browser CORS/network issues.
  return '/api/proxy';
}

const API_BASE_URL = getApiBaseUrl();
const API_KEY = process.env.NEXT_PUBLIC_INTELLIML_API_KEY;

function getSessionId(): string {
  if (typeof window === 'undefined') return 'default';

  const existing = localStorage.getItem('intelliml_session_id');
  if (existing) return existing;

  const generated = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem('intelliml_session_id', generated);
  return generated;
}

function withSession(endpoint: string): string {
  const sessionId = getSessionId();
  const separator = endpoint.includes('?') ? '&' : '?';
  return `${endpoint}${separator}session_id=${encodeURIComponent(sessionId)}`;
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  }

  if (API_KEY) {
    return { 'X-API-Key': API_KEY };
  }

  return {};
}

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
  const endpointWithSession = withSession(endpoint);
  const url = `${API_BASE_URL}${endpointWithSession}`;

  console.log(`[API] ${options.method || 'GET'} ${url}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || errorData.error || `API Error: ${response.status} ${response.statusText}`;

      // Treat client-side validation/auth errors as handled UI states.
      // Keep console.error for server-side failures only.
      if (response.status >= 500) {
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

  const endpointWithSession = withSession(endpoint);
  const url = `${API_BASE_URL}${endpointWithSession}`;
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
      headers: {
        ...getAuthHeaders(),
      },
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
  try {
    return await apiCall<{ status: string; message: string; response: string }>(
      '/test-groq'
    );
  } catch (error) {
    // Return unavailable status instead of throwing
    return {
      status: 'unavailable',
      message: 'Groq API not configured',
      response: null
    };
  }
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
  const url = `${baseUrl}${withSession('/api/data/upload')}`;

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
      headers: {
        ...getAuthHeaders(),
      },
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
  optimizationMetric?: string,
  testSize: number = 0.2,
  cvFolds: number = 5,
  enableTuning: boolean = false
) {
  return apiCall<any>('/api/models/train', {
    method: 'POST',
    body: JSON.stringify({
      target_column: targetColumn,
      model_types: modelTypes,
      optimization_metric: optimizationMetric,
      test_size: testSize,
      cv_folds: cvFolds,
      enable_tuning: enableTuning
    }),
  });
}

/**
 * Get simulation schema for a trained job
 */
export async function getSimulationSchema(jobId: string) {
  return apiCall<any>(`/api/data/simulate/schema/${jobId}`);
}

/**
 * Run what-if simulation prediction
 */
export async function runSimulation(jobId: string, features: Record<string, any>) {
  return apiCall<any>(`/api/data/simulate/predict/${jobId}`, {
    method: 'POST',
    body: JSON.stringify({ features }),
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
 * Get list of experiments
 */
export async function getExperiments() {
  return apiCall<any[]>('/api/models/experiments');
}

export async function getCurrentUser() {
  return apiCall<any>('/api/auth/me');
}

export async function updateCurrentUser(payload: { email?: string; full_name?: string }) {
  return apiCall<any>('/api/auth/me', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function changeCurrentPassword(currentPassword: string, newPassword: string) {
  return apiCall<{ message: string }>('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}


/**
 * Get SHAP explanations
 */
export async function getExplanations(jobId: string, modelName?: string) {
  const endpoint = modelName
    ? `/api/data/explain/${jobId}?model=${modelName}`
    : `/api/data/explain/${jobId}`;
  const raw = await apiCall<any>(endpoint);

  // If already has shap_results with feature_importance, return as-is
  if (raw?.shap_results?.feature_importance) {
    return raw;
  }

  // If feature_importance is already an array, just add shap_results wrapper and return
  if (raw?.feature_importance && Array.isArray(raw.feature_importance)) {
    return {
      ...raw,
      shap_results: {
        feature_importance: raw.feature_importance,
        plots: {},
      },
      explanation: raw.explanation || 'Feature importance generated from the trained model.',
      model_name: raw.model_name || 'best_model',
      status: raw.status || 'success',
    };
  }

  // If feature_importance is a plain object (dict format), normalize it
  if (raw?.feature_importance && typeof raw.feature_importance === 'object' && !Array.isArray(raw.feature_importance)) {
    const normalized = Object.entries(raw.feature_importance)
      .map(([feature, importance]) => ({
        feature,
        importance: Number(importance) || 0,
      }))
      .sort((a, b) => b.importance - a.importance);

    return {
      ...raw,
      shap_results: {
        feature_importance: normalized,
        plots: raw.plots || {},
        fallback: true,
      },
      explanation: raw.explanation || 'Feature importance generated from the trained model.',
      model_name: raw.model_name || 'best_model',
      status: raw.status || 'success',
    };
  }

  return raw;
}

/**
 * Download EDA Report
 */
export async function downloadReport() {
  try {
    const response = await fetch(`${API_BASE_URL}${withSession('/api/data/report')}`, {
      method: 'GET',
      headers: {
        ...getAuthHeaders(),
      },
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

export async function detectOutliers(method: 'iqr' | 'zscore', threshold: number) {
  return apiCall<{
    method: string;
    threshold: number;
    total_outlier_rows: number;
    columns_analyzed: number;
    details: Array<{ column: string; outlier_count: number; percentage: number; sample_values: number[] }>;
  }>('/api/data/outliers/detect', {
    method: 'POST',
    body: JSON.stringify({ method, threshold }),
  });
}

export async function removeOutliers(method: 'iqr' | 'zscore', threshold: number) {
  return apiCall<{
    status: string;
    original_rows: number;
    removed_rows: number;
    remaining_rows: number;
    columns_processed: string[];
  }>('/api/data/outliers/remove', {
    method: 'POST',
    body: JSON.stringify({ method, threshold }),
  });
}

export async function engineerFeatures(
  operation: string,
  columns: string[],
  params: Record<string, unknown> = {}
) {
  return apiCall<any>('/api/data/engineer', {
    method: 'POST',
    body: JSON.stringify({ operation, columns, params }),
  });
}

export async function runSinglePrediction(jobId: string, features: number[]) {
  return apiCall<any>(`/api/models/predict/${jobId}`, {
    method: 'POST',
    body: JSON.stringify({ features }),
  });
}

export async function explainSinglePrediction(jobId: string, features: number[]) {
  return apiCall<any>(`/api/models/explain/${jobId}`, {
    method: 'POST',
    body: JSON.stringify({ features }),
  });
}

export function getModelExportUrl(jobId: string): string {
  return `${API_BASE_URL}${withSession(`/api/models/export/${jobId}`)}`;
}

export function getBatchPredictionUrl(jobId: string): string {
  return `${API_BASE_URL}${withSession(`/api/models/predict-batch/${jobId}`)}`;
}

export function getAuthHeadersForRequest(): Record<string, string> {
  return getAuthHeaders();
}

export async function downloadModelExport(jobId: string, fileName?: string) {
  const response = await fetch(getModelExportUrl(jobId), {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new APIError(errorData.detail || 'Failed to download model', response.status, errorData);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || `model_${jobId}.joblib`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Test data endpoint
 */
export async function testData() {
  return apiCall<any>('/api/data/test-data');
}

export async function resetSessionData() {
  return apiCall<{ status: string; message: string }>('/api/data/reset', {
    method: 'POST',
  });
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

export async function getAdminOverview() {
  return apiCall<any>('/api/admin/overview');
}

export async function getAdminUsers() {
  return apiCall<any[]>('/api/admin/users');
}

export async function setAdminUserStatus(userId: number, isActive: boolean) {
  return apiCall<any>(`/api/admin/users/${userId}/status`, {
    method: 'POST',
    body: JSON.stringify({ is_active: isActive }),
  });
}

export async function setAdminRole(userId: number, isAdmin: boolean) {
  return apiCall<any>(`/api/admin/users/${userId}/admin-role`, {
    method: 'POST',
    body: JSON.stringify({ is_admin: isAdmin }),
  });
}

export async function setAdminRoleWithReason(userId: number, isAdmin: boolean, reason?: string) {
  return apiCall<any>(`/api/admin/users/${userId}/admin-role`, {
    method: 'POST',
    body: JSON.stringify({ is_admin: isAdmin, reason }),
  });
}

export async function setAdminUserStatusWithReason(userId: number, isActive: boolean, reason?: string) {
  return apiCall<any>(`/api/admin/users/${userId}/status`, {
    method: 'POST',
    body: JSON.stringify({ is_active: isActive, reason }),
  });
}

export async function getAdminAnalytics() {
  return apiCall<any>('/api/admin/analytics');
}

export async function getAdminSystemHealth() {
  return apiCall<any>('/api/admin/system-health');
}

export async function getAdminAudit(limit: number = 200) {
  return apiCall<any>(`/api/admin/audit?limit=${limit}`);
}

export async function adminResetPassword(userId: number, newPassword: string, reason: string) {
  return apiCall<any>('/api/admin/actions/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      new_password: newPassword,
      reason,
    }),
  });
}

export async function adminForceLogout(userId: number, reason: string) {
  return apiCall<any>('/api/admin/actions/force-logout', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      reason,
    }),
  });
}

export async function adminClearUserSession(sessionId: string, reason: string) {
  return apiCall<any>('/api/admin/actions/clear-user-session', {
    method: 'POST',
    body: JSON.stringify({
      session_id: sessionId,
      reason,
    }),
  });
}

export async function adminClearStuckJobs(reason: string) {
  return apiCall<any>('/api/admin/actions/clear-stuck-jobs', {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
