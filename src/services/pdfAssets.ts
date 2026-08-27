import jsPDF from 'jspdf';
import { ConteoEstadoEntry } from './presupuestoService';

let cachedLogoPng: SvgPngResult | null = null;
let cachedWhatsappIconPng: SvgPngResult | null = null;

export interface SvgPngResult {
  dataUrl: string;
  width: number;
  height: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) || 255,
    parseInt(h.slice(2, 4), 16) || 255,
    parseInt(h.slice(4, 6), 16) || 255,
  ];
}

export function drawConteoBadges(
  pdf: jsPDF,
  entries: ConteoEstadoEntry[],
  x: number,
  y: number,
  maxX: number,
  ensureSpace: (needed: number) => void
): number {
  if (entries.length === 0) return y;
  const badgePadding = 3.6;
  const dotSize = 2.7;
  const dotGap = 2.1;
  const badgeGap = 3.6;
  const pillH = 6.12;
  const scaleFactor = pdf.internal.scaleFactor;
  const badgeFontSize = pillH * scaleFactor * 0.75;
  pdf.setFontSize(badgeFontSize);
  let badgeX = x;
  let pillTop = y;
  entries.forEach((entry) => {
    pdf.setFont('helvetica', 'normal');
    const text = `${entry.label} ${entry.count}`;
    const textW = pdf.getTextWidth(text);
    const totalW = badgePadding * 2 + textW + dotGap + dotSize;
    if (badgeX + totalW > maxX) {
      badgeX = x;
      pillTop += pillH + 5;
      ensureSpace(pillH + 5);
    }
    const pillCenterY = pillTop + pillH / 2;
    const textBaseline = pillCenterY + (0.31 * badgeFontSize) / scaleFactor;
    pdf.setFillColor(243, 244, 246);
    pdf.setDrawColor(229, 231, 235);
    pdf.roundedRect(badgeX, pillTop, totalW, pillH, pillH / 2, pillH / 2, 'FD');
    pdf.setTextColor(17, 24, 39);
    pdf.text(text, badgeX + badgePadding, textBaseline);
    const dotX = badgeX + totalW - badgePadding - dotSize / 2;
    if (entry.color === '#FFFFFF') {
      pdf.setDrawColor(200, 200, 200);
      pdf.setFillColor(255, 255, 255);
      pdf.circle(dotX, pillCenterY, dotSize / 2, 'FD');
    } else {
      const rgb = hexToRgb(entry.color);
      pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
      pdf.circle(dotX, pillCenterY, dotSize / 2, 'F');
    }
    badgeX += totalW + badgeGap;
  });
  return pillTop + pillH + 4;
}

const WHATSAPP_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="#25D366" d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>`;

function getSvgDimensions(svg: string): { width: number; height: number } {
  const widthAttr = /width="([\d.]+)"/.exec(svg);
  const heightAttr = /height="([\d.]+)"/.exec(svg);
  const viewBoxMatch = /viewBox="([\d.\s-]+)"/.exec(svg);
  const viewBox = viewBoxMatch
    ? viewBoxMatch[1].trim().split(/\s+/).map(Number)
    : null;
  return {
    width: widthAttr ? parseFloat(widthAttr[1]) : viewBox ? viewBox[2] : 300,
    height: heightAttr ? parseFloat(heightAttr[1]) : viewBox ? viewBox[3] : 150,
  };
}

async function renderSvgToPng(svg: string): Promise<SvgPngResult> {
  const { width, height } = getSvgDimensions(svg);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo obtener el contexto del canvas');
  const canvgModule = await import('canvg');
  const canvg = (canvgModule.default ?? canvgModule) as typeof import('canvg').default;
  const renderer = canvg.fromString(ctx, svg, {
    ignoreMouse: true,
    ignoreAnimation: true,
  });
  renderer.render();
  return { dataUrl: canvas.toDataURL('image/png'), width, height };
}

export async function getClinicLogoPng(): Promise<SvgPngResult> {
  if (cachedLogoPng) return cachedLogoPng;
  const res = await fetch('/Logo.svg');
  if (!res.ok) throw new Error('No se pudo cargar el logo');
  const svg = await res.text();
  cachedLogoPng = await renderSvgToPng(svg);
  return cachedLogoPng;
}

export async function getWhatsappIconPng(): Promise<SvgPngResult> {
  if (cachedWhatsappIconPng) return cachedWhatsappIconPng;
  cachedWhatsappIconPng = await renderSvgToPng(WHATSAPP_ICON_SVG);
  return cachedWhatsappIconPng;
}
