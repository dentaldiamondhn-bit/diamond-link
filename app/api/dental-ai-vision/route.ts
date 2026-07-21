import { NextRequest, NextResponse } from 'next/server';

const HF_TOKEN = process.env.HUGGINGFACE_API_KEY;

interface DetectionResult {
  boxes: Array<{
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
    confidence: number;
  }>;
  masks?: Array<{
    mask: string;
    label: string;
  }>;
  model: string;
  image_width: number;
  image_height: number;
}

async function base64FromRequest(req: NextRequest): Promise<string> {
  const form = await req.formData();
  const file = form.get('image') as File;
  if (!file) throw new Error('No image provided');
  const buffer = Buffer.from(await file.arrayBuffer());
  return buffer.toString('base64');
}

async function runObjectDetection(
  imageBase64: string,
  model: string
): Promise<DetectionResult> {
  const buffer = Buffer.from(imageBase64, 'base64');
  const response = await fetch(
    `https://api-inference.huggingface.co/models/${model}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/octet-stream',
      },
      body: buffer,
    }
  );

  if (!response.ok) {
    const err = await response.text().catch(() => '');
    throw new Error(`HF Inference API error (${response.status}): ${err}`);
  }

  const data = await response.json();

  const boxes = (Array.isArray(data) ? data : []).map((item: any) => ({
    x: item.box?.xmin ?? 0,
    y: item.box?.ymin ?? 0,
    w: (item.box?.xmax ?? 0) - (item.box?.xmin ?? 0),
    h: (item.box?.ymax ?? 0) - (item.box?.ymin ?? 0),
    label: item.label || 'unknown',
    confidence: item.score ?? 0,
  }));

  return {
    boxes,
    model,
    image_width: 0,
    image_height: 0,
  };
}

async function runSegmentation(
  imageBase64: string,
  model: string
): Promise<DetectionResult> {
  const buffer = Buffer.from(imageBase64, 'base64');
  const response = await fetch(
    `https://api-inference.huggingface.co/models/${model}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/octet-stream',
      },
      body: buffer,
    }
  );

  if (!response.ok) {
    const err = await response.text().catch(() => '');
    throw new Error(`HF Inference API error (${response.status}): ${err}`);
  }

  const data = await response.json();

  const masks = (Array.isArray(data) ? data : []).map((item: any) => ({
    mask: item.mask || '',
    label: item.label || 'unknown',
  }));

  return {
    boxes: [],
    masks,
    model,
    image_width: 0,
    image_height: 0,
  };
}

const MODELS: Record<string, { task: 'object-detection' | 'image-segmentation'; model: string }> = {
  'tooth-detection': {
    task: 'object-detection',
    model: 'AI-RESEARCHER-2024/AI-in-Dentistry',
  },
  'caries-detection': {
    task: 'object-detection',
    model: 'keremberke/yolov8n-dental-caries-detection',
  },
  'segmentation': {
    task: 'image-segmentation',
    model: 'AI-RESEARCHER-2024/AI-in-Dentistry',
  },
};

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('image') as File;
    const analysisType = (form.get('type') as string) || 'tooth-detection';

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const config = MODELS[analysisType];
    if (!config) {
      return NextResponse.json({ error: `Unknown analysis type: ${analysisType}` }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');

    let result: DetectionResult;

    if (config.task === 'object-detection') {
      result = await runObjectDetection(base64, config.model);
    } else {
      result = await runSegmentation(base64, config.model);
    }

    result.image_width = 0;
    result.image_height = 0;

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Dental AI Vision API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Processing failed' },
      { status: 500 }
    );
  }
}
