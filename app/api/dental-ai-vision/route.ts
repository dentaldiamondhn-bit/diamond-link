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
    { x: 304, y: 210, w: 48, h: 75, label: 'Distal Occlusal Caries #14', confidence: 0.92 },
    { x: 496, y: 290, w: 56, h: 80, label: 'Periapical Radiolucency #19', confidence: 0.85 },
    { x: 256, y: 300, w: 56, h: 75, label: 'Marginal Leakage Crown #30', confidence: 0.74 },
    { x: 160, y: 240, w: 48, h: 70, label: 'Horizontal Bone Loss #03', confidence: 0.68 },
    { x: 400, y: 200, w: 52, h: 78, label: 'Mesial Caries #09', confidence: 0.71 },
  ],
  model: 'demo',
  image_width: 800,
  image_height: 500,
};

interface HFBox {
  box?: { xmin: number; ymin: number; xmax: number; ymax: number };
  label?: string;
  score?: number;
}

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

function parseBoxes(data: HFBox[], model: string, imgW: number, imgH: number): DetectionResult {
  const boxes = (Array.isArray(data) ? data : []).map((item) => ({
    x: (item.box?.xmin ?? 0) * imgW,
    y: (item.box?.ymin ?? 0) * imgH,
    w: ((item.box?.xmax ?? 0) - (item.box?.xmin ?? 0)) * imgW,
    h: ((item.box?.ymax ?? 0) - (item.box?.ymin ?? 0)) * imgH,
    label: item.label || 'unknown',
    confidence: item.score ?? 0,
  }));
  return { boxes, model, image_width: imgW, image_height: imgH };
}

function parseMasks(data: any, model: string, imgW: number, imgH: number): DetectionResult {
  const masks = (Array.isArray(data) ? data : []).map((item: any) => ({
    mask: item.mask || '', label: item.label || 'unknown',
  }));
  return { boxes: [], masks, model, image_width: imgW, image_height: imgH };
}

const MODELS: Record<string, { task: 'object-detection' | 'image-segmentation'; model: string }> = {
  'tooth-detection': { task: 'object-detection', model: 'liodon-ai/dental-panoramic-detector' },
  'caries-detection': { task: 'object-detection', model: 'nsitnov/8024-yolov8-model' },
  'segmentation': { task: 'image-segmentation', model: 'nsitnov/8024-yolov8-model' },
};

function imageDimensionsFromBuffer(buffer: Buffer): { width: number; height: number } {
  const firstBytes = buffer.slice(0, 33).toString('hex').toUpperCase();
  let width = 800, height = 500;
  if (firstBytes.startsWith('FFD8')) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xFF) break;
      const marker = buffer[offset + 1];
      if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
        height = (buffer[offset + 5] << 8) + buffer[offset + 6];
        width = (buffer[offset + 7] << 8) + buffer[offset + 8];
        break;
      }
      const segLen = (buffer[offset + 2] << 8) + buffer[offset + 3];
      offset += 2 + segLen;
    }
  } else if (firstBytes.startsWith('89504E47')) {
    width = (buffer[16] << 24) + (buffer[17] << 16) + (buffer[18] << 8) + buffer[19];
    height = (buffer[20] << 24) + (buffer[21] << 16) + (buffer[22] << 8) + buffer[23];
  }
  return { width, height };
}

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

    const buffer = Buffer.from(await file.arrayBuffer());
    const { width: imgW, height: imgH } = imageDimensionsFromBuffer(buffer);

    if (!HF_TOKEN) {
      const demo = { ...DEMO_RESULT, image_width: imgW, image_height: imgH };
      return NextResponse.json({
        success: true,
        data: demo,
        _demo: true,
        _notice: 'HUGGINGFACE_API_KEY not set. Showing simulated results.',
      });
    }

    let result: DetectionResult;
    try {
      const data = await callHFInference(buffer, config.model);
      result = config.task === 'object-detection'
        ? parseBoxes(data, config.model, imgW, imgH)
        : parseMasks(data, config.model, imgW, imgH);
    } catch (hfErr: any) {
      console.warn('HF Inference failed, falling back to demo:', hfErr.message);
      const demo = { ...DEMO_RESULT, image_width: imgW, image_height: imgH };
      return NextResponse.json({
        success: true,
        data: demo,
        _demo: true,
        _notice: `HF Inference unavailable (${hfErr.message}). Showing simulated results.`,
      });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Dental AI Vision API error:', error);
    const demo = { ...DEMO_RESULT, image_width: 800, image_height: 500 };
    return NextResponse.json({ success: true, data: demo, _demo: true, _notice: error.message });
  }
}
