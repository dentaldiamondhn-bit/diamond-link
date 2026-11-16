'use client';

// Serializes an SVG element and downloads it as a PNG (white background),
// the same artifact path the reference site produces via html2canvas.
export async function rasterizeSvg(svg: SVGSVGElement, filename: string, scale = 2): Promise<void> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  const svgString = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('No se pudo rasterizar la imagen.'));
      img.src = url;
    });

    const viewBox = svg.getAttribute('viewBox');
    const baseWidth = Number(svg.getAttribute('width')) || (viewBox ? parseFloat(viewBox.split(' ')[2]) : 800);
    const baseHeight = Number(svg.getAttribute('height')) || (viewBox ? parseFloat(viewBox.split(' ')[3]) : 600);

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(baseWidth * scale);
    canvas.height = Math.round(baseHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas no disponible.');

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = filename;
    link.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Breaks a plain-text line into SVG-friendly chunks of roughly maxChars
// characters, honouring spaces where possible.
export function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (current.length === 0) {
      current = word;
    } else if (current.length + 1 + word.length <= maxChars) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}
