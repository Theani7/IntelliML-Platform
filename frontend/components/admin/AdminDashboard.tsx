'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  adminClearStuckJobs,
  adminClearUserSession,
  adminForceLogout,
  adminResetPassword,
  getAdminAnalytics,
  getAdminAudit,
  getAdminOverview,
  getAdminSystemHealth,
  getAdminUsers,
  setAdminRoleWithReason,
  setAdminUserStatusWithReason,
} from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import SkeletonState from '@/components/ui/SkeletonState';

interface AdminUser {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  is_admin?: boolean;
  created_at?: string;
}

interface AdminDashboardProps {
  currentUsername?: string;
}

type DrillKey = 'users_total' | 'users_active' | 'users_new' | 'experiments_total';

export default function AdminDashboard({ currentUsername }: AdminDashboardProps) {
  const { notify } = useToast();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [audit, setAudit] = useState<any[]>([]);
  const [selectedDrill, setSelectedDrill] = useState<DrillKey>('users_total');

  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const [updatingAdminRoleId, setUpdatingAdminRoleId] = useState<number | null>(null);

  const [actionUserId, setActionUserId] = useState<number | ''>('');
  const [actionReason, setActionReason] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [sessionIdToClear, setSessionIdToClear] = useState('');
  const [runningAction, setRunningAction] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ov, us, an, health, aud] = await Promise.all([
        getAdminOverview(),
        getAdminUsers(),
        getAdminAnalytics(),
        getAdminSystemHealth(),
        getAdminAudit(120),
      ]);
      setOverview(ov);
      setUsers(us as AdminUser[]);
      setAnalytics(an);
      setSystemHealth(health);
      setAudit(aud?.events || []);
    } catch (error: any) {
      notify('error', 'Admin load failed', error?.message || 'Could not load admin dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === actionUserId),
    [users, actionUserId]
  );

  const requireSafeguardReason = (reason: string) => {
    if (reason.trim().length < 5) {
      notify('error', 'Reason required', 'Please provide at least 5 characters as a reason.');
      return false;
    }
    return true;
  };

  const confirmAndRun = async (title: string, fn: () => Promise<void>) => {
    const ok = window.confirm(`${title}\n\nThis action will be logged in admin audit.`);
    if (!ok) return;
    await fn();
  };

  const refreshUsersAndOverview = async () => {
    const [ov, us, aud] = await Promise.all([getAdminOverview(), getAdminUsers(), getAdminAudit(120)]);
    setOverview(ov);
    setUsers(us as AdminUser[]);
    setAudit(aud?.events || []);
  };

  const toggleUserStatus = async (user: AdminUser) => {
    const nextActive = !user.is_active;
    if (!nextActive && !requireSafeguardReason(actionReason)) return;

    await confirmAndRun(
      `${nextActive ? 'Activate' : 'Deactivate'} user @${user.username}?`,
      async () => {
        setUpdatingUserId(user.id);
        try {
          await setAdminUserStatusWithReason(user.id, nextActive, actionReason.trim() || undefined);
          await refreshUsersAndOverview();
          notify('success', 'User status updated', `${user.username} is now ${nextActive ? 'active' : 'inactive'}.`);
        } catch (error: any) {
          notify('error', 'Update failed', error?.message || 'Could not update user status.');
        } finally {
          setUpdatingUserId(null);
        }
      }
    );
  };

  const toggleAdminRole = async (user: AdminUser) => {
    const nextRole = !user.is_admin;
    if (!nextRole && !requireSafeguardReason(actionReason)) return;

    await confirmAndRun(
      `${nextRole ? 'Promote' : 'Demote'} @${user.username} ${nextRole ? 'to' : 'from'} admin?`,
      async () => {
        setUpdatingAdminRoleId(user.id);
        try {
          await setAdminRoleWithReason(user.id, nextRole, actionReason.trim() || undefined);
          await refreshUsersAndOverview();
          notify('success', 'Admin role updated', `${user.username} is now ${nextRole ? 'an admin' : 'a regular user'}.`);
        } catch (error: any) {
          notify('error', 'Role update failed', error?.message || 'Could not update admin role.');
        } finally {
          setUpdatingAdminRoleId(null);
        }
      }
    );
  };

  const runAdminAction = async (actionKey: string, runner: () => Promise<void>) => {
    setRunningAction(actionKey);
    try {
      await runner();
      await loadData();
    } finally {
      setRunningAction(null);
    }
  };

  const seriesMax = (list: any[]) => Math.max(1, ...((list || []).map((item) => item.value || 0)));

  const renderTrend = (title: string, series: any[]) => {
    const max = seriesMax(series || []);
    return (
      <div className="rounded-xl border border-[#FFEDC1] bg-[#FFF7EA] p-4">
        <h4 className="text-xs font-bold text-[#470102] uppercase tracking-wider mb-3">{title}</h4>
        <div className="space-y-2">
          {(series || []).map((point: any) => (
            <div key={point.day} className="flex items-center gap-3">
              <span className="text-[10px] font-semibold text-[#8A5A5A] w-20">{point.day.slice(5)}</span>
              <div className="flex-1 h-2 rounded-full bg-white border border-[#FFEDC1] overflow-hidden">
                <div className="h-full bg-[#FEB229]" style={{ width: `${(point.value / max) * 100}%` }} />
              </div>
              <span className="text-[10px] font-bold text-[#470102] w-7 text-right">{point.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const drillContent = useMemo(() => {
    switch (selectedDrill) {
      case 'users_active':
        return users.filter((u) => u.is_active);
      case 'users_new': {
        const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
        return users.filter((u) => u.created_at && new Date(u.created_at).getTime() >= cutoff);
      }
      case 'experiments_total':
        return overview?.experiments?.latest || [];
      case 'users_total':
      default:
        return users;
    }
  }, [selectedDrill, users, overview]);

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonState rows={5} />
        <SkeletonState rows={7} />
      </div>
    );
  }

  const adminTotal = overview?.admins?.total || 0;
  const adminMax = overview?.admins?.max || 2;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-[#470102] tracking-tight">Admin Operations Center</h2>
          <p className="text-[#8A5A5A] text-sm">Manage users, monitor system health, and run secure admin actions.</p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 rounded-lg border border-[#FFEDC1] bg-white text-[#470102] text-xs font-bold hover:bg-[#FFF7EA]"
        >
          Refresh All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { key: 'users_total' as DrillKey, label: 'Total Users', value: overview?.users?.total ?? 0 },
          { key: 'users_active' as DrillKey, label: 'Active Users', value: overview?.users?.active ?? 0 },
          { key: 'users_new' as DrillKey, label: 'New (7 days)', value: overview?.users?.new_last_7_days ?? 0 },
          { key: 'experiments_total' as DrillKey, label: 'Experiments', value: overview?.experiments?.total ?? 0 },
        ].map((card) => (
          <button
            key={card.key}
            onClick={() => setSelectedDrill(card.key)}
            className={`rounded-xl border p-4 text-left transition-colors ${
              selectedDrill === card.key
                ? 'border-[#470102] bg-[#FFF7EA]'
                : 'border-[#FFEDC1] bg-white hover:bg-[#FFF7EA]'
            }`}
          >
            <p className="text-[10px] uppercase tracking-wider font-bold text-[#8A5A5A]">{card.label}</p>
            <p className="text-2xl font-bold text-[#470102]">{card.value}</p>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-[#FFEDC1] bg-white p-5">
        <h3 className="text-lg font-bold text-[#470102] mb-2">Admin Management</h3>
        <p className="text-sm text-[#8A5A5A]">
          Maximum admins allowed: <span className="font-bold text-[#470102]">{adminTotal}/{adminMax}</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(overview?.admins?.usernames || []).map((username: string) => (
            <span key={username} className="px-3 py-1 rounded-full text-xs font-bold bg-[#FFF7EA] border border-[#FFEDC1] text-[#470102]">
              @{username}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderTrend('Uploads (activity proxy) - 7d', analytics?.uploads_7d || [])}
            {renderTrend('Trainings - 7d', analytics?.trainings_7d || [])}
            {renderTrend('New Users - 7d', analytics?.new_users_7d || [])}
          </div>

          <div className="rounded-2xl border border-[#FFEDC1] bg-white p-5">
            <h3 className="text-lg font-bold text-[#470102] mb-4">KPI Drill-Down</h3>
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {selectedDrill === 'experiments_total' ? (
                (drillContent as any[]).length === 0 ? (
                  <p className="text-sm text-[#8A5A5A]">No experiments available.</p>
                ) : (
                  (drillContent as any[]).map((exp, idx) => (
                    <div key={`${exp.job_id || idx}`} className="rounded-xl border border-[#FFEDC1] bg-[#FFF7EA] p-3">
                      <p className="text-sm font-bold text-[#470102]">{exp.best_model || 'Model'}</p>
                      <p className="text-xs text-[#8A5A5A]">Target: {exp.target_column || 'N/A'} | Score: {exp.score?.toFixed ? exp.score.toFixed(3) : exp.score}</p>
                    </div>
                  ))
                )
              ) : (
                (drillContent as AdminUser[]).map((u) => (
                  <div key={u.id} className="rounded-xl border border-[#FFEDC1] bg-[#FFF7EA] p-3">
                    <p className="text-sm font-bold text-[#470102]">{u.full_name || u.username}</p>
                    <p className="text-xs text-[#8A5A5A]">@{u.username} • {u.email}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[#FFEDC1] bg-white p-5">
            <h3 className="text-lg font-bold text-[#470102] mb-4">User Management</h3>
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {users.map((u) => (
                <div key={u.id} className="rounded-xl border border-[#FFEDC1] bg-[#FFF7EA] p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#470102] truncate">{u.full_name || u.username}</p>
                    <p className="text-xs text-[#8A5A5A] truncate">@{u.username} • {u.email} {u.is_admin ? '• Admin' : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleAdminRole(u)}
                      disabled={
                        updatingAdminRoleId === u.id ||
                        (u.is_admin && u.username === currentUsername) ||
                        (!u.is_admin && adminTotal >= adminMax)
                      }
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                        u.is_admin
                          ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                          : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      {updatingAdminRoleId === u.id ? 'Updating...' : u.is_admin ? 'Remove Admin' : 'Make Admin'}
                    </button>
                    <button
                      onClick={() => toggleUserStatus(u)}
                      disabled={updatingUserId === u.id || u.username === currentUsername}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                        u.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      {updatingUserId === u.id ? 'Updating...' : u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-[#FFEDC1] bg-white p-5">
            <h3 className="text-lg font-bold text-[#470102] mb-3">System Health</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-[#8A5A5A]">Backend</span><span className="font-bold text-emerald-700">{systemHealth?.services?.backend || 'unknown'}</span></div>
              <div className="flex justify-between"><span className="text-[#8A5A5A]">AI Engine</span><span className="font-bold text-[#470102]">{systemHealth?.services?.ai_engine || 'unknown'}</span></div>
              <div className="flex justify-between"><span className="text-[#8A5A5A]">Data Sessions</span><span className="font-bold text-[#470102]">{systemHealth?.runtime?.data_sessions ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-[#8A5A5A]">Chat Sessions</span><span className="font-bold text-[#470102]">{systemHealth?.runtime?.chat_sessions ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-[#8A5A5A]">Jobs In Memory</span><span className="font-bold text-[#470102]">{systemHealth?.runtime?.ml_jobs_in_memory ?? 0}</span></div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#FFEDC1] bg-white p-5 space-y-3">
            <h3 className="text-lg font-bold text-[#470102]">Admin Actions</h3>
            <p className="text-xs text-[#8A5A5A]">Safeguard enabled: destructive actions require reason and confirmation.</p>

            <select
              value={actionUserId}
              onChange={(e) => setActionUserId(e.target.value ? Number(e.target.value) : '')}
              className="w-full rounded-lg border border-[#FFEDC1] bg-[#FFF7EA] px-3 py-2 text-sm text-[#470102]"
            >
              <option value="">Select user</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.username}</option>
              ))}
            </select>

            <input
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="Reason (required for sensitive actions)"
              className="w-full rounded-lg border border-[#FFEDC1] bg-[#FFF7EA] px-3 py-2 text-sm text-[#470102]"
            />

            <input
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
              placeholder="Temporary password (for reset)"
              className="w-full rounded-lg border border-[#FFEDC1] bg-[#FFF7EA] px-3 py-2 text-sm text-[#470102]"
            />

            <input
              value={sessionIdToClear}
              onChange={(e) => setSessionIdToClear(e.target.value)}
              placeholder="Session ID (for clear session)"
              className="w-full rounded-lg border border-[#FFEDC1] bg-[#FFF7EA] px-3 py-2 text-sm text-[#470102]"
            />

            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => {
                  if (!selectedUser) return notify('error', 'Select user', 'Please select a user first.');
                  if (tempPassword.length < 8) return notify('error', 'Invalid password', 'Temporary password must be at least 8 characters.');
                  if (!requireSafeguardReason(actionReason)) return;
                  runAdminAction('reset_password', async () => {
                    await confirmAndRun(`Reset password for @${selectedUser.username}?`, async () => {
                      await adminResetPassword(selectedUser.id, tempPassword, actionReason);
                      notify('success', 'Password reset', `Password updated for ${selectedUser.username}.`);
                    });
                  });
                }}
                disabled={runningAction === 'reset_password'}
                className="w-full px-3 py-2 rounded-lg text-xs font-bold border border-[#FFEDC1] bg-[#FFF7EA] text-[#470102] hover:bg-[#FFEDC1] disabled:opacity-60"
              >
                {runningAction === 'reset_password' ? 'Running...' : 'Reset User Password'}
              </button>

              <button
                onClick={() => {
                  if (!selectedUser) return notify('error', 'Select user', 'Please select a user first.');
                  if (!requireSafeguardReason(actionReason)) return;
                  runAdminAction('force_logout', async () => {
                    await confirmAndRun(`Force logout @${selectedUser.username}?`, async () => {
                      await adminForceLogout(selectedUser.id, actionReason);
                      notify('success', 'User logged out', `${selectedUser.username} was logged out (set inactive).`);
                    });
                  });
                }}
                disabled={runningAction === 'force_logout'}
                className="w-full px-3 py-2 rounded-lg text-xs font-bold border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-60"
              >
                {runningAction === 'force_logout' ? 'Running...' : 'Force Logout User'}
              </button>

              <button
                onClick={() => {
                  if (!sessionIdToClear.trim()) return notify('error', 'Session required', 'Please enter a session ID.');
                  if (!requireSafeguardReason(actionReason)) return;
                  runAdminAction('clear_session', async () => {
                    await confirmAndRun(`Clear session ${sessionIdToClear}?`, async () => {
                      await adminClearUserSession(sessionIdToClear.trim(), actionReason);
                      notify('success', 'Session cleared', `Session ${sessionIdToClear} was cleared.`);
                    });
                  });
                }}
                disabled={runningAction === 'clear_session'}
                className="w-full px-3 py-2 rounded-lg text-xs font-bold border border-[#FFEDC1] bg-[#FFF7EA] text-[#470102] hover:bg-[#FFEDC1] disabled:opacity-60"
              >
                {runningAction === 'clear_session' ? 'Running...' : 'Clear User Session'}
              </button>

              <button
                onClick={() => {
                  if (!requireSafeguardReason(actionReason)) return;
                  runAdminAction('clear_jobs', async () => {
                    await confirmAndRun('Clear potentially stuck jobs?', async () => {
                      const result = await adminClearStuckJobs(actionReason);
                      notify('success', 'Jobs cleared', `${result.removed_jobs || 0} stuck jobs removed.`);
                    });
                  });
                }}
                disabled={runningAction === 'clear_jobs'}
                className="w-full px-3 py-2 rounded-lg text-xs font-bold border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-60"
              >
                {runningAction === 'clear_jobs' ? 'Running...' : 'Clear Stuck Jobs'}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-[#FFEDC1] bg-white p-5">
            <h3 className="text-lg font-bold text-[#470102] mb-3">Audit Log</h3>
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {audit.length === 0 ? (
                <p className="text-sm text-[#8A5A5A]">No audit events yet.</p>
              ) : (
                audit.map((event, idx) => (
                  <div key={idx} className="rounded-lg border border-[#FFEDC1] bg-[#FFF7EA] p-2.5">
                    <p className="text-[11px] font-bold text-[#470102]">{event.action}</p>
                    <p className="text-[10px] text-[#8A5A5A]">{event.actor} → {event.target || '-'}</p>
                    {event.reason && <p className="text-[10px] text-[#8A5A5A] italic">Reason: {event.reason}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
