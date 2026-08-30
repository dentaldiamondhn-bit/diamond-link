import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export interface VoiceRecordingResult {
  blob: Blob;
  url: string;
  duration: number; // in seconds
}

/**
 * Pick the first MediaRecorder mime type the browser actually supports.
 * `audio/mp4` is tried FIRST because Safari/iOS can neither record WebM nor
 * play WebM/Opus back in `<audio>`, so a webm recording sent to an iOS
 * recipient would be silent on their device. Chrome/Android can play mp4, so
 * mp4 maximizes cross-device compatibility. Falls back to the browser default.
 */
function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined' || !('isTypeSupported' in MediaRecorder)) return '';
  const candidates = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
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
 * relying on a stale React closure of the blob state. Pausing/resuming and
 * cancelling (discard without uploading) are supported.
 */
export const useVoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const startTimeRef = useRef<number>(0);
  const pauseStartedAtRef = useRef<number>(0);
  const pausedTotalRef = useRef<number>(0);
  const mimeRef = useRef<string>('');
  const tickRef = useRef<number | null>(null);
  const discardRef = useRef(false);
  const stopResolveRef = useRef<((result: VoiceRecordingResult | null) => void) | null>(null);

  const elapsedSeconds = useCallback(
    () => (Date.now() - startTimeRef.current - pausedTotalRef.current) / 1000,
    []
  );

  const clearTicker = useCallback(() => {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const startTicker = useCallback(() => {
    clearTicker();
    tickRef.current = window.setInterval(() => {
      setDuration(elapsedSeconds());
    }, 250);
  }, [clearTicker, elapsedSeconds]);

  const stopTracks = () => {
    mediaRecorderRef.current?.stream?.getTracks().forEach((track) => track.stop());
    mediaRecorderRef.current = null;
  };

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
      clearTicker();
      if (discardRef.current) {
        discardRef.current = false;
        audioChunksRef.current = [];
        setDuration(0);
        stopResolveRef.current?.(null);
        stopResolveRef.current = null;
        return;
      }
      const elapsed = elapsedSeconds();
      setDuration(elapsed);
      const blobType = mimeRef.current || 'audio/webm';
      const blob = new Blob(audioChunksRef.current, { type: blobType });
      const url = URL.createObjectURL(blob);
      audioChunksRef.current = [];
      stopResolveRef.current?.({ blob, url, duration: elapsed });
      stopResolveRef.current = null;
    };
  }, [clearTicker, elapsedSeconds]);

  const startRecording = useCallback(async () => {
    if (!mediaRecorderRef.current) {
      await initRecorder();
    }
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'inactive') return;
    audioChunksRef.current = [];
    startTimeRef.current = Date.now();
    pausedTotalRef.current = 0;
    pauseStartedAtRef.current = 0;
    discardRef.current = false;
    recorder.start();
    setIsRecording(true);
    setIsPaused(false);
    setDuration(0);
    startTicker();
  }, [initRecorder, startTicker]);

  const pauseRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'recording' || isPaused) return;
    recorder.pause();
    pauseStartedAtRef.current = Date.now();
    setIsPaused(true);
    clearTicker();
  }, [isPaused, clearTicker]);

  const resumeRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'paused') return;
    pausedTotalRef.current += Date.now() - pauseStartedAtRef.current;
    pauseStartedAtRef.current = 0;
    recorder.resume();
    setIsPaused(false);
    startTicker();
  }, [startTicker]);

  const stopRecording = useCallback(() => {
    return new Promise<VoiceRecordingResult | null>((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state === 'recording') {
        stopResolveRef.current = resolve;
        recorder.stop();
        setIsRecording(false);
        setIsPaused(false);
      } else {
        resolve(null);
      }
    });
  }, []);

  /** Discard the current recording without uploading it. */
  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && (recorder.state === 'recording' || recorder.state === 'paused')) {
      discardRef.current = true;
      recorder.stop();
    }
    clearTicker();
    setDuration(0);
    setIsRecording(false);
    setIsPaused(false);
    audioChunksRef.current = [];
    stopResolveRef.current?.(null);
    stopResolveRef.current = null;
    stopTracks();
  }, [clearTicker]);

  const play = useCallback((blob: Blob) => {
    return new Promise<void>((resolve) => {
      const audio = new Audio(URL.createObjectURL(blob));
      const cleanup = () => {
        URL.revokeObjectURL(audio.src);
        resolve();
      };
      audio.onended = cleanup;
      audio.onerror = cleanup;
      audio.play().catch(cleanup);
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
    clearTicker();
    setDuration(0);
    setIsRecording(false);
    setIsPaused(false);
    audioChunksRef.current = [];
    stopResolveRef.current = null;
    discardRef.current = false;
    stopTracks();
  }, [clearTicker]);

  return {
    isRecording,
    isPaused,
    duration,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    play,
    uploadVoiceNote,
    reset,
  };
};