'use client';

import React, { useRef, useState, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Upload,
  Image as ImageIcon,
  Activity,
  ZoomIn,
  Loader2,
  AlertCircle,
} from 'lucide-react';

type AnalysisType = 'tooth-detection' | 'caries-detection' | 'segmentation';

const ANALYSIS_OPTIONS: { value: AnalysisType; label: string; description: string }[] = [
  {
    value: 'tooth-detection',
    label: 'Tooth Numbering & Detection',
    description: 'Identify and number all 32 teeth on panoramic X-rays',
  },
  {
    value: 'caries-detection',
    label: 'Caries / Cavity Detection',
    description: 'Detect dental caries and cavities on periapical X-rays',
  },
  {
    value: 'segmentation',
    label: 'Tooth Segmentation',
    description: 'Semantic segmentation of individual teeth and anatomical structures',
  },
];

interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  confidence: number;
}

interface ResultsData {
  boxes: BoundingBox[];
  model: string;
  image_width: number;
  image_height: number;
}

export default function DentalAIVision() {
  const { resolvedTheme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [analysisType, setAnalysisType] = useState<AnalysisType>('tooth-detection');
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ResultsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const loadImage = useCallback((file: File) => {
    setFile(file);
    setResults(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImage(dataUrl);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) loadImage(f);
  }, [loadImage]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith('image/')) loadImage(f);
  }, [loadImage]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const processImage = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    setResults(null);

    try {
      const form = new FormData();
      form.append('image', file);
      form.append('type', analysisType);

      const res = await fetch('/api/dental-ai-vision', {
        method: 'POST',
        body: form,
      });

      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || 'Processing failed');
      }

      setResults(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const drawResults = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new window.Image();
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);

      if (!results) return;

      ctx.strokeStyle = '#14b8a6';
      ctx.lineWidth = 3;
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.textBaseline = 'top';

      results.boxes.forEach((box) => {
        ctx.strokeRect(box.x, box.y, box.w, box.h);

        const label = `${box.label} (${(box.confidence * 100).toFixed(0)}%)`;
        const textWidth = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(20, 184, 166, 0.85)';
        ctx.fillRect(box.x, box.y - 24, textWidth + 8, 22);
        ctx.fillStyle = '#fff';
        ctx.fillText(label, box.x + 4, box.y - 20);
      });

      if (results.boxes.length === 0) {
        ctx.fillStyle = 'rgba(107, 114, 128, 0.5)';
        ctx.font = '16px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No detections found', canvas.width / 2, canvas.height / 2);
      }
    };
    img.src = image;
  }, [image, results]);

  React.useEffect(() => {
    if (results) drawResults();
  }, [results, drawResults]);

  React.useEffect(() => {
    if (image && !results) drawResults();
  }, [image, results, drawResults]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Dental AI Vision
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            X-ray analysis powered by computer vision models
          </p>
        </div>
      </div>

      {/* Upload & Controls */}
      <div className={`rounded-xl shadow-sm p-4 md:p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl">
            <Upload className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upload X-Ray</h2>
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-teal-400 bg-teal-50 dark:bg-teal-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-teal-400 dark:hover:border-teal-500'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          {image ? (
            <div className="flex items-center justify-center gap-2 text-teal-600 dark:text-teal-400">
              <ImageIcon className="w-6 h-6" />
              <span className="font-medium">{file?.name}</span>
            </div>
          ) : (
            <div className="text-gray-500 dark:text-gray-400">
              <Upload className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="font-medium">Drop an X-ray image here, or click to browse</p>
              <p className="text-sm mt-1">Supports PNG, JPEG, DICOM (as PNG/JPEG)</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Analysis Type
            </label>
            <select
              value={analysisType}
              onChange={(e) => setAnalysisType(e.target.value as AnalysisType)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              {ANALYSIS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {ANALYSIS_OPTIONS.find((o) => o.value === analysisType)?.description}
            </p>
          </div>
          <div className="flex items-end">
            <button
              onClick={processImage}
              disabled={!file || processing}
              className="w-full sm:w-auto px-6 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4" />
                  Analyze
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Analysis failed</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {image && (
        <div className={`rounded-xl shadow-sm p-4 md:p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl">
              <ZoomIn className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Results</h2>
            {results && (
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                {results.boxes.length} detections
              </span>
            )}
          </div>

          <div className="relative overflow-hidden rounded-lg">
            <canvas
              ref={canvasRef}
              className="w-full h-auto max-h-[70vh] object-contain"
            />
          </div>

          {results && results.boxes.length > 0 && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {results.boxes.map((box, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm"
                >
                  <span className="w-2 h-2 rounded-full bg-teal-500" />
                  <span className="font-medium text-gray-900 dark:text-white flex-1 truncate">
                    {box.label}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {(box.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          )}

          {results && results.boxes.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No objects detected. Try a different analysis type or image.
            </p>
          )}
        </div>
      )}

      {/* Info card */}
      {!image && (
        <div className={`rounded-xl shadow-sm p-4 md:p-6 ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-start gap-3">
            <ImageIcon className="w-5 h-5 text-teal-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">How it works</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Upload a panoramic or periapical X-ray image. The AI model will analyze it and return
                detected teeth, caries, or segmented regions depending on the selected analysis type.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                <strong>Models used:</strong> YOLOv8, U-Net, and DINO-based architectures trained on
                dental X-ray datasets.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
