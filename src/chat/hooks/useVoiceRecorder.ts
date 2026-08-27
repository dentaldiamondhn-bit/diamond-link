import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export interface VoiceNote {
  blob: Blob;
  url: string;
  duration: number; // in seconds
}

/**
 * Hook to handle voice recording using MediaRecorder API.
 * Returns an object with methods to start, stop, play, and upload voice notes.
 */
export const useVoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const startTimeRef = useRef<number>(0);

  // Request microphone permission and initialize MediaRecorder
  const initRecorder = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        // Calculate duration approximately: we can use the number of chunks and sample rate? 
        // For simplicity, we'll estimate based on recording time.
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setDuration(elapsed);
        // Reset chunks for next recording
        audioChunksRef.current = [];
      };
    } catch (err) {
      console.error('Error accessing microphone:', err);
      throw err;
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!mediaRecorderRef.current) {
      await initRecorder();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
      audioChunksRef.current = [];
      startTimeRef.current = Date.now();
      mediaRecorderRef.current.start();
      setIsRecording(true);
    }
  }, [initRecorder]);

  const stopRecording = useCallback(async () => {
    return new Promise<void>((resolve) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        // Resolve after a short delay to ensure onstop fired
        setTimeout(resolve, 100);
      } else {
        resolve();
      }
    });
  }, []);

  const play = useCallback((blob: Blob) => {
    return new Promise<void>((resolve) => {
      const audio = new Audio(URL.createObjectURL(blob));
      audio.onended = () => {
        URL.revokeObjectURL(audio.src);
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audio.src);
        resolve();
      };
      audio.play().catch(() => {
        URL.revokeObjectURL(audio.src);
        resolve();
      });
    });
  }, []);

  const uploadVoiceNote = useCallback(async (blob: Blob, fileName: string) => {
    const { data, error } = await supabase
      .storage
      .from('chat-voice-notes')
      .upload(fileName, blob, {
        contentType: 'audio/webm',
        upsert: false,
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from('chat-voice-notes')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  }, []);

  const reset = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setIsRecording(false);
    audioChunksRef.current = [];
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
    }
  }, [audioUrl]);

  return {
    isRecording,
    audioBlob,
    audioUrl,
    duration,
    startRecording,
    stopRecording,
    play,
    uploadVoiceNote,
    reset,
  };
};