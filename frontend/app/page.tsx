'use client';

import { useState, useEffect } from 'react';
import WorkflowNavigation from '@/components/layout/responsive/WorkflowNavigation';
import LandingPage from '@/components/landing/LandingPage';
import { LoginPage } from '@/components/auth/LoginPage';
import { SignupPage } from '@/components/auth/SignupPage';
import VoiceChat from '@/components/chat/VoiceChat';
import FileUploader from '@/components/data/FileUploader';
import DataPreview from '@/components/data/DataPreview';
import DataStats from '@/components/analysis/DataStats';
import AIInsights from '@/components/analysis/AIInsights';
import InsightsDashboard from '@/components/Dashboard/InsightsDashboard';
import DataCleaning from '@/components/data/DataCleaning';
import ModelTraining from '@/components/models/ModelTraining';
import ModelComparison from '@/components/models/ModelComparison';
import SHAPPlots from '@/components/explanations/SHAPPlots';
import OutlierDetection from '@/components/data/OutlierDetection';
import FeatureEngineering from '@/components/data/FeatureEngineering';
import BatchPrediction from '@/components/models/BatchPrediction';
import Simulate from '@/components/models/Simulate';
import AccountSection from '@/components/account/AccountSection';
import AdminDashboard from '@/components/admin/AdminDashboard';
import ResetModal from '@/components/ui/ResetModal';
import LogoutModal from '@/components/ui/LogoutModal';
import OnboardingChecklist from '@/components/ui/OnboardingChecklist';
import SkeletonState from '@/components/ui/SkeletonState';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  checkBackendHealth,
  testGroqConnection,
  analyzeData,
  getExplanations,
  resetSessionData,
  clearChatHistory,
} from '@/lib/api';


import MobileNavigation from '@/components/layout/responsive/MobileNavigation';

type Tab = 'upload' | 'chat' | 'analyze' | 'train' | 'results' | 'simulate' | 'cleaning' | 'engineering' | 'account' | 'admin';
type Status = 'checking' | 'connected' | 'error';


// Icon Components
const UploadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const ChatIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const BrainIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const TargetIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const WrenchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l8 4v6c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V7l8-4z" />
  </svg>
);

const getInitials = (fullName?: string, username?: string) => {
  const source = (fullName || username || 'U').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
};

const getAvatarGradient = (seed: string) => {
  const palette = [
    'from-[#470102] to-[#8A5A5A]',
    'from-[#7C2D12] to-[#C2410C]',
    'from-[#1D4D4F] to-[#307B65]',
    'from-[#7F1D1D] to-[#A93434]',
    'from-[#8A5A5A] to-[#470102]',
  ];
  const hash = seed.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return palette[hash % palette.length];
};

export default function Home() {
  const { isAuthenticated, user, logout, loading } = useAuth();
  const { notify } = useToast();
  const [showApp, setShowApp] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [authMode, setAuthMode] = useState<'landing' | 'login' | 'signup'>('landing');
  const [backendStatus, setBackendStatus] = useState<Status>('checking');
  const [groqStatus, setGroqStatus] = useState<Status>('checking');

  const [datasetInfo, setDatasetInfo] = useState<any>(null);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [trainingResults, setTrainingResults] = useState<any>(null);
  const [explanations, setExplanations] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [isHeavyTabLoading, setIsHeavyTabLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const isAdmin = !!user?.is_admin;
  const avatarInitials = getInitials(user?.full_name, user?.username);
  const avatarGradient = getAvatarGradient(user?.username || user?.email || 'user');

  useEffect(() => {
    const checkStatus = async () => {
      try {
        await checkBackendHealth();
        setBackendStatus('connected');
      } catch { setBackendStatus('error'); }

      try {
        await testGroqConnection();
        setGroqStatus('connected');
      } catch { setGroqStatus('error'); }
    };

    if (showApp) checkStatus();
  }, [showApp]);

  useEffect(() => {
    if (isAuthenticated) {
      setShowApp(true);
      setAuthMode('landing');
      setActiveTab(user?.is_admin ? 'admin' : 'upload');
    }
  }, [isAuthenticated, user?.is_admin]);

  useEffect(() => {
    if (isAdmin) {
      if (activeTab !== 'admin') setActiveTab('admin');
      return;
    }
    if (activeTab === 'admin') setActiveTab('upload');
  }, [isAdmin, activeTab]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setShowApp(false);
    }
  }, [isAuthenticated, loading]);

  useEffect(() => {
    const heavyTabs: Tab[] = ['analyze', 'train', 'simulate', 'account', 'admin'];
    const hasRequiredData =
      (activeTab === 'analyze' || activeTab === 'train') ? !!datasetInfo :
      activeTab === 'simulate' ? !!trainingResults :
      activeTab === 'account' ? isAuthenticated :
      activeTab === 'admin' ? !!user?.is_admin :
      true;

    if (!heavyTabs.includes(activeTab) || !hasRequiredData) {
      setIsHeavyTabLoading(false);
      return;
    }

    setIsHeavyTabLoading(true);
    const timer = window.setTimeout(() => setIsHeavyTabLoading(false), 360);
    return () => window.clearTimeout(timer);
  }, [activeTab, datasetInfo, trainingResults, isAuthenticated, user?.is_admin]);

  const handleDataUpload = async (data: any) => {
    setDatasetInfo(data);
    setActiveTab('cleaning');
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const results = await analyzeData();
      setAnalysisResults(results);
      setActiveTab('analyze');
    } catch (error: any) {
      console.error('Analysis failed:', error);
      // Handle session expiry (backend restart)
      if (error.message && (error.message.includes('404') || error.message.includes('No dataset'))) {
        notify('error', 'Session expired', 'Please re-upload your dataset.');
        setDatasetInfo(null);
        setAnalysisResults(null);
        setActiveTab('upload');
      } else {
        notify('error', 'Analysis failed', 'Please try again.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTrainingComplete = async (results: any) => {
    setTrainingResults(results);
    setActiveTab('results');

    try {
      const jobId = results.job_id || results.results?.job_id;
      if (jobId) {
        const exp = await getExplanations(jobId);
        console.log('Explanations raw:', JSON.stringify(exp).slice(0, 500));
        console.log('Feature importance entries:', exp?.feature_importance?.map((f: any) => `${f.feature}:${f.importance}`));
        setExplanations(exp);
      }
    } catch (error) {
      console.error('Failed to get explanations:', error);
    }
  };

  const handleReset = () => {
    setShowResetModal(true);
  };

  const confirmReset = async () => {
    try {
      await resetSessionData();
      await clearChatHistory();
    } catch (error) {
      console.warn('Failed to fully reset backend session state:', error);
    } finally {
      setDatasetInfo(null);
      setAnalysisResults(null);
      setTrainingResults(null);
      setExplanations(null);
      setActiveTab('upload');
      notify('success', 'Session reset', 'All current data and results were cleared.');
    }
  };

  // Prevent landing-page flash while auth state is restoring from localStorage/token.
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF7EA] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#8A5A5A] text-sm font-bold tracking-wider uppercase">
          <svg className="w-5 h-5 animate-spin text-[#470102]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Restoring Session
        </div>
      </div>
    );
  }

  if (showApp && !loading && !isAuthenticated) {
    return (
      <LoginPage
        onSwitchToSignup={() => setAuthMode('signup')}
        onBack={() => {
          setShowApp(false);
          setAuthMode('landing');
        }}
      />
    );
  }

  if (!showApp) {
    if (authMode === 'login') {
      return (
        <LoginPage
          onSwitchToSignup={() => setAuthMode('signup')}
          onBack={() => setAuthMode('landing')}
        />
      );
    }
    if (authMode === 'signup') {
      return (
        <SignupPage
          onSwitchToLogin={() => setAuthMode('login')}
          onSignupSuccess={() => setAuthMode('login')}
          onBack={() => setAuthMode('landing')}
        />
      );
    }

    return (
      <LandingPage
        onGetStarted={() => {
          if (isAuthenticated) {
            setShowApp(true);
          } else {
            setAuthMode('login');
          }
        }}
        onLogin={() => setAuthMode('login')}
        onSignup={() => setAuthMode('signup')}
      />
    );
  }

  const mainTabs = [
    ...(isAdmin
      ? [{ id: 'admin', label: 'Admin', icon: <ShieldIcon />, available: true }]
      : [
        { id: 'upload', label: 'Upload', icon: <UploadIcon />, available: true },
        { id: 'cleaning', label: 'Data Cleaning', icon: <SparklesIcon />, available: !!datasetInfo },
        { id: 'analyze', label: 'EDA', icon: <ChartIcon />, available: !!datasetInfo },
        { id: 'engineering', label: 'Feature Engineering', icon: <WrenchIcon />, available: !!datasetInfo },
        { id: 'train', label: 'Train', icon: <BrainIcon />, available: !!datasetInfo },
        { id: 'results', label: 'Results', icon: <TargetIcon />, available: !!trainingResults },
        { id: 'simulate', label: 'Simulate', icon: <SparklesIcon />, available: !!trainingResults },
        { id: 'chat', label: 'AI Assistant', icon: <ChatIcon />, available: !!datasetInfo },
      ]),
  ];
  const unlockedCount = mainTabs.filter((tab) => tab.available).length;
  const workflowProgress = Math.round((unlockedCount / mainTabs.length) * 100);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#FFF7EA]/90 backdrop-blur-xl border-b border-[#FFEDC1] transition-colors duration-300">
        <div className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center justify-between sm:justify-start gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-[#470102] tracking-tight">IntelliML</h1>
                <p className="text-[10px] sm:text-xs text-[#8A5A5A] font-bold tracking-wider uppercase hidden sm:block">AI-Powered Analytics Platform</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-white/50 rounded-full border border-[#FFEDC1] shadow-sm">
                <div className={`w-2 h-2 rounded-full shadow-sm ${backendStatus === 'connected' ? 'bg-emerald-500 shadow-emerald-500/50' : backendStatus === 'error' ? 'bg-rose-500 shadow-rose-500/50' : 'bg-amber-500 animate-pulse'}`}></div>
                <span className="text-[10px] sm:text-xs font-bold text-[#470102] tracking-wide hidden sm:inline">Backend</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-white/50 rounded-full border border-[#FFEDC1] shadow-sm">
                <div className={`w-2 h-2 rounded-full shadow-sm ${groqStatus === 'connected' ? 'bg-emerald-500 shadow-emerald-500/50' : groqStatus === 'error' ? 'bg-rose-500 shadow-rose-500/50' : 'bg-amber-500 animate-pulse'}`}></div>
                <span className="text-[10px] sm:text-xs font-bold text-[#470102] tracking-wide hidden sm:inline">AI Engine</span>
              </div>
              {datasetInfo && !isAdmin && (
                <button
                  onClick={handleReset}
                  className="px-2 sm:px-3 sm:px-4 py-1.5 text-[10px] sm:text-xs font-bold bg-[#470102] hover:bg-[#5D0203] text-[#FFEDC1] rounded-lg transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                >
                  Reset
                </button>
              )}
              {isAuthenticated && !isAdmin && (
                <button
                  onClick={() => setActiveTab('account')}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-bold border rounded-full transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
                    activeTab === 'account'
                      ? 'bg-[#470102] border-[#470102] text-[#FFEDC1]'
                      : 'border-[#FFEDC1] bg-white text-[#470102]'
                  }`}
                >
                  <span className={`w-6 sm:w-7 h-6 sm:h-7 rounded-full bg-gradient-to-br ${avatarGradient} text-[#FFEDC1] flex items-center justify-center text-[9px] sm:text-[10px] font-bold`}>
                    {avatarInitials}
                  </span>
                  <span className="pr-1 hidden sm:inline">{user?.full_name || user?.username || 'Account'}</span>
                </button>
              )}
              {isAuthenticated && isAdmin && (
                <button
                  onClick={() => setShowLogoutModal(true)}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold border border-[#FFEDC1] bg-white text-[#470102] rounded-lg transition-all shadow-sm hover:shadow-md"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-col md:flex-row min-h-[calc(100vh-80px)] md:min-h-[calc(100vh-80px)]">
        <WorkflowNavigation
          tabs={mainTabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as Tab)}
          unlockedCount={unlockedCount}
          workflowProgress={workflowProgress}
          datasetInfo={datasetInfo}
          showDatasetCard={!isAdmin}
        />

        {/* Mobile Bottom Navigation */}
        <MobileNavigation
          tabs={mainTabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as Tab)}
        />

        {/* Main Content */}
        <main className="flex-1 min-w-0 overflow-x-hidden p-4 md:p-6 lg:p-8 bg-[var(--background)] pb-24 md:pb-8">
          {/* Upload Tab */}
          {
            activeTab === 'upload' && !isAdmin && (
              <div className="animate-fadeIn">
                <div className="text-center mb-6 sm:mb-10">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-display mb-2 sm:mb-3 text-[#470102]">Upload Your Data</h2>
                  <p className="text-sm sm:text-base md:text-lg text-[#8A5A5A] max-w-2xl mx-auto px-4">Start by uploading a CSV file to begin your analysis.</p>
                </div>

                <div className="max-w-2xl mx-auto mb-8 sm:mb-12 px-2 sm:px-0">
                  <FileUploader onUploadSuccess={handleDataUpload} />
                </div>

                <div className="max-w-6xl mx-auto mb-4 sm:mb-8 px-2 sm:px-0">
                  <OnboardingChecklist
                    hasDataset={!!datasetInfo}
                    hasAnalysis={!!analysisResults}
                    hasTraining={!!trainingResults}
                    onGoUpload={() => setActiveTab('upload')}
                    onGoClean={() => setActiveTab('cleaning')}
                    onGoAnalyze={() => setActiveTab('analyze')}
                    onGoTrain={() => setActiveTab('train')}
                    onGoSimulate={() => setActiveTab('simulate')}
                  />
                </div>

              </div>
            )
          }

          {/* Data Cleaning Tab */}
          {
            activeTab === 'cleaning' && datasetInfo && !isAdmin && (
              <div className="animate-fadeIn max-w-6xl mx-auto">
                <div className="text-center mb-6 sm:mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 tracking-tight">Data Cleaning</h2>
                  <p className="text-sm text-gray-500 hidden sm:block">Handle missing values and remove outliers</p>
                </div>

                <div className="space-y-6 sm:space-y-8">
                  <OutlierDetection onDataUpdate={(newData) => setDatasetInfo(newData)} />
                  <DataCleaning
                    data={datasetInfo}
                    onDataUpdate={(newData) => setDatasetInfo(newData)}
                  />
                </div>
              </div>
            )
          }

          {/* Feature Engineering Tab */}
          {
            activeTab === 'engineering' && datasetInfo && !isAdmin && (
              <div className="animate-fadeIn max-w-6xl mx-auto">
                <div className="text-center mb-6 sm:mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 tracking-tight">Feature Engineering</h2>
                  <p className="text-sm text-gray-500 hidden sm:block">Transform variables and create new features</p>
                </div>

                <div className="space-y-3">
                  <FeatureEngineering columns={datasetInfo.columns || []} />
                </div>
              </div>
            )
          }

          {/* Chat Tab */}
          {
            activeTab === 'chat' && datasetInfo && !isAdmin && (
              <div className="animate-fadeIn h-[calc(100dvh-280px)] md:h-[calc(100vh-180px)] lg:h-[calc(100vh-140px)] rounded-2xl sm:rounded-[24px] overflow-hidden shadow-xl sm:shadow-2xl shadow-black/5 border border-gray-200 bg-white">
                <VoiceChat />
              </div>
            )
          }

          {
            activeTab === 'account' && isAuthenticated && !isAdmin && (
              <div className="animate-fadeIn">
                {isHeavyTabLoading ? (
                  <div className="space-y-4 max-w-6xl mx-auto">
                    <SkeletonState rows={4} />
                    <SkeletonState rows={5} />
                    <SkeletonState rows={6} />
                  </div>
                ) : (
                  <AccountSection onLogout={() => setShowLogoutModal(true)} />
                )}
              </div>
            )
          }

          {
            activeTab === 'admin' && user?.is_admin && (
              <div className="animate-fadeIn max-w-7xl mx-auto">
                {isHeavyTabLoading ? (
                  <div className="space-y-4">
                    <SkeletonState rows={4} />
                    <SkeletonState rows={6} />
                  </div>
                ) : (
                  <AdminDashboard currentUsername={user?.username} />
                )}
              </div>
            )
          }

          {/* Analyze Tab */}
          {
            activeTab === 'analyze' && datasetInfo && !isAdmin && (
              <div className="animate-fadeIn space-y-6 sm:space-y-8 max-w-7xl mx-auto">
                {isHeavyTabLoading ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <SkeletonState rows={6} />
                    <SkeletonState rows={6} />
                  </div>
                ) : !analysisResults ? (
                  <div className="animate-fadeIn">
                    <div className="bg-[#FFF7EA] rounded-2xl sm:rounded-[24px] border border-[#FFEDC1] p-6 sm:p-10 md:p-12 text-center shadow-lg shadow-[#FEB229]/5">
                      {/* Hero Content */}
                      <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#FEB229] to-[#F59E0B] flex items-center justify-center mx-auto mb-6 sm:mb-8 text-[#470102] shadow-xl shadow-[#FEB229]/20 rotate-3 transition-transform hover:rotate-6">
                        <div className="scale-125 sm:scale-150">
                          <ChartIcon />
                        </div>
                      </div>

                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#470102] mb-3 sm:mb-4 tracking-tight">Exploratory Data Analysis</h2>
                      <p className="text-sm sm:text-base md:text-lg text-[#8A5A5A] mb-6 sm:mb-10 max-w-2xl mx-auto leading-relaxed">
                        Unlock the power of your data. Our AI automatically discovers patterns and generates visualizations.
                      </p>

                      <button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className="group relative inline-flex items-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 bg-[#470102] text-[#FFEDC1] text-base sm:text-lg font-bold rounded-xl sm:rounded-xl hover:bg-[#5D0203] transition-all shadow-lg shadow-[#470102]/20 hover:shadow-xl hover:-translate-y-1 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
                      >
                        {isAnalyzing ? (
                          <>
                            <SpinnerIcon />
                            <span>Running...</span>
                          </>
                        ) : (
                          <>
                            <span>Start Analysis</span>
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                          </>
                        )}
                      </button>
                    </div>

                    {isAnalyzing && (
                      <div className="mt-4 sm:mt-6 grid sm:grid-cols-2 gap-4">
                        <SkeletonState rows={6} />
                        <SkeletonState rows={6} />
                      </div>
                    )}

                    {/* Feature Grid */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-6 sm:mt-8">
                      {/* Feature 1 */}
                      <div className="p-4 sm:p-6 bg-white rounded-xl sm:rounded-2xl border border-[#FFEDC1] shadow-sm hover:shadow-md transition-all group">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#FFF7EA] text-[#470102] flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                          <ChartIcon />
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-[#470102] mb-1 sm:mb-2">Visualizations</h3>
                        <p className="text-[#8A5A5A] text-xs sm:text-sm">Distributions, heatmaps, and scatter matrices.</p>
                      </div>
                      {/* Feature 2 */}
                      <div className="p-4 sm:p-6 bg-white rounded-xl sm:rounded-2xl border border-[#FFEDC1] shadow-sm hover:shadow-md transition-all group">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#FFF7EA] text-[#470102] flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                          <BrainIcon />
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-[#470102] mb-1 sm:mb-2">AI Insights</h3>
                        <p className="text-[#8A5A5A] text-xs sm:text-sm">Natural language summaries and key findings.</p>
                      </div>
                      {/* Feature 3 */}
                      <div className="p-4 sm:p-6 bg-white rounded-xl sm:rounded-2xl border border-[#FFEDC1] shadow-sm hover:shadow-md transition-all group sm:col-span-2 lg:col-span-1">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#FFF7EA] text-[#470102] flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                          <CheckIcon />
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-[#470102] mb-1 sm:mb-2">Data Quality</h3>
                        <p className="text-[#8A5A5A] text-xs sm:text-sm">Detection of missing values and outliers.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 sm:space-y-8">
                    <DataPreview data={datasetInfo} />
                    <DataStats analysis={analysisResults.analysis} />
                    <AIInsights insights={analysisResults.ai_insights} />
                    <InsightsDashboard analysisResults={analysisResults} />
                  </div>
                )}
              </div>
            )
          }

          {/* Train Tab */}
          {
            activeTab === 'train' && datasetInfo && !isAdmin && (
              <div className="animate-fadeIn max-w-4xl mx-auto">
                <div className="text-center mb-6 sm:mb-10">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 tracking-tight">Train ML Models</h2>
                  <p className="text-sm sm:text-base text-gray-500 hidden sm:block">Select a target column and train multiple models</p>
                </div>

                {isHeavyTabLoading ? (
                  <div className="space-y-4">
                    <SkeletonState rows={6} />
                    <SkeletonState rows={4} />
                  </div>
                ) : (
                  <div className="bg-white p-2 sm:p-1 rounded-2xl sm:rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100">
                    <div className="bg-[var(--background)] p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-[20px]">
                      <ModelTraining
                        columns={datasetInfo.columns}
                        onTrainingComplete={handleTrainingComplete}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          }

          {/* Results Tab */}
          {
            activeTab === 'results' && trainingResults && !isAdmin && (
              <div className="animate-fadeIn space-y-6 sm:space-y-8 max-w-6xl mx-auto">
                <div className="text-center mb-6 sm:mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 tracking-tight">Training Complete</h2>
                  <p className="text-sm sm:text-base text-gray-500 hidden sm:block">View model performance and explanations</p>
                </div>

                <ModelComparison results={trainingResults} />

                {explanations && <SHAPPlots explanations={explanations} />}

                <BatchPrediction jobId={trainingResults.job_id || trainingResults.results?.job_id || null} />
              </div>
            )
          }

          {/* Simulate Tab */}
          {
            activeTab === 'simulate' && trainingResults && !isAdmin && (
              <div className="animate-fadeIn max-w-6xl mx-auto">
                <div className="text-center mb-6 sm:mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 tracking-tight">What-If Simulation</h2>
                  <p className="text-sm sm:text-base text-gray-500 hidden sm:block">Adjust features and see live prediction impact</p>
                </div>
                {isHeavyTabLoading ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <SkeletonState rows={8} />
                    <SkeletonState rows={8} />
                  </div>
                ) : (
                  <Simulate jobId={trainingResults.job_id || trainingResults.results?.job_id} />
                )}
              </div>
            )
          }
        </main>
      </div>

      <ResetModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={confirmReset}
      />
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={logout}
      />
    </div>
  );
}
