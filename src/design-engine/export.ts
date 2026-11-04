// PNG / PDF export (browser). PDF v1 embeds each page as a JPEG so Devanagari renders exactly as previewed.
import { PDFDocument } from "pdf-lib";

import { type DesignDoc } from "./model";
import { type MergeData } from "./merge";
import { renderAll } from "./render";

export async function toPngBlob(doc: DesignDoc, data: MergeData = {}, scale = 2): Promise<Blob> {
  const [c] = await renderAll(doc, data, scale);
  return new Promise((res, rej) => c!.toBlob((b) => (b ? res(b) : rej(new Error("PNG failed"))), "image/png"));
}

export async function toPdfBytes(doc: DesignDoc, data: MergeData = {}, opts: { dpi?: number; quality?: number } = {}): Promise<Uint8Array> {
  const dpi = opts.dpi ?? 200;
  const canvases = await renderAll(doc, data, dpi / 96);
  const pdf = await PDFDocument.create();
  pdf.setProducer("Kalchuri One Design Engine");
  const wPt = (doc.wMm / 25.4) * 72, hPt = (doc.hMm / 25.4) * 72;
  for (const c of canvases) {
    const jpg = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("JPEG failed"))), "image/jpeg", opts.quality ?? 0.92));
    const img = await pdf.embedJpg(new Uint8Array(await jpg.arrayBuffer()));
    const page = pdf.addPage([wPt, hPt]);
    page.drawImage(img, { x: 0, y: 0, width: wPt, height: hPt });
  }
  return pdf.save();
}

export function download(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
