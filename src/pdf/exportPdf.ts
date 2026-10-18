// PDF export in the browser (Phase 1). Each page is the same PagePanel the reader shows, rendered
// to a JPEG with html-to-image and placed one per sheet with jsPDF. Phase 2 renders server-side.

import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import type { Paper } from '../domain/types';

async function imagesReady(root: HTMLElement, timeoutMs = 15000) {
  const imgs = Array.from(root.querySelectorAll('img'));
  await Promise.race([
    Promise.all(imgs.map((im) => (im.complete && im.naturalWidth ? Promise.resolve() : im.decode().catch(() => undefined)))),
    new Promise((r) => setTimeout(r, timeoutMs)),
  ]);
  await document.fonts?.ready;
}

/** Pages must already be mounted (off-screen) inside `root`, one element per [data-pdf-page]. */
export async function buildPdf(root: HTMLElement, paper: Paper, onProgress?: (done: number, total: number) => void): Promise<Blob> {
  await imagesReady(root);
  const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-pdf-page]'));
  const doc = new jsPDF({ unit: 'mm', format: paper === 'a4' ? 'a4' : 'letter', orientation: 'portrait', compress: true });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margin = paper === 'a4' ? 10 : 10.16;
  // PagePanel is 210:297; fit inside the margins and centre.
  const maxW = W - 2 * margin;
  const maxH = H - 2 * margin;
  const w = Math.min(maxW, maxH * (210 / 297));
  const h = w * (297 / 210);
  const x = (W - w) / 2;
  const y = (H - h) / 2;
  for (let i = 0; i < nodes.length; i++) {
    const data = await toJpeg(nodes[i], { quality: 0.92, pixelRatio: 2, backgroundColor: '#FFFFFF', cacheBust: false });
    if (i > 0) doc.addPage();
    doc.addImage(data, 'JPEG', x, y, w, h, undefined, 'FAST');
    onProgress?.(i + 1, nodes.length);
  }
  return doc.output('blob');
}
