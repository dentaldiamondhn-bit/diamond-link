'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Cropper, { type Area, type MediaSize, type Point } from 'react-easy-crop';
import { Check, Crop as CropIcon, Pencil, RotateCcw, RotateCw } from 'lucide-react';
import { useTranslations } from '@/chat/i18n/useTranslations';

type Tool = 'crop' | 'tilt' | 'draw';

interface ChatImageEditorProps {
  src: string;
  name: string;
  onProcessed: (file: File) => void;
  onCancel: () => void;
}

interface Stroke {
  color: string;
  size: number;
  points: { x: number; y: number }[];
}

const PEN_COLORS = ['#ffffff', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#f97316'];
const PEN_SIZES = [4, 8, 14];
const MAX_DIMENSION = 2048;

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });
}

/** Rotate an image by `rotation` degrees into a padded canvas (bounding-box). */
function renderRotated(image: HTMLImageElement, rotation: number): HTMLCanvasElement {
  const rad = (rotation * Math.PI) / 180;
  const absSin = Math.abs(Math.sin(rad));
  const absCos = Math.abs(Math.cos(rad));
  const w = Math.round(image.naturalWidth * absCos + image.naturalHeight * absSin);
  const h = Math.round(image.naturalWidth * absSin + image.naturalHeight * absCos);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.translate(w / 2, h / 2);
  ctx.rotate(rad);
  ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
  return canvas;
}

/**
 * Compose rotation + crop + pencil strokes into a final JPEG File.
 * `area` is react-easy-crop's croppedAreaPixels (expressed in the displayed
 * mediaSize coordinate space). Strokes are recorded in the same space, so
 * mapping is a linear translate + scale.
 */
function process(
  source: string,
  fileName: string,
  rotation: number,
  area: Area,
  strokes: Stroke[]
): Promise<File> {
  return createImage(source).then((image) => {
    const rotated = renderRotated(image, rotation);
    const srcW = area.width;
    const srcH = area.height;
    const longSide = Math.max(srcW, srcH);
    const scale = Math.min(1, MAX_DIMENSION / longSide);
    const outW = Math.max(1, Math.round(srcW * scale));
    const outH = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // Slice the crop from the rotated canvas. react-easy-crop's croppedAreaPixels
    // are already expressed in the rotated bounding-box space.
    ctx.drawImage(rotated, area.x, area.y, srcW, srcH, 0, 0, outW, outH);

    // Map each stroke (recorded in mediaSize space) into the crop, scaled.
    const scaleX = outW / srcW;
    const scaleY = outH / srcH;
    for (const stroke of strokes) {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = Math.max(1, stroke.size * scaleX);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      stroke.points.forEach((p, i) => {
        const px = (p.x - area.x) * scaleX;
        const py = (p.y - area.y) * scaleY;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }

    return new Promise<File>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to encode image'));
            return;
          }
          const base = fileName.replace(/\.[^.]+$/, '') || 'imagen';
          resolve(new File([blob], `${base}_editada.jpg`, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.92
      );
    });
  });
}

export const ChatImageEditor = ({
  src,
  name,
  onProcessed,
  onCancel,
}: ChatImageEditorProps) => {
  const { t } = useTranslations();
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [mediaSize, setMediaSize] = useState<MediaSize | null>(null);
  const [tool, setTool] = useState<Tool>('crop');
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [activeStroke, setActiveStroke] = useState<Stroke | null>(null);
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [penSize, setPenSize] = useState(PEN_SIZES[1]);
  const [processing, setProcessing] = useState(false);
  const drawRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedPixels: Area) => setCroppedAreaPixels(croppedPixels),
    []
  );

  const onMediaLoaded = useCallback((size: MediaSize) => {
    setMediaSize(size);
    setZoom((size.width * 0.66) / size.height / 2 || 1);
  }, []);

  // Commit the in-progress stroke when the pointer is released.
  useEffect(() => {
    const up = () => {
      if (drawingRef.current && activeStroke) {
        setStrokes((prev) => [...prev, activeStroke]);
        setActiveStroke(null);
      }
      drawingRef.current = false;
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [activeStroke]);

  const getDrawPoint = (e: React.PointerEvent): { x: number; y: number } | null => {
    const canvas = drawRef.current;
    const ms = mediaSize;
    if (!canvas || !ms) return null;
    const rect = canvas.getBoundingClientRect();
    // MediaSize is the displayed (un-cropped) media px. Map the container px
    // back into that space.
    const x = ((e.clientX - rect.left) / rect.width) * ms.width;
    const y = ((e.clientY - rect.top) / rect.height) * ms.height;
    return { x, y };
  };

  const pointerDown = (e: React.PointerEvent) => {
    if (tool !== 'draw') return;
    e.preventDefault();
    drawingRef.current = true;
    const p = getDrawPoint(e);
    if (!p) return;
    setActiveStroke({ color: penColor, size: penSize, points: [p] });
  };
  const pointerMove = (e: React.PointerEvent) => {
    if (tool !== 'draw' || !drawingRef.current) return;
    const p = getDrawPoint(e);
    if (!p) return;
    setActiveStroke((prev) =>
      prev ? { ...prev, points: [...prev.points, p] } : prev
    );
  };

  // Live-render the drawing overlay (active stroke + committed strokes).
  useEffect(() => {
    const canvas = drawRef.current;
    if (!canvas || !mediaSize) return;
    const ms = mediaSize;
    // Match drawing canvas backing store to its own displayed rect.
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    if (cssW === 0 || cssH === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
      canvas.width = cssW * dpr;
      canvas.height = cssH * dpr;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scaleX = canvas.width / ms.width;

    const drawStroke = (stroke: Stroke) => {
      if (stroke.points.length === 0) return;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = Math.max(1, stroke.size * scaleX);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      stroke.points.forEach((p, i) => {
        const px = (p.x / ms.width) * canvas.width;
        const py = (p.y / ms.height) * canvas.height;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    };
    strokes.forEach(drawStroke);
    if (activeStroke) drawStroke(activeStroke);
  }, [strokes, activeStroke, mediaSize]);

  const undo = () => setStrokes((prev) => prev.slice(0, -1));

  const finish = () => {
    if (processing) return;
    setProcessing(true);
    process(src, name, rotation, croppedAreaPixels, strokes)
      .then(onProcessed)
      .catch((err) => {
        console.error('Image edit failed:', err);
        setProcessing(false);
      });
  };

  const toolBtn = (id: Tool, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setTool(id)}
      title={label}
      aria-label={label}
      className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs transition ${
        tool === id ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex h-full w-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-center gap-1 border-b border-white/10 py-2">
        {toolBtn('crop', t('editorCrop'), <CropIcon className="h-5 w-5" />)}
        {toolBtn('tilt', t('editorTilt'), <RotateCw className="h-5 w-5" />)}
        {toolBtn('draw', t('editorDraw'), <Pencil className="h-5 w-5" />)}

        {tool === 'draw' && (
          <div className="ml-2 flex items-center gap-1 border-l border-white/10 pl-2">
            {PEN_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setPenColor(c)}
                aria-label={c}
                className={`h-6 w-6 rounded-full border-2 ${
                  penColor === c ? 'border-white' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
            <span className="mx-1 h-5 w-px bg-white/10" />
            {PEN_SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setPenSize(s)}
                aria-label={`${s}px`}
                className={`flex h-7 w-7 items-center justify-center rounded-full ${
                  penSize === s ? 'bg-white/25' : 'hover:bg-white/10'
                }`}
              >
                <span
                  className="rounded-full bg-white"
                  style={{ width: s, height: s }}
                />
              </button>
            ))}
            <button
              type="button"
              onClick={undo}
              disabled={strokes.length === 0}
              title={t('undo')}
              aria-label={t('undo')}
              className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        )}

        {tool === 'tilt' && (
          <div className="ml-2 flex items-center gap-2 border-l border-white/10 pl-2">
            <button
              type="button"
              onClick={() => setRotation((r) => r - 90)}
              title={t('rotateLeft')}
              aria-label={t('rotateLeft')}
              className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
            <span className="min-w-[3.5rem] text-center text-sm text-white/80 tabular-nums">
              {rotation}°
            </span>
            <button
              type="button"
              onClick={() => setRotation((r) => r + 90)}
              title={t('rotateRight')}
              aria-label={t('rotateRight')}
              className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white"
            >
              <RotateCw className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Canvas area */}
      <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={1}
          showGrid={tool === 'crop'}
          cropShape="rect"
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={onCropComplete}
          onMediaLoaded={onMediaLoaded}
          style={{ containerStyle: { width: '100%', height: '100%' } }}
          classes={{
            containerClassName: 'h-full w-full',
            mediaClassName: 'touch-none select-none',
          }}
        />
        <canvas
          ref={drawRef}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          className={`pointer-events-none absolute inset-0 h-full w-full touch-none ${
            tool === 'draw' ? 'pointer-events-auto' : ''
          } ${tool === 'draw' ? 'cursor-crosshair' : ''}`}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-white/10 px-4 py-2.5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
        >
          {t('cancel')}
        </button>
        <button
          type="button"
          onClick={finish}
          disabled={processing}
          className="flex items-center gap-2 rounded-lg bg-blue-500 px-5 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-40"
        >
          <Check className="h-4 w-4" />
          {t('apply')}
        </button>
      </div>
    </div>
  );
};

export default ChatImageEditor;
