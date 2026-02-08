'use client';

import { useState } from 'react';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { processVoiceCommand } from '@/lib/api';

export default function VoiceButton() {
  const { 
    isRecording, 
    isPreparing, 
    startRecording, 
    stopRecording, 
    error: recordingError,
    clearError 
  } = useVoiceRecording();
  
  const [transcription, setTranscription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intent, setIntent] = useState<any>(null);

  const handleClick = async () => {
    if (isRecording) {
      // Stop recording and process
      setIsProcessing(true);
      setError(null);
      
      try {
        console.log('Stopping recording...');
        const audioBlob = await stopRecording();
        
        if (!audioBlob) {
          throw new Error('No audio recorded');
        }

        console.log('Audio blob size:', audioBlob.size);

        if (audioBlob.size < 1000) {
          throw new Error('Recording too short. Please speak for at least 1 second.');
        }
        
        // Send to backend for processing
        console.log('Sending to backend...');
        const result = await processVoiceCommand(audioBlob);
        
        console.log('Result:', result);
        
        setTranscription(result.transcription);
        setIntent(result.intent);
        
      } catch (err: any) {
        console.error('Processing error:', err);
        setError(err.message || 'Failed to process audio');
      } finally {
        setIsProcessing(false);
      }
      
    } else {
      // Start recording
      setTranscription('');
      setIntent(null);
      setError(null);
      clearError();
      await startRecording();
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Voice Button */}
      <div className="flex flex-col items-center space-y-6">
        <button
          onClick={handleClick}
          disabled={isPreparing || isProcessing}
          className={`
            relative w-40 h-40 rounded-full flex items-center justify-center
            transition-all duration-300 transform hover:scale-105
            ${isRecording 
              ? 'bg-red-500 hover:bg-red-600 shadow-2xl shadow-red-500/50' 
              : 'bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-2xl shadow-purple-500/50'
            }
            ${(isPreparing || isProcessing) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {/* Pulse animation when recording */}
          {isRecording && (
            <>
              <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75"></span>
              <span className="absolute inset-0 rounded-full bg-red-400 animate-pulse opacity-50"></span>
            </>
          )}

          {/* Icon */}
          <span className="relative z-10 text-6xl">
            {isPreparing ? (
              '⏳'
            ) : isProcessing ? (
              <span className="animate-spin">⚙️</span>
            ) : isRecording ? (
              '⏹️'
            ) : (
              '🎤'
            )}
          </span>
        </button>

        {/* Status Text */}
        <div className="text-center min-h-[60px]">
          {isPreparing && (
            <p className="text-gray-600 font-medium animate-pulse">
              🎙️ Preparing microphone...
            </p>
          )}
          {isRecording && (
            <div className="space-y-2">
              <p className="text-red-600 font-bold text-xl animate-pulse">
                🔴 Recording...
              </p>
              <p className="text-gray-600 text-sm">
                Click to stop and process
              </p>
            </div>
          )}
          {isProcessing && (
            <p className="text-purple-600 font-medium animate-pulse">
              🤖 Processing your command...
            </p>
          )}
          {!isRecording && !isPreparing && !isProcessing && (
            <div className="space-y-1">
              <p className="text-gray-600 font-medium">
                Click to start voice command
              </p>
              <p className="text-gray-500 text-sm">
                Try: "Analyze the data" or "Train a model"
              </p>
            </div>
          )}
        </div>

        {/* Recording Waveform Animation */}
        {isRecording && (
          <div className="flex items-center justify-center space-x-1 h-16">
            {[...Array(15)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-gradient-to-t from-red-500 to-pink-500 rounded-full animate-pulse"
                style={{
                  height: `${20 + Math.random() * 40}px`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '0.8s',
                }}
              />
            ))}
          </div>
        )}

        {/* Error Display */}
        {(error || recordingError) && (
          <div className="w-full bg-red-50 border-2 border-red-200 rounded-lg p-4 animate-slideIn">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="text-red-800 font-semibold mb-1">
                  {error || recordingError}
                </p>
                <p className="text-red-600 text-sm">
                  Please check your microphone settings and try again.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Transcription Display */}
        {transcription && (
          <div className="w-full bg-blue-50 border-2 border-blue-200 rounded-lg p-4 animate-slideIn">
            <p className="text-sm text-blue-600 font-semibold mb-2">
              💬 You said:
            </p>
            <p className="text-gray-900 text-lg">{transcription}</p>
          </div>
        )}

        {/* Intent Display */}
        {intent && (
          <div className="w-full bg-green-50 border-2 border-green-200 rounded-lg p-4 animate-slideIn">
            <p className="text-sm text-green-600 font-semibold mb-3">
              🤖 System understood:
            </p>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-gray-700">Intent:</span>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  {intent.intent}
                </span>
              </div>
              
              {intent.target_column && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-gray-700">Target:</span>
                  <span className="text-sm text-gray-900 font-medium">{intent.target_column}</span>
                </div>
              )}
              
              {intent.needs_clarification && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
                  <p className="text-sm text-yellow-800 flex items-start space-x-2">
                    <span>❓</span>
                    <span>{intent.clarification_question}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}