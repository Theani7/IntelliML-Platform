'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import LandingPage from '@/components/landing/LandingPage';
import VoiceButton from '@/components/voice/VoiceButton';
import FileUploader from '@/components/data/FileUploader';
import DataPreview from '@/components/data/DataPreview';
import DataStats from '@/components/analysis/DataStats';
import AIInsights from '@/components/analysis/AIInsights';
import InsightsDashboard from '@/components/Dashboard/InsightsDashboard';
import ModelTraining from '@/components/models/ModelTraining';
import ModelComparison from '@/components/models/ModelComparison';
import SHAPPlots from '@/components/explanations/SHAPPlots';
import { 
  checkBackendHealth, 
  testGroqConnection,
  analyzeData, 
  getExplanations 
} from '@/lib/api';

type Step = 'upload' | 'analyze' | 'train' | 'explain';
type Status = 'checking' | 'connected' | 'error';

export default function Home() {
  // Landing page state
  const [showApp, setShowApp] = useState(false);

  // System status
  const [backendStatus, setBackendStatus] = useState<Status>('checking');
  const [groqStatus, setGroqStatus] = useState<Status>('checking');

  // Workflow state
  const [datasetInfo, setDatasetInfo] = useState<any>(null);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [trainingResults, setTrainingResults] = useState<any>(null);
  const [explanations, setExplanations] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [showDashboard, setShowDashboard] = useState(false);

  // UI state
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Check system status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        await checkBackendHealth();
        setBackendStatus('connected');
      } catch (error) {
        setBackendStatus('error');
        console.error('Backend check failed:', error);
      }

      try {
        await testGroqConnection();
        setGroqStatus('connected');
      } catch (error) {
        setGroqStatus('error');
        console.error('Groq check failed:', error);
      }
    };

    if (showApp) {
      checkStatus();
    }
  }, [showApp]);

  const handleGetStarted = () => {
    setShowApp(true);
  };

  const handleDataUpload = async (data: any) => {
    console.log('Data uploaded:', data);
    setDatasetInfo(data);
    setCurrentStep('analyze');
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const results = await analyzeData();
      console.log('Analysis results:', results);
      setAnalysisResults(results);
      setShowDashboard(true);
      setCurrentStep('train');
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Analysis failed. Please check the console for details.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTrainingComplete = async (results: any) => {
  console.log('Training complete:', results);
  setTrainingResults(results);
  setCurrentStep('explain');
  
  try {
    // Check if job_id exists in results
    const jobId = results.job_id || results.results?.job_id;
    const modelName = results.best_model || results.results?.best_model || 'best_model';
    
    if (jobId) {
      console.log('Fetching explanations for job:', jobId);
      const exp = await getExplanations(jobId, modelName);
      setExplanations(exp);
    } else {
      console.warn('No job_id found in results:', results);
      // Skip explanations if no job_id
    }
  } catch (error) {
    console.error('Failed to get explanations:', error);
    // Don't throw - just log the error and continue
  }
};

  // Show landing page first
  if (!showApp) {
    return <LandingPage onGetStarted={handleGetStarted} />;
  }

  // Show main app
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-blue-50/30">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* System Status Cards - Only show if there are connection issues */}
        {(backendStatus === 'error' || groqStatus === 'error') && (
          <div className="mb-8 grid md:grid-cols-2 gap-4 animate-fadeIn">
            {backendStatus === 'error' && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <h3 className="font-semibold text-red-900">Backend Offline</h3>
                    <p className="text-sm text-red-700">
                      Make sure the backend is running on port 8000
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {groqStatus === 'error' && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <h3 className="font-semibold text-yellow-900">Groq API Issue</h3>
                    <p className="text-sm text-yellow-700">
                      Check your Groq API key in the backend .env file
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Voice Control Section */}
        <div className="mb-8 animate-fadeIn">
          <div className="card bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                🎙️ Voice Control Center
              </h2>
              <p className="text-gray-600">
                Click the microphone and speak your command
              </p>
            </div>
            <VoiceButton />
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 animate-fadeIn">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <Step 
              number={1} 
              label="Upload Data" 
              active={currentStep === 'upload'} 
              completed={datasetInfo !== null} 
            />
            <StepConnector />
            <Step 
              number={2} 
              label="Analyze" 
              active={currentStep === 'analyze'} 
              completed={analysisResults !== null} 
            />
            <StepConnector />
            <Step 
              number={3} 
              label="Train Models" 
              active={currentStep === 'train'} 
              completed={trainingResults !== null} 
            />
            <StepConnector />
            <Step 
              number={4} 
              label="Explain" 
              active={currentStep === 'explain'} 
              completed={explanations !== null} 
            />
          </div>
        </div>

        {/* Step 1: Upload Data */}
        {currentStep === 'upload' && (
          <div className="max-w-2xl mx-auto animate-fadeIn">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                📁 Upload Your Dataset
              </h3>
              <p className="text-gray-600">
                Upload a CSV, Excel, or JSON file to get started
              </p>
            </div>
            <FileUploader onUploadSuccess={handleDataUpload} />
          </div>
        )}

        {/* Show data preview if uploaded */}
        {datasetInfo && (
          <div className="mb-8 animate-fadeIn">
            <DataPreview data={datasetInfo} />
          </div>
        )}

        {/* Step 2: Analyze */}
        {currentStep === 'analyze' && datasetInfo && !analysisResults && (
          <div className="max-w-2xl mx-auto text-center animate-fadeIn">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                📊 Ready to Analyze
              </h3>
              <p className="text-gray-600 mb-6">
                Click below to start analyzing your data, or use voice command: "Analyze the data"
              </p>
            </div>
            <button 
              onClick={handleAnalyze} 
              disabled={isAnalyzing}
              className="btn-primary text-lg px-8 py-4 shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <span className="flex items-center space-x-2">
                  <span className="animate-spin">⚙️</span>
                  <span>Analyzing...</span>
                </span>
              ) : (
                '📊 Analyze Data'
              )}
            </button>
          </div>
        )}

        {/* Show analysis results */}
        {analysisResults && (
          <div className="space-y-6 mb-8 animate-fadeIn">
            <DataStats analysis={analysisResults.analysis} />
            <AIInsights insights={analysisResults.ai_insights} />
            
            {/* Dashboard Toggle Button */}
            <div className="text-center">
              <button
                onClick={() => setShowDashboard(!showDashboard)}
                className="btn-primary text-lg px-8 py-3 shadow-xl hover:shadow-2xl"
              >
                {showDashboard ? '📊 Hide Dashboard' : '📊 Show Interactive Dashboard'}
              </button>
            </div>

            {/* Interactive Dashboard */}
            {showDashboard && (
              <div className="animate-fadeIn">
                <InsightsDashboard analysisResults={analysisResults} />
              </div>
            )}
          </div>
        )}

        {/* Step 3: Train Models */}
        {currentStep === 'train' && datasetInfo && !trainingResults && (
          <div className="max-w-2xl mx-auto animate-fadeIn">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                🤖 Train Machine Learning Models
              </h3>
              <p className="text-gray-600 mb-6">
                Select a target column to predict, or use voice: "Train a model to predict [column]"
              </p>
            </div>
            <ModelTraining 
              columns={datasetInfo.columns}
              onTrainingComplete={handleTrainingComplete}
            />
          </div>
        )}

        {/* Show training results */}
        {trainingResults && (
          <div className="mb-8 animate-fadeIn">
            <ModelComparison results={trainingResults} />
          </div>
        )}

        {/* Step 4: Explanations */}
        {explanations && (
          <div className="mb-8 animate-fadeIn">
            <SHAPPlots explanations={explanations} />
          </div>
        )}

        {/* Quick Actions */}
        {(datasetInfo || analysisResults || trainingResults) && (
          <div className="mt-12 flex justify-center space-x-4">
            <button
              onClick={() => {
                if (confirm('Are you sure you want to start over? This will clear all progress.')) {
                  setDatasetInfo(null);
                  setAnalysisResults(null);
                  setTrainingResults(null);
                  setExplanations(null);
                  setCurrentStep('upload');
                  setShowDashboard(false);
                }
              }}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg border border-gray-300 transition-colors"
            >
              🔄 Start Over
            </button>
            
            {datasetInfo && !analysisResults && (
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg shadow-lg transition-all disabled:opacity-50"
              >
                {isAnalyzing ? 'Analyzing...' : '📊 Quick Analyze'}
              </button>
            )}
          </div>
        )}

        {/* Helper Text */}
        <div className="mt-12 max-w-2xl mx-auto">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-3">
              💡 Voice Commands You Can Try:
            </h3>
            <div className="grid md:grid-cols-2 gap-3 text-sm text-blue-800">
              <div className="space-y-2">
                <p>• "Upload my data"</p>
                <p>• "Analyze the data"</p>
                <p>• "Show me the dashboard"</p>
              </div>
              <div className="space-y-2">
                <p>• "Train a model to predict sales"</p>
                <p>• "Explain the best model"</p>
                <p>• "Show feature importance"</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Helper Components
function Step({ 
  number, 
  label, 
  active, 
  completed 
}: { 
  number: number; 
  label: string; 
  active: boolean; 
  completed: boolean; 
}) {
  return (
    <div className="flex flex-col items-center">
      <div className={`
        w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg 
        transition-all duration-300 shadow-lg
        ${completed 
          ? 'bg-green-500 text-white shadow-green-200' 
          : active 
          ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-purple-200' 
          : 'bg-gray-300 text-gray-600 shadow-gray-200'
        }
      `}>
        {completed ? '✓' : number}
      </div>
      <div className={`
        mt-2 text-sm font-medium transition-colors
        ${active ? 'text-purple-600' : 'text-gray-600'}
      `}>
        {label}
      </div>
    </div>
  );
}

function StepConnector() {
  return (
    <div className="flex-1 h-1 bg-gradient-to-r from-gray-300 via-purple-200 to-gray-300 mx-4 rounded-full"></div>
  );
}