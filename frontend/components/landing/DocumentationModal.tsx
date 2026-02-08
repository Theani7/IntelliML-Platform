import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';

// Inline Icons to avoid dependency issues
const BookOpenIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
);
const CloudUploadIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
);
const SparklesIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
);
const ChartBarIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
);
const BeakerIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
);
const LightBulbIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
);

interface DocumentationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function DocumentationModal({ isOpen, onClose }: DocumentationModalProps) {
    const [activeSection, setActiveSection] = useState('overview');

    const sections = [
        { id: 'overview', title: 'Overview', icon: <BookOpenIcon className="w-5 h-5" /> },
        { id: 'upload', title: 'Data Upload', icon: <CloudUploadIcon className="w-5 h-5" /> },
        { id: 'prep', title: 'Data Preparation', icon: <SparklesIcon className="w-5 h-5" /> },
        { id: 'eda', title: 'Exploratory Analysis', icon: <ChartBarIcon className="w-5 h-5" /> },
        { id: 'training', title: 'Model Training', icon: <BeakerIcon className="w-5 h-5" /> },
        { id: 'results', title: 'Results & Deployment', icon: <LightBulbIcon className="w-5 h-5" /> },
    ];

    const renderContent = () => {
        switch (activeSection) {
            case 'overview':
                return (
                    <div className="space-y-6">
                        <h3 className="text-2xl font-bold text-white">Welcome to IntelliML</h3>
                        <p className="text-gray-300">
                            IntelliML is an autonomous machine learning platform designed to democratize data science.
                            It guides you through the entire lifecycle—from raw data to deployed models—without requiring deep technical expertise.
                        </p>
                        <div className="grid grid-cols-2 gap-4 mt-8">
                            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                <h4 className="font-semibold text-blue-400 mb-2">No-Code / Low-Code</h4>
                                <p className="text-sm text-gray-400">Perform complex ML tasks using a simple, intuitive interface.</p>
                            </div>
                            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                <h4 className="font-semibold text-purple-400 mb-2">AutoML Engine</h4>
                                <p className="text-sm text-gray-400">Automatically selects the best algorithms and hyperparameters for your data.</p>
                            </div>
                        </div>
                    </div>
                );
            case 'upload':
                return (
                    <div className="space-y-6">
                        <h3 className="text-2xl font-bold text-white">Data Upload</h3>
                        <p className="text-gray-300">Start by uploading your dataset. We support CSV, Excel, and JSON formats.</p>

                        <div className="bg-slate-900/50 p-4 rounded-lg border border-white/10">
                            <h4 className="font-semibold text-white mb-2">Requirements</h4>
                            <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
                                <li>File size under 50MB (for best performance)</li>
                                <li>Clean tabular data (columns as features, rows as samples)</li>
                                <li>Header row representing column names</li>
                            </ul>
                        </div>
                    </div>
                );
            case 'prep':
                return (
                    <div className="space-y-6">
                        <h3 className="text-2xl font-bold text-white">Data Preparation</h3>
                        <p className="text-gray-300">Clean and transform your data to improve model quality.</p>

                        <div className="space-y-4">
                            <div>
                                <h4 className="text-lg font-semibold text-cyan-400">Cleaning</h4>
                                <p className="text-sm text-gray-400">Handle missing values (drop or fill) and remove duplicates.</p>
                            </div>
                            <div>
                                <h4 className="text-lg font-semibold text-rose-400">Outlier Detection</h4>
                                <p className="text-sm text-gray-400">Identify anomalies using IQR or Z-Score methods and remove them to prevent skewing results.</p>
                            </div>
                            <div>
                                <h4 className="text-lg font-semibold text-violet-400">Feature Engineering</h4>
                                <p className="text-sm text-gray-400">Create new features (Polynomial, Log, Interaction) to capture complex patterns.</p>
                            </div>
                        </div>
                    </div>
                );
            case 'eda':
                return (
                    <div className="space-y-6">
                        <h3 className="text-2xl font-bold text-white">Exploratory Data Analysis (EDA)</h3>
                        <p className="text-gray-300">Understand your data before training.</p>
                        <ul className="list-disc list-inside text-gray-400 space-y-2">
                            <li><strong className="text-white">Distribution Plots:</strong> See how your data is spread.</li>
                            <li><strong className="text-white">Correlation Matrix:</strong> Identify relationships between features.</li>
                            <li><strong className="text-white">AI Insights:</strong> Get automated text summaries of interesting patterns.</li>
                        </ul>
                    </div>
                );
            case 'training':
                return (
                    <div className="space-y-6">
                        <h3 className="text-2xl font-bold text-white">Model Training</h3>
                        <p className="text-gray-300">Train multiple models simultaneously.</p>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-white/5 rounded border border-white/10">
                                <div className="text-xs text-gray-500 uppercase">Regression</div>
                                <div className="text-sm text-white mt-1">Random Forest, XGBoost, Linear, Ridge, Lasso</div>
                            </div>
                            <div className="p-3 bg-white/5 rounded border border-white/10">
                                <div className="text-xs text-gray-500 uppercase">Classification</div>
                                <div className="text-sm text-white mt-1">Random Forest, XGBoost, Gradient Boosting, SVM, KNN</div>
                            </div>
                        </div>

                        <p className="text-sm text-gray-400 mt-4">
                            Enable <strong>Hyperparameter Tuning</strong> to automatically find the optimal settings for each algorithm.
                        </p>
                    </div>
                );
            case 'results':
                return (
                    <div className="space-y-6">
                        <h3 className="text-2xl font-bold text-white">Results & Deployment</h3>
                        <p className="text-gray-300">Evaluate model performance and explain predictions.</p>

                        <div className="space-y-4">
                            <div>
                                <h4 className="text-white font-medium">Evaluation Metrics</h4>
                                <p className="text-sm text-gray-400">Accuracy, F1-Score, MSE, R2, and more depending on the task.</p>
                            </div>
                            <div>
                                <h4 className="text-white font-medium">Explainability (SHAP)</h4>
                                <p className="text-sm text-gray-400">Understand <em>why</em> a model made a specific prediction. See which features contributed most.</p>
                            </div>
                            <div>
                                <h4 className="text-white font-medium">Deployment</h4>
                                <p className="text-sm text-gray-400">Download your trained model as a simplified Pickle file or use the built-in Batch Prediction tool.</p>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[100]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-5xl transform overflow-hidden rounded-2xl bg-slate-900 border border-white/10 shadow-2xl transition-all flex h-[700px]">
                                {/* Sidebar */}
                                <div className="w-64 bg-slate-950 border-r border-white/10 p-4 flex flex-col">
                                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                        <span className="bg-blue-600 rounded p-1"><BookOpenIcon className="w-4 h-4 text-white" /></span>
                                        Documentation
                                    </h2>
                                    <nav className="space-y-1 flex-1">
                                        {sections.map(section => (
                                            <button
                                                key={section.id}
                                                onClick={() => setActiveSection(section.id)}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${activeSection === section.id
                                                    ? 'bg-blue-600/10 text-blue-400 font-medium'
                                                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                                    }`}
                                            >
                                                {section.icon}
                                                {section.title}
                                            </button>
                                        ))}
                                    </nav>
                                    <div className="pt-4 border-t border-white/10 text-xs text-gray-600 text-center">
                                        v1.0.0 Stable
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 flex flex-col min-w-0">
                                    {/* Header */}
                                    <div className="h-16 flex items-center justify-end px-6 border-b border-white/5">
                                        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                                            <span className="sr-only">Close</span>
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>

                                    {/* Scrollable Body */}
                                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                        <div className="max-w-3xl mx-auto animate-fadeIn">
                                            {renderContent()}
                                        </div>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
