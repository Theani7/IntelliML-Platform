'use client';

import { useState, useRef, useCallback } from 'react';

interface UseVoiceRecordingReturn {
  isRecording: boolean;
  isPreparing: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  error: string | null;
  clearError: () => void;
}

export function useVoiceRecording(): UseVoiceRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setIsPreparing(true);
      setError(null);
      audioChunksRef.current = [];

      console.log('Requesting microphone access...');

      // Request microphone access with specific constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 48000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });

      streamRef.current = stream;
      console.log('Microphone access granted');

      // Try different MIME types
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/ogg;codecs=opus';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4';
      }

      console.log('Using MIME type:', mimeType);

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
      });

      // Store audio chunks as they're recorded
      mediaRecorder.ondataavailable = (event) => {
        console.log('Data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred');
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      mediaRecorderRef.current = mediaRecorder;
      
      setIsRecording(true);
      setIsPreparing(false);
      console.log('Recording started');
      
    } catch (err: any) {
      console.error('Recording start error:', err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone access denied. Please allow microphone access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.');
      } else {
        setError(`Failed to start recording: ${err.message}`);
      }
      
      setIsPreparing(false);
      
      // Clean up stream if it was created
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        console.warn('No active recording to stop');
        resolve(null);
        return;
      }

      console.log('Stopping recording...');

      // When recording stops, create final blob
      mediaRecorder.onstop = () => {
        console.log('Recording stopped, chunks:', audioChunksRef.current.length);
        
        if (audioChunksRef.current.length === 0) {
          console.error('No audio data recorded');
          setError('No audio recorded. Please try again.');
          resolve(null);
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { 
          type: mediaRecorder.mimeType || 'audio/webm'
        });
        
        console.log('Created audio blob:', audioBlob.size, 'bytes');
        
        // Stop all audio tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            console.log('Stopping track:', track.label);
            track.stop();
          });
          streamRef.current = null;
        }
        
        setIsRecording(false);
        mediaRecorderRef.current = null;
        
        resolve(audioBlob);
      };

      try {
        mediaRecorder.stop();
      } catch (err) {
        console.error('Error stopping recorder:', err);
        setError('Failed to stop recording');
        resolve(null);
      }
    });
  }, []);

  return {
    isRecording,
    isPreparing,
    startRecording,
    stopRecording,
    error,
    clearError,
  };
}