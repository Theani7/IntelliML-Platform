'use client';

import { useState, useEffect } from 'react';
import AnimatedSphere from './AnimatedSphere';
import DocumentationModal from './DocumentationModal';

// --- Icons ---
const PlayIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);

const GitHubIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
  </svg>
);

const UploadCloudIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const ChatBubbleIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const LightBulbIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const DatabaseIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const WrenchIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ChipIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
  </svg>
);

const ChartBarIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const RocketIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
  </svg>
);

const LightningIcon = () => (
  <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const CubeIcon = () => (
  <svg className="w-8 h-8 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const TargetIcon = () => (
  <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// --- Components ---

export default function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [showDocs, setShowDocs] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden font-sans selection:bg-cyan-500/30">

      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-cyan-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '1s' }} />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]"></div>
      </div>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 container mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16">

          <div className="flex-1 space-y-8 z-10 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              v2.0 Now Available with Voice Control
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]">
              The Future of <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 animate-gradient-x">
                Intelligent Data Science
              </span>
            </h1>

            <p className="text-xl text-gray-400 max-w-xl leading-relaxed">
              Stop fighting with spreadsheets and Python scripts.
              Just upload your data and <strong>talk</strong>. IntelliML builds models,
              finds insights, and visualizes trends—automatically.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-4">
              <button
                onClick={onGetStarted}
                className="group relative px-8 py-4 bg-white text-black rounded-lg font-bold text-lg hover:bg-gray-100 transition-all hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
                <span className="flex items-center gap-2">
                  Start Analysis Free
                  <ArrowRightIcon />
                </span>
              </button>

              <a
                href="https://www.youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 flex items-center gap-2 rounded-lg font-semibold text-gray-300 hover:text-white border border-white/10 hover:border-white/30 hover:bg-white/5 transition-all"
              >
                <PlayIcon />
                Watch Demo
              </a>
            </div>

            <div className="pt-8 flex items-center gap-6 text-sm text-gray-500 font-medium">
              <span className="flex items-center gap-2"><CheckCircleIcon /> No Coding Required</span>
              <span className="flex items-center gap-2"><CheckCircleIcon /> Instant Results</span>
              <span className="flex items-center gap-2"><CheckCircleIcon /> Secure & Private</span>
            </div>
          </div>

          <div className="flex-1 w-full relative h-[500px] flex items-center justify-center lg:justify-end">
            {/* Abstract Visualization of "AI Thinking" */}
            <div className="relative w-full max-w-lg aspect-square">
              <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full animate-pulse"></div>
              <div className="relative z-10 w-full h-full scale-125">
                <AnimatedSphere />
              </div>

              {/* Floating Cards simulating analysis */}
              <div className="absolute top-10 left-0 bg-slate-900/80 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl shadow-black/50 animate-float" style={{ animationDelay: '0s' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center text-blue-400"><ChatBubbleIcon /></div>
                  <div className="text-sm font-semibold">"Predict churn for Q3"</div>
                </div>
                <div className="h-1 w-24 bg-blue-500/30 rounded-full overflow-hidden">
                  <div className="h-full w-2/3 bg-blue-400 rounded-full animate-progress"></div>
                </div>
              </div>

              <div className="absolute bottom-20 right-0 bg-slate-900/80 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl shadow-black/50 animate-float" style={{ animationDelay: '2s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-400"><CheckCircleIcon /></div>
                  <div>
                    <div className="text-xs text-gray-400">Model Accuracy</div>
                    <div className="text-xl font-bold text-white">94.8%</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* --- DATA SCIENCE LIFECYCLE --- */}
      <section className="py-24 bg-slate-900/30 border-y border-white/5 backdrop-blur-sm">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Data Science, Democratized.</h2>
            <p className="text-gray-400">
              IntelliML covers the complete data science lifecycle—from raw data to production deployment.
            </p>
          </div>

          {/* Lifecycle Steps */}
          <div className="relative">
            {/* Connection Line */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/0 via-cyan-500/50 to-blue-500/0 transform -translate-y-1/2" />

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <LifecycleStep
                number={1}
                title="Collect"
                icon={<DatabaseIcon />}
                desc="CSV/Excel Upload"
                color="blue"
              />
              <LifecycleStep
                number={2}
                title="Understand"
                icon={<SearchIcon />}
                desc="EDA & Statistics"
                color="cyan"
              />
              <LifecycleStep
                number={3}
                title="Prepare"
                icon={<WrenchIcon />}
                desc="Clean & Engineer"
                color="emerald"
              />
              <LifecycleStep
                number={4}
                title="Model"
                icon={<ChipIcon />}
                desc="10+ Algorithms"
                color="purple"
              />
              <LifecycleStep
                number={5}
                title="Evaluate"
                icon={<ChartBarIcon />}
                desc="Metrics & Charts"
                color="pink"
              />
              <LifecycleStep
                number={6}
                title="Interpret"
                icon={<LightBulbIcon />}
                desc="SHAP Explain"
                color="amber"
              />
              <LifecycleStep
                number={7}
                title="Deploy"
                icon={<RocketIcon />}
                desc="Export & Predict"
                color="rose"
              />
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="mt-16 grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-gradient-to-b from-white/5 to-transparent border border-white/10">
              <div className="mb-3"><TargetIcon /></div>
              <h4 className="text-lg font-semibold text-white mb-2">Data Preparation</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Outlier Detection (IQR/Z-score)</li>
                <li>• Feature Engineering</li>
                <li>• Missing Value Handling</li>
              </ul>
            </div>
            <div className="p-6 rounded-xl bg-gradient-to-b from-white/5 to-transparent border border-white/10">
              <div className="mb-3"><LightningIcon /></div>
              <h4 className="text-lg font-semibold text-white mb-2">AutoML Training</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Random Forest, XGBoost, LightGBM</li>
                <li>• Hyperparameter Tuning</li>
                <li>• Cross-Validation</li>
              </ul>
            </div>
            <div className="p-6 rounded-xl bg-gradient-to-b from-white/5 to-transparent border border-white/10">
              <div className="mb-3"><CubeIcon /></div>
              <h4 className="text-lg font-semibold text-white mb-2">Model Deployment</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Download .joblib Model</li>
                <li>• Python Code Export</li>
                <li>• Batch Prediction</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* --- USE CASES --- */}
      <section className="py-24 container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Built for <span className="text-blue-400">Every Team</span>
            </h2>
            <p className="text-gray-400 mb-8 text-lg">
              Whether you're in finance, marketing, or operations, IntelliML adapts to your data.
            </p>

            <div className="space-y-4">
              <UseCaseRow title="Marketing Teams" desc="Predict customer churn and optimize campaign ROI." />
              <UseCaseRow title="Financial Analysts" desc="Forecast revenue and detect anomalies in transaction data." />
              <UseCaseRow title="Product Managers" desc="Analyze user feedback sentiment and prioritize features." />
              <UseCaseRow title="Researchers" desc="Process experimental data and identify correlations quickly." />
            </div>

            <div className="mt-8">
              <a href="#" className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-2">
                View all use cases <ArrowRightIcon />
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-purple-600/20 rounded-2xl blur-2xl"></div>
            <div className="relative bg-slate-950 border border-white/10 rounded-2xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Project</div>
                  <div className="font-semibold text-white">Q3 Sales Forecast</div>
                </div>
                <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-full border border-emerald-500/20">Analysis Complete</div>
              </div>

              <div className="space-y-4">
                <div className="h-32 bg-slate-900 rounded-lg border border-white/5 relative overflow-hidden group">
                  <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm group-hover:text-cyan-400 transition-colors">
                    Interactive Visualization
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 h-20 bg-slate-900 rounded-lg border border-white/5 p-3">
                    <div className="text-xs text-gray-500">R2 Score</div>
                    <div className="text-2xl font-bold text-white mt-1">0.892</div>
                  </div>
                  <div className="flex-1 h-20 bg-slate-900 rounded-lg border border-white/5 p-3">
                    <div className="text-xs text-gray-500">MSE</div>
                    <div className="text-2xl font-bold text-white mt-1">124.5</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="border-t border-white/10 bg-black pt-16 pb-8">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-xl font-bold text-white mb-4">IntelliML</h3>
              <p className="text-gray-500 max-w-xs">
                Empowering teams to make data-driven decisions with the power of autonomous AI.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Developers</h4>
              <ul className="space-y-3 text-gray-500 text-sm">
                <li>
                  <a href="https://github.com/ani7" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-3 group">
                    <div className="p-1.5 bg-white/5 rounded-lg border border-white/10 group-hover:border-white/20 transition-colors">
                      <GitHubIcon />
                    </div>
                    <span className="font-medium">Anil Paneru</span>
                  </a>
                </li>
                <li>
                  <a href="https://github.com/NeonNinjaX" className="hover:text-white transition-colors flex items-center gap-3 group">
                    <div className="p-1.5 bg-white/5 rounded-lg border border-white/10 group-hover:border-white/20 transition-colors">
                      <GitHubIcon />
                    </div>
                    <span className="font-medium">Rahul Mishra</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors flex items-center gap-3 group">
                    <div className="p-1.5 bg-white/5 rounded-lg border border-white/10 group-hover:border-white/20 transition-colors">
                      <GitHubIcon />
                    </div>
                    <span className="font-medium">Mahesh Karki</span>
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-500 text-sm">
                <li>
                  <button onClick={() => setShowDocs(true)} className="hover:text-cyan-400 transition-colors text-left">
                    Documentation
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-gray-600">
            <div>&copy; 2026 IntelliML Inc. All rights reserved.</div>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-white">Privacy</a>
              <a href="#" className="hover:text-white">Terms</a>
              <a href="#" className="hover:text-white">Twitter</a>
            </div>
          </div>
        </div>
      </footer>

      <DocumentationModal isOpen={showDocs} onClose={() => setShowDocs(false)} />
    </div>
  );
}

function StepCard({ number, icon, title, desc }: any) {
  return (
    <div className="relative group p-8 rounded-2xl bg-gradient-to-b from-white/5 to-white/[0.02] border border-white/10 hover:border-blue-500/30 transition-all hover:translate-y-[-5px]">
      <div className="absolute top-4 right-6 text-4xl font-bold text-white/5 group-hover:text-blue-500/10 transition-colors font-mono">
        {number}
      </div>
      <div className="w-14 h-14 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-gray-400 leading-relaxed text-sm">
        {desc}
      </p>
    </div>
  );
}

function UseCaseRow({ title, desc }: any) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors cursor-default">
      <div className="mt-1 w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"></div>
      <div>
        <h4 className="text-white font-medium">{title}</h4>
        <p className="text-sm text-gray-500">{desc}</p>
      </div>
    </div>
  );
}

function LifecycleStep({ number, title, icon, desc, color }: any) {
  const colorMap: any = {
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
    cyan: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 text-cyan-400',
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
    pink: 'from-pink-500/20 to-pink-600/10 border-pink-500/30 text-pink-400',
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400',
    rose: 'from-rose-500/20 to-rose-600/10 border-rose-500/30 text-rose-400',
  };

  return (
    <div className={`relative p-4 rounded-xl bg-gradient-to-b ${colorMap[color]} border hover:scale-105 transition-transform cursor-default group`}>
      <div className="text-center">
        <div className="text-3xl mb-2">{icon}</div>
        <div className="text-xs font-bold text-white/50 mb-1">0{number}</div>
        <h4 className="font-semibold text-white text-sm">{title}</h4>
        <p className="text-xs text-gray-500 mt-1">{desc}</p>
      </div>
    </div>
  );
}