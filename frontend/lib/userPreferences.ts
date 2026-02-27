'use client';

export type DateFormatPreference = 'locale' | 'us' | 'eu' | 'iso';
export type ModelMetricPreference = 'auto' | 'accuracy' | 'f1' | 'roc_auc' | 'r2' | 'rmse';
export type ChartDensityPreference = 'compact' | 'balanced' | 'expanded';

export interface UserPreferences {
  timezone: string;
  dateFormat: DateFormatPreference;
  defaultModelMetric: ModelMetricPreference;
  chartDensity: ChartDensityPreference;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  timezone: 'local',
  dateFormat: 'locale',
  defaultModelMetric: 'auto',
  chartDensity: 'balanced',
};

const STORAGE_KEY = 'intelliml_user_preferences';

export function getStoredUserPreferences(): UserPreferences {
  if (typeof window === 'undefined') return DEFAULT_USER_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_USER_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return {
      ...DEFAULT_USER_PREFERENCES,
      ...parsed,
    };
  } catch {
    return DEFAULT_USER_PREFERENCES;
  }
}

export function saveUserPreferences(next: UserPreferences) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('intelliml:preferences-updated', { detail: next }));
}

export function chartDensityToMaxCharts(density: ChartDensityPreference): number {
  if (density === 'compact') return 4;
  if (density === 'expanded') return 12;
  return 6;
}

export function maxChartsToDensity(maxCharts: number): ChartDensityPreference {
  if (maxCharts <= 4) return 'compact';
  if (maxCharts >= 12) return 'expanded';
  return 'balanced';
}

export function formatDateWithPreferences(input: string | Date, preferences: UserPreferences): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return 'N/A';

  if (preferences.dateFormat === 'iso') {
    return date.toISOString();
  }

  const timeZone = preferences.timezone === 'local' ? undefined : preferences.timezone;
  const locale =
    preferences.dateFormat === 'us' ? 'en-US' :
    preferences.dateFormat === 'eu' ? 'en-GB' :
    undefined;

  return new Intl.DateTimeFormat(locale, {
    timeZone,
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
