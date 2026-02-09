'use client';

import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import Header from '@/components/layout/Header';
import LandingPage from '@/components/landing/LandingPage';
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
import ExperimentLeaderboard from '@/components/ml/ExperimentLeaderboard';
import ResetModal from '@/components/ui/ResetModal';
import {
  checkBackendHealth,
  testGroqConnection,
  analyzeData,
  getExplanations
} from '@/lib/api';


// ... other imports

type Tab = 'upload' | 'chat' | 'analyze' | 'train' | 'results' | 'cleaning' | 'engineering' | 'history';
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

const LockIcon = () => (
  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
  </svg>
);

const MicIcon = () => (
  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
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

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function Home() {
  const [showApp, setShowApp] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [backendStatus, setBackendStatus] = useState<Status>('checking');
  const [groqStatus, setGroqStatus] = useState<Status>('checking');

  const [datasetInfo, setDatasetInfo] = useState<any>(null);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [trainingResults, setTrainingResults] = useState<any>(null);
  const [explanations, setExplanations] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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
        alert("Session expired or dataset lost. Please re-upload your file.");
        setDatasetInfo(null);
        setAnalysisResults(null);
        setActiveTab('upload');
      } else {
        alert("Analysis failed. Please try again.");
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
        const exp = await getExplanations(jobId, 'best_model');
        setExplanations(exp);
      }
    } catch (error) {
      console.error('Failed to get explanations:', error);
    }
  };

  const handleReset = () => {
    setShowResetModal(true);
  };

  const confirmReset = () => {
    setDatasetInfo(null);
    setAnalysisResults(null);
    setTrainingResults(null);
    setExplanations(null);
    setActiveTab('upload');
  };

  if (!showApp) {
    return <LandingPage onGetStarted={() => setShowApp(true)} />;
  }

  const mainTabs = [
    { id: 'upload', label: 'Upload', icon: <UploadIcon />, available: true },
    { id: 'cleaning', label: 'Data Cleaning', icon: <SparklesIcon />, available: !!datasetInfo },
    { id: 'analyze', label: 'EDA', icon: <ChartIcon />, available: !!datasetInfo },
    { id: 'engineering', label: 'Feature Engineering', icon: <WrenchIcon />, available: !!datasetInfo },
    { id: 'train', label: 'Train', icon: <BrainIcon />, available: !!datasetInfo },
    { id: 'results', label: 'Results', icon: <TargetIcon />, available: !!trainingResults },
    { id: 'history', label: 'History', icon: <ClockIcon />, available: !!datasetInfo },
    { id: 'chat', label: 'AI Assistant', icon: <ChatIcon />, available: !!datasetInfo },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#FFF7EA]/80 backdrop-blur-xl border-b border-[#FFEDC1] transition-colors duration-300">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-3xl font-display font-bold text-[#470102] tracking-tight">IntelliML</h1>
                <p className="text-xs text-[#8A5A5A] font-bold tracking-wider uppercase">AI-Powered Analytics Platform</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/50 rounded-full border border-[#FFEDC1] shadow-sm">
                <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${backendStatus === 'connected' ? 'bg-emerald-500 shadow-emerald-500/50' : backendStatus === 'error' ? 'bg-rose-500 shadow-rose-500/50' : 'bg-amber-500 animate-pulse'}`}></div>
                <span className="text-xs font-bold text-[#470102] tracking-wide">Backend</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/50 rounded-full border border-[#FFEDC1] shadow-sm">
                <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${groqStatus === 'connected' ? 'bg-emerald-500 shadow-emerald-500/50' : groqStatus === 'error' ? 'bg-rose-500 shadow-rose-500/50' : 'bg-amber-500 animate-pulse'}`}></div>
                <span className="text-xs font-bold text-[#470102] tracking-wide">AI Engine</span>
              </div>
              {datasetInfo && (
                <button
                  onClick={handleReset}
                  className="px-4 py-1.5 text-xs font-bold bg-[#470102] hover:bg-[#5D0203] text-[#FFEDC1] rounded-lg transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                >
                  Reset Session
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-[calc(100vh-80px)] bg-[#FFF7EA] border-r border-[#FFEDC1] p-5 flex flex-col transition-colors duration-300">

          {/* Main Workflow Steps */}
          <nav className="space-y-2">
            {mainTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => tab.available && setActiveTab(tab.id as Tab)}
                disabled={!tab.available}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group ${activeTab === tab.id
                  ? 'bg-[#FEB229] text-[#470102] shadow-lg shadow-[#FEB229]/20 font-bold translate-x-1'
                  : tab.available
                    ? 'text-[#8A5A5A] hover:bg-[#FFEDC1]/50 hover:text-[#470102] hover:translate-x-1'
                    : 'text-[#8A5A5A]/40 cursor-not-allowed'
                  }`}
              >
                <div className={`transition-transform duration-300 ${activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {tab.icon}
                </div>
                <span className="font-semibold tracking-wide text-sm">{tab.label}</span>
                {!tab.available && tab.id !== 'upload' && (
                  <span className="ml-auto flex items-center gap-1 text-xs opacity-50">
                    <LockIcon />
                  </span>
                )}
                {tab.id === 'upload' && datasetInfo && (
                  <span className="ml-auto text-emerald-500 bg-emerald-50 rounded-full p-0.5"><CheckIcon /></span>
                )}
              </button>
            ))}
          </nav>

          {datasetInfo && (
            <div className="mt-6 pt-6 text-center">
              <div className="p-4 bg-white rounded-2xl border border-[#FFEDC1] shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-[#FEB229]"></div>
                <div className="w-10 h-10 bg-[#FFF7EA] border border-[#FFEDC1] rounded-full flex items-center justify-center mx-auto mb-3 text-[#470102] font-bold text-lg shadow-sm">
                  {datasetInfo.filename.charAt(0).toUpperCase()}
                </div>
                <h3 className="text-sm font-bold text-[#470102] mb-1 truncate">{datasetInfo.filename}</h3>
                <p className="text-[10px] text-[#8A5A5A] uppercase tracking-wider font-bold mb-3">Active Dataset</p>

                <div className="flex justify-center gap-2 text-[10px] font-medium">
                  <span className="px-2 py-1 bg-[#FFF7EA] text-[#470102] rounded-lg border border-[#FFEDC1]">
                    {datasetInfo.rows} rows
                  </span>
                  <span className="px-2 py-1 bg-[#FFF7EA] text-[#470102] rounded-lg border border-[#FFEDC1]">
                    {datasetInfo.columns?.length} cols
                  </span>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 bg-[var(--background)]">
          {/* Upload Tab */}
          {
            activeTab === 'upload' && (
              <div className="animate-fadeIn">
                <div className="text-center mb-10">
                  <h2 className="text-5xl font-medium tracking-tight text-display mb-3 text-[#470102]">Upload Your Data</h2>
                  <p className="text-lg text-[#8A5A5A] max-w-2xl mx-auto">Start by uploading a CSV, Excel, or JSON file to begin your analysis.</p>
                </div>

                <div className="max-w-2xl mx-auto mb-16">
                  <FileUploader onUploadSuccess={handleDataUpload} />
                </div>

                <div className="mt-12 max-w-4xl mx-auto">
                  <h3 className="text-lg font-semibold text-[#470102] mb-4 text-center">How It Works</h3>
                  <div className="grid md:grid-cols-5 gap-6">
                    {[
                      { key: 'upload', icon: <UploadIcon />, title: 'Upload', desc: 'Add your dataset' },
                      { key: 'clean', icon: <SparklesIcon />, title: 'Clean', desc: 'Handle missing/outliers' },
                      { key: 'eda', icon: <ChartIcon />, title: 'EDA', desc: 'View insights' },
                      { key: 'eng', icon: <WrenchIcon />, title: 'Engineer', desc: 'Create features' },
                      { key: 'train', icon: <BrainIcon />, title: 'Train', desc: 'Build ML models' },
                    ].map((step, i) => (
                      <div key={i} className="text-center p-6 rounded-2xl bg-[#FFF7EA] border border-[#FFEDC1] shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                        <div className="w-12 h-12 rounded-2xl bg-[#FFF7EA] border border-[#FFEDC1] flex items-center justify-center mx-auto text-[#FEB229] mb-4 shadow-sm">
                          {step.icon}
                        </div>
                        <h4 className="text-[#470102] font-semibold mb-1">{step.title}</h4>
                        <p className="text-sm text-[#8A5A5A] leading-relaxed">{step.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          }

          {/* Data Cleaning Tab */}
          {
            activeTab === 'cleaning' && datasetInfo && (
              <div className="animate-fadeIn max-w-6xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Data Cleaning Station</h2>
                  <p className="text-gray-500">Handle missing values and remove outliers</p>
                </div>

                <div className="space-y-8">
                  <OutlierDetection />
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
            activeTab === 'engineering' && datasetInfo && (
              <div className="animate-fadeIn max-w-6xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Feature Engineering</h2>
                  <p className="text-gray-500">Transform variables and create new features</p>
                </div>

                <div className="space-y-3">
                  <FeatureEngineering columns={datasetInfo.columns || []} />
                </div>
              </div>
            )
          }

          {/* Chat Tab */}
          {
            activeTab === 'chat' && datasetInfo && (
              <div className="animate-fadeIn h-[calc(100vh-140px)] rounded-[24px] overflow-hidden shadow-2xl shadow-black/5 border border-gray-200 bg-white">
                <VoiceChat />
              </div>
            )
          }

          {/* Analyze Tab */}
          {
            activeTab === 'analyze' && datasetInfo && (
              <div className="animate-fadeIn space-y-8 max-w-7xl mx-auto">
                {!analysisResults ? (
                  <div className="animate-fadeIn">
                    <div className="bg-[#FFF7EA] rounded-[24px] border border-[#FFEDC1] p-12 text-center shadow-lg shadow-[#FEB229]/5">
                      {/* Hero Content */}
                      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#FEB229] to-[#F59E0B] flex items-center justify-center mx-auto mb-8 text-[#470102] shadow-xl shadow-[#FEB229]/20 rotate-3 transition-transform hover:rotate-6">
                        <div className="scale-150">
                          <ChartIcon />
                        </div>
                      </div>

                      <h2 className="text-4xl font-bold text-[#470102] mb-4 tracking-tight">Exploratory Data Analysis</h2>
                      <p className="text-lg text-[#8A5A5A] mb-10 max-w-2xl mx-auto leading-relaxed">
                        Unlock the power of your data. Our AI automatically discovers patterns, detects anomalies, and generates interactive visualizations to help you understand your dataset instantly.
                      </p>

                      <button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className="group relative inline-flex items-center gap-3 px-8 py-4 bg-[#470102] text-[#FFEDC1] text-lg font-bold rounded-xl hover:bg-[#5D0203] transition-all shadow-lg shadow-[#470102]/20 hover:shadow-xl hover:-translate-y-1 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
                      >
                        {isAnalyzing ? (
                          <>
                            <SpinnerIcon />
                            <span>Running Analysis...</span>
                          </>
                        ) : (
                          <>
                            <span>Start Automated Analysis</span>
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Feature Grid */}
                    <div className="grid md:grid-cols-3 gap-6 mt-8">
                      {/* Feature 1 */}
                      <div className="p-6 bg-white rounded-2xl border border-[#FFEDC1] shadow-sm hover:shadow-md transition-all group">
                        <div className="w-12 h-12 rounded-xl bg-[#FFF7EA] text-[#470102] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <ChartIcon />
                        </div>
                        <h3 className="text-lg font-bold text-[#470102] mb-2">Smart Visualizations</h3>
                        <p className="text-[#8A5A5A] text-sm">Automatically generated distributions, correlation heatmaps, and scatter matrices.</p>
                      </div>
                      {/* Feature 2 */}
                      <div className="p-6 bg-white rounded-2xl border border-[#FFEDC1] shadow-sm hover:shadow-md transition-all group">
                        <div className="w-12 h-12 rounded-xl bg-[#FFF7EA] text-[#470102] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <BrainIcon />
                        </div>
                        <h3 className="text-lg font-bold text-[#470102] mb-2">AI Insights</h3>
                        <p className="text-[#8A5A5A] text-sm">Natural language summaries and key findings extracted directly from your data.</p>
                      </div>
                      {/* Feature 3 */}
                      <div className="p-6 bg-white rounded-2xl border border-[#FFEDC1] shadow-sm hover:shadow-md transition-all group">
                        <div className="w-12 h-12 rounded-xl bg-[#FFF7EA] text-[#470102] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <CheckIcon />
                        </div>
                        <h3 className="text-lg font-bold text-[#470102] mb-2">Data Quality</h3>
                        <p className="text-[#8A5A5A] text-sm">Instant detection of missing values, outliers, and data type inconsistencies.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
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
            activeTab === 'train' && datasetInfo && (
              <div className="animate-fadeIn max-w-4xl mx-auto">
                <div className="text-center mb-10">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Train ML Models</h2>
                  <p className="text-gray-500">Select a target column and train multiple models</p>
                </div>

                <div className="bg-white p-1 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100">
                  <div className="bg-[var(--background)] p-8 rounded-[20px]">
                    <ModelTraining
                      columns={datasetInfo.columns}
                      onTrainingComplete={handleTrainingComplete}
                    />
                  </div>
                </div>
              </div>
            )
          }

          {/* Results Tab */}
          {
            activeTab === 'results' && trainingResults && (
              <div className="animate-fadeIn space-y-8 max-w-6xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Training Complete</h2>
                  <p className="text-gray-500">View model performance and explanations</p>
                </div>

                <ModelComparison results={trainingResults} />

                {explanations && <SHAPPlots explanations={explanations} />}

                <BatchPrediction jobId={trainingResults.job_id || trainingResults.results?.job_id || null} />
              </div>
            )
          }

          {/* History Tab */}
          {
            activeTab === 'history' && datasetInfo && (
              <div className="animate-fadeIn max-w-6xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Experiment History</h2>
                  <p className="text-gray-500">Track and compare your model training runs</p>
                </div>
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                  <ExperimentLeaderboard />
                </div>
              </div>
            )
          }
        </main >
      </div>

      <ResetModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={confirmReset}
      />
    </div>
  );
}