'use client';

import { useState, useRef, useEffect } from 'react';
import { sendChatMessage, getVisualizationSuggestions, clearChatHistory, VisualizationSuggestion } from '@/lib/api';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    code?: string | null;
    output?: string | null;
    visualization?: string | null;
    error?: boolean;
}

export default function DataChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<VisualizationSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load suggestions when component mounts
    useEffect(() => {
        loadSuggestions();
    }, []);

    const loadSuggestions = async () => {
        try {
            const result = await getVisualizationSuggestions();
            setSuggestions(result.suggestions);
        } catch (error) {
            console.error('Failed to load suggestions:', error);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');

        // Add user message
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const response = await sendChatMessage(userMessage);

            // Add assistant response
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: response.text,
                code: response.code,
                output: response.output,
                visualization: response.visualization,
                error: response.error
            }]);
        } catch (error: any) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Error: ${error.message || 'Failed to get response'}`,
                error: true
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleClear = async () => {
        try {
            await clearChatHistory();
            setMessages([]);
        } catch (error) {
            console.error('Failed to clear history:', error);
        }
    };

    const handleSuggestionClick = (suggestion: VisualizationSuggestion) => {
        setInput(`Create a ${suggestion.type} chart: ${suggestion.description}`);
        setShowSuggestions(false);
    };

    const exampleQuestions = [
        "What is the average age of passengers?",
        "Show me the distribution of Fare",
        "How many passengers survived?",
        "What is the correlation between Age and Fare?",
        "Create a bar chart of passenger classes"
    ];

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 h-[600px] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-t-xl">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🤖</span>
                        <div>
                            <h3 className="text-lg font-semibold text-white">AI Data Assistant</h3>
                            <p className="text-cyan-100 text-sm">Ask questions about your data</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowSuggestions(!showSuggestions)}
                            className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-400 text-white rounded-lg transition-colors"
                        >
                            💡 Suggestions
                        </button>
                        <button
                            onClick={handleClear}
                            className="px-3 py-1.5 text-sm bg-blue-700 hover:bg-blue-600 text-white rounded-lg transition-colors"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            </div>

            {/* Suggestions Panel */}
            {showSuggestions && suggestions.length > 0 && (
                <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                    <p className="text-sm font-medium text-blue-800 mb-2">Suggested Visualizations:</p>
                    <div className="flex flex-wrap gap-2">
                        {suggestions.map((s, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleSuggestionClick(s)}
                                className="px-3 py-1.5 text-sm bg-white border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-blue-700"
                            >
                                📊 {s.title}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500">
                        <span className="text-5xl mb-4">💬</span>
                        <p className="text-lg font-medium mb-4">Ask me anything about your data!</p>
                        <div className="flex flex-wrap gap-2 justify-center max-w-md">
                            {exampleQuestions.map((q, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setInput(q)}
                                    className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white'
                                    : msg.error
                                        ? 'bg-red-50 border border-red-200 text-red-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}
                            >
                                {/* Main text */}
                                <div className="whitespace-pre-wrap text-sm">{msg.content}</div>

                                {/* Code block */}
                                {msg.code && (
                                    <div className="mt-3">
                                        <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto">
                                            <pre className="text-green-400 text-xs font-mono">{msg.code}</pre>
                                        </div>
                                    </div>
                                )}

                                {/* Output */}
                                {msg.output && (
                                    <div className="mt-3">
                                        <p className="text-xs font-semibold text-gray-600 mb-1">Output:</p>
                                        <div className="bg-white rounded-lg p-3 border border-gray-200 overflow-x-auto">
                                            <pre className="text-gray-800 text-xs font-mono whitespace-pre-wrap">{msg.output}</pre>
                                        </div>
                                    </div>
                                )}

                                {/* Visualization */}
                                {msg.visualization && (
                                    <div className="mt-3">
                                        <p className="text-xs font-semibold text-gray-600 mb-1">Visualization:</p>
                                        <img
                                            src={msg.visualization}
                                            alt="Data visualization"
                                            className="rounded-lg border border-gray-200 max-w-full"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}

                {/* Loading indicator */}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 rounded-2xl px-4 py-3">
                            <div className="flex items-center gap-2">
                                <div className="animate-pulse flex gap-1">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                                <span className="text-sm text-gray-500">Analyzing data...</span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask about your data... (e.g., 'What is the average age?')"
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                    >
                        <span>Send</span>
                        <span>→</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
