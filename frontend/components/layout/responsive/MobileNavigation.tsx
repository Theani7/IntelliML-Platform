'use client';

import { ReactNode, useState } from 'react';

interface MobileTab {
  id: string;
  label: string;
  icon: ReactNode;
  available: boolean;
}

interface MobileNavigationProps {
  tabs: MobileTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const HomeIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const UploadIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const ChatIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const TrainIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const WrenchIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const AdminIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l8 4v6c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V7l8-4z" />
  </svg>
);

// Map tab IDs to icons
function getTabIcon(tabId: string, isActive: boolean) {
  const className = isActive ? 'w-6 h-6' : 'w-5 h-5';
  switch (tabId) {
    case 'upload':
      return <UploadIcon />;
    case 'chat':
      return <ChatIcon />;
    case 'analyze':
    case 'eda':
      return <ChartIcon />;
    case 'train':
      return <TrainIcon />;
    case 'results':
      return <CheckIcon />;
    case 'simulate':
    case 'cleaning':
    case 'engineering':
      return <SparklesIcon />;
    case 'admin':
      return <AdminIcon />;
    default:
      return <HomeIcon />;
  }
}

export default function MobileNavigation({ tabs, activeTab, onTabChange }: MobileNavigationProps) {
  const [showMore, setShowMore] = useState(false);

  // Primary tabs to always show (first 5 available)
  const primaryTabs = tabs.filter(t => t.available).slice(0, 5);
  const secondaryTabs = tabs.filter(t => t.available).slice(5);

  // If active tab is in secondary, ensure it's in primary view
  const activeInPrimary = primaryTabs.some(t => t.id === activeTab);
  const displayTabs = activeInPrimary ? primaryTabs : (tabs.find(t => t.id === activeTab) ? [tabs.find(t => t.id === activeTab)!, ...primaryTabs.slice(0, 4)] : primaryTabs);

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#FFEDC1] safe-bottom">
        {/* Main Tab Bar */}
        <div className="flex items-center justify-around px-2 py-2">
          {displayTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  flex flex-col items-center justify-center tap-target px-3 py-1 rounded-xl transition-all duration-200 min-w-[60px]
                  ${isActive
                    ? 'text-[#470102] bg-[#FFF7EA]'
                    : 'text-[#8A5A5A] hover:text-[#470102] hover:bg-[#FFF7EA]/50'
                  }
                `}
              >
                <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'scale-100'}`}>
                  {getTabIcon(tab.id, isActive)}
                </span>
                <span className={`text-[10px] mt-1 font-semibold truncate max-w-[60px] ${isActive ? 'font-bold' : ''}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* More Button if there are more tabs */}
          {secondaryTabs.length > 0 && (
            <button
              onClick={() => setShowMore(!showMore)}
              className={`
                flex flex-col items-center justify-center tap-target px-3 py-1 rounded-xl transition-all duration-200 min-w-[60px]
                ${showMore
                  ? 'text-[#470102] bg-[#FFF7EA]'
                  : 'text-[#8A5A5A] hover:text-[#470102] hover:bg-[#FFF7EA]/50'
                }
              `}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="text-[10px] mt-1 font-semibold">More</span>
            </button>
          )}
        </div>
      </nav>

      {/* More Tabs Dropdown Overlay */}
      {showMore && secondaryTabs.length > 0 && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/20 z-40"
            onClick={() => setShowMore(false)}
          />
          <div className="md:hidden fixed bottom-[72px] left-4 right-4 z-50 animate-slide-up">
            <div className="bg-white rounded-2xl shadow-2xl border border-[#FFEDC1] overflow-hidden">
              <div className="p-3 border-b border-[#FFEDC1] bg-[#FFF7EA]">
                <p className="text-xs font-bold text-[#8A5A5A] text-center uppercase tracking-wider">More Options</p>
              </div>
              <div className="max-h-[50vh] overflow-y-auto hide-scrollbar py-2">
                {secondaryTabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        onTabChange(tab.id);
                        setShowMore(false);
                      }}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3 transition-colors
                        ${isActive
                          ? 'bg-[#FFF7EA] text-[#470102]'
                          : 'text-[#8A5A5A] hover:bg-[#FFF7EA]/50'
                        }
                      `}
                    >
                      <span className={`${isActive ? 'text-[#470102]' : 'text-[#8A5A5A]'}`}>
                        {getTabIcon(tab.id, false)}
                      </span>
                      <span className="font-semibold text-sm">{tab.label}</span>
                      {isActive && (
                        <svg className="w-5 h-5 ml-auto text-[#470102]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Bottom padding for content to not be hidden behind nav */}
      <div className="md:hidden h-16" />
    </>
  );
}