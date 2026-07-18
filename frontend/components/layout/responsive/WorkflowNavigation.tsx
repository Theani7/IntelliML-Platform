'use client';

import { ReactNode } from 'react';

interface WorkflowTab {
  id: string;
  label: string;
  icon: ReactNode;
  available: boolean;
}

interface WorkflowNavigationProps {
  tabs: WorkflowTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  unlockedCount: number;
  workflowProgress: number;
  datasetInfo: any;
  showDatasetCard?: boolean;
}

const LockIcon = () => (
  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

export default function WorkflowNavigation({
  tabs,
  activeTab,
  onTabChange,
  unlockedCount,
  workflowProgress,
  datasetInfo,
  showDatasetCard = true,
}: WorkflowNavigationProps) {
  return (
    <>
      {/* Desktop Sidebar - Hidden on mobile/tablet */}
      <aside className="hidden lg:block w-72 shrink-0 p-5 bg-[#FFF7EA] border-r border-[#FFEDC1] sticky top-[80px] h-[calc(100vh-80px)]">
        <div className="h-full rounded-[24px] border border-[#FFEDC1] bg-white shadow-sm p-4 flex flex-col overflow-y-auto">
          <div className="mb-4 px-1">
            <p className="text-[10px] font-black text-[#8A5A5A] uppercase tracking-[0.22em]">Workspace Flow</p>
          </div>

          <nav className="space-y-1.5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => tab.available && onTabChange(tab.id)}
                disabled={!tab.available}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all duration-200 group ${
                  activeTab === tab.id
                    ? 'bg-[#470102] text-[#FFEDC1] border-[#470102] shadow-md shadow-[#470102]/20'
                    : tab.available
                      ? 'bg-white text-[#8A5A5A] border-[#FFEDC1] hover:border-[#FEB229] hover:bg-[#FFF7EA] hover:text-[#470102]'
                      : 'bg-white text-[#8A5A5A]/45 border-[#FFEDC1] cursor-not-allowed'
                }`}
              >
                <div className={`transition-transform duration-200 ${activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {tab.icon}
                </div>
                <span className="font-semibold tracking-wide text-sm">{tab.label}</span>
                {!tab.available && tab.id !== 'upload' && (
                  <span className="ml-auto rounded-md px-1.5 py-0.5 bg-[#FFF7EA] border border-[#FFEDC1] text-[#8A5A5A]/70">
                    <LockIcon />
                  </span>
                )}
                {tab.id === 'upload' && datasetInfo && (
                  <span className="ml-auto text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full p-0.5">
                    <CheckIcon />
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="mt-5 rounded-2xl border border-[#FFEDC1] bg-[#FFF7EA] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8A5A5A]">Progress</span>
              <span className="text-xs font-bold text-[#470102]">{workflowProgress}%</span>
            </div>
            <div className="h-2 rounded-full bg-white border border-[#FFEDC1] overflow-hidden">
              <div className="h-full bg-[#FEB229] transition-all duration-500" style={{ width: `${workflowProgress}%` }} />
            </div>
            <p className="mt-2 text-[11px] text-[#8A5A5A]">{unlockedCount}/{tabs.length} modules unlocked</p>
          </div>

          {datasetInfo && showDatasetCard && (
            <div className="mt-4 p-4 bg-white rounded-2xl border border-[#FFEDC1] shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[#FFF7EA] border border-[#FFEDC1] rounded-xl flex items-center justify-center text-[#470102] font-bold">
                  {datasetInfo.filename?.charAt(0)?.toUpperCase?.() || 'D'}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#470102] truncate">{datasetInfo.filename}</h3>
                  <p className="text-[10px] text-[#8A5A5A] uppercase tracking-wider font-bold">Active Dataset</p>
                </div>
              </div>
              <div className="flex gap-2 text-[10px] font-semibold">
                <span className="px-2 py-1 bg-[#FFF7EA] text-[#470102] rounded-lg border border-[#FFEDC1]">
                  {typeof datasetInfo.rows === 'number' ? datasetInfo.rows.toLocaleString() : (datasetInfo.rows || 0)} rows
                </span>
                <span className="px-2 py-1 bg-[#FFF7EA] text-[#470102] rounded-lg border border-[#FFEDC1]">
                  {Array.isArray(datasetInfo.columns) ? datasetInfo.columns.length : (datasetInfo.columns || 0)} cols
                </span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
