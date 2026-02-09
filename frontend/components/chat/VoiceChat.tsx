'use client';

import { useState, useRef, useEffect } from 'react';
import { sendChatMessage, getVisualizationSuggestions, clearChatHistory, VisualizationSuggestion, transcribeAudio } from '@/lib/api';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    code?: string | null;
    output?: string | null;
    visualization?: string | null;
    error?: boolean;
    timestamp: Date;
}

// Icon Components - Warm Retro Style
const MicIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
);

const StopIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
);

const SendIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
);

const SparklesIcon = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
);

const CopyIcon = () => (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const UserIcon = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
);

const BotIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H6a2 2 0 01-2-2v-1H3a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2zM9 16a1 1 0 100-2 1 1 0 000 2zm6 0a1 1 0 100-2 1 1 0 000 2z" />
    </svg>
);

const SpinnerIcon = () => (
    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// Python syntax highlighter - Updated colors for Warm Retro
const highlightPython = (code: string): React.ReactNode[] => {
    const tokens: { type: string; value: string }[] = [];
    let remaining = code;

    const patterns: [string, RegExp][] = [
        ['comment', /^#.*/],
        ['string', /^('''[\s\S]*?'''|"""[\s\S]*?"""|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/],
        ['decorator', /^@\w+/],
        ['keyword', /^(def|class|if|elif|else|for|while|try|except|finally|with|return|yield|import|from|as|in|is|not|and|or|True|False|None|lambda|pass|break|continue|raise|assert|global|nonlocal|async|await)\b/],
        ['builtin', /^(print|len|range|str|int|float|list|dict|set|tuple|bool|type|isinstance|hasattr|getattr|setattr|open|input|sum|min|max|abs|round|sorted|reversed|enumerate|zip|map|filter|any|all|format)\b/],
        ['function', /^([a-zA-Z_]\w*)\s*(?=\()/],
        ['number', /^(\d+\.?\d*([eE][+-]?\d+)?|\.\d+([eE][+-]?\d+)?)/],
        ['operator', /^(==|!=|<=|>=|<|>|\+|-|\*\*|\*|\/\/|\/|%|=|\+=|-=|\*=|\/=|&|\||\^|~|<<|>>)/],
        ['punctuation', /^[()[\]{},.:;]/],
        ['variable', /^[a-zA-Z_]\w*/],
        ['whitespace', /^\s+/],
    ];

    while (remaining.length > 0) {
        let matched = false;
        for (const [type, pattern] of patterns) {
            const match = remaining.match(pattern);
            if (match) {
                tokens.push({ type, value: match[0] });
                remaining = remaining.slice(match[0].length);
                matched = true;
                break;
            }
        }
        if (!matched) {
            tokens.push({ type: 'text', value: remaining[0] });
            remaining = remaining.slice(1);
        }
    }

    const colors: Record<string, string> = {
        comment: 'text-gray-500 italic',
        string: 'text-[#8A5A5A]', // Muted Red
        decorator: 'text-[#FEB229]', // Gold
        keyword: 'text-[#470102] font-bold', // Dark Red
        builtin: 'text-[#8A5A5A] font-medium',
        function: 'text-[#470102]',
        number: 'text-[#FEB229]',
        operator: 'text-gray-600',
        punctuation: 'text-gray-500',
        variable: 'text-gray-800',
        whitespace: '',
        text: 'text-gray-800',
    };

    return tokens.map((token, i) => (
        <span key={i} className={colors[token.type] || 'text-gray-800'}>
            {token.value}
        </span>
    ));
};

// Collapsible code block component with Warm Retro Style
const CollapsibleCode = ({ lang, code, isPython }: { lang: string; code: string; isPython: boolean }) => {
    const [isExpanded, setIsExpanded] = useState(false); // Collapsed by default
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(code);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="my-4 rounded-xl overflow-hidden border border-[#FFEDC1] shadow-sm bg-[#FFF7EA]/50">
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#FFF7EA] border-b border-[#FFEDC1]">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-[#470102]/20"></div>
                        <div className="w-3 h-3 rounded-full bg-[#FEB229]/50"></div>
                        <div className="w-3 h-3 rounded-full bg-[#8A5A5A]/30"></div>
                    </div>
                    <span className="ml-3 text-xs font-mono text-[#8A5A5A] select-none font-bold uppercase tracking-wider">
                        {lang || 'code'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleCopy}
                        className={`text-xs transition-colors flex items-center gap-1.5 font-medium px-2 py-1 rounded-md border ${isCopied ? 'bg-green-100 text-green-700 border-green-200' : 'text-[#8A5A5A] hover:text-[#470102] hover:bg-[#FFEDC1]/50 border-transparent'}`}
                    >
                        {isCopied ? (
                            <>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                <span>Copied!</span>
                            </>
                        ) : (
                            <>
                                <CopyIcon />
                                <span>Copy</span>
                            </>
                        )}
                    </button>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-[#8A5A5A] hover:text-[#470102] transition-colors p-1.5 rounded-md hover:bg-[#FFEDC1]/50"
                    >
                        <svg
                            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Code Content */}
            {isExpanded && (
                <div className="p-4 overflow-x-auto bg-white/50">
                    <pre className="text-xs font-mono leading-relaxed bg-transparent text-[#470102]">
                        {isPython ? highlightPython(code) : <span className="text-[#470102]">{code}</span>}
                    </pre>
                </div>
            )}
        </div>
    );
};

// Markdown renderer for chat messages
const renderMarkdown = (text: string) => {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
        // Match code blocks ```...```
        const codeBlockMatch = remaining.match(/^```(\w*)\n?([\s\S]*?)```/);
        if (codeBlockMatch) {
            const lang = codeBlockMatch[1] || 'python';
            const code = codeBlockMatch[2].trim();
            const isPython = lang.toLowerCase() === 'python' || lang === '' || lang.toLowerCase() === 'py';
            parts.push(<CollapsibleCode key={key++} lang={lang} code={code} isPython={isPython} />);
            remaining = remaining.slice(codeBlockMatch[0].length);
            continue;
        }

        // Match Headers (###, ##, #)
        const headerMatch = remaining.match(/^(#{1,3})\s+(.+?)(\n|$)/);
        if (headerMatch) {
            const level = headerMatch[1].length;
            const content = headerMatch[2];
            const className = level === 1 ? "text-xl font-bold text-[#470102] mt-4 mb-2 border-b border-[#FFEDC1] pb-1" :
                level === 2 ? "text-lg font-bold text-[#470102] mt-3 mb-2" :
                    "text-base font-bold text-[#8A5A5A] mt-2 mb-1";
            parts.push(<div key={key++} className={className}>{content}</div>);
            remaining = remaining.slice(headerMatch[0].length);
            continue;
        }

        // Match Lists ( - or * )
        const listMatch = remaining.match(/^(\s*[-*]\s+.+?)(\n|$)/);
        if (listMatch) {
            parts.push(
                <div key={key++} className="flex gap-2 ml-1 my-1">
                    <span className="text-[#FEB229] mt-1.5">•</span>
                    <span className="text-[#470102] leading-relaxed">{listMatch[1].replace(/^\s*[-*]\s+/, '')}</span>
                </div>
            );
            remaining = remaining.slice(listMatch[0].length);
            continue;
        }

        // Match Inline Code `...`
        const inlineCodeMatch = remaining.match(/^`([^`]+)`/);
        if (inlineCodeMatch) {
            parts.push(
                <code key={key++} className="bg-[#FFF7EA] px-1.5 py-0.5 rounded text-[#470102] text-xs font-mono border border-[#FFEDC1] font-bold">
                    {inlineCodeMatch[1]}
                </code>
            );
            remaining = remaining.slice(inlineCodeMatch[0].length);
            continue;
        }

        // Match Bold **...**
        const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/) || remaining.match(/^__([^_]+)__/);
        if (boldMatch) {
            parts.push(<strong key={key++} className="font-bold text-[#470102]">{boldMatch[1]}</strong>);
            remaining = remaining.slice(boldMatch[0].length);
            continue;
        }

        // Plain Text
        const nextSpecial = remaining.search(/```|`|\*\*|__|#{1,3}\s|^\s*[-*]\s/m);

        if (nextSpecial === -1) {
            parts.push(<span key={key++} className="text-[#470102] leading-relaxed whitespace-pre-wrap">{remaining}</span>);
            break;
        } else if (nextSpecial === 0) {
            parts.push(<span key={key++}>{remaining[0]}</span>);
            remaining = remaining.slice(1);
        } else {
            parts.push(<span key={key++} className="text-[#470102] leading-relaxed whitespace-pre-wrap">{remaining.slice(0, nextSpecial)}</span>);
            remaining = remaining.slice(nextSpecial);
        }
    }

    return <div className="space-y-1">{parts}</div>;
};

export default function VoiceChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<VisualizationSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Voice recording state
    const [isRecording, setIsRecording] = useState(false);
    const [isPreparing, setIsPreparing] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [voiceError, setVoiceError] = useState<string | null>(null);

    // Recording refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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

    const handleSend = async (text?: string) => {
        const messageText = text || input.trim();
        if (!messageText || isLoading) return;

        setInput('');

        setMessages(prev => [...prev, {
            role: 'user',
            content: messageText,
            timestamp: new Date()
        }]);
        setIsLoading(true);

        try {
            const response = await sendChatMessage(messageText);

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: response.text,
                code: response.code,
                output: response.output,
                visualization: response.visualization,
                error: response.error,
                timestamp: new Date()
            }]);
        } catch (error: any) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Error: ${error.message || 'Unable to process your request'}`,
                error: true,
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Voice logic remains identical, just need to re-include it
    const startRecording = async () => {
        try {
            setIsPreparing(true);
            setVoiceError(null);
            audioChunksRef.current = [];

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true,
                }
            });

            streamRef.current = stream;

            let mimeType = 'audio/webm;codecs=opus';
            if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'audio/webm';
            if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'audio/mp4';

            const mediaRecorder = new MediaRecorder(stream, { mimeType });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onerror = () => {
                setVoiceError('Recording error');
                setIsRecording(false);
            };

            mediaRecorder.start(200);
            mediaRecorderRef.current = mediaRecorder;

            setIsRecording(true);
            setIsPreparing(false);

        } catch (err: any) {
            setVoiceError('Microphone access denied or not found');
            setIsPreparing(false);
        }
    };

    const stopRecording = async () => {
        const mediaRecorder = mediaRecorderRef.current;
        if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

        return new Promise<void>((resolve) => {
            mediaRecorder.onstop = async () => {
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }

                setIsRecording(false);
                mediaRecorderRef.current = null;

                if (audioChunksRef.current.length === 0) {
                    setVoiceError('No audio recorded');
                    resolve();
                    return;
                }

                const audioBlob = new Blob(audioChunksRef.current, {
                    type: mediaRecorder.mimeType || 'audio/webm'
                });

                if (audioBlob.size < 1000) {
                    setVoiceError('Recording too short');
                    resolve();
                    return;
                }

                setIsTranscribing(true);
                try {
                    const result = await transcribeAudio(audioBlob);
                    if (result.success && result.text) {
                        await handleSend(result.text);
                    } else {
                        setVoiceError('Could not transcribe audio');
                    }
                } catch (err: any) {
                    setVoiceError('Transcription failed');
                } finally {
                    setIsTranscribing(false);
                }
                resolve();
            };
            mediaRecorder.stop();
        });
    };

    const handleVoiceClick = async () => {
        setVoiceError(null);
        if (isRecording) {
            await stopRecording();
        } else {
            await startRecording();
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
            console.error('Failed to clear');
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const quickQuestions = [
        "Show data summary",
        "Which columns have missing values?",
        "What is the average of numeric columns?",
        "Create a correlation heatmap"
    ];

    return (
        <div className="h-full flex flex-col bg-[#FFF7EA] rounded-[24px] shadow-sm border border-[#FFEDC1] overflow-hidden relative">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#FEB229]/5 rounded-full blur-[120px] pointer-events-none" />

            {/* Header */}
            <div className="px-6 py-5 bg-[#FFF7EA]/80 backdrop-blur-xl border-b border-[#FFEDC1] z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-[#470102] flex items-center justify-center shadow-lg shadow-[#470102]/20 text-[#FFEDC1]">
                            <BotIcon />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[#FEB229] rounded-full border-2 border-[#FFF7EA]"></div>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-[#470102] tracking-tight">AI Data Assistant</h3>
                        <p className="text-[#8A5A5A] text-xs font-bold uppercase tracking-wider">
                            IntelliML Assistant Active
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowSuggestions(!showSuggestions)}
                        className={`px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 border ${showSuggestions
                            ? 'bg-[#470102] text-[#FFEDC1] border-[#470102]'
                            : 'bg-white text-[#470102] border-[#FFEDC1] hover:bg-[#FFF7EA]'
                            }`}
                    >
                        <SparklesIcon /> Ideas
                    </button>
                    <button
                        onClick={handleClear}
                        className="px-3 py-2 text-xs font-bold bg-white hover:bg-[#FFF7EA] text-[#470102] border border-[#FFEDC1] rounded-lg transition-all"
                    >
                        Clear
                    </button>
                </div>
            </div>

            {/* Suggestions Panel */}
            {showSuggestions && (
                <div className="px-4 py-3 bg-[#FFF7EA] backdrop-blur-md border-b border-[#FFEDC1] animate-fadeIn z-10">
                    <p className="text-[10px] font-bold text-[#8A5A5A] uppercase tracking-widest mb-3 px-1">Suggested Visualizations</p>
                    <div className="flex flex-wrap gap-2">
                        {suggestions.map((s, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    handleSend(`Create a ${s.type} chart: ${s.description}`);
                                    setShowSuggestions(false);
                                }}
                                className="px-3 py-1.5 text-xs bg-white hover:bg-[#FFEDC1] text-[#470102] border border-[#FFEDC1] rounded-full transition-all hover:border-[#FEB229] font-bold"
                            >
                                {s.title}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 z-0 scrollbar-thin scrollbar-thumb-[#FFEDC1] scrollbar-track-transparent">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                        <div className="w-24 h-24 rounded-[2rem] bg-white border border-[#FFEDC1] shadow-xl shadow-[#FEB229]/5 flex items-center justify-center mb-8 relative">
                            <div className="absolute inset-0 rounded-[2rem] bg-[#FEB229]/5 animate-pulse"></div>
                            <div className="text-[#470102]"><BotIcon /></div>
                        </div>
                        <h4 className="text-2xl font-bold text-[#470102] mb-3">How can I help you?</h4>
                        <p className="text-[#8A5A5A] mb-8 max-w-sm text-sm leading-relaxed">
                            I can analyze your dataset, create visualizations, and answer questions. Just ask or use a preset below.
                        </p>
                        <div className="grid grid-cols-2 gap-3 max-w-md w-full">
                            {quickQuestions.map((q, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSend(q)}
                                    className="px-4 py-3 text-xs font-bold bg-white hover:bg-[#FFEDC1] hover:border-[#FEB229] hover:shadow-md rounded-xl text-[#470102] transition-all border border-[#FFEDC1] text-left shadow-sm"
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
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn group`}
                        >
                            <div className={`max-w-[85%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                {/* Avatar */}
                                <div className={`w-8 h-8 rounded-[12px] flex items-center justify-center flex-shrink-0 mt-1 shadow-sm border ${msg.role === 'user'
                                    ? 'bg-[#470102] text-[#FFEDC1] border-[#470102]'
                                    : 'bg-white text-[#470102] border-[#FFEDC1]'
                                    }`}>
                                    {msg.role === 'user' ? <UserIcon /> : <BotIcon />}
                                </div>

                                <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    {/* Sender Label */}
                                    <span className="text-[10px] text-[#8A5A5A] mb-1 px-1 font-bold select-none">
                                        {msg.role === 'user' ? 'You' : 'AI Assistant'}
                                    </span>

                                    {/* Message Bubble */}
                                    <div className={`rounded-[20px] px-6 py-4 shadow-sm backdrop-blur-md border transition-all ${msg.role === 'user'
                                        ? 'bg-[#470102] text-[#FFEDC1] rounded-tr-sm border-[#470102]'
                                        : msg.error
                                            ? 'bg-rose-50 text-rose-800 border-rose-100 rounded-tl-sm'
                                            : 'bg-white text-[#470102] border-[#FFEDC1] rounded-tl-sm shadow-md shadow-[#470102]/5'
                                        }`}>
                                        <div className={`text-sm leading-relaxed ${msg.role === 'user' ? 'text-[#FFEDC1]' : 'text-[#470102]'}`}>
                                            {msg.role === 'user' ? msg.content : renderMarkdown(msg.content)}
                                        </div>

                                        {msg.output && (
                                            <div className="mt-4 border-t border-[#FFEDC1] pt-3">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#FEB229]"></div>
                                                    <div className="text-[10px] font-bold text-[#8A5A5A] uppercase tracking-widest">System Output</div>
                                                </div>
                                                <div className="bg-[#FFF7EA] rounded-xl p-3 overflow-x-auto border border-[#FFEDC1] text-[#470102]">
                                                    <pre className="text-xs font-mono whitespace-pre-wrap">{msg.output}</pre>
                                                </div>
                                            </div>
                                        )}

                                        {msg.visualization && (
                                            <div className="mt-4 bg-[#FFF7EA] rounded-xl p-3 border border-[#FFEDC1]">
                                                <div className="flex items-center justify-between text-xs text-[#8A5A5A] mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-[#470102]"></span>
                                                        <span className="font-bold uppercase tracking-widest text-[10px]">Visualization</span>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            // Simpler, more reliable approach using direct data URL
                                                            const link = document.createElement('a');
                                                            link.href = msg.visualization!;
                                                            link.download = `visualization-${Date.now()}.png`;
                                                            link.style.display = 'none';
                                                            document.body.appendChild(link);
                                                            link.click();
                                                            // Small delay before cleanup to ensure download starts
                                                            setTimeout(() => {
                                                                document.body.removeChild(link);
                                                            }, 100);
                                                        }}
                                                        className="hover:text-[#470102] transition-colors flex items-center gap-1.5 bg-white hover:bg-[#FFEDC1] px-2 py-1 rounded border border-[#FFEDC1] font-bold"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                        Download
                                                    </button>
                                                </div>
                                                <div className="rounded-lg overflow-hidden border border-[#FFEDC1] bg-white shadow-sm">
                                                    <img
                                                        src={msg.visualization}
                                                        alt="Data visualization"
                                                        className="w-full h-auto"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-[#8A5A5A] mt-1.5 px-1 font-medium opacity-0 group-hover:opacity-100 transition-opacity select-none">
                                        {formatTime(msg.timestamp)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}

                {/* Loading State */}
                {(isLoading || isTranscribing) && (
                    <div className="flex justify-start animate-fadeIn">
                        <div className="flex gap-3 max-w-[85%]">
                            <div className="w-8 h-8 rounded-[12px] bg-white flex items-center justify-center text-[#470102] mt-1 border border-[#FFEDC1]">
                                <BotIcon />
                            </div>
                            <div className="bg-white rounded-[20px] rounded-tl-sm px-5 py-4 border border-[#FFEDC1] shadow-lg shadow-[#470102]/5">
                                <div className="flex items-center gap-3">
                                    <div className="relative w-4 h-4">
                                        <div className="absolute inset-0 bg-[#FEB229] rounded-full animate-ping opacity-75"></div>
                                        <div className="relative w-4 h-4 bg-[#FEB229] rounded-full shadow-lg shadow-[#FEB229]/50"></div>
                                    </div>
                                    <span className="text-xs font-bold text-[#8A5A5A] tracking-wide">
                                        {isTranscribing ? 'Processing audio...' : 'Thinking...'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Recording Indicator */}
            {isRecording && (
                <div className="absolute bottom-24 left-0 right-0 flex justify-center pointer-events-none z-20">
                    <div className="bg-[#470102]/90 backdrop-blur-md border border-[#FEB229]/30 rounded-full px-6 py-2 shadow-2xl shadow-[#470102]/10 flex items-center gap-4 animate-in slide-in-from-bottom-5">
                        <div className="flex items-center gap-1 h-4">
                            {[...Array(8)].map((_, i) => (
                                <div
                                    key={i}
                                    className="w-1 bg-[#FEB229] rounded-full animate-pulse"
                                    style={{
                                        height: `${8 + Math.random() * 12}px`,
                                        animationDelay: `${i * 0.1}s`,
                                        animationDuration: '0.6s',
                                    }}
                                />
                            ))}
                        </div>
                        <span className="text-[#FFEDC1] text-xs font-bold uppercase tracking-wider animate-pulse">
                            Listening
                        </span>
                    </div>
                </div>
            )}

            {/* Input Area - Floating Glass Style */}
            <div className="p-5 z-20 relative">
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#FFF7EA] via-[#FFF7EA]/90 to-transparent pointer-events-none" />
                <div className="relative flex gap-3 items-end max-w-3xl mx-auto bg-white/80 backdrop-blur-2xl border border-[#FFEDC1] rounded-2xl p-2.5 shadow-2xl shadow-[#470102]/5 ring-1 ring-[#470102]/5">
                    <button
                        onClick={handleVoiceClick}
                        disabled={isPreparing || isLoading || isTranscribing}
                        className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 flex-shrink-0 ${isRecording
                            ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-600/20 scale-105'
                            : isPreparing || isTranscribing
                                ? 'bg-[#FFF7EA] text-[#8A5A5A] cursor-wait'
                                : 'bg-[#FFF7EA] text-[#470102] hover:bg-white hover:text-[#FEB229] border border-[#FFEDC1]'
                            }`}
                        title={isRecording ? 'Stop Recording' : 'Start Voice Input'}
                    >
                        {isPreparing || isTranscribing ? <SpinnerIcon /> : isRecording ? <StopIcon /> : <MicIcon />}
                    </button>

                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={isRecording ? "Listening..." : "Ask something..."}
                        className="flex-1 bg-transparent border-none rounded-none focus:ring-0 text-[#470102] placeholder-[#8A5A5A]/50 text-sm py-3 px-2 font-medium tracking-wide"
                        disabled={isLoading || isRecording || isTranscribing}
                    />

                    <button
                        onClick={() => handleSend()}
                        disabled={!input.trim() || isLoading || isRecording}
                        className="w-11 h-11 rounded-xl bg-[#470102] hover:bg-[#5D0203] disabled:bg-[#FFEDC1] disabled:text-[#8A5A5A]/50 flex items-center justify-center transition-all duration-300 shadow-lg shadow-[#470102]/20 disabled:shadow-none flex-shrink-0 text-[#FFEDC1] group"
                        title="Send Message"
                    >
                        <div className={`transform transition-transform duration-300 ${!input.trim() || isLoading || isRecording ? '' : 'group-hover:translate-x-0.5 group-hover:-translate-y-0.5'}`}>
                            <SendIcon />
                        </div>
                    </button>
                </div>
                {voiceError && (
                    <p className="text-rose-600 text-[10px] mt-2 text-center absolute -bottom-6 left-0 right-0 animate-fadeIn font-medium">
                        {voiceError}
                    </p>
                )}
            </div>

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }
            `}</style>
        </div>
    );
}
