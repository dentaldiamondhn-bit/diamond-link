import { NextRequest, NextResponse } from 'next/server';

const HF_TOKEN = process.env.HUGGINGFACE_API_KEY;

interface DetectionResult {
  boxes: Array<{ x: number; y: number; w: number; h: number; label: string; confidence: number }>;
  masks?: Array<{ mask: string; label: string }>;
  model: string;
  image_width: number;
  image_height: number;
}

const HF_HOST = 'https://api-inference.huggingface.co';

const DEMO_RESULT: DetectionResult = {
  boxes: [
    { x: 42, y: 35, w: 16, h: 20, label: 'Distal Occlusal Caries #14', confidence: 0.92 },
    { x: 60, y: 50, w: 16, h: 20, label: 'Periapical Radiolucency #19', confidence: 0.85 },
    { x: 72, y: 45, w: 14, h: 18, label: 'Marginal Leakage Crown #30', confidence: 0.74 },
    { x: 10, y: 55, w: 12, h: 15, label: 'Horizontal Bone Loss #03', confidence: 0.68 },
  ],
  model: 'demo',
  image_width: 800,
  image_height: 500,
};

async function callHFInference(buffer: Buffer, model: string): Promise<any> {
  const response = await fetch(`${HF_HOST}/models/${model}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/octet-stream',
    },
    body: buffer,
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`HF API ${response.status}: ${body.slice(0, 200)}`);
  }
  return response.json();
}

function parseBoxes(data: any, model: string): DetectionResult {
  const boxes = (Array.isArray(data) ? data : []).map((item: any) => ({
    x: item.box?.xmin ?? 0,
    y: item.box?.ymin ?? 0,
    w: (item.box?.xmax ?? 0) - (item.box?.xmin ?? 0),
    h: (item.box?.ymax ?? 0) - (item.box?.ymin ?? 0),
    label: item.label || 'unknown',
    confidence: item.score ?? 0,
  }));
  return { boxes, model, image_width: 0, image_height: 0 };
}

function parseMasks(data: any, model: string): DetectionResult {
  const masks = (Array.isArray(data) ? data : []).map((item: any) => ({
    mask: item.mask || '', label: item.label || 'unknown',
  }));
  return { boxes: [], masks, model, image_width: 0, image_height: 0 };
}

const MODELS: Record<string, { task: 'object-detection' | 'image-segmentation'; model: string }> = {
  'tooth-detection': { task: 'object-detection', model: 'AI-RESEARCHER-2024/AI-in-Dentistry' },
  'caries-detection': { task: 'object-detection', model: 'keremberke/yolov8n-dental-caries-detection' },
  'segmentation': { task: 'image-segmentation', model: 'AI-RESEARCHER-2024/AI-in-Dentistry' },
};

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('image') as File;
    const analysisType = (form.get('type') as string) || 'tooth-detection';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 });
    }

    const config = MODELS[analysisType];
    if (!config) {
      return NextResponse.json({ success: false, error: `Unknown analysis type: ${analysisType}` }, { status: 400 });
    }

    if (!HF_TOKEN) {
      return NextResponse.json({
        success: true,
        data: DEMO_RESULT,
        _demo: true,
        _notice: 'HUGGINGFACE_API_KEY not set. Showing simulated results. Add it to Vercel project env vars for real inference.',
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let result: DetectionResult;
    try {
      const data = await callHFInference(buffer, config.model);
      result = config.task === 'object-detection' ? parseBoxes(data, config.model) : parseMasks(data, config.model);
    } catch (hfErr: any) {
      console.warn('HF Inference failed, falling back to demo:', hfErr.message);
      return NextResponse.json({
        success: true,
        data: DEMO_RESULT,
        _demo: true,
        _notice: `HF Inference unavailable (${hfErr.message}). Showing simulated results.`,
      });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Dental AI Vision API error:', error);
    return NextResponse.json({ success: true, data: DEMO_RESULT, _demo: true, _notice: error.message });
  }
}
