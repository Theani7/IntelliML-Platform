'use client';

import { useState, useEffect } from 'react';
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
import {
  checkBackendHealth,
  testGroqConnection,
  analyzeData,
  getExplanations
} from '@/lib/api';


// ... other imports

type Tab = 'upload' | 'chat' | 'analyze' | 'train' | 'results' | 'clean';
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

export default function Home() {
  const [showApp, setShowApp] = useState(false);
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
    setActiveTab('clean');
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
    if (confirm('Start over? This will clear all data.')) {
      setDatasetInfo(null);
      setAnalysisResults(null);
      setTrainingResults(null);
      setExplanations(null);
      setActiveTab('upload');
    }
  };

  if (!showApp) {
    return <LandingPage onGetStarted={() => setShowApp(true)} />;
  }

  const mainTabs = [
    { id: 'upload', label: 'Upload', icon: <UploadIcon />, available: true },
    { id: 'clean', label: 'Data Prep', icon: <SparklesIcon />, available: !!datasetInfo },
    { id: 'analyze', label: 'EDA', icon: <ChartIcon />, available: !!datasetInfo },
    { id: 'train', label: 'Train', icon: <BrainIcon />, available: !!datasetInfo },
    { id: 'results', label: 'Results', icon: <TargetIcon />, available: !!trainingResults },
    { id: 'chat', label: 'AI Assistant', icon: <ChatIcon />, available: !!datasetInfo },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/20 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">IntelliML</h1>
                <p className="text-xs text-cyan-400">AI-Powered Analytics</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${backendStatus === 'connected' ? 'bg-green-500' : backendStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}`}></div>
                <span className="text-xs text-gray-400">Backend</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${groqStatus === 'connected' ? 'bg-green-500' : groqStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}`}></div>
                <span className="text-xs text-gray-400">AI</span>
              </div>
              {datasetInfo && (
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-[calc(100vh-80px)] bg-black/20 backdrop-blur-sm border-r border-white/10 p-4 flex flex-col">

          {/* Main Workflow Steps */}
          <nav className="space-y-2">
            {mainTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => tab.available && setActiveTab(tab.id as Tab)}
                disabled={!tab.available}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/20'
                  : tab.available
                    ? 'text-gray-300 hover:bg-white/10 hover:text-white'
                    : 'text-gray-600 cursor-not-allowed'
                  }`}
              >
                {tab.icon}
                <span className="font-medium">{tab.label}</span>
                {!tab.available && tab.id !== 'upload' && (
                  <span className="ml-auto flex items-center gap-1 text-xs bg-white/10 px-2 py-0.5 rounded">
                    <LockIcon />
                  </span>
                )}
                {tab.id === 'upload' && datasetInfo && (
                  <span className="ml-auto text-green-400"><CheckIcon /></span>
                )}
              </button>
            ))}
          </nav>

          {datasetInfo && (
            <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-sm font-semibold text-white mb-2">Current Dataset</h3>
              <p className="text-xs text-gray-400 truncate">{datasetInfo.filename}</p>
              <div className="mt-2 flex gap-2 text-xs">
                <span className="px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30">{datasetInfo.rows} rows</span>
                <span className="px-2 py-1 bg-blue-500/30 text-blue-300 rounded">{datasetInfo.columns?.length} cols</span>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Upload Tab */}
          {
            activeTab === 'upload' && (
              <div className="animate-fadeIn">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Upload Your Data</h2>
                  <p className="text-gray-400">Start by uploading a CSV, Excel, or JSON file</p>
                </div>

                <div className="max-w-2xl mx-auto">
                  <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
                    <FileUploader onUploadSuccess={handleDataUpload} />
                  </div>
                </div>

                <div className="mt-12 max-w-4xl mx-auto">
                  <h3 className="text-lg font-semibold text-white mb-4 text-center">How It Works</h3>
                  <div className="grid md:grid-cols-4 gap-4">
                    {[
                      { icon: <UploadIcon />, title: 'Upload', desc: 'Add your dataset' },
                      { icon: <ChatIcon />, title: 'Chat', desc: 'Ask AI questions' },
                      { icon: <ChartIcon />, title: 'Analyze', desc: 'View insights' },
                      { icon: <BrainIcon />, title: 'Train', desc: 'Build ML models' },
                    ].map((step, i) => (
                      <div key={i} className="text-center p-4 bg-white/5 rounded-xl border border-white/10 hover:border-cyan-500/30 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mx-auto text-cyan-400">
                          {step.icon}
                        </div>
                        <h4 className="text-white font-medium mt-3">{step.title}</h4>
                        <p className="text-sm text-gray-400 mt-1">{step.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          }

          {/* Clean Tab */}
          {
            activeTab === 'clean' && datasetInfo && (
              <div className="animate-fadeIn">
                <div className="text-center mb-6">
                  <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Data Cleaning Station</h2>
                  <p className="text-gray-400">Transform and prepare your data for analysis</p>
                </div>

                <div className="space-y-6">
                  <OutlierDetection />
                  <FeatureEngineering columns={datasetInfo.columns || []} />
                  <DataCleaning
                    data={datasetInfo}
                    onDataUpdate={(newData) => setDatasetInfo(newData)}
                  />
                </div>
              </div>
            )
          }

          {/* Chat Tab */}
          {
            activeTab === 'chat' && datasetInfo && (
              <div className="animate-fadeIn h-full">
                <VoiceChat />
              </div>
            )
          }

          {/* Analyze Tab */}
          {
            activeTab === 'analyze' && datasetInfo && (
              <div className="animate-fadeIn space-y-6">
                {!analysisResults ? (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600/30 to-pink-600/30 flex items-center justify-center mx-auto mb-6 border border-purple-500/30 text-white">
                      <ChartIcon />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Exploratory Data Analysis (EDA)</h2>
                    <p className="text-gray-400 mb-6">Get AI-powered insights, statistics, and visualizations</p>
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-2 mx-auto"
                    >
                      {isAnalyzing ? (
                        <>
                          <SpinnerIcon /> Analyzing...
                        </>
                      ) : (
                        'Start Analysis'
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
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
              <div className="animate-fadeIn">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Train ML Models</h2>
                  <p className="text-gray-400">Select a target column and train multiple models</p>
                </div>

                <div className="max-w-2xl mx-auto">
                  <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
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
              <div className="animate-fadeIn space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Training Complete</h2>
                  <p className="text-gray-400">View model performance and explanations</p>
                </div>

                <ModelComparison results={trainingResults} />

                {explanations && <SHAPPlots explanations={explanations} />}

                <BatchPrediction jobId={trainingResults.job_id || trainingResults.results?.job_id || null} />
              </div>
            )
          }
        </main >
      </div >
    </div >
  );
}