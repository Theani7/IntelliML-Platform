'use client';

import { ReactNode, useState } from 'react';
import { 
  UploadIcon, 
  ChatIcon, 
  ChartIcon, 
  BrainIcon, 
  CheckIcon, 
  SparklesIcon
} from '@/components/icons/Icons';

// Re-define local icons if they aren't in the library
const LocalHomeIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const LocalMenuIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

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

// Map tab IDs to icons
function getTabIcon(tabId: string, isActive: boolean) {
  const className = isActive ? 'w-6 h-6' : 'w-5 h-5';
  switch (tabId) {
    case 'upload':
      return <UploadIcon className={className} />;
    case 'chat':
      return <ChatIcon className={className} />;
    case 'analyze':
    case 'eda':
      return <ChartIcon className={className} />;
    case 'train':
      return <BrainIcon className={className} />;
    case 'results':
      return <CheckIcon className={className} />;
    case 'simulate':
    case 'cleaning':
    case 'engineering':
      return <SparklesIcon className={className} />;
    case 'admin':
      // ShieldIcon is a good fit for admin
      return <ShieldIcon className={className} />;
    default:
      return <LocalHomeIcon />;
  }
}

// Custom ShieldIcon if not in library (Wait, I checked Icons.tsx and it was NOT there)
const ShieldIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
);

export default function MobileNavigation({ tabs, activeTab, onTabChange }: MobileNavigationProps) {
  const [showMore, setShowMore] = useState(false);

  // Primary tabs to always show (first 5 available)
  const availableTabs = tabs.filter(t => t.available);
  const primaryTabs = availableTabs.slice(0, 5);
  const secondaryTabs = availableTabs.slice(5);

  // If active tab is in secondary, ensure it's in primary view
  const activeInPrimary = primaryTabs.some(t => t.id === activeTab);
  let displayTabs = primaryTabs;
  
  if (!activeInPrimary) {
    const activeTabObj = availableTabs.find(t => t.id === activeTab);
    if (activeTabObj) {
      displayTabs = [activeTabObj, ...primaryTabs.slice(0, 4)];
    }
  }

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#FFEDC1] safe-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
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
                <span className={`text-[10px] mt-1 font-semibold truncate max-w-[64px] ${isActive ? 'font-bold' : ''}`}>
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
              <LocalMenuIcon />
              <span className="text-[10px] mt-1 font-semibold">More</span>
            </button>
          )}
        </div>
      </nav>

      {/* More Tabs Dropdown Overlay */}
      {showMore && secondaryTabs.length > 0 && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/20 z-40 backdrop-blur-[2px]"
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
