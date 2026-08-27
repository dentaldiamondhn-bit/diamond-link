'use client';

import { useVoiceRecorder } from '@/chat/hooks/useVoiceRecorder';
import { useState } from 'react';

export const VoiceRecorderTest = () => {
  const { isRecording, audioBlob, audioUrl, duration, startRecording, stopRecording, play, reset } =
    useVoiceRecorder();
  const [message, setMessage] = useState('');

  const handleStart = async () => {
    setMessage('Recording...');
    try {
      await startRecording();
      setMessage('Recording...');
    } catch (err) {
      setMessage('Error: ' + (err as Error).message);
    }
  };

  const handleStop = async () => {
    setMessage('Stopping...');
    await stopRecording();
    setMessage('Stopped. Ready to play or upload.');
  };

  const handlePlay = async () => {
    if (!audioBlob) return;
    setMessage('Playing...');
    try {
      await play(audioBlob);
      setMessage('Playback finished.');
    } catch (err) {
      setMessage('Playback error: ' + (err as Error).message);
    }
  };

  const handleReset = () => {
    reset();
    setMessage('Reset.');
  };

  return (
    <div className="p-4 max-w-md">
      <h2 className="text-lg font-semibold mb-4">Voice Recorder Test</h2>
      <p className="mb-2">{message}</p>
      <div className="space-y-2">
        <button
          onClick={handleStart}
          disabled={isRecording}
          className={`px-4 py-2 rounded ${
            isRecording ? 'bg-red-500' : 'bg-blue-500'
          } text-white hover:opacity-90`}
        >
          {isRecording ? 'Stop' : 'Record'}
        </button>
        <button
          onClick={handlePlay}
          disabled={!audioBlob || isRecording}
          className="px-4 py-2 rounded bg-green-500 text-white hover:opacity-90"
        >
          Play
        </button>
        <button
          onClick={handleReset}
          disabled={isRecording}
          className="px-4 py-2 rounded bg-gray-500 text-white hover:opacity-90"
        >
          Reset
        </button>
        {audioUrl && (
          <div className="mt-2">
            <audio controls src={audioUrl} className="w-full" />
          </div>
        )}
        {duration > 0 && (
          <p className="mt-2 text-sm text-gray-500">
            Duration: {duration.toFixed(1)} seconds
          </p>
        )}
      </div>
    </div>
  );
};

export default VoiceRecorderTest;