'use client';

import { useState, useEffect } from 'react';
import CreativeVisual from './CreativeVisual';
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
  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37.996.608 2.296.07 2.572-1.065z" />
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
  <svg className="w-8 h-8 text-[#FEB229]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const CubeIcon = () => (
  <svg className="w-8 h-8 text-[#470102]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const TargetIcon = () => (
  <svg className="w-8 h-8 text-[#470102]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <div className="min-h-screen bg-[#FFF7EA] text-[#470102] overflow-hidden font-sans selection:bg-[#FEB229]/30">

      {/* Background - Cream */}
      <div className="fixed inset-0 pointer-events-none bg-[#FFF7EA] z-[-1]">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]"></div>
      </div>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-20 pb-20 lg:pt-36 lg:pb-32 container mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16">

          <div className="flex-1 space-y-8 z-10 animate-fade-in-up">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#470102]/5 border border-[#470102]/10 text-[#470102] text-sm font-bold tracking-wide animate-fade-in-up"
              style={{ animationDelay: '0.1s' }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FEB229] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FEB229]"></span>
              </span>
              v2.0 Now Available
            </div>

            <div className="relative animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <h1 className="text-6xl md:text-8xl font-display font-bold tracking-tight leading-[1] text-[#470102]">
                Intelligent <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FEB229] to-[#d97706] drop-shadow-sm">
                  Data Future
                </span>
              </h1>
              <div className="absolute -z-10 top-10 left-10 w-32 h-32 bg-[#FEB229]/20 rounded-full blur-3xl"></div>
            </div>

            <p
              className="text-xl md:text-2xl text-[#8A5A5A] max-w-xl leading-relaxed font-serif animate-fade-in-up"
              style={{ animationDelay: '0.4s' }}
            >
              Upload your data. Ask questions.
              <br />
              <span className="italic text-[#470102] font-medium">IntelliML handles the rest.</span>
            </p>

            <div
              className="flex flex-wrap items-center gap-4 pt-4 animate-fade-in-up"
              style={{ animationDelay: '0.6s' }}
            >
              <button
                onClick={onGetStarted}
                className="group relative px-8 py-4 bg-[#FEB229] text-[#470102] rounded-xl font-bold text-lg hover:bg-[#FCA408] transition-all hover:scale-105 shadow-[4px_4px_0px_0px_#470102] hover:shadow-[2px_2px_0px_0px_#470102] active:translate-y-0.5 active:shadow-none border-2 border-[#470102]"
              >
                <span className="flex items-center gap-2">
                  Start Analysis Free
                  <ArrowRightIcon />
                </span>
              </button>

              <a
                href="https://www.youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 flex items-center gap-2 rounded-xl font-bold text-[#470102] border-2 border-[#470102]/10 hover:border-[#470102] transition-all bg-white/50 hover:bg-white"
              >
                <PlayIcon />
                Watch Demo
              </a>
            </div>

            <div
              className="pt-8 flex items-center gap-6 text-sm text-[#8A5A5A] font-bold tracking-wide uppercase animate-fade-in-up"
              style={{ animationDelay: '0.8s' }}
            >
              <span className="flex items-center gap-2"><CheckCircleIcon /> No Coding</span>
              <span className="flex items-center gap-2"><CheckCircleIcon /> Instant</span>
              <span className="flex items-center gap-2"><CheckCircleIcon /> Secure</span>
            </div>
          </div>

          <div className="flex-1 w-full relative h-[600px] flex items-center justify-center lg:justify-end">
            {/* Abstract Visualization of "AI Thinking" */}
            <div className="relative w-full max-w-xl aspect-square">
              <div className="relative z-10 w-full h-full scale-110">
                <CreativeVisual />
              </div>

              {/* Floating Cards simulating analysis */}
              <div className="absolute top-20 left-0 bg-[#FFF7EA] border-2 border-[#470102]/10 p-5 rounded-2xl shadow-xl shadow-[#470102]/5 animate-float" style={{ animationDelay: '0s' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#FEB229] flex items-center justify-center text-[#470102] font-bold border border-[#470102]"><ChatBubbleIcon /></div>
                  <div className="text-sm font-bold text-[#470102]">"Analyze sales trend"</div>
                </div>
                <div className="h-1.5 w-32 bg-[#FFEDC1] rounded-full overflow-hidden border border-[#470102]/10">
                  <div className="h-full w-2/3 bg-[#470102] rounded-full animate-progress"></div>
                </div>
              </div>

              <div className="absolute bottom-32 right-10 bg-[#FFF7EA] border-2 border-[#470102]/10 p-5 rounded-2xl shadow-xl shadow-[#470102]/5 animate-float" style={{ animationDelay: '2s' }}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 border border-emerald-200"><CheckCircleIcon /></div>
                  <div>
                    <div className="text-xs font-bold text-[#8A5A5A] uppercase tracking-wider">Accuracy</div>
                    <div className="text-2xl font-bold text-[#470102]">98.2%</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* --- DATA SCIENCE LIFECYCLE --- */}
      <section className="py-24 bg-[#FFEDC1]/30 border-y border-[#FFEDC1] backdrop-blur-sm">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-4xl font-bold mb-4 text-[#470102] font-display">Data Science, Democratized.</h2>
            <p className="text-lg text-[#8A5A5A]">
              IntelliML covers the complete lifecycle—from raw data to production deployment.
            </p>
          </div>

          {/* Lifecycle Steps */}
          <div className="relative">
            {/* Connection Line */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-[#470102]/10 transform -translate-y-1/2" />

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <LifecycleStep number={1} title="Collect" icon={<DatabaseIcon />} desc="Upload" />
              <LifecycleStep number={2} title="Understand" icon={<SearchIcon />} desc="EDA" />
              <LifecycleStep number={3} title="Prepare" icon={<WrenchIcon />} desc="Clean" />
              <LifecycleStep number={4} title="Model" icon={<ChipIcon />} desc="AutoML" />
              <LifecycleStep number={5} title="Evaluate" icon={<ChartBarIcon />} desc="Metrics" />
              <LifecycleStep number={6} title="Interpret" icon={<LightBulbIcon />} desc="SHAP" />
              <LifecycleStep number={7} title="Deploy" icon={<RocketIcon />} desc="Predict" />
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="mt-20 grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-[#FFF7EA] border border-[#FFEDC1] shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 group">
              <div className="mb-4 text-[#FEB229] group-hover:scale-110 transition-transform"><TargetIcon /></div>
              <h4 className="text-xl font-bold text-[#470102] mb-3">Smart Preparation</h4>
              <ul className="text-sm text-[#8A5A5A] space-y-2 font-medium">
                <li>• Outlier Detection</li>
                <li>• Automated Cleaning</li>
                <li>• Smart Imputation</li>
              </ul>
            </div>
            <div className="p-8 rounded-2xl bg-[#FFF7EA] border border-[#FFEDC1] shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 group">
              <div className="mb-4 text-[#FEB229] group-hover:scale-110 transition-transform"><LightningIcon /></div>
              <h4 className="text-xl font-bold text-[#470102] mb-3">AutoML Engine</h4>
              <ul className="text-sm text-[#8A5A5A] space-y-2 font-medium">
                <li>• Multi-Model Training</li>
                <li>• Hyperparameter Tuning</li>
                <li>• Best Model Selection</li>
              </ul>
            </div>
            <div className="p-8 rounded-2xl bg-[#FFF7EA] border border-[#FFEDC1] shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 group">
              <div className="mb-4 text-[#FEB229] group-hover:scale-110 transition-transform"><CubeIcon /></div>
              <h4 className="text-xl font-bold text-[#470102] mb-3">Instant Deploy</h4>
              <ul className="text-sm text-[#8A5A5A] space-y-2 font-medium">
                <li>• One-Click Export</li>
                <li>• Batch Prediction</li>
                <li>• Python Code Gen</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* --- USE CASES --- */}
      <section className="py-24 container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 text-[#470102]">
              Built for <span className="text-[#FEB229] underline decoration-4 decoration-[#FEB229]/30">Every Team</span>
            </h2>
            <p className="text-[#8A5A5A] mb-10 text-xl leading-relaxed">
              Whether you're in finance, marketing, or operations, IntelliML adapts to your data.
            </p>

            <div className="space-y-4">
              <UseCaseRow title="Marketing Teams" desc="Predict customer churn and optimize campaign ROI." />
              <UseCaseRow title="Financial Analysts" desc="Forecast revenue and detect anomalies in transaction data." />
              <UseCaseRow title="Product Managers" desc="Analyze user feedback sentiment and prioritize features." />
              <UseCaseRow title="Researchers" desc="Process experimental data and identify correlations quickly." />
            </div>

            <div className="mt-10">
              <a href="#" className="text-[#470102] hover:text-[#FEB229] font-bold text-lg flex items-center gap-2 transition-colors">
                View all use cases <ArrowRightIcon />
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#FEB229]/20 to-[#470102]/5 rounded-[3rem] blur-2xl transform rotate-3"></div>
            <div className="relative bg-[#FFF7EA] border-[3px] border-[#470102] rounded-[2rem] p-8 shadow-[10px_10px_0px_0px_#470102]">
              <div className="flex items-center justify-between mb-8 border-b-2 border-[#FFEDC1] pb-4">
                <div>
                  <div className="text-xs font-bold text-[#8A5A5A] uppercase tracking-wider">Project</div>
                  <div className="font-bold text-xl text-[#470102]">Q3 Sales Forecast</div>
                </div>
                <div className="px-4 py-1.5 bg-[#470102] text-[#FFEDC1] text-xs font-bold rounded-full">Analysis Complete</div>
              </div>

              <div className="space-y-4">
                <div className="h-40 bg-[#FFEDC1]/20 rounded-xl border border-[#FFEDC1] relative overflow-hidden group">
                  <SalesForecastChart />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 h-24 bg-[#FFEDC1]/20 rounded-xl border border-[#FFEDC1] p-4 flex flex-col justify-between">
                    <div className="text-xs font-bold text-[#8A5A5A] uppercase">R2 Score</div>
                    <div className="text-3xl font-bold text-[#470102]">0.892</div>
                  </div>
                  <div className="flex-1 h-24 bg-[#FFEDC1]/20 rounded-xl border border-[#FFEDC1] p-4 flex flex-col justify-between">
                    <div className="text-xs font-bold text-[#8A5A5A] uppercase">MSE</div>
                    <div className="text-3xl font-bold text-[#470102]">124.5</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="border-t-[3px] border-[#FEB229] bg-[#470102] pt-20 pb-10 relative z-10 text-[#FFF7EA]">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-3xl font-display font-bold text-[#FEB229] mb-6">IntelliML</h3>
              <p className="text-[#FFF7EA]/80 max-w-sm text-lg leading-relaxed">
                Empowering teams to make data-driven decisions with the power of autonomous AI.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-[#FFF7EA] mb-6 uppercase tracking-wider">Developers</h4>
              <ul className="space-y-4 text-[#FFEDC1]/80">
                <li>
                  <a href="https://github.com/ani7" target="_blank" rel="noopener noreferrer" className="hover:text-[#FEB229] transition-colors flex items-center gap-3">
                    <GitHubIcon /> <span className="font-medium">Anil Paneru</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-[#FEB229] transition-colors flex items-center gap-3">
                    <GitHubIcon /> <span className="font-medium">Rahul Mishra</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-[#FEB229] transition-colors flex items-center gap-3">
                    <GitHubIcon /> <span className="font-medium">Mahesh Karki</span>
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-[#FFF7EA] mb-6 uppercase tracking-wider">Resources</h4>
              <ul className="space-y-3 text-[#FFEDC1]/80">
                <li>
                  <button onClick={() => setShowDocs(true)} className="hover:text-[#FEB229] transition-colors text-left font-medium">
                    Documentation
                  </button>
                </li>
                <li><a href="#" className="hover:text-[#FEB229]">API Reference</a></li>
                <li><a href="#" className="hover:text-[#FEB229]">Community</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[#FFF7EA]/10 pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-[#FFEDC1]/50 font-medium">
            <div>&copy; 2026 IntelliML Inc. All rights reserved.</div>
            <div className="flex gap-8 mt-4 md:mt-0">
              <a href="#" className="hover:text-[#FEB229]">Privacy</a>
              <a href="#" className="hover:text-[#FEB229]">Terms</a>
              <a href="#" className="hover:text-[#FEB229]">Twitter</a>
            </div>
          </div>
        </div>
      </footer>

      <DocumentationModal isOpen={showDocs} onClose={() => setShowDocs(false)} />
    </div>
  );
}

function UseCaseRow({ title, desc }: any) {
  return (
    <div className="flex items-start gap-5 p-5 rounded-xl hover:bg-[#FFEDC1]/50 transition-colors cursor-default border border-transparent hover:border-[#470102]/10 group">
      <div className="mt-1.5 w-3 h-3 rounded-full bg-[#FEB229] shadow-[0_0_0_4px_#FFF7EA] group-hover:scale-125 transition-transform"></div>
      <div>
        <h4 className="text-[#470102] font-bold text-lg mb-1">{title}</h4>
        <p className="text-[#8A5A5A]">{desc}</p>
      </div>
    </div>
  );
}

function LifecycleStep({ number, title, icon, desc }: any) {
  return (
    <div className="relative p-5 rounded-xl bg-white border-2 border-[#470102]/5 hover:border-[#FEB229] hover:scale-105 transition-all cursor-default group shadow-sm hover:shadow-lg">
      <div className="text-center">
        <div className="text-4xl mb-3 text-[#470102] group-hover:text-[#FEB229] transition-colors transform group-hover:rotate-6 duration-300">{icon}</div>
        <div className="text-xs font-bold text-[#8A5A5A] uppercase tracking-wider mb-1">Step 0{number}</div>
        <h4 className="font-bold text-[#470102] text-lg">{title}</h4>
        <p className="text-xs text-[#8A5A5A] mt-1 font-medium bg-[#FFF7EA] inline-block px-2 py-0.5 rounded-full">{desc}</p>
      </div>
    </div>
  );
}

function SalesForecastChart() {
  return (
    <div className="absolute inset-0 p-6 flex flex-col justify-end overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 z-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#470102 1px, transparent 1px)', backgroundSize: '100% 25%' }}></div>

      <div className="flex items-end justify-between gap-2 h-full z-10 px-2 relative">
        {/* Trend Line (Approximate) */}
        <svg className="absolute top-0 left-0 w-full h-full overflow-visible z-20 pointer-events-none px-4 pb-0" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path
            d="M5 65 L20 48 L35 52 L50 30 L65 35 L80 15 L95 5"
            fill="none"
            stroke="#FEB229"
            strokeWidth="2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            className="drop-shadow-md"
          />
          {/* End Point Dot */}
          <circle cx="95" cy="5" r="3" fill="#470102" stroke="#FEB229" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>

        {[35, 52, 48, 70, 65, 85, 95].map((height, i) => (
          <div
            key={i}
            className="w-full rounded-t-sm opacity-90 hover:opacity-100 transition-opacity relative group"
            style={{
              height: `${height}%`,
              backgroundColor: i === 6 ? '#470102' : '#470102',
              opacity: i === 6 ? 1 : 0.7
            }}
          >
            {/* Highlight top of each bar */}
            <div className="w-full h-1 bg-white/20 absolute top-0"></div>
          </div>
        ))}
      </div>
    </div>
  );
}