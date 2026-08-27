'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@/types/chat';

interface VoiceMessageBubbleProps {
  message: ChatMessage;
  isCurrentUser: boolean;
}

export const VoiceMessageBubble = ({ message, isCurrentUser }: VoiceMessageBubbleProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [waveformData, setWaveformData] = useState<number[] | null>(null);

  // Load audio and generate waveform data
  useEffect(() => {
    if (!message.voiceNoteUrl) return;

    // Fetch the audio blob
    fetch(message.voiceNoteUrl)
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        return audioContext.decodeAudioData(arrayBuffer);
      })
      .then(audioBuffer => {
        setDuration(audioBuffer.duration);
        // Generate waveform data (simplified: we'll take samples)
        const offlineCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const buffer = offlineCtx.createBuffer(
          audioBuffer.numberOfChannels,
          audioBuffer.length,
          audioBuffer.sampleRate
        );
        buffer.copyFromChannel(audioBuffer.getChannelData(0), 0);

        // Downsample to 100 points for waveform
        const waveformLength = 100;
        const channelData = buffer.getChannelData(0);
        const step = Math.floor(channelData.length / waveformLength);
        const sampled: number[] = [];
        for (let i = 0; i < waveformLength; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) {
            const idx = i * step + j;
            if (idx < channelData.length) {
              sum += Math.abs(channelData[idx]);
            }
          }
          sampled.push(sum / step);
        }
        setWaveformData(sampled);
      })
      .catch(err => {
        console.error('Failed to load audio for waveform:', err);
      });
  }, [message.voiceNoteUrl]);

  // Handle audio playback
  useEffect(() => {
    if (!audioRef.current) return;

    audioRef.current.ontimeupdate = () => {
      setCurrentTime(audioRef.current.currentTime);
    };

    audioRef.current.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
  }, []);

  // Draw waveform on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Set waveform style
    ctx.fillStyle = isCurrentUser ? '#4f46e5' : '#60a5fa'; // Indigo-600 for user, Blue-400 for others
    ctx.strokeStyle = ctx.fillStyle;

    const barWidth = width / waveformData.length;
    const maxHeight = height * 0.8; // Leave some padding
    const xOffset = 0;

    ctx.beginPath();
    waveformData.forEach((value, index) => {
      const x = xOffset + index * barWidth;
      const barHeight = value * maxHeight;
      const y = height - barHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Optional: fill under the curve
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = isCurrentUser ? '#4f46e520' : '#60a5fa20'; // 20% opacity
    ctx.fill();
  }, [waveformData, isCurrentUser]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="flex items-center space-x-3">
      {/* Waveform canvas */}
      <canvas
        ref={canvasRef}
        width={200}
        height={40}
        className={`bg-gray-100 dark:bg-gray-700 rounded`}
      />
      <div className="flex items-center space-x-2">
        <button
          onClick={togglePlay}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          {isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12l-3 3v-6l3-3z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <span className="text-sm">
          {`${Math.floor(currentTime)}s / ${Math.floor(duration)}s`}
        </span>
      </div>
    </div>
  );
};

export default VoiceMessageBubble;