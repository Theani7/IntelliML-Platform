'use client';

import { CheckIcon, LockIcon } from '@/components/icons/Icons';

type MainTab = 'upload' | 'chat' | 'analyze' | 'train' | 'results' | 'simulate' | 'cleaning' | 'engineering' | 'history';

interface TabItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    available: boolean;
}

interface SidebarProps {
    mainTabs: TabItem[];
    activeTab: MainTab;
    setActiveTab: (tab: MainTab) => void;
    datasetInfo: any;
}

export default function Sidebar({ mainTabs, activeTab, setActiveTab, datasetInfo }: SidebarProps) {
    return (
        <aside className="w-72 min-h-[calc(100vh-100px)] p-6 flex flex-col z-10">
            <div className="bg-white/5 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-4 h-full flex flex-col shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 blur-3xl pointer-events-none"></div>

                {/* Main Workflow Steps */}
                <nav className="space-y-1 relative z-10">
                    <p className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-4 px-4">Workspace Flow</p>
                    {mainTabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => tab.available && setActiveTab(tab.id as MainTab)}
                            disabled={!tab.available}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group relative ${activeTab === tab.id
                                ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                                : tab.available
                                    ? 'text-neutral-400 hover:bg-white/5 hover:text-white'
                                    : 'text-neutral-600 cursor-not-allowed opacity-40'
                                }`}
                        >
                            <div className={`transition-transform duration-300 ${activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                                {tab.icon}
                            </div>
                            <span className="font-bold tracking-tight text-sm">{tab.label}</span>
                            {!tab.available && tab.id !== 'upload' && (
                                <LockIcon className="ml-auto w-3 h-3" />
                            )}
                            {tab.id === 'upload' && datasetInfo && (
                                <CheckIcon className="ml-auto w-4 h-4 text-emerald-500" />
                            )}
                        </button>
                    ))}
                </nav>

                {datasetInfo && (
                    <div className="mt-auto pt-6 px-2 relative z-10">
                        <div className="p-5 bg-gradient-to-br from-red-600/10 to-transparent border border-white/5 rounded-3xl group hover:border-red-600/20 transition-all">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-red-600 flex items-center justify-center rounded-2xl text-white font-black text-lg">
                                    {datasetInfo.filename.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-black text-white truncate">{datasetInfo.filename}</h3>
                                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-black">Active Data</p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <div className="flex-1 px-2 py-2 bg-black/40 border border-white/5 rounded-xl text-center">
                                    <p className="text-[10px] font-black text-red-500">
                                        {typeof datasetInfo.rows === 'number' ? datasetInfo.rows.toLocaleString() : (datasetInfo.rows || 0)}
                                    </p>
                                    <p className="text-[8px] text-neutral-500 uppercase">Rows</p>
                                </div>
                                <div className="flex-1 px-2 py-2 bg-black/40 border border-white/5 rounded-xl text-center">
                                    <p className="text-[10px] font-black text-red-500">
                                        {Array.isArray(datasetInfo.columns) ? datasetInfo.columns.length : (datasetInfo.columns || 0)}
                                    </p>
                                    <p className="text-[8px] text-neutral-500 uppercase">Cols</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}
