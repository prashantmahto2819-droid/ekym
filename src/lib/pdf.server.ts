import { LineCapStyle, PDFDocument, StandardFonts, degrees, rgb, type PDFImage, type PDFPage, type PDFFont, type RGB } from "pdf-lib";
import QRCode from "qrcode";

import { toLatin } from "@/design-engine/script";

/** Central server-side PDF engine (receipts, volunteer ID card and certificate).
 *  Standard PDF fonts cannot draw Devanagari, so every string passes through `safe()`: Hindi names are
 *  transliterated to Latin ("रमेश कुमार" → "Ramesh Kumar"), ₹ becomes "Rs." and anything else unprintable is dropped. */

const TEAL = rgb(0.059, 0.463, 0.431);
const TEAL_DEEP = rgb(0.035, 0.33, 0.31);
const GOLD = rgb(0.722, 0.573, 0.29);
const NAVY = rgb(0.106, 0.227, 0.361);
const INK = rgb(0.075, 0.11, 0.17);
const MUTED = rgb(0.4, 0.44, 0.47);
const LINE = rgb(0.85, 0.87, 0.88);
const CREAM = rgb(1, 0.988, 0.953);
const WHITE = rgb(1, 1, 1);

export type PdfDocContext = {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
};

export async function startDocument(): Promise<PdfDocContext> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  return { doc, page, font, bold };
}

/* ---------------- text safety: Devanagari → Latin, WinAnsi only ---------------- */
/** Make any string drawable with the standard (WinAnsi) fonts. */
export function safe(s: string | null | undefined): string {
  if (!s) return "";
  let t = String(s).replace(/₹\s?/g, "Rs. ").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-");
  t = toLatin(t);
  // keep printable Latin-1 plus a few WinAnsi extras
  return t.replace(/[^\x20-\x7e\xa0-\xff•…€]/g, "").replace(/\s{2,}/g, " ").trim();
}

/* ---------------- drawing helpers ---------------- */
type TextOpts = { size: number; font: PDFFont; color?: RGB };
function text(page: PDFPage, s: string, x: number, y: number, o: TextOpts) {
  const t = safe(s);
  if (t) page.drawText(t, { x, y, size: o.size, font: o.font, color: o.color ?? INK });
}
function widthOf(s: string, o: TextOpts, spacing = 0) {
  const t = safe(s);
  return o.font.widthOfTextAtSize(t, o.size) + Math.max(0, t.length - 1) * spacing;
}
/** Shrinks the size until the text fits `maxW`. */
function fitSize(s: string, font: PDFFont, size: number, maxW: number, min = 6) {
  let z = size;
  while (z > min && font.widthOfTextAtSize(safe(s), z) > maxW) z -= 0.5;
  return z;
}
function centered(page: PDFPage, s: string, cx: number, y: number, o: TextOpts, spacing = 0) {
  if (!spacing) { text(page, s, cx - widthOf(s, o) / 2, y, o); return; }
  spaced(page, s, cx - widthOf(s, o, spacing) / 2, y, o, spacing);
}
function rightAligned(page: PDFPage, s: string, rx: number, y: number, o: TextOpts) {
  text(page, s, rx - widthOf(s, o), y, o);
}
/** Letter-spaced capitals (pdf-lib has no tracking, so draw glyph by glyph). */
function spaced(page: PDFPage, s: string, x: number, y: number, o: TextOpts, spacing: number) {
  let cx = x;
  for (const ch of safe(s)) {
    page.drawText(ch, { x: cx, y, size: o.size, font: o.font, color: o.color ?? INK });
    cx += o.font.widthOfTextAtSize(ch, o.size) + spacing;
  }
}
function wrap(s: string, font: PDFFont, size: number, maxW: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const w of safe(s).split(" ")) {
    const next = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) > maxW && cur) { lines.push(cur); cur = w; } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Draws a QR code as vector squares — no raster encoder needed at runtime. */
export function drawQrCode(page: PDFPage, value: string, opts: { x: number; y: number; size: number; color?: RGB }) {
  const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
  const count = qr.modules.size;
  const data = qr.modules.data;
  const cell = opts.size / count;
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      if (!data[row * count + col]) continue;
      page.drawRectangle({ x: opts.x + col * cell, y: opts.y + opts.size - (row + 1) * cell, width: cell + 0.05, height: cell + 0.05, color: opts.color ?? INK });
    }
  }
}

/** Gold rosette seal with ribbon tails, centred at (cx, cy). */
function drawSeal(page: PDFPage, cx: number, cy: number, r: number, color: RGB = GOLD) {
  for (const sg of [-1, 1]) {
    page.drawSvgPath(`M ${-r * 0.22} 0 L ${r * 0.22} 0 L ${r * 0.22} ${r * 1.05} L 0 ${r * 0.86} L ${-r * 0.22} ${r * 1.05} Z`, { x: cx, y: cy - r * 0.45, color, rotate: degrees(sg * 18) });
  }
  const n = 28; let d = "";
  for (let i = 0; i <= n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, rad = i % 2 ? r * 0.9 : r; d += `${i ? "L" : "M"} ${(Math.cos(a) * rad).toFixed(2)} ${(Math.sin(a) * rad).toFixed(2)} `; }
  page.drawSvgPath(d + "Z", { x: cx, y: cy, color });
  page.drawCircle({ x: cx, y: cy, size: r * 0.76, borderColor: WHITE, borderWidth: Math.max(0.6, r * 0.035), borderOpacity: 0.8 });
  page.drawCircle({ x: cx, y: cy, size: r * 0.66, borderColor: WHITE, borderWidth: Math.max(0.6, r * 0.035), borderOpacity: 0.8 });
  let st = "";
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rad = i % 2 ? r * 0.14 : r * 0.34; st += `${i ? "L" : "M"} ${(Math.cos(a) * rad).toFixed(2)} ${(Math.sin(a) * rad).toFixed(2)} `; }
  page.drawSvgPath(st + "Z", { x: cx, y: cy, color: WHITE, opacity: 0.92 });
}

/** L-shaped corner flourish; (x, y) is the outer corner, sx/sy = +1/-1 point inwards. */
function drawCorner(page: PDFPage, x: number, y: number, s: number, sx: 1 | -1, sy: 1 | -1, color: RGB = GOLD) {
  const p = (a: number, b: number) => `${(a * sx).toFixed(2)} ${(-b * sy).toFixed(2)}`;
  page.drawSvgPath(`M ${p(s, 0)} L ${p(s * 0.28, 0)} C ${p(s * 0.08, 0)} ${p(0, s * 0.08)} ${p(0, s * 0.28)} L ${p(0, s)}`, { x, y, borderColor: color, borderWidth: s * 0.05, borderLineCap: LineCapStyle.Round });
  page.drawSvgPath(`M ${p(s * 0.7, s * 0.12)} L ${p(s * 0.3, s * 0.12)} C ${p(s * 0.18, s * 0.12)} ${p(s * 0.12, s * 0.18)} ${p(s * 0.12, s * 0.3)} L ${p(s * 0.12, s * 0.7)}`, { x, y, borderColor: color, borderWidth: s * 0.035 });
  page.drawCircle({ x: x + sx * s * 0.26, y: y + sy * s * 0.26, size: s * 0.05, color });
}

/** Org logo if available, else a round monogram with the organisation's initial. */
async function drawLogo(doc: PDFDocument, page: PDFPage, org: OrgHeader, cx: number, cy: number, size: number, bold: PDFFont, ring: RGB = GOLD, fill: RGB = TEAL) {
  const img = await loadLogo(doc, org.logo);
  if (img) {
    const s = Math.min(size / img.width, size / img.height);
    page.drawImage(img, { x: cx - (img.width * s) / 2, y: cy - (img.height * s) / 2, width: img.width * s, height: img.height * s });
    return;
  }
  page.drawCircle({ x: cx, y: cy, size: size / 2, color: ring });
  page.drawCircle({ x: cx, y: cy, size: size / 2 - size * 0.08, color: fill });
  const initial = safe(org.organization_name ?? "K").replace(/^(the|shri|sri)\s+/i, "").charAt(0).toUpperCase() || "K";
  const fs = size * 0.46;
  page.drawText(initial, { x: cx - bold.widthOfTextAtSize(initial, fs) / 2, y: cy - fs * 0.35, size: fs, font: bold, color: WHITE });
}
async function loadLogo(doc: PDFDocument, src: string | null | undefined): Promise<PDFImage | null> {
  if (!src || !/^https?:\/\//.test(src)) return null;
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    const png = bytes[0] === 0x89 && bytes[1] === 0x50;
    return png ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  } catch {
    return null;
  }
}
const addressOf = (o: OrgHeader) => [o.address, o.city, o.state, o.pincode].filter(Boolean).join(", ");
const contactsOf = (o: OrgHeader) => [o.phone, o.email, o.website].filter(Boolean).join("   |   ");

/* ---------------- receipt (A4 portrait) ---------------- */
export type ReceiptDocInput = {
  title: string;
  documentNumber: string;
  issuedOn: string;
  organization: {
    organization_name: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    /** public URL of the organisation logo (optional) */
    logo?: string | null;
  };
  rows: { label: string; value: string }[];
  amountLabel?: string;
  amountValue?: string;
  verificationUrl: string;
  footerNote: string;
};

/** Shared A4 receipt layout used by every money document. */
export async function renderReceiptPdf(input: ReceiptDocInput): Promise<Uint8Array> {
  const { doc, page, font, bold } = await startDocument();
  const { width, height } = page.getSize();
  const M = 44;
  const org = input.organization;

  // header band with a slightly deeper right half for depth, gold hairline under it
  page.drawRectangle({ x: 0, y: height - 128, width, height: 128, color: TEAL });
  page.drawRectangle({ x: width * 0.55, y: height - 128, width: width * 0.45, height: 128, color: TEAL_DEEP, opacity: 0.55 });
  page.drawRectangle({ x: 0, y: height - 132, width, height: 4, color: GOLD });
  await drawLogo(doc, page, org, M + 30, height - 64, 62, bold, WHITE, TEAL_DEEP);
  const tx = M + 76, tw = width - tx - M - 150;
  const name = org.organization_name ?? "Kalchuri One";
  const ns = fitSize(name, bold, 19, tw, 11);
  text(page, name, tx, height - 56, { size: ns, font: bold, color: WHITE });
  wrap(addressOf(org), font, 9, tw).slice(0, 2).forEach((l, i) => text(page, l, tx, height - 74 - i * 12, { size: 9, font, color: rgb(0.88, 0.96, 0.94) }));
  text(page, contactsOf(org), tx, height - 104, { size: 8.5, font, color: rgb(0.88, 0.96, 0.94) });
  rightAligned(page, "RECEIPT", width - M, height - 60, { size: 22, font: bold, color: WHITE });
  rightAligned(page, input.title.toUpperCase(), width - M, height - 78, { size: 8.5, font: bold, color: rgb(0.88, 0.96, 0.94) });

  // number / date strip
  let y = height - 172;
  page.drawRectangle({ x: M, y: y - 12, width: width - 2 * M, height: 34, color: rgb(0.96, 0.98, 0.975), borderColor: LINE, borderWidth: 0.6 });
  text(page, "Receipt No.", M + 14, y + 6, { size: 7.5, font: bold, color: MUTED });
  text(page, input.documentNumber, M + 14, y - 5, { size: 11, font: bold });
  const dateLbl = "Date";
  rightAligned(page, dateLbl, width - M - 14, y + 6, { size: 7.5, font: bold, color: MUTED });
  rightAligned(page, input.issuedOn, width - M - 14, y - 5, { size: 11, font: bold });

  // details table (zebra rows)
  y -= 44;
  text(page, "RECEIVED WITH THANKS", M, y, { size: 8, font: bold, color: GOLD });
  y -= 12;
  input.rows.forEach((row, i) => {
    const h = 24;
    if (i % 2 === 0) page.drawRectangle({ x: M, y: y - h + 7, width: width - 2 * M, height: h, color: rgb(0.975, 0.98, 0.985) });
    text(page, row.label, M + 12, y - 9, { size: 9.5, font, color: MUTED });
    const v = row.value || "-";
    text(page, v, M + 180, y - 9, { size: fitSize(v, bold, 10.5, width - 2 * M - 196, 7), font: bold });
    y -= h;
  });
  page.drawLine({ start: { x: M, y: y + 6 }, end: { x: width - M, y: y + 6 }, thickness: 0.6, color: LINE });

  // amount panel
  if (input.amountValue) {
    y -= 22;
    const h = 58;
    page.drawRectangle({ x: M, y: y - h + 14, width: width - 2 * M, height: h, color: rgb(0.94, 0.98, 0.97), borderColor: TEAL, borderWidth: 1.2 });
    page.drawRectangle({ x: M, y: y - h + 14, width: 5, height: h, color: TEAL });
    text(page, (input.amountLabel ?? "Amount received").toUpperCase(), M + 20, y - 4, { size: 8.5, font: bold, color: TEAL });
    text(page, "Thank you for your generous support.", M + 20, y - 20, { size: 9, font, color: MUTED });
    rightAligned(page, input.amountValue, width - M - 18, y - 18, { size: 22, font: bold, color: TEAL });
    y -= h;
  }

  // verification + signature
  const qy = 118;
  page.drawRectangle({ x: M - 4, y: qy - 4, width: 92, height: 92, color: WHITE, borderColor: LINE, borderWidth: 0.6 });
  drawQrCode(page, input.verificationUrl, { x: M, y: qy, size: 84 });
  text(page, "Scan to verify this receipt", M + 98, qy + 62, { size: 9, font: bold });
  wrap(input.verificationUrl, font, 7.5, 210).slice(0, 2).forEach((l, i) => text(page, l, M + 98, qy + 48 - i * 10, { size: 7.5, font, color: MUTED }));
  drawSeal(page, width / 2 + 70, qy + 46, 26);
  page.drawLine({ start: { x: width - M - 150, y: qy + 30 }, end: { x: width - M, y: qy + 30 }, thickness: 0.8, color: MUTED });
  centered(page, "Authorised signatory", width - M - 75, qy + 16, { size: 9, font, color: MUTED });
  centered(page, name, width - M - 75, qy + 4, { size: fitSize(name, font, 8, 150, 5), font, color: MUTED });

  // footer
  wrap(input.footerNote, font, 8, width - 2 * M).slice(0, 2).forEach((l, i) => text(page, l, M, 82 - i * 11, { size: 8, font, color: MUTED }));
  page.drawRectangle({ x: 0, y: 0, width, height: 40, color: TEAL });
  page.drawRectangle({ x: 0, y: 40, width, height: 3, color: GOLD });
  centered(page, contactsOf(org) || name, width / 2, 22, { size: 8.5, font, color: WHITE });
  centered(page, "Generated by Kalchuri One  ·  kalchuri.org", width / 2, 10, { size: 6.5, font, color: rgb(0.8, 0.92, 0.9) });

  return doc.save();
}

export type OrgHeader = ReceiptDocInput["organization"];

export type VolunteerDocInput = {
  name: string;
  referenceId: string;
  designation: string | null;
  city: string | null;
  state: string | null;
  mobile: string | null;
  bloodGroup?: string | null;
  validUntil?: string | null;
  issuedOn: string;
  organization: OrgHeader;
  verificationUrl: string;
  photo?: { bytes: Uint8Array; contentType: string } | null;
};

async function embedPhoto(doc: PDFDocument, photo: VolunteerDocInput["photo"]) {
  if (!photo) return null;
  try {
    return photo.contentType === "image/png" ? await doc.embedPng(photo.bytes) : await doc.embedJpg(photo.bytes);
  } catch {
    return null;
  }
}
/** Draws an image cropped to fill the box (centre crop). */
function drawCover(page: PDFPage, img: PDFImage, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.width, h / img.height);
  const dw = img.width * s, dh = img.height * s;
  // pdf-lib has no clipping helper; scale to the box when the aspect is close, else fit inside
  if (Math.abs(dw - w) < w * 0.25 && Math.abs(dh - h) < h * 0.25) page.drawImage(img, { x, y, width: w, height: h });
  else { const f = Math.min(w / img.width, h / img.height); page.drawImage(img, { x: x + (w - img.width * f) / 2, y: y + (h - img.height * f) / 2, width: img.width * f, height: img.height * f }); }
}

/** Wallet-size volunteer ID card (85.6 × 54 mm) with photo, QR and validity. */
export async function renderVolunteerIdCard(input: VolunteerDocInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([242.6, 153]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();
  const org = input.organization;
  const orgName = org.organization_name ?? "Kalchuri One";

  page.drawRectangle({ x: 0, y: 0, width, height, color: WHITE });
  // header band + gold title strip
  page.drawRectangle({ x: 0, y: height - 36, width, height: 36, color: TEAL });
  page.drawRectangle({ x: width * 0.6, y: height - 36, width: width * 0.4, height: 36, color: TEAL_DEEP, opacity: 0.55 });
  await drawLogo(doc, page, org, 20, height - 18, 26, bold, WHITE, TEAL_DEEP);
  text(page, orgName, 38, height - 16, { size: fitSize(orgName, bold, 9, width - 46, 5), font: bold, color: WHITE });
  text(page, [org.city, org.state].filter(Boolean).join(", "), 38, height - 27, { size: 5.5, font, color: rgb(0.88, 0.96, 0.94) });
  page.drawRectangle({ x: 0, y: height - 47, width, height: 11, color: GOLD });
  centered(page, "VOLUNTEER IDENTITY CARD", width / 2, height - 44, { size: 6, font: bold, color: WHITE }, 1.1);

  // photo
  const img = await embedPhoto(doc, input.photo ?? null);
  const px = 9, py = 30, pw = 52, ph = 64;
  page.drawRectangle({ x: px - 1.5, y: py - 1.5, width: pw + 3, height: ph + 3, color: WHITE, borderColor: TEAL, borderWidth: 1 });
  if (img) drawCover(page, img, px, py, pw, ph);
  else {
    page.drawRectangle({ x: px, y: py, width: pw, height: ph, color: rgb(0.9, 0.95, 0.94) });
    const ini = safe(input.name).charAt(0).toUpperCase();
    centered(page, ini, px + pw / 2, py + ph / 2 - 9, { size: 26, font: bold, color: TEAL });
  }

  // details
  const x = 70, maxW = width - x - 52;
  text(page, input.name, x, height - 62, { size: fitSize(input.name, bold, 10.5, maxW + 44, 6), font: bold });
  text(page, input.designation ?? "Volunteer", x, height - 73, { size: 6.5, font: bold, color: TEAL });
  let y = height - 86;
  const row = (label: string, value: string | null | undefined) => {
    if (!value) return;
    text(page, label, x, y, { size: 5, font, color: MUTED });
    text(page, value, x + 34, y, { size: fitSize(value, bold, 6.3, maxW - 34, 4.5), font: bold });
    y -= 9.5;
  };
  row("ID", input.referenceId);
  row("Place", [input.city, input.state].filter(Boolean).join(", "));
  row("Mobile", input.mobile);
  row("Blood", input.bloodGroup);
  row("Issued", input.issuedOn);
  row("Valid till", input.validUntil);

  drawQrCode(page, input.verificationUrl, { x: width - 47, y: 30, size: 38 });
  centered(page, "Scan to verify", width - 28, 23, { size: 4.5, font, color: MUTED });

  // footer band
  page.drawRectangle({ x: 0, y: 0, width, height: 15, color: TEAL });
  centered(page, [org.phone, org.website].filter(Boolean).join("  |  ") || orgName, width / 2, 5, { size: 5.5, font, color: WHITE });
  return doc.save();
}

/** A4 landscape volunteer service certificate: cream paper, navy edge, gold frame, corner flourishes, seal. */
export async function renderVolunteerCertificate(input: VolunteerDocInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([841.89, 595.28]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const { width, height } = page.getSize();
  const cx = width / 2;
  const org = input.organization;
  const orgName = org.organization_name ?? "Kalchuri One";

  page.drawRectangle({ x: 0, y: 0, width, height, color: CREAM });
  page.drawRectangle({ x: 6, y: 6, width: width - 12, height: height - 12, borderColor: NAVY, borderWidth: 12 });
  page.drawRectangle({ x: 24, y: 24, width: width - 48, height: height - 48, borderColor: GOLD, borderWidth: 2.4 });
  page.drawRectangle({ x: 31, y: 31, width: width - 62, height: height - 62, borderColor: GOLD, borderWidth: 0.7 });
  const k = 58;
  drawCorner(page, 44, height - 44, k, 1, -1);
  drawCorner(page, width - 44, height - 44, k, -1, -1);
  drawCorner(page, 44, 44, k, 1, 1);
  drawCorner(page, width - 44, 44, k, -1, 1);

  await drawLogo(doc, page, org, cx, height - 86, 58, bold, GOLD, NAVY);
  centered(page, orgName.toUpperCase(), cx, height - 138, { size: fitSize(orgName.toUpperCase(), bold, 15, width - 260, 9), font: bold, color: NAVY }, 1.2);
  const addr = [org.city, org.state].filter(Boolean).join(", ");
  if (addr) centered(page, addr, cx, height - 153, { size: 9, font, color: MUTED });

  centered(page, "CERTIFICATE", cx, height - 200, { size: 38, font: serifBold, color: GOLD }, 5);
  centered(page, "OF VOLUNTEER SERVICE", cx, height - 222, { size: 12, font: bold, color: NAVY }, 4);
  // divider with a centre lozenge
  page.drawLine({ start: { x: cx - 120, y: height - 238 }, end: { x: cx - 12, y: height - 238 }, thickness: 1, color: GOLD });
  page.drawLine({ start: { x: cx + 12, y: height - 238 }, end: { x: cx + 120, y: height - 238 }, thickness: 1, color: GOLD });
  page.drawSvgPath("M 0 -6 L 6 0 L 0 6 L -6 0 Z", { x: cx, y: height - 238, color: GOLD });

  centered(page, "This certificate is proudly presented to", cx, height - 266, { size: 13, font: serifItalic, color: MUTED });
  const nm = safe(input.name);
  centered(page, nm, cx, height - 310, { size: fitSize(nm, serifBold, 38, width - 300, 18), font: serifBold, color: INK });
  page.drawLine({ start: { x: cx - 210, y: height - 322 }, end: { x: cx + 210, y: height - 322 }, thickness: 1, color: GOLD });

  const place = [input.city, input.state].filter(Boolean).join(", ");
  const body = `in grateful recognition of dedicated service as ${/^[aeiou]/i.test(safe(input.designation ?? "volunteer")) ? "an" : "a"} ${safe(input.designation ?? "Volunteer")} with ${safe(orgName)}${place ? `, ${safe(place)}` : ""}, giving time and care to our seva work with sincerity and compassion.`;
  wrap(body, serif, 14, width - 300).slice(0, 3).forEach((l, i) => centered(page, l, cx, height - 350 - i * 20, { size: 14, font: serif, color: INK }));

  // photo (top-right, inside the frame)
  const img = await embedPhoto(doc, input.photo ?? null);
  if (img) {
    const pw = 74, ph = 90, px = width - 82 - pw, py = height - 70 - ph;
    page.drawRectangle({ x: px - 3, y: py - 3, width: pw + 6, height: ph + 6, color: WHITE, borderColor: GOLD, borderWidth: 1.2 });
    drawCover(page, img, px, py, pw, ph);
  }

  // bottom row: QR + reference (left), seal (centre), signature (right)
  drawQrCode(page, input.verificationUrl, { x: 92, y: 66, size: 62, color: NAVY });
  text(page, "Volunteer ID", 164, 116, { size: 7.5, font: bold, color: MUTED });
  text(page, input.referenceId, 164, 104, { size: 11, font: bold, color: NAVY });
  text(page, `Issued on ${input.issuedOn}`, 164, 88, { size: 9, font, color: MUTED });
  text(page, "Scan to verify", 164, 74, { size: 8, font, color: MUTED });
  drawSeal(page, cx, 104, 34);
  page.drawLine({ start: { x: width - 290, y: 100 }, end: { x: width - 100, y: 100 }, thickness: 0.9, color: NAVY });
  centered(page, "Authorised Signatory", width - 195, 85, { size: 10, font: bold, color: NAVY });
  centered(page, orgName, width - 195, 72, { size: fitSize(orgName, font, 8.5, 190, 5), font, color: MUTED });
  return doc.save();
}
