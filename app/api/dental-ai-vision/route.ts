import { NextRequest, NextResponse } from 'next/server';

const PYTHON_AI_URL = process.env.PYTHON_AI_URL || 'http://127.0.0.1:8000';
const HF_TOKEN = process.env.HUGGINGFACE_API_KEY;

const DEMO_RESULT = {
  boxes: [
    { x: 0.23, y: 0.44, w: 0.05, h: 0.12, label: 'Horizontal Bone Loss #03', confidence: 0.68 },
    { x: 0.38, y: 0.43, w: 0.04, h: 0.13, label: 'Mesial Caries #09', confidence: 0.71 },
    { x: 0.48, y: 0.44, w: 0.05, h: 0.12, label: 'Distal Occlusal Caries #14', confidence: 0.92 },
    { x: 0.48, y: 0.52, w: 0.05, h: 0.14, label: 'Periapical Radiolucency #19', confidence: 0.85 },
    { x: 0.25, y: 0.52, w: 0.05, h: 0.14, label: 'Marginal Leakage Crown #30', confidence: 0.74 },
  ],
  image_width: 800,
  image_height: 500,
};

const HF_HOST = 'https://api-inference.huggingface.co';

const MODELS: Record<string, string> = {
  'tooth-detection': 'liodon-ai/dental-panoramic-detector',
  'caries-detection': 'nsitnov/8024-yolov8-model',
  'segmentation': 'nsitnov/8024-yolov8-model',
};

interface HFBox {
  box?: { xmin: number; ymin: number; xmax: number; ymax: number };
  label?: string;
  score?: number;
}

function parseHFBoxes(data: HFBox[], imgW: number, imgH: number) {
  return (Array.isArray(data) ? data : []).map((item) => ({
    x: (item.box?.xmin ?? 0) * imgW,
    y: (item.box?.ymin ?? 0) * imgH,
    w: ((item.box?.xmax ?? 0) - (item.box?.xmin ?? 0)) * imgW,
    h: ((item.box?.ymax ?? 0) - (item.box?.ymin ?? 0)) * imgH,
    label: item.label || 'unknown',
    confidence: item.score ?? 0,
  }));
}

function imageDimensionsFromBuffer(buffer: Buffer): { width: number; height: number } {
  const hex = buffer.slice(0, 33).toString('hex').toUpperCase();
  if (hex.startsWith('FFD8')) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xFF) break;
      const marker = buffer[offset + 1];
      if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
        return {
          height: (buffer[offset + 5] << 8) + buffer[offset + 6],
          width: (buffer[offset + 7] << 8) + buffer[offset + 8],
        };
      }
      offset += 2 + ((buffer[offset + 2] << 8) + buffer[offset + 3]);
    }
  } else if (hex.startsWith('89504E47')) {
    return {
      width: (buffer[16] << 24) + (buffer[17] << 16) + (buffer[18] << 8) + buffer[19],
      height: (buffer[20] << 24) + (buffer[21] << 16) + (buffer[22] << 8) + buffer[23],
    };
  }
  return { width: 800, height: 500 };
}

async function tryPythonAI(formData: FormData): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${PYTHON_AI_URL}/api/dental-ai-vision`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok ? res : null;
  } catch {
    return null;
  }
}

async function tryHFInference(buffer: Buffer, imgW: number, imgH: number, model: string) {
  const res = await fetch(`${HF_HOST}/models/${model}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/octet-stream',
    },
    body: buffer,
  });
  if (!res.ok) throw new Error(`HF API ${res.status}`);
  const data = await res.json();
  return { boxes: parseHFBoxes(data, imgW, imgH), image_width: imgW, image_height: imgH };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 });
    }

    // 1. Try local Python ONNX server first
    const pythonRes = await tryPythonAI(formData);
    if (pythonRes) {
      const data = await pythonRes.json();
      return NextResponse.json(data);
    }

    // 2. Fallback to HuggingFace Inference API
    const analysisType = (formData.get('type') as string) || 'tooth-detection';
    const model = MODELS[analysisType];
    const buffer = Buffer.from(await file.arrayBuffer());
    const { width: imgW, height: imgH } = imageDimensionsFromBuffer(buffer);

    if (model && HF_TOKEN) {
      try {
        const result = await tryHFInference(buffer, imgW, imgH, model);
        return NextResponse.json({ success: true, data: result });
      } catch (hfErr: any) {
        console.warn('HF Inference failed:', hfErr.message);
      }
    }

    // 3. Demo fallback
    return NextResponse.json({
      success: true,
      data: { ...DEMO_RESULT, image_width: imgW, image_height: imgH },
      _demo: true,
      _notice: 'AI server unavailable. Showing simulated results.',
    });
  } catch (error: any) {
    console.error('Dental AI Vision API error:', error);
    return NextResponse.json({ success: true, data: DEMO_RESULT, _demo: true, _notice: error.message });
  }
}
