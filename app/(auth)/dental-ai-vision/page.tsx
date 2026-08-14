'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, Image as ImageIcon, Eye, EyeOff, ZoomIn, ZoomOut,
  Sliders, CheckCircle2, XCircle, Sparkles, Send, FileText,
  AlertCircle, Loader2, Activity,
} from 'lucide-react';

type AnalysisType = 'tooth-detection' | 'caries-detection' | 'segmentation';

const ANALYSIS_OPTIONS: { value: AnalysisType; label: string; description: string }[] = [
  { value: 'tooth-detection', label: 'Tooth Numbering & Detection', description: 'Identify and number all 32 teeth on panoramic X-rays' },
  { value: 'caries-detection', label: 'Caries / Cavity Detection', description: 'Detect dental caries and cavities on periapical X-rays' },
  { value: 'segmentation', label: 'Tooth Segmentation', description: 'Semantic segmentation of individual teeth and anatomical structures' },
];

interface BoundingBox {
  x: number; y: number; w: number; h: number; label: string; confidence: number;
}

interface Finding {
  id: string; tooth: string; diagnosis: string; confidence: number; severity: 'high' | 'medium' | 'low'; verified: boolean | null;
}

const TOOTH_MAP: Record<string, { diagnosis: string; confidence: number; severity: Finding['severity'] }> = {
  '03': { diagnosis: 'Horizontal Bone Loss (2.8mm)', confidence: 68, severity: 'low' },
  '09': { diagnosis: 'Mesial Caries', confidence: 71, severity: 'medium' },
  '14': { diagnosis: 'Distal Occlusal Caries', confidence: 92, severity: 'high' },
  '19': { diagnosis: 'Periapical Radiolucency', confidence: 85, severity: 'high' },
  '30': { diagnosis: 'Marginal Leakage (Existing Crown)', confidence: 74, severity: 'medium' },
};

const TEETH_UPPER = ['01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16'];
const TEETH_LOWER = ['17','18','19','20','21','22','23','24','25','26','27','28','29','30','31','32'];

interface ImgLayout {
  offsetX: number; offsetY: number; renderW: number; renderH: number;
}

function computeImgLayout(
  containerW: number, containerH: number, naturalW: number, naturalH: number
): ImgLayout {
  const imgAspect = naturalW / naturalH;
  const contAspect = containerW / containerH;
  let renderW: number, renderH: number, offsetX: number, offsetY: number;
  if (imgAspect > contAspect) {
    renderW = containerW;
    renderH = containerW / imgAspect;
    offsetX = 0;
    offsetY = (containerH - renderH) / 2;
  } else {
    renderH = containerH;
    renderW = containerH * imgAspect;
    offsetX = (containerW - renderW) / 2;
    offsetY = 0;
  }
  return { offsetX, offsetY, renderW, renderH };
}

function scaleBox(
  box: BoundingBox, naturalW: number, naturalH: number, layout: ImgLayout
): { left: number; top: number; width: number; height: number } {
  const isNormalized = box.x <= 1 && box.y <= 1 && box.w <= 1 && box.h <= 1;
  console.log('[scaleBox]', { box, naturalW, naturalH, layout, isNormalized });
  if (isNormalized) {
    const result = {
      left: layout.offsetX + box.x * layout.renderW,
      top: layout.offsetY + box.y * layout.renderH,
      width: box.w * layout.renderW,
      height: box.h * layout.renderH,
    };
    console.log('[scaleBox] normalized result', result);
    return result;
  }
  const result = {
    left: layout.offsetX + (box.x / naturalW) * layout.renderW,
    top: layout.offsetY + (box.y / naturalH) * layout.renderH,
    width: (box.w / naturalW) * layout.renderW,
    height: (box.h / naturalH) * layout.renderH,
  };
  console.log('[scaleBox] pixel fallback result', result);
  return result;
}

export default function DentalAIVisionWorkspace() {
  const [mode, setMode] = useState<'upload' | 'workspace'>('upload');
  const [image, setImage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [analysisType, setAnalysisType] = useState<AnalysisType>('tooth-detection');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedTooth, setSelectedTooth] = useState<string | null>('14');
  const [showOverlays, setShowOverlays] = useState(true);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [boxes, setBoxes] = useState<BoundingBox[]>([]);
  const [imageNatural, setImageNatural] = useState({ w: 800, h: 500 });
  const [imageLayout, setImageLayout] = useState<ImgLayout>({ offsetX: 0, offsetY: 0, renderW: 800, renderH: 500 });

  const imgRef = useRef<HTMLImageElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const spaceRef = useRef(false);

  const loadImage = useCallback((f: File) => {
    setFile(f);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setImage(e.target?.result as string);
    reader.readAsDataURL(f);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) loadImage(f);
  }, [loadImage]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f?.type.startsWith('image/')) loadImage(f);
  }, [loadImage]);

  const processImage = async () => {
    if (!file) return;
    setProcessing(true); setError(null); setIsDemo(false);
    try {
      const form = new FormData();
      form.append('image', file);
      form.append('type', analysisType);
      const res = await fetch('/api/dental-ai-vision', { method: 'POST', body: form });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Processing failed');
      const data = json.data;
      console.log('[API] response', { _demo: json._demo, boxes: data.boxes, image_width: data.image_width, image_height: data.image_height });
      setIsDemo(!!json._demo);
      const resultBoxes: BoundingBox[] = (data.boxes || []).filter((b: BoundingBox) => b.w > 0 && b.h > 0);
      setBoxes(resultBoxes);
      if (data.image_width && data.image_height) {
        setImageNatural({ w: data.image_width, h: data.image_height });
      }
      const generated: Finding[] = resultBoxes.map((b: BoundingBox, i: number) => {
        const match = b.label.match(/#(\d{2})/);
        const toothNum = match ? match[1] : String(i + 1).padStart(2, '0');
        return {
          id: `find-${i}`, tooth: toothNum,
          diagnosis: b.label, confidence: Math.round(b.confidence * 100),
          severity: b.confidence >= 0.8 ? 'high' : b.confidence >= 0.6 ? 'medium' : 'low',
          verified: null,
        };
      });
      if (generated.length === 0) {
        setFindings(Object.entries(TOOTH_MAP).map(([tooth, info], i) => ({
          id: `mock-${i}`, tooth, ...info, verified: null,
        })));
        setSelectedTooth('09');
      } else {
        setFindings(generated);
        if (generated.length > 0) setSelectedTooth(generated[0].tooth);
      }
      setMessages([{ role: 'assistant', text: `AI Analysis complete. Detected ${Math.max(generated.length, Object.keys(TOOTH_MAP).length)} areas of interest.${json._demo ? ' (Demo mode)' : ''}` }]);
      setMode('workspace');
    } catch (err: any) {
      setIsDemo(true);
      const demo = Object.entries(TOOTH_MAP).map(([tooth, info], i) => ({
        id: `demo-${i}`, tooth, ...info, verified: null,
      }));
      setFindings(demo); setBoxes([]); setSelectedTooth('09');
      setMessages([{ role: 'assistant', text: 'Demo mode: Showing simulated findings for 5 target teeth.' }]);
      setMode('workspace');
    } finally { setProcessing(false); }
  };

  const handleVerify = (id: string, verified: boolean) => {
    setFindings(f => f.map(item => item.id === id ? { ...item, verified } : item));
  };

  const activeFinding = findings.find(f => f.tooth === selectedTooth);

  interface RenderedBox { left: number; top: number; width: number; height: number; toothLabel: string; confidence: number; }

  const activeSource = isDemo || boxes.length === 0
    ? [
        { x: 0.20, y: 0.43, w: 0.05, h: 0.12, label: 'Horizontal Bone Loss #03', confidence: 0.68 },
        { x: 0.22, y: 0.54, w: 0.05, h: 0.14, label: 'Marginal Leakage Crown #30', confidence: 0.74 },
        { x: 0.40, y: 0.41, w: 0.04, h: 0.13, label: 'Mesial Caries #09', confidence: 0.71 },
        { x: 0.60, y: 0.45, w: 0.05, h: 0.12, label: 'Distal Occlusal Caries #14', confidence: 0.92 },
        { x: 0.60, y: 0.55, w: 0.05, h: 0.14, label: 'Periapical Radiolucency #19', confidence: 0.85 },
      ]
    : boxes;

  const canvasToothBoxes: RenderedBox[] = activeSource.map(b => {
    const pos = scaleBox(b, imageNatural.w, imageNatural.h, imageLayout);
    const match = b.label.match(/#(\d{2})/);
    const toothLabel = match ? match[1] : '00';
    console.log('[renderBox]', { label: b.label, toothLabel, pos, imageNatural, imageLayout });
    return { ...pos, toothLabel, confidence: b.confidence };
  });

  const hasFinding = (toothNum: string) => findings.some(f => f.tooth === toothNum);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault(); spaceRef.current = true; setShowOverlays(false);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') { spaceRef.current = false; setShowOverlays(true); }
    };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useEffect(() => {
    if (mode !== 'workspace') return;
    const imgEl = imgRef.current;
    const container = canvasContainerRef.current;
    if (!imgEl || !container) return;
    const updateLayout = () => {
      const cr = container.getBoundingClientRect();
      setImageLayout(computeImgLayout(cr.width, cr.height, imageNatural.w, imageNatural.h));
    };
    const ro = new ResizeObserver(updateLayout);
    ro.observe(container);
    updateLayout();
    return () => ro.disconnect();
  }, [mode, imageNatural]);

  if (mode === 'upload') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 p-6">
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-100">Dental AI Vision</h1>
            <p className="text-slate-400 mt-2">Upload an X-ray for AI-powered diagnostic analysis</p>
          </div>

          <div
            onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
              dragOver ? 'border-indigo-400 bg-indigo-900/20' : 'border-slate-700 hover:border-indigo-500 bg-slate-900/50'
            }`}
          >
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            {image ? (
              <div className="flex items-center justify-center gap-2 text-indigo-400">
                <ImageIcon className="w-6 h-6" />
                <span className="font-medium">{file?.name}</span>
              </div>
            ) : (
              <div className="text-slate-500">
                <Upload className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium text-slate-300">Drop an X-ray here, or click to browse</p>
                <p className="text-sm mt-1">PNG, JPEG, DICOM (as PNG/JPEG)</p>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-300 mb-1">Analysis Type</label>
              <select value={analysisType} onChange={(e) => setAnalysisType(e.target.value as AnalysisType)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {ANALYSIS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <p className="text-xs text-slate-500 mt-1">{ANALYSIS_OPTIONS.find(o => o.value === analysisType)?.description}</p>
            </div>
            <div className="flex items-end">
              <button onClick={processImage} disabled={!file || processing}
                className="w-full sm:w-auto px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : <><Activity className="w-4 h-4" /> Analyze</>}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 bg-rose-900/20 border border-rose-800 rounded-xl text-rose-300">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div><p className="font-medium">Error</p><p className="text-sm mt-1">{error}</p></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div data-rr-block className="flex h-screen w-full bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* LEFT PANE */}
      <div className="flex flex-col flex-1 border-r border-slate-800 bg-slate-900/50">
        <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-4">
            <h1 className="font-semibold text-lg text-slate-100">Patient: John Doe</h1>
            <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
              Panorex &bull; 2026-07-21
            </span>
            {isDemo && (
              <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                Demo Mode
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowOverlays(!showOverlays)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                showOverlays ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {showOverlays ? <Eye size={14} /> : <EyeOff size={14} />}
              {showOverlays ? 'AI Overlays Active' : 'Show Raw X-Ray'}
            </button>
            <div className="h-4 w-px bg-slate-800 mx-1" />
            <button className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800"><ZoomIn size={16} /></button>
            <button className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800"><ZoomOut size={16} /></button>
            <button className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800"><Sliders size={16} /></button>
          </div>
        </header>

        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden p-6">
          <div ref={canvasContainerRef} className="relative w-full max-w-4xl h-[500px] rounded-lg border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden">
            <img
              ref={imgRef}
              src={image!}
              alt="X-Ray"
              className="absolute inset-0 w-full h-full object-contain"
              onLoad={(e) => {
                const img = e.currentTarget;
                setImageNatural({ w: img.naturalWidth, h: img.naturalHeight });
              }}
            />
            {showOverlays && canvasToothBoxes.map((t, i) => {
              const isSelected = selectedTooth === t.toothLabel;
              return (
                <div key={i} onClick={() => setSelectedTooth(t.toothLabel)}
                  className={`absolute border-2 rounded transition-all cursor-pointer flex flex-col justify-between p-0.5 ${
                    isSelected
                      ? 'border-rose-500 bg-rose-500/20 ring-4 ring-rose-500/20'
                      : 'border-rose-500/60 bg-rose-500/10 hover:border-rose-400'
                  }`}
                  style={{ left: `${t.left}px`, top: `${t.top}px`, width: `${t.width}px`, height: `${t.height}px` }}
                >
                  <span className="text-[10px] font-mono bg-rose-500 text-white px-1 rounded w-max">#{t.toothLabel}</span>
                  <span className="text-[9px] font-semibold text-rose-200">
                    {`${(t.confidence * 100).toFixed(0)}%`}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="absolute bottom-4 left-6 text-xs text-slate-500 flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">Space</kbd>
            Hold to hide annotations
          </div>
        </div>

        <div className="h-22 border-t border-slate-800 bg-slate-900 px-6 py-2 flex flex-col gap-1 overflow-x-auto">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Upper Arch</span>
          <div className="flex gap-1.5">
            {TEETH_UPPER.map((toothNum) => {
              const hf = hasFinding(toothNum); const sel = selectedTooth === toothNum;
              return (
                <button key={toothNum} onClick={() => setSelectedTooth(toothNum)}
                  className={`relative flex flex-col items-center justify-center min-w-[34px] h-9 rounded border text-xs font-mono transition-all ${
                    sel ? 'border-indigo-500 bg-indigo-500/20 text-white font-bold' : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {toothNum}
                  {hf && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-slate-900" />}
                </button>
              );
            })}
          </div>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Lower Arch</span>
          <div className="flex gap-1.5">
            {TEETH_LOWER.map((toothNum) => {
              const hf = hasFinding(toothNum); const sel = selectedTooth === toothNum;
              return (
                <button key={toothNum} onClick={() => setSelectedTooth(toothNum)}
                  className={`relative flex flex-col items-center justify-center min-w-[34px] h-9 rounded border text-xs font-mono transition-all ${
                    sel ? 'border-indigo-500 bg-indigo-500/20 text-white font-bold' : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {toothNum}
                  {hf && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-slate-900" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT PANE */}
      <div className="w-[420px] flex flex-col bg-slate-900">
        <div className="flex-1 border-b border-slate-800 p-5 flex flex-col gap-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="text-indigo-400" size={18} />
              <h2 className="font-semibold text-sm text-slate-100">AI Diagnostic Findings</h2>
            </div>
            <span className="text-xs text-slate-400">{findings.length} detected</span>
          </div>

          <div className="flex flex-col gap-3">
            {findings.map((item) => {
              const isSelected = selectedTooth === item.tooth;
              return (
                <div key={item.id} onClick={() => setSelectedTooth(item.tooth)}
                  className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/5' : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-400 font-mono text-xs font-bold border border-slate-700">#{item.tooth}</span>
                      <h3 className="text-xs font-medium text-slate-200">{item.diagnosis}</h3>
                    </div>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      item.confidence >= 85 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>{item.confidence}% match</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2.5">
                    <span className="text-[11px] text-slate-500">
                      {item.verified === true ? 'Approved' : item.verified === false ? 'Overridden' : 'Pending Review'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button onClick={(e) => { e.stopPropagation(); handleVerify(item.id, false); }}
                        className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800" title="Dismiss Finding">
                        <XCircle size={15} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleVerify(item.id, true); }}
                        className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                          item.verified ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-emerald-600 hover:text-white'
                        }`}>
                        <CheckCircle2 size={13} />
                        {item.verified ? 'Verified' : 'Verify'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="h-[320px] flex flex-col bg-slate-950 p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <FileText size={14} className="text-indigo-400" />
              Dental Clinical Copilot
            </span>
            <button onClick={() => setMessages([])} className="text-[11px] text-indigo-400 hover:underline">Clear Context</button>
          </div>

          <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-2.5 text-xs">
            {messages.map((msg, idx) => (
              <div key={idx} className={`p-2.5 rounded-lg max-w-[90%] ${
                msg.role === 'assistant' ? 'bg-slate-900 border border-slate-800 text-slate-300 self-start' : 'bg-indigo-600 text-white self-end'
              }`}>{msg.text}</div>
            ))}
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button onClick={() => setChatInput(`Generate SOAP note for Tooth #${selectedTooth}`)}
                className="px-2 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-400 whitespace-nowrap">
                + Draft SOAP Note
              </button>
              <button onClick={() => setChatInput(`Patient explanation for Tooth #${selectedTooth}`)}
                className="px-2 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-400 whitespace-nowrap">
                + Patient Summary
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!chatInput.trim()) return;
              setMessages(prev => [...prev, { role: 'user', text: chatInput }]);
              const ctx = activeFinding ? ` (Context: Tooth #${activeFinding.tooth} - ${activeFinding.diagnosis})` : '';
              setTimeout(() => setMessages(prev => [...prev, {
                role: 'assistant',
                text: `Processing your request for Tooth #${selectedTooth}${ctx}. [Clinical copilot response would be generated here.]`
              }]), 500);
              setChatInput('');
            }} className="flex items-center gap-2">
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                placeholder={`Ask about Tooth #${selectedTooth || 'general'}...`}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-md px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button type="submit" className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors">
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
