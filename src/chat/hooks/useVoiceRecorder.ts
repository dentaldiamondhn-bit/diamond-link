import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export interface VoiceRecordingResult {
  blob: Blob;
  url: string;
  duration: number; // in seconds
}

/**
 * Pick the first MediaRecorder mime type the browser actually supports.
 * `audio/webm` (Chrome/Android/Firefox) is not supported by Safari/iOS,
 * which prefers `audio/mp4` — passing an unsupported mime type to the
 * MediaRecorder constructor throws. Falls back to the browser default.
 */
function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined' || !('isTypeSupported' in MediaRecorder)) return '';
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return '';
}

/**
 * Hook to handle voice recording using the MediaRecorder API.
 *
 * `stopRecording()` resolves with `{ blob, url, duration }` (or `null`) so the
 * caller can upload synchronously without racing the async `onstop` event or
 * relying on a stale React closure of the blob state.
 */
export const useVoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const startTimeRef = useRef<number>(0);
  const mimeRef = useRef<string>('');
  const tickRef = useRef<number | null>(null);
  const stopResolveRef = useRef<((result: VoiceRecordingResult | null) => void) | null>(null);

  // Request microphone permission and initialize MediaRecorder
  const initRecorder = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone API unavailable in this browser');
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = pickMimeType();
    mimeRef.current = mime;
    const mediaRecorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      if (tickRef.current !== null) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setDuration(elapsed);
      const blobType = mimeRef.current || 'audio/webm';
      const blob = new Blob(audioChunksRef.current, { type: blobType });
      const url = URL.createObjectURL(blob);
      audioChunksRef.current = [];
      stopResolveRef.current?.({ blob, url, duration: elapsed });
      stopResolveRef.current = null;
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (!mediaRecorderRef.current) {
      await initRecorder();
    }
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'inactive') return;
    audioChunksRef.current = [];
    startTimeRef.current = Date.now();
    recorder.start();
    setIsRecording(true);
    setDuration(0);
    tickRef.current = window.setInterval(() => {
      setDuration((Date.now() - startTimeRef.current) / 1000);
    }, 500);
  }, [initRecorder]);

  const stopRecording = useCallback(() => {
    return new Promise<VoiceRecordingResult | null>((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state === 'recording') {
        stopResolveRef.current = resolve;
        recorder.stop();
        setIsRecording(false);
      } else {
        resolve(null);
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
    const { error } = await supabase
      .storage
      .from('chat-voice-notes')
      .upload(fileName, blob, {
        contentType: blob.type || 'audio/webm',
        upsert: false,
      });

    if (error) {
      throw error;
    }

    const { data: urlData } = supabase
      .storage
      .from('chat-voice-notes')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  }, []);

  const reset = useCallback(() => {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    setDuration(0);
    setIsRecording(false);
    audioChunksRef.current = [];
    stopResolveRef.current = null;
    const recorder = mediaRecorderRef.current;
    if (recorder) {
      recorder.stream?.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current = null;
    }
  }, []);

  return {
    isRecording,
    duration,
    startRecording,
    stopRecording,
    play,
    uploadVoiceNote,
    reset,
  };
};