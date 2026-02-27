'use client';

import { useEffect, useMemo, useState } from 'react';
import { changeCurrentPassword, getExperiments, updateCurrentUser } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import SkeletonState from '@/components/ui/SkeletonState';
import {
  DEFAULT_USER_PREFERENCES,
  UserPreferences,
  formatDateWithPreferences,
  getStoredUserPreferences,
  saveUserPreferences,
} from '@/lib/userPreferences';

interface Experiment {
  job_id: string;
  timestamp: string;
  target_column: string;
  best_model: string;
  score: number;
  metric: string;
}

function getInitials(name?: string, username?: string) {
  const source = (name || username || 'U').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function getAvatarGradient(seed: string) {
  const palette = [
    'from-[#470102] to-[#8A5A5A]',
    'from-[#7C2D12] to-[#C2410C]',
    'from-[#1D4D4F] to-[#307B65]',
    'from-[#7F1D1D] to-[#A93434]',
    'from-[#8A5A5A] to-[#470102]',
  ];
  const hash = seed.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

interface AccountSectionProps {
  onLogout?: () => void;
}

export default function AccountSection({ onLogout }: AccountSectionProps) {
  const { user, refreshUser } = useAuth();
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES);
  const [prefsMsg, setPrefsMsg] = useState<string | null>(null);

  useEffect(() => {
    setFullName(user?.full_name || '');
    setEmail(user?.email || '');
  }, [user]);

  useEffect(() => {
    setPreferences(getStoredUserPreferences());
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      setLoadingHistory(true);
      try {
        const data = await getExperiments();
        setExperiments(data as Experiment[]);
      } catch (error) {
        console.error('Failed to load user experiments', error);
      } finally {
        setLoadingHistory(false);
      }
    };
    loadHistory();
  }, []);

  const initials = getInitials(user?.full_name, user?.username);
  const avatarGradient = getAvatarGradient(user?.username || user?.email || 'user');

  const stats = useMemo(() => {
    const total = experiments.length;
    const best = experiments.length ? Math.max(...experiments.map((e) => e.score ?? 0)) : 0;
    const latest = experiments.length ? experiments[0]?.timestamp : null;
    return { total, best, latest };
  }, [experiments]);

  const onSaveProfile = async () => {
    setSavingProfile(true);
    setProfileMsg(null);
    setProfileErr(null);
    try {
      await updateCurrentUser({
        full_name: fullName || undefined,
        email: email || undefined,
      });
      await refreshUser();
      setProfileMsg('Profile updated successfully.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update profile.';
      setProfileErr(message);
    } finally {
      setSavingProfile(false);
    }
  };

  const onChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordMsg(null);
      setPasswordErr('Please fill in all password fields.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMsg(null);
      setPasswordErr('New password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordMsg(null);
      setPasswordErr('New password and confirm password do not match.');
      return;
    }

    setSavingPassword(true);
    setPasswordMsg(null);
    setPasswordErr(null);
    try {
      await changeCurrentPassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordMsg('Password changed successfully.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to change password.';
      setPasswordErr(message);
    } finally {
      setSavingPassword(false);
    }
  };

  const onSavePreferences = () => {
    saveUserPreferences(preferences);
    setPrefsMsg('Personalization preferences saved.');
    window.setTimeout(() => setPrefsMsg(null), 1800);
  };

  const timezoneOptions = useMemo(() => {
    const supported =
      typeof Intl !== 'undefined' && typeof (Intl as any).supportedValuesOf === 'function'
        ? (Intl as any).supportedValuesOf('timeZone') as string[]
        : [];
    return ['local', ...supported.slice(0, 120)];
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-white border border-[#FFEDC1] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${avatarGradient} text-[#FFEDC1] flex items-center justify-center text-xl font-bold shadow-sm`}>
            {initials}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-[#470102]">Account Settings</h2>
            <p className="text-sm text-[#8A5A5A]">Manage your profile, security, and activity.</p>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="px-4 py-2 text-xs font-bold border border-[#FFEDC1] bg-white text-[#470102] rounded-lg transition-all shadow-sm hover:shadow-md"
            >
              Logout
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-5">
          <div className="rounded-xl border border-[#FFEDC1] bg-[#FFF7EA] p-3">
            <p className="text-[10px] uppercase tracking-wider font-bold text-[#8A5A5A]">Experiments</p>
            <p className="text-xl font-bold text-[#470102]">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-[#FFEDC1] bg-[#FFF7EA] p-3">
            <p className="text-[10px] uppercase tracking-wider font-bold text-[#8A5A5A]">Best Score</p>
            <p className="text-xl font-bold text-[#470102]">{stats.best ? stats.best.toFixed(3) : 'N/A'}</p>
          </div>
          <div className="rounded-xl border border-[#FFEDC1] bg-[#FFF7EA] p-3">
            <p className="text-[10px] uppercase tracking-wider font-bold text-[#8A5A5A]">Last Activity</p>
            <p className="text-sm font-semibold text-[#470102]">{stats.latest ? formatDateWithPreferences(stats.latest, preferences) : 'No activity yet'}</p>
          </div>
          <div className="rounded-xl border border-[#FFEDC1] bg-[#FFF7EA] p-3">
            <p className="text-[10px] uppercase tracking-wider font-bold text-[#8A5A5A]">Member Since</p>
            <p className="text-sm font-semibold text-[#470102]">{user?.created_at ? formatDateWithPreferences(user.created_at, preferences) : 'N/A'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#FFEDC1] rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-[#470102]">Profile</h3>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#8A5A5A]">Full name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 w-full rounded-xl border border-[#FFEDC1] bg-[#FFF7EA] px-4 py-3 text-[#470102]" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#8A5A5A]">Username</label>
            <input value={user?.username || ''} disabled className="mt-1 w-full rounded-xl border border-[#FFEDC1] bg-[#FFF7EA] px-4 py-3 text-[#8A5A5A]" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#8A5A5A]">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-[#FFEDC1] bg-[#FFF7EA] px-4 py-3 text-[#470102]" />
          </div>

          {profileMsg && <p className="text-sm text-emerald-700">{profileMsg}</p>}
          {profileErr && <p className="text-sm text-rose-700">{profileErr}</p>}

          <button onClick={onSaveProfile} disabled={savingProfile} className="w-full rounded-xl bg-[#470102] text-[#FFEDC1] py-3 font-bold hover:bg-[#5D0203] disabled:opacity-60">
            {savingProfile ? 'Saving...' : 'Save Profile'}
          </button>
        </div>

        <div className="bg-white border border-[#FFEDC1] rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-[#470102]">Security</h3>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#8A5A5A]">Current password</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-[#FFEDC1] bg-[#FFF7EA] px-4 py-3 text-[#470102]" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#8A5A5A]">New password</label>
            <input
              type="password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#FFEDC1] bg-[#FFF7EA] px-4 py-3 text-[#470102]"
            />
            <p className="mt-1 text-[11px] text-[#8A5A5A]">Use at least 8 characters.</p>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#8A5A5A]">Confirm new password</label>
            <input
              type="password"
              minLength={8}
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#FFEDC1] bg-[#FFF7EA] px-4 py-3 text-[#470102]"
            />
            <p className="mt-1 text-[11px] text-[#8A5A5A]">Use at least 8 characters.</p>
          </div>

          {passwordMsg && <p className="text-sm text-emerald-700">{passwordMsg}</p>}
          {passwordErr && <p className="text-sm text-rose-700">{passwordErr}</p>}

          <button
            onClick={onChangePassword}
            disabled={
              savingPassword ||
              !currentPassword ||
              !newPassword ||
              !confirmNewPassword ||
              newPassword.length < 8 ||
              confirmNewPassword.length < 8 ||
              newPassword !== confirmNewPassword
            }
            className="w-full rounded-xl bg-[#470102] text-[#FFEDC1] py-3 font-bold hover:bg-[#5D0203] disabled:opacity-60"
          >
            {savingPassword ? 'Updating...' : 'Change Password'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#FFEDC1] rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-[#470102]">Personalization</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#8A5A5A]">Timezone</label>
            <select
              value={preferences.timezone}
              onChange={(e) => setPreferences((prev) => ({ ...prev, timezone: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-[#FFEDC1] bg-[#FFF7EA] px-4 py-3 text-[#470102]"
            >
              {timezoneOptions.map((tz) => (
                <option key={tz} value={tz}>
                  {tz === 'local' ? 'Browser local time' : tz}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#8A5A5A]">Date format</label>
            <select
              value={preferences.dateFormat}
              onChange={(e) => setPreferences((prev) => ({ ...prev, dateFormat: e.target.value as UserPreferences['dateFormat'] }))}
              className="mt-1 w-full rounded-xl border border-[#FFEDC1] bg-[#FFF7EA] px-4 py-3 text-[#470102]"
            >
              <option value="locale">Locale (auto)</option>
              <option value="us">US (MM/DD/YYYY)</option>
              <option value="eu">EU (DD/MM/YYYY)</option>
              <option value="iso">ISO</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#8A5A5A]">Default model metric</label>
            <select
              value={preferences.defaultModelMetric}
              onChange={(e) => setPreferences((prev) => ({ ...prev, defaultModelMetric: e.target.value as UserPreferences['defaultModelMetric'] }))}
              className="mt-1 w-full rounded-xl border border-[#FFEDC1] bg-[#FFF7EA] px-4 py-3 text-[#470102]"
            >
              <option value="auto">Auto</option>
              <option value="accuracy">Accuracy</option>
              <option value="f1">F1 Score</option>
              <option value="roc_auc">ROC AUC</option>
              <option value="r2">R2</option>
              <option value="rmse">RMSE</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#8A5A5A]">Default chart density</label>
            <select
              value={preferences.chartDensity}
              onChange={(e) => setPreferences((prev) => ({ ...prev, chartDensity: e.target.value as UserPreferences['chartDensity'] }))}
              className="mt-1 w-full rounded-xl border border-[#FFEDC1] bg-[#FFF7EA] px-4 py-3 text-[#470102]"
            >
              <option value="compact">Compact</option>
              <option value="balanced">Balanced</option>
              <option value="expanded">Expanded</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-[#8A5A5A]">
          These defaults are applied to your dashboard on this browser.
        </p>
        {prefsMsg && <p className="text-sm text-emerald-700">{prefsMsg}</p>}
        <button
          onClick={onSavePreferences}
          className="w-full md:w-auto px-5 py-3 rounded-xl bg-[#470102] text-[#FFEDC1] font-bold hover:bg-[#5D0203]"
        >
          Save Preferences
        </button>
      </div>

      <div className="bg-white border border-[#FFEDC1] rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-[#470102] mb-4">Recent Activity</h3>
        {loadingHistory ? (
          <div className="space-y-3">
            <SkeletonState rows={2} />
            <SkeletonState rows={2} />
            <SkeletonState rows={2} />
          </div>
        ) : experiments.length === 0 ? (
          <p className="text-sm text-[#8A5A5A]">No experiments found for your account yet.</p>
        ) : (
          <div className="space-y-3">
            {experiments.slice(0, 8).map((exp) => (
              <div key={exp.job_id} className="rounded-xl border border-[#FFEDC1] bg-[#FFF7EA] p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[#470102]">{exp.best_model}</p>
                  <p className="text-xs text-[#8A5A5A]">Target: {exp.target_column} | {formatDateWithPreferences(exp.timestamp, preferences)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[#470102]">{exp.score?.toFixed(3)}</p>
                  <p className="text-[10px] uppercase tracking-wider text-[#8A5A5A]">{exp.metric}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
