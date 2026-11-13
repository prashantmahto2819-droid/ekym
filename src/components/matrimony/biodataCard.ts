// Matrimony biodata card renderer (browser canvas).
// 7 templates with their own background (radial colour, jaali / paper / dot pattern, mandala behind the photo, toran,
// flowers, lotus), decorative fonts, accent colour, chosen fields, photo shape, three sizes (WhatsApp story 1080×1920,
// post 1080×1350, A4 1240×1754) and a QR code to the profile's share page. JPG / PDF export.
// Layout is measured first and then fitted: font sizes scale (0.66–1.25×) so the content always fills the page
// without overflowing; long text is trimmed with "…" only when even the smallest size does not fit.
import { PDFDocument } from "pdf-lib";
import QRCode from "qrcode";

import { toDevanagari, toLatin } from "@/design-engine/script";

export type FieldKey = "age" | "height" | "education" | "profession" | "income" | "city" | "gotra" | "native" | "created_for" | "interests" | "about" | "expectations" | "special_note";
export type FontKey = "rozha" | "tiro" | "yatra" | "kalam" | "notoserif" | "mukta";
export type CardOpts = {
  template: string; accent?: string | undefined; lang: "hi" | "en"; headline?: string | undefined; invocation: boolean;
  photoShape: "circle" | "rounded" | "arch"; fields: Partial<Record<FieldKey, boolean>>; extraPhotos: boolean; showContact: boolean;
  size: "story" | "portrait" | "a4"; font: FontKey; footerNote?: string | undefined;
};
export type CardData = {
  name: string; gender: string; birth_year: number; height_cm: number | null; education: string | null; profession: string | null; income_range: string | null;
  city: string | null; district: string | null; gotra: string | null; native_place: string | null; created_for: string | null; interests: string | null;
  about: string | null; expectations: string | null; special_note: string | null; contact_phone: string | null; org: string | null;
  photos: string[]; qrUrl: string | null;
};

export const DEFAULT_FIELDS: Record<FieldKey, boolean> = { age: true, height: true, education: true, profession: true, income: false, city: true, gotra: true, native: true, created_for: false, interests: true, about: true, expectations: true, special_note: false };
export const DEFAULT_OPTS: CardOpts = { template: "royal", lang: "hi", invocation: true, photoShape: "circle", fields: DEFAULT_FIELDS, extraPhotos: true, showContact: false, size: "story", font: "rozha" };

type Tpl = {
  id: string; name: string; name_hi: string; bg: [string, string]; ink: string; sub: string; accent: string; nameInk: string; panel: string; panelLine: string;
  dark: boolean; border: "royal" | "classic" | "floral" | "modern" | "lotus"; pattern: "jaali" | "paper" | "dots" | "grid"; toran: boolean; gold: boolean;
};
export const TEMPLATES: Tpl[] = [
  { id: "royal", name: "Royal maroon", name_hi: "शाही मैरून", bg: ["#8a1a2b", "#3a0710"], ink: "#fff8e8", sub: "#f0d6a2", accent: "#dcb15c", nameInk: "#f6dc94", panel: "rgba(45,4,12,0.42)", panelLine: "rgba(220,177,92,0.55)", dark: true, border: "royal", pattern: "jaali", toran: true, gold: true },
  { id: "floral", name: "Floral rose", name_hi: "गुलाबी फूल", bg: ["#fffafa", "#f9d3db"], ink: "#3b1520", sub: "#87394b", accent: "#c0264b", nameInk: "#9d1a3d", panel: "rgba(255,255,255,0.78)", panelLine: "rgba(192,38,75,0.28)", dark: false, border: "floral", pattern: "dots", toran: false, gold: false },
  { id: "classic", name: "Classic ivory", name_hi: "क्लासिक हाथीदाँत", bg: ["#fffdf7", "#f1e2c2"], ink: "#2a2118", sub: "#6b5a45", accent: "#a97c2e", nameInk: "#5a3c12", panel: "rgba(255,255,255,0.72)", panelLine: "rgba(169,124,46,0.35)", dark: false, border: "classic", pattern: "paper", toran: false, gold: false },
  { id: "saffron", name: "Saffron festive", name_hi: "केसरिया उत्सव", bg: ["#fff4de", "#f6a94e"], ink: "#3d1505", sub: "#7a2e0c", accent: "#b4380a", nameInk: "#8f2306", panel: "rgba(255,251,242,0.8)", panelLine: "rgba(180,56,10,0.3)", dark: false, border: "royal", pattern: "jaali", toran: true, gold: false },
  { id: "emerald", name: "Emerald gold", name_hi: "पन्ना व सोना", bg: ["#11684f", "#032a1f"], ink: "#fbf6e4", sub: "#d8e6c6", accent: "#d8b45f", nameInk: "#f2d98f", panel: "rgba(0,30,20,0.4)", panelLine: "rgba(216,180,95,0.5)", dark: true, border: "royal", pattern: "jaali", toran: false, gold: true },
  { id: "lotus", name: "Lotus peach", name_hi: "कमल", bg: ["#fffaf4", "#f5d5c4"], ink: "#2e2430", sub: "#6d5263", accent: "#b0476d", nameInk: "#7e2a4b", panel: "rgba(255,255,255,0.75)", panelLine: "rgba(176,71,109,0.3)", dark: false, border: "lotus", pattern: "dots", toran: false, gold: false },
  { id: "modern", name: "Modern navy", name_hi: "आधुनिक नीला", bg: ["#1d2d58", "#080f24"], ink: "#f5f7fb", sub: "#b9c4dd", accent: "#4cc3f0", nameInk: "#ffffff", panel: "rgba(255,255,255,0.06)", panelLine: "rgba(76,195,240,0.4)", dark: true, border: "modern", pattern: "grid", toran: false, gold: false },
];
export const SIZES = { story: [1080, 1920], portrait: [1080, 1350], a4: [1240, 1754] } as const;

/** Display fonts (headline, name). Body text is always Mukta for clean, even reading. */
export const FONTS: { id: FontKey; label: string; en: string; css: string }[] = [
  { id: "rozha", en: "Rozha (royal, bold)", label: "रोझा (शाही, मोटा)", css: '"Rozha One"' },
  { id: "tiro", en: "Tiro (traditional)", label: "तिरो (पारंपरिक)", css: '"Tiro Devanagari Hindi"' },
  { id: "yatra", en: "Yatra (festive)", label: "यात्रा (उत्सव)", css: '"Yatra One"' },
  { id: "kalam", en: "Kalam (handwritten)", label: "कलम (हस्तलिखित)", css: "Kalam" },
  { id: "notoserif", en: "Noto Serif", label: "नोटो सेरिफ़", css: '"Noto Serif Devanagari"' },
  { id: "mukta", en: "Mukta (plain)", label: "मुक्ता (सादा)", css: "Mukta" },
];
const FONT_LINK = "https://fonts.googleapis.com/css2?family=Rozha+One&family=Yatra+One&family=Kalam:wght@400;700&family=Tiro+Devanagari+Hindi&family=Noto+Serif+Devanagari:wght@500;700&family=Mukta:wght@400;500;600;700&family=Cormorant+Garamond:wght@600;700&display=swap";
const BODY = "Mukta, 'Noto Sans Devanagari', sans-serif";

type Labels = { headline: string; inv: string; details: string; age: string; height: string; education: string; profession: string; income: string; city: string; gotra: string; native: string; created_for: string; interests: string; about: string; expectations: string; special_note: string; contact: string; years: string; groom: string; bride: string; scan: string; via: string; cm: string };
const LBL: Record<"hi" | "en", Labels> = {
  hi: { headline: "शुभ विवाह हेतु परिचय", inv: "॥ श्री गणेशाय नमः ॥", details: "व्यक्तिगत विवरण", age: "आयु", height: "कद", education: "शिक्षा", profession: "व्यवसाय", income: "वार्षिक आय", city: "निवास", gotra: "गोत्र", native: "मूल ग्राम", created_for: "प्रोफ़ाइल", interests: "रुचियाँ", about: "परिचय", expectations: "जीवनसाथी से अपेक्षा", special_note: "विशेष", contact: "संपर्क", years: "वर्ष", groom: "वर", bride: "वधू", scan: "स्कैन करें — पूरा परिचय देखें", via: "कलचुरी वन · kalchuri.org", cm: "सेमी" },
  en: { headline: "Marriage Biodata", inv: "|| Shri Ganeshaya Namah ||", details: "Personal details", age: "Age", height: "Height", education: "Education", profession: "Profession", income: "Annual income", city: "Lives in", gotra: "Gotra", native: "Native place", created_for: "Profile for", interests: "Interests", about: "About", expectations: "Looking for", special_note: "Note", contact: "Contact", years: "yrs", groom: "Groom", bride: "Bride", scan: "Scan to view the full profile", via: "Kalchuri One · kalchuri.org", cm: "cm" },
};

const VW = 1080; // all drawing happens in a 1080-wide virtual page
const ft = (cm: number) => { const inch = Math.round(cm / 2.54); return `${Math.floor(inch / 12)}'${inch % 12}"`; };
type Ctx = CanvasRenderingContext2D;

/* ---------------- fonts & images ---------------- */
let fontsLinked = false;
async function ensureFonts(display: string) {
  if (typeof document === "undefined") return;
  if (!fontsLinked) {
    fontsLinked = true;
    if (!document.querySelector(`link[data-k1-card-fonts]`)) {
      const l = document.createElement("link"); l.rel = "stylesheet"; l.href = FONT_LINK; l.setAttribute("data-k1-card-fonts", "1"); document.head.appendChild(l);
      await new Promise((r) => { l.onload = r; l.onerror = r; setTimeout(r, 2500); });
    }
  }
  if ("fonts" in document) {
    const want = [`400 40px ${display}`, `700 40px ${display}`, "400 40px Mukta", "500 40px Mukta", "600 40px Mukta", "700 40px Mukta", '700 40px "Cormorant Garamond"'];
    await Promise.race([Promise.all(want.map((f) => document.fonts.load(f, "अआकक्ष Ab"))), new Promise((r) => setTimeout(r, 3000))]).catch(() => undefined);
  }
}

async function loadImg(src: string): Promise<HTMLImageElement | null> {
  if (!src) return null;
  try {
    const r = await fetch(src, { mode: "cors" }); if (!r.ok) return null;
    const url = URL.createObjectURL(await r.blob());
    return await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = url; });
  } catch { return null; }
}

/* ---------------- small helpers ---------------- */
function wrap(ctx: Ctx, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split(/\n+/)) {
    let line = "";
    for (const w of para.split(/\s+/).filter(Boolean)) {
      const t = line ? `${line} ${w}` : w;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
    }
    if (line) out.push(line);
  }
  return out;
}
function clip(ctx: Ctx, lines: string[], max: number, maxW: number): string[] {
  if (lines.length <= max) return lines;
  const keep = lines.slice(0, max);
  let last = keep[max - 1]!;
  while (last && ctx.measureText(`${last} …`).width > maxW) last = last.replace(/\s*\S+$/, "");
  keep[max - 1] = `${last} …`;
  return keep;
}
function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const q = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + q, y); ctx.arcTo(x + w, y, x + w, y + h, q); ctx.arcTo(x + w, y + h, x, y + h, q); ctx.arcTo(x, y + h, x, y, q); ctx.arcTo(x, y, x + w, y, q); ctx.closePath();
}
function rgba(hex: string, a: number) {
  const h = hex.replace("#", ""); const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function mix(hex: string, to: string, t: number) {
  const p = (x: string) => { const n = parseInt(x.replace("#", "").slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const a = p(hex), b = p(to); return `rgb(${a.map((v, i) => Math.round(v + (b[i]! - v) * t)).join(",")})`;
}
function rand(seed: number) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const fitFont = (ctx: Ctx, text: string, weight: number, family: string, size: number, maxW: number, min = 0.55) => {
  let s = size;
  ctx.font = `${weight} ${s}px ${family}`;
  while (ctx.measureText(text).width > maxW && s > size * min) { s -= 1; ctx.font = `${weight} ${s}px ${family}`; }
  return s;
};

/* ---------------- ornaments ---------------- */
function petal(ctx: Ctx, cx: number, cy: number, a: number, r0: number, r1: number, w: number) {
  const ca = Math.cos(a), sa = Math.sin(a), na = -sa, nb = ca;
  const x0 = cx + ca * r0, y0 = cy + sa * r0, x1 = cx + ca * r1, y1 = cy + sa * r1, mx = cx + ca * ((r0 + r1) / 2), my = cy + sa * ((r0 + r1) / 2);
  ctx.beginPath(); ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(mx + na * w, my + nb * w, x1, y1);
  ctx.quadraticCurveTo(mx - na * w, my - nb * w, x0, y0); ctx.closePath();
}
function mandala(ctx: Ctx, cx: number, cy: number, r: number, col: string, alpha: number) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = Math.max(1.2, r / 160);
  for (const k of [1, 0.94, 0.62, 0.4]) { ctx.beginPath(); ctx.arc(cx, cy, r * k, 0, Math.PI * 2); ctx.stroke(); }
  for (let i = 0; i < 36; i++) { petal(ctx, cx, cy, (i / 36) * Math.PI * 2, r * 0.66, r * 0.92, r * 0.05); ctx.stroke(); }
  for (let i = 0; i < 18; i++) { petal(ctx, cx, cy, ((i + 0.5) / 18) * Math.PI * 2, r * 0.44, r * 0.62, r * 0.07); ctx.fill(); }
  for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r * 0.97, cy + Math.sin(a) * r * 0.97, r * 0.012, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function cornerFan(ctx: Ctx, x: number, y: number, dirX: number, dirY: number, r: number, col: string) {
  // quarter mandala in a corner, opening into the page
  const start = dirX > 0 ? (dirY > 0 ? 0 : -Math.PI / 2) : dirY > 0 ? Math.PI / 2 : Math.PI;
  ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2;
  for (const k of [1, 0.78]) { ctx.beginPath(); ctx.arc(x, y, r * k, start, start + Math.PI / 2); ctx.stroke(); }
  for (let i = 0; i <= 6; i++) { const a = start + (i / 6) * (Math.PI / 2); petal(ctx, x, y, a, r * 0.2, r * 0.72, r * 0.09); ctx.globalAlpha = 0.85; ctx.fill(); }
  ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(x, y, r * 0.16, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i <= 8; i++) { const a = start + (i / 8) * (Math.PI / 2); ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.89, y + Math.sin(a) * r * 0.89, 3.2, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function flower(ctx: Ctx, cx: number, cy: number, r: number, col: string, rot = 0) {
  ctx.save();
  for (let k = 0; k < 5; k++) {
    const a = rot + (k / 5) * Math.PI * 2;
    const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r * 1.1); g.addColorStop(0, mix(col, "#ffffff", 0.75)); g.addColorStop(1, col);
    ctx.fillStyle = g; petal(ctx, cx, cy, a, 0, r * 1.05, r * 0.55); ctx.fill();
    ctx.strokeStyle = rgba("#ffffff", 0.5); ctx.lineWidth = 1.2; ctx.stroke();
  }
  ctx.fillStyle = "#f2b33d"; ctx.beginPath(); ctx.arc(cx, cy, r * 0.24, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#b86b12"; for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r * 0.12, cy + Math.sin(a) * r * 0.12, r * 0.035, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function leaf(ctx: Ctx, x: number, y: number, len: number, a: number, col: string) {
  ctx.save(); ctx.fillStyle = col; petal(ctx, x, y, a, 0, len, len * 0.28); ctx.fill();
  ctx.strokeStyle = rgba("#ffffff", 0.35); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len * 0.9, y + Math.sin(a) * len * 0.9); ctx.stroke(); ctx.restore();
}
function bouquet(ctx: Ctx, x: number, y: number, s: number, dx: number, dy: number, col: string) {
  leaf(ctx, x + dx * s * 0.2, y + dy * s * 0.2, s * 1.25, Math.atan2(dy * 0.15, dx), "#4f8a4b");
  leaf(ctx, x + dx * s * 0.2, y + dy * s * 0.2, s * 1.25, Math.atan2(dy, dx * 0.15), "#3f7a3c");
  leaf(ctx, x, y, s * 1.1, Math.atan2(dy, dx), "#5d9a57");
  flower(ctx, x + dx * s * 0.35, y + dy * s * 0.35, s * 0.62, col, 0.3);
  flower(ctx, x + dx * s * 1.15, y + dy * s * 0.25, s * 0.4, mix(col, "#ffffff", 0.25), 1.1);
  flower(ctx, x + dx * s * 0.25, y + dy * s * 1.15, s * 0.4, mix(col, "#ffffff", 0.25), 0.7);
}
function lotus(ctx: Ctx, cx: number, by: number, s: number, col: string) {
  ctx.save();
  const p = (a: number, len: number, w: number, c: string) => { ctx.fillStyle = c; petal(ctx, cx, by, a, 0, len, w); ctx.fill(); ctx.strokeStyle = rgba("#ffffff", 0.55); ctx.lineWidth = 1.2; ctx.stroke(); };
  p(-Math.PI / 2 - 1.05, s * 0.8, s * 0.2, mix(col, "#ffffff", 0.45)); p(-Math.PI / 2 + 1.05, s * 0.8, s * 0.2, mix(col, "#ffffff", 0.45));
  p(-Math.PI / 2 - 0.55, s * 0.95, s * 0.24, mix(col, "#ffffff", 0.25)); p(-Math.PI / 2 + 0.55, s * 0.95, s * 0.24, mix(col, "#ffffff", 0.25));
  p(-Math.PI / 2, s * 1.05, s * 0.27, col);
  ctx.strokeStyle = "#3f7a3c"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, by + 4, s * 0.85, s * 0.12, 0, 0, Math.PI); ctx.stroke();
  ctx.restore();
}
function toran(ctx: Ctx, x0: number, x1: number, y: number) {
  const swags = 6, w = (x1 - x0) / swags, sag = 30;
  ctx.save(); ctx.strokeStyle = "#8a5a12"; ctx.lineWidth = 2.5;
  for (let i = 0; i < swags; i++) { ctx.beginPath(); ctx.moveTo(x0 + i * w, y); ctx.quadraticCurveTo(x0 + i * w + w / 2, y + sag * 2, x0 + (i + 1) * w, y); ctx.stroke(); }
  for (let i = 0; i < swags; i++) {
    for (let k = 1; k < 8; k++) {
      const t = k / 8, px = x0 + i * w + t * w, py = y + 4 * sag * t * (1 - t);
      if (k % 2) leaf(ctx, px, py, 34, Math.PI / 2 + (t - 0.5) * 0.6, k % 4 === 1 ? "#3f7a3c" : "#5d9a57");
      else { ctx.fillStyle = "#f08a12"; ctx.beginPath(); ctx.arc(px, py + 10, 11, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#ffc23d"; ctx.beginPath(); ctx.arc(px - 3, py + 7, 5, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.fillStyle = "#e0661b"; for (let d = 0; d < 3; d++) { ctx.beginPath(); ctx.arc(x0 + (i + 1) * w, y + 14 + d * 18, 8 - d, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}
function divider(ctx: Ctx, cx: number, y: number, w: number, col: string) {
  ctx.save();
  for (const side of [-1, 1]) {
    const g = ctx.createLinearGradient(cx, 0, cx + side * w / 2, 0); g.addColorStop(0, col); g.addColorStop(1, rgba(col.startsWith("#") ? col : "#000000", 0));
    ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + side * 20, y); ctx.lineTo(cx + side * w / 2, y); ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx + side * 30, y, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(cx, y - 9); ctx.lineTo(cx + 9, y); ctx.lineTo(cx, y + 9); ctx.lineTo(cx - 9, y); ctx.closePath(); ctx.fill();
  ctx.restore();
}

/* ---------------- background & border ---------------- */
function background(ctx: Ctx, VH: number, t: Tpl, accent: string) {
  const g = ctx.createRadialGradient(VW / 2, VH * 0.3, VW * 0.08, VW / 2, VH * 0.45, Math.max(VW, VH) * 0.8);
  g.addColorStop(0, t.bg[0]); g.addColorStop(1, t.bg[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  ctx.save();
  if (t.pattern === "jaali") {
    ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.globalAlpha = t.dark ? 0.07 : 0.09; ctx.lineWidth = 1.2;
    const s = 60;
    for (let y = -s; y < VH + s; y += s) for (let x = -s; x < VW + s; x += s) {
      ctx.beginPath(); ctx.moveTo(x, y - s / 2); ctx.lineTo(x + s / 2, y); ctx.lineTo(x, y + s / 2); ctx.lineTo(x - s / 2, y); ctx.closePath(); ctx.stroke();
      for (let k = 0; k < 4; k++) { petal(ctx, x + s / 2, y + s / 2, (k * Math.PI) / 2, 0, 10, 3.5); ctx.fill(); }
    }
  } else if (t.pattern === "dots") {
    ctx.fillStyle = accent; ctx.globalAlpha = 0.09;
    for (let y = 30, r = 0; y < VH; y += 46, r++) for (let x = r % 2 ? 23 : 0; x < VW; x += 46) { ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill(); }
  } else if (t.pattern === "paper") {
    const R = rand(7); ctx.fillStyle = "#7a5a2a";
    for (let i = 0; i < 2600; i++) { ctx.globalAlpha = 0.02 + R() * 0.04; ctx.fillRect(R() * VW, R() * VH, 1.6, 1.6); }
  } else {
    ctx.strokeStyle = accent; ctx.globalAlpha = 0.06; ctx.lineWidth = 1;
    for (let x = -VH; x < VW; x += 44) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + VH, VH); ctx.stroke(); }
    ctx.globalAlpha = 0.08; for (const [x, y, r] of [[VW * 0.9, VH * 0.08, 220], [VW * 0.08, VH * 0.9, 260]] as const) { ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, r * 0.7, 0, Math.PI * 2); ctx.stroke(); }
  }
  ctx.restore();
  // soft vignette
  const v = ctx.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * 0.35, VW / 2, VH / 2, Math.max(VW, VH) * 0.75);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, t.dark ? "rgba(0,0,0,0.28)" : "rgba(120,80,40,0.10)");
  ctx.fillStyle = v; ctx.fillRect(0, 0, VW, VH);
}

function border(ctx: Ctx, VH: number, t: Tpl, accent: string) {
  const m = 26, m2 = 42;
  ctx.save(); ctx.strokeStyle = accent; ctx.fillStyle = accent;
  if (t.border === "royal") {
    ctx.lineWidth = 5; ctx.strokeRect(m, m, VW - 2 * m, VH - 2 * m);
    ctx.lineWidth = 1.5; ctx.strokeRect(m2, m2, VW - 2 * m2, VH - 2 * m2);
    // beads between the two lines
    ctx.globalAlpha = 0.8;
    for (let x = m2 + 30; x < VW - m2 - 20; x += 26) for (const y of [(m + m2) / 2, VH - (m + m2) / 2]) { ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill(); }
    for (let y = m2 + 30; y < VH - m2 - 20; y += 26) for (const x of [(m + m2) / 2, VW - (m + m2) / 2]) { ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
    cornerFan(ctx, m2, m2, 1, 1, 110, accent); cornerFan(ctx, VW - m2, m2, -1, 1, 110, accent);
    cornerFan(ctx, VW - m2, VH - m2, -1, -1, 110, accent); cornerFan(ctx, m2, VH - m2, 1, -1, 110, accent);
  } else if (t.border === "classic") {
    ctx.lineWidth = 3; ctx.strokeRect(m, m, VW - 2 * m, VH - 2 * m);
    ctx.lineWidth = 1.2; ctx.strokeRect(m2, m2, VW - 2 * m2, VH - 2 * m2);
    for (const [x, y, sx, sy] of [[m2, m2, 1, 1], [VW - m2, m2, -1, 1], [VW - m2, VH - m2, -1, -1], [m2, VH - m2, 1, -1]] as const) {
      ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x + sx * 14, y + sy * 120); ctx.lineTo(x + sx * 14, y + sy * 14); ctx.lineTo(x + sx * 120, y + sy * 14); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + sx * 34, y + sy * 34, 14, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + sx * 34, y + sy * 34, 5, 0, Math.PI * 2); ctx.fill();
      for (const [px, py] of [[x + sx * 120, y + sy * 14], [x + sx * 14, y + sy * 120]] as const) { ctx.beginPath(); ctx.moveTo(px, py - 6); ctx.lineTo(px + 6, py); ctx.lineTo(px, py + 6); ctx.lineTo(px - 6, py); ctx.closePath(); ctx.fill(); }
    }
    divider(ctx, VW / 2, m2, 260, accent); divider(ctx, VW / 2, VH - m2, 260, accent);
  } else if (t.border === "floral") {
    ctx.lineWidth = 2.5; rr(ctx, m, m, VW - 2 * m, VH - 2 * m, 36); ctx.stroke();
    ctx.lineWidth = 1; ctx.globalAlpha = 0.6; rr(ctx, m2, m2, VW - 2 * m2, VH - 2 * m2, 26); ctx.stroke(); ctx.globalAlpha = 1;
    bouquet(ctx, m + 18, m + 18, 70, 1, 1, accent); bouquet(ctx, VW - m - 18, VH - m - 18, 70, -1, -1, accent);
    bouquet(ctx, VW - m - 14, m + 14, 46, -1, 1, mix(accent, "#ffffff", 0.2)); bouquet(ctx, m + 14, VH - m - 14, 46, 1, -1, mix(accent, "#ffffff", 0.2));
  } else if (t.border === "lotus") {
    ctx.lineWidth = 2.5; rr(ctx, m, m, VW - 2 * m, VH - 2 * m, 30); ctx.stroke();
    ctx.lineWidth = 1; ctx.globalAlpha = 0.55; rr(ctx, m2, m2, VW - 2 * m2, VH - 2 * m2, 22); ctx.stroke(); ctx.globalAlpha = 1;
    for (const x of [VW * 0.2, VW * 0.8]) lotus(ctx, x, VH - m - 4, 46, accent);
    lotus(ctx, VW / 2, VH - m - 4, 64, accent);
    ctx.globalAlpha = 0.75; cornerFan(ctx, m2, m2, 1, 1, 80, accent); cornerFan(ctx, VW - m2, m2, -1, 1, 80, accent); ctx.globalAlpha = 1;
  } else {
    ctx.globalAlpha = 0.55; ctx.lineWidth = 1.5; rr(ctx, m + 6, m + 6, VW - 2 * m - 12, VH - 2 * m - 12, 30); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.lineWidth = 6; ctx.lineCap = "round";
    for (const [x, y, sx, sy] of [[m, m, 1, 1], [VW - m, m, -1, 1], [VW - m, VH - m, -1, -1], [m, VH - m, 1, -1]] as const) { ctx.beginPath(); ctx.moveTo(x, y + sy * 90); ctx.lineTo(x, y); ctx.lineTo(x + sx * 90, y); ctx.stroke(); }
  }
  ctx.restore();
}

/* ---------------- main ---------------- */
type Block = { key: string; h: number; draw: (y: number) => void };

export async function renderCard(d: CardData, o: CardOpts): Promise<HTMLCanvasElement> {
  const [W, H] = SIZES[o.size];
  const t = TEMPLATES.find((x) => x.id === o.template) ?? TEMPLATES[0]!;
  const accent = o.accent || t.accent;
  const hi = o.lang === "hi";
  const L = LBL[o.lang];
  const display = `${(FONTS.find((f) => f.id === o.font) ?? FONTS[0]!).css}, ${hi ? "" : '"Cormorant Garamond", '}"Tiro Devanagari Hindi", serif`;
  await ensureFonts((FONTS.find((f) => f.id === o.font) ?? FONTS[0]!).css);
  const sc = (v: string | null | undefined) => (v ? (hi ? toDevanagari(v) : toLatin(v)) : "");

  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  const k = W / VW, VH = H / k;
  ctx.scale(k, k);
  ctx.textBaseline = "alphabetic";
  background(ctx, VH, t, accent);

  const imgs = (await Promise.all(d.photos.slice(0, o.extraPhotos ? 4 : 1).map(loadImg))).filter((x): x is HTMLImageElement => !!x);
  const age = new Date().getFullYear() - d.birth_year;
  const name = sc(d.name) || d.name;
  const city = sc(d.city), district = sc(d.district);
  const place = [city, district && district !== city ? district : null].filter(Boolean).join(", ");
  const F = { ...DEFAULT_FIELDS, ...o.fields };

  type Cell = { k: string; v: string };
  const cells: Cell[] = [];
  if (F.age) cells.push({ k: L.age, v: `${age} ${L.years} (${d.birth_year})` });
  if (F.height && d.height_cm) cells.push({ k: L.height, v: `${ft(d.height_cm)} (${d.height_cm} ${L.cm})` });
  if (F.education && d.education) cells.push({ k: L.education, v: d.education });
  if (F.profession && d.profession) cells.push({ k: L.profession, v: d.profession });
  if (F.income && d.income_range) cells.push({ k: L.income, v: d.income_range });
  if (F.city && place) cells.push({ k: L.city, v: place });
  if (F.gotra && d.gotra) cells.push({ k: L.gotra, v: sc(d.gotra) });
  if (F.native && d.native_place) cells.push({ k: L.native, v: sc(d.native_place) });
  if (F.created_for && d.created_for) cells.push({ k: L.created_for, v: d.created_for });
  if (F.interests && d.interests) cells.push({ k: L.interests, v: d.interests });
  if (o.showContact && d.contact_phone) cells.push({ k: L.contact, v: `+${d.contact_phone.replace(/\D/g, "")}` });
  const paras: [string, string][] = [];
  if (F.about && d.about) paras.push([L.about, d.about]);
  if (F.expectations && d.expectations) paras.push([L.expectations, d.expectations]);
  if (F.special_note && d.special_note) paras.push([L.special_note, d.special_note]);

  const left = 96, CW = VW - 2 * left;
  const top = t.toran ? 128 : 92, bottom = VH - (t.border === "lotus" ? 104 : 74);
  const qrCanvas = d.qrUrl ? await (async () => { const q = document.createElement("canvas"); await QRCode.toCanvas(q, d.qrUrl!, { margin: 1, width: 360, color: { dark: "#141414", light: "#ffffff" }, errorCorrectionLevel: "M" }); return q; })() : null;
  const basePhoto = o.size === "story" ? 400 : o.size === "a4" ? 330 : 250;
  const goldFill = (y0: number, y1: number) => {
    if (!t.gold) return t.nameInk;
    const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, "#fff1c4"); g.addColorStop(0.45, t.nameInk); g.addColorStop(1, mix(accent, "#000000", 0.15)); return g;
  };

  function build(s: number, paraMax: number, withExtra: boolean): Block[] {
    const B: Block[] = [];
    // invocation
    if (o.invocation) {
      const fs = 32 * s;
      B.push({ key: "inv", h: fs * 1.2, draw: (y) => { ctx.textAlign = "center"; ctx.fillStyle = accent; ctx.font = `600 ${fs}px ${BODY}`; ctx.fillText(L.inv, VW / 2, y + fs); } });
    }
    // headline
    const hl = o.headline?.trim() || L.headline;
    const hfs = 60 * s;
    B.push({ key: "head", h: hfs * 1.2 + 30 * s, draw: (y) => {
      ctx.textAlign = "center"; const f = fitFont(ctx, hl, 400, display, hfs, CW * 0.9);
      ctx.fillStyle = t.dark ? goldFill(y, y + f) : accent; ctx.fillText(hl, VW / 2, y + f * 1.02);
      divider(ctx, VW / 2, y + hfs * 1.2 + 14 * s, Math.min(CW * 0.62, 520), accent);
    } });
    // photo
    const P = basePhoto * s;
    const boxH = o.photoShape === "circle" ? P : P * 1.2;
    B.push({ key: "photo", h: boxH + 36 * s, draw: (y0) => {
      const y = y0 + 16 * s, cx = VW / 2, px = cx - P / 2;
      mandala(ctx, cx, y + boxH / 2, Math.max(P, boxH) * 0.78, accent, t.dark ? 0.16 : 0.13);
      const path = (g: number) => {
        ctx.beginPath();
        if (o.photoShape === "circle") ctx.arc(cx, y + P / 2, P / 2 + g, 0, Math.PI * 2);
        else if (o.photoShape === "arch") { ctx.moveTo(px - g, y + boxH + g); ctx.lineTo(px - g, y + P / 2); ctx.arc(cx, y + P / 2, P / 2 + g, Math.PI, 0); ctx.lineTo(px + P + g, y + boxH + g); ctx.closePath(); }
        else rr(ctx, px - g, y - g, P + 2 * g, boxH + 2 * g, 26 * s + g);
      };
      ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowBlur = 30 * s; ctx.shadowOffsetY = 10 * s; path(10 * s); ctx.fillStyle = t.dark ? mix(accent, "#000000", 0.2) : "#ffffff"; ctx.fill(); ctx.restore();
      ctx.save(); path(0); ctx.clip();
      const im = imgs[0];
      if (im) { const r = Math.max(P / im.width, boxH / im.height); ctx.drawImage(im, cx - (im.width * r) / 2, y + boxH / 2 - (im.height * r) / 2 - (im.height * r - boxH) * 0.15, im.width * r, im.height * r); }
      else { ctx.fillStyle = mix(accent, "#ffffff", 0.75); ctx.fillRect(px, y, P, boxH); ctx.fillStyle = accent; ctx.textAlign = "center"; ctx.font = `400 ${P * 0.45}px ${display}`; ctx.fillText([...name][0] ?? "", cx, y + boxH / 2 + P * 0.16); }
      ctx.restore();
      ctx.strokeStyle = accent; ctx.lineWidth = 5 * s; path(10 * s); ctx.stroke();
      ctx.lineWidth = 1.5 * s; path(18 * s); ctx.stroke();
      if (o.photoShape === "circle") { ctx.fillStyle = accent; for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * (P / 2 + 27 * s), y + P / 2 + Math.sin(a) * (P / 2 + 27 * s), 2.6 * s, 0, Math.PI * 2); ctx.fill(); } }
      if (o.photoShape === "arch") { ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(cx, y - 30 * s, 8 * s, 0, Math.PI * 2); ctx.fill(); petal(ctx, cx, y - 22 * s, -Math.PI / 2, 0, 26 * s, 7 * s); ctx.fill(); }
    } });
    // name + chips
    const nfs = 78 * s, chipH = 50 * s, chipFs = 26 * s;
    B.push({ key: "name", h: nfs * 1.15 + 22 * s + chipH, draw: (y) => {
      ctx.textAlign = "center";
      const f = fitFont(ctx, name, 400, display, nfs, CW);
      if (t.dark) { ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.45)"; ctx.shadowBlur = 12 * s; ctx.shadowOffsetY = 3 * s; }
      ctx.fillStyle = goldFill(y, y + f); ctx.fillText(name, VW / 2, y + f * 1.02);
      if (t.dark) ctx.restore();
      const chips = [d.gender === "female" ? L.bride : L.groom, `${age} ${L.years}`, d.height_cm ? ft(d.height_cm) : "", city].filter(Boolean);
      ctx.font = `600 ${chipFs}px ${BODY}`;
      const ws = () => chips.map((c2) => ctx.measureText(c2).width + 40 * s);
      while (chips.length > 2 && ws().reduce((a, b) => a + b + 14 * s, -14 * s) > CW) chips.pop();
      const widths = ws(); let x = VW / 2 - widths.reduce((a, b) => a + b + 14 * s, -14 * s) / 2; const cy = y + nfs * 1.15 + 22 * s;
      chips.forEach((ch, i) => {
        const w = widths[i]!; rr(ctx, x, cy, w, chipH, chipH / 2);
        if (i === 0) { ctx.fillStyle = accent; ctx.fill(); ctx.fillStyle = t.dark ? t.bg[1] : "#ffffff"; }
        else { ctx.fillStyle = t.dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.7)"; ctx.fill(); ctx.strokeStyle = rgba(accent.startsWith("#") ? accent : "#888888", 0.6); ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = t.ink; }
        ctx.textAlign = "center"; ctx.fillText(ch, x + w / 2, cy + chipH / 2 + chipFs * 0.36); x += w + 14 * s;
      });
    } });
    // details panel: two columns, a value that needs more than two lines takes the full width
    if (cells.length) {
      const pad = 34 * s, gap = 28 * s, colW = (CW - 2 * pad - gap) / 2, lfs = 25 * s, vfs = 33 * s, vlh = vfs * 1.32, headH = 58 * s;
      ctx.font = `600 ${vfs}px ${BODY}`;
      type Row = { cells: { c: Cell; lines: string[]; full: boolean }[]; h: number };
      const rows: Row[] = []; let pend: { c: Cell; lines: string[]; full: boolean } | null = null;
      const flush = () => { if (pend) { rows.push({ cells: [pend], h: lfs * 1.3 + pend.lines.length * vlh + 20 * s }); pend = null; } };
      for (const cl of cells) {
        const half = wrap(ctx, cl.v, colW);
        if (half.length <= 2) {
          const item = { c: cl, lines: half, full: false };
          if (pend) { rows.push({ cells: [pend, item], h: lfs * 1.3 + Math.max(pend.lines.length, half.length) * vlh + 20 * s }); pend = null; } else pend = item;
        } else { flush(); const full = clip(ctx, wrap(ctx, cl.v, CW - 2 * pad), 3, CW - 2 * pad); rows.push({ cells: [{ c: cl, lines: full, full: true }], h: lfs * 1.3 + full.length * vlh + 20 * s }); }
      }
      flush();
      const bodyH = rows.reduce((a, r) => a + r.h, 0);
      B.push({ key: "details", h: headH + bodyH + 18 * s, draw: (y) => {
        const ph = headH + bodyH + 18 * s;
        ctx.save(); ctx.shadowColor = t.dark ? "rgba(0,0,0,0.35)" : "rgba(120,70,30,0.12)"; ctx.shadowBlur = 24 * s; ctx.shadowOffsetY = 6 * s;
        rr(ctx, left, y, CW, ph, 26 * s); ctx.fillStyle = t.panel; ctx.fill(); ctx.restore();
        rr(ctx, left, y, CW, ph, 26 * s); ctx.strokeStyle = t.panelLine; ctx.lineWidth = 2; ctx.stroke();
        // header strip
        ctx.save(); rr(ctx, left, y, CW, ph, 26 * s); ctx.clip(); ctx.fillStyle = rgba(accent.startsWith("#") ? accent : "#888888", t.dark ? 0.22 : 0.1); ctx.fillRect(left, y, CW, headH); ctx.restore();
        ctx.textAlign = "center"; ctx.fillStyle = t.dark ? t.nameInk : accent; ctx.font = `700 ${27 * s}px ${BODY}`; ctx.fillText(L.details, VW / 2, y + headH / 2 + 27 * s * 0.36);
        const tw = ctx.measureText(L.details).width; ctx.fillStyle = accent;
        for (const side of [-1, 1]) { const x = VW / 2 + side * (tw / 2 + 22 * s); ctx.beginPath(); ctx.moveTo(x, y + headH / 2 - 6 * s); ctx.lineTo(x + 6 * s, y + headH / 2); ctx.lineTo(x, y + headH / 2 + 6 * s); ctx.lineTo(x - 6 * s, y + headH / 2); ctx.closePath(); ctx.fill(); }
        let ry = y + headH + 4 * s;
        rows.forEach((r, ri) => {
          r.cells.forEach((it, ci) => {
            const x = left + pad + (it.full ? 0 : ci * (colW + gap));
            ctx.textAlign = "left"; ctx.fillStyle = t.dark ? t.sub : accent; ctx.font = `600 ${lfs}px ${BODY}`; ctx.fillText(it.c.k, x, ry + 12 * s + lfs);
            ctx.fillStyle = t.ink; ctx.font = `600 ${vfs}px ${BODY}`;
            it.lines.forEach((ln, j) => ctx.fillText(ln, x, ry + 12 * s + lfs * 1.3 + vfs + j * vlh));
          });
          if (r.cells.length === 2) { ctx.strokeStyle = t.panelLine; ctx.globalAlpha = 0.7; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(left + CW / 2, ry + 14 * s); ctx.lineTo(left + CW / 2, ry + r.h - 8 * s); ctx.stroke(); ctx.globalAlpha = 1; }
          ry += r.h;
          if (ri < rows.length - 1) { ctx.save(); ctx.strokeStyle = t.panelLine; ctx.setLineDash([3 * s, 6 * s]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(left + pad, ry); ctx.lineTo(left + CW - pad, ry); ctx.stroke(); ctx.restore(); }
        });
      } });
    }
    // paragraphs
    if (paraMax > 0) for (const [label, text] of paras) {
      const fs = 31 * s, lh = fs * 1.48, tfs = 29 * s, w = CW - 40 * s;
      ctx.font = `400 ${fs}px ${BODY}`; const lines = clip(ctx, wrap(ctx, text, w), paraMax, w);
      B.push({ key: `p-${label}`, h: tfs * 1.6 + lines.length * lh, draw: (y) => {
        ctx.textAlign = "center"; ctx.fillStyle = t.dark ? t.nameInk : accent; ctx.font = `700 ${tfs}px ${BODY}`; ctx.fillText(label, VW / 2, y + tfs);
        const tw = ctx.measureText(label).width; ctx.strokeStyle = accent; ctx.lineWidth = 1.5;
        for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(VW / 2 + side * (tw / 2 + 14 * s), y + tfs * 0.65); ctx.lineTo(VW / 2 + side * (tw / 2 + 90 * s), y + tfs * 0.65); ctx.stroke(); ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(VW / 2 + side * (tw / 2 + 96 * s), y + tfs * 0.65, 3.5 * s, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = t.ink; ctx.font = `400 ${fs}px ${BODY}`;
        lines.forEach((ln, j) => ctx.fillText(ln, VW / 2, y + tfs * 1.6 + fs + j * lh));
      } });
    }
    // extra photos
    if (withExtra && imgs.length > 1) {
      const n = imgs.length - 1, gap = 22 * s, sz = Math.min(170 * s, (CW - (n - 1) * gap) / n);
      B.push({ key: "extra", h: sz + 10 * s, draw: (y) => {
        let x = VW / 2 - (n * sz + (n - 1) * gap) / 2;
        for (const im of imgs.slice(1)) {
          ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.25)"; ctx.shadowBlur = 14 * s; ctx.shadowOffsetY = 5 * s; rr(ctx, x - 6 * s, y - 6 * s, sz + 12 * s, sz + 12 * s, 20 * s); ctx.fillStyle = "#ffffff"; ctx.fill(); ctx.restore();
          ctx.save(); rr(ctx, x, y, sz, sz, 15 * s); ctx.clip(); const r = Math.max(sz / im.width, sz / im.height); ctx.drawImage(im, x + sz / 2 - (im.width * r) / 2, y + sz / 2 - (im.height * r) / 2, im.width * r, im.height * r); ctx.restore();
          ctx.strokeStyle = accent; ctx.lineWidth = 2; rr(ctx, x - 6 * s, y - 6 * s, sz + 12 * s, sz + 12 * s, 20 * s); ctx.stroke();
          x += sz + gap;
        }
      } });
    }
    return B;
  }

  // footer (anchored at the bottom)
  const footer = (s: number) => {
    const q = qrCanvas ? 170 * s : 0, org = d.org ? (hi ? toDevanagari(d.org) : toLatin(d.org)) : "", via = o.footerNote?.trim() || L.via;
    const h = qrCanvas ? q + 16 * s : 44 * s;
    return { h, draw: (y: number) => {
      if (!qrCanvas) { ctx.textAlign = "center"; ctx.fillStyle = t.sub; ctx.font = `500 ${24 * s}px ${BODY}`; ctx.fillText([org, via].filter(Boolean).join("  ·  "), VW / 2, y + 30 * s); return; }
      const tw = Math.min(CW - q - 40 * s, 560 * s);
      ctx.font = `700 ${29 * s}px ${BODY}`; const l1 = wrap(ctx, L.scan, tw);
      ctx.font = `500 ${23 * s}px ${BODY}`; const l2 = org ? wrap(ctx, org, tw).slice(0, 2) : [];
      const textW = Math.max(...[...l1.map((x) => { ctx.font = `700 ${29 * s}px ${BODY}`; return ctx.measureText(x).width; }), ...l2.map((x) => { ctx.font = `500 ${23 * s}px ${BODY}`; return ctx.measureText(x).width; }), (() => { ctx.font = `600 ${23 * s}px ${BODY}`; return ctx.measureText(via).width; })()]);
      const total = q + 34 * s + Math.min(textW, tw); const x0 = VW / 2 - total / 2, qy = y + 8 * s;
      ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.2)"; ctx.shadowBlur = 12 * s; rr(ctx, x0 - 10 * s, qy - 10 * s, q + 20 * s, q + 20 * s, 18 * s); ctx.fillStyle = "#ffffff"; ctx.fill(); ctx.restore();
      ctx.strokeStyle = accent; ctx.lineWidth = 2.5; rr(ctx, x0 - 10 * s, qy - 10 * s, q + 20 * s, q + 20 * s, 18 * s); ctx.stroke();
      ctx.drawImage(qrCanvas, x0, qy, q, q);
      const tx = x0 + q + 34 * s; const blockH = l1.length * 38 * s + l2.length * 31 * s + 31 * s; let ty = qy + q / 2 - blockH / 2 + 28 * s;
      ctx.textAlign = "left"; ctx.fillStyle = t.ink; ctx.font = `700 ${29 * s}px ${BODY}`; for (const ln of l1) { ctx.fillText(ln, tx, ty); ty += 38 * s; }
      ctx.fillStyle = t.sub; ctx.font = `500 ${23 * s}px ${BODY}`; for (const ln of l2) { ctx.fillText(ln, tx, ty); ty += 31 * s; }
      ctx.fillStyle = t.dark ? t.nameInk : accent; ctx.font = `600 ${23 * s}px ${BODY}`; ctx.fillText(via, tx, ty);
    } };
  };

  // fit: largest scale that fits; then fewer paragraph lines; then drop extra photos; then drop paragraphs
  const avail = (s: number) => bottom - top - footer(s).h - 24 * s;
  const minGap = (s: number) => 22 * s;
  let chosen: { s: number; B: Block[] } | null = null;
  outer: for (const [paraMax, extra] of [[6, true], [4, true], [3, true], [2, true], [2, false], [0, false]] as const) {
    for (let s = 1.25; s >= 0.66; s -= 0.02) {
      const B = build(s, paraMax, extra); const tot = B.reduce((a, b) => a + b.h, 0) + minGap(s) * (B.length - 1);
      if (tot <= avail(s)) { chosen = { s, B }; break outer; }
    }
  }
  if (!chosen) { const s = 0.66; chosen = { s, B: build(s, 0, false) }; }
  const { s, B } = chosen;
  const tot = B.reduce((a, b) => a + b.h, 0);
  const free = avail(s) - tot;
  const gap = Math.min(free / Math.max(1, B.length - 1), 70 * s);
  let y = top + Math.max(0, (free - gap * (B.length - 1)) / 2) * 0.6;

  // decorations under the text
  if (t.toran) toran(ctx, 150, VW - 150, 48);
  border(ctx, VH, t, accent);
  for (const b of B) { b.draw(y); y += b.h + gap; }
  const f = footer(s);
  const fy = bottom - f.h;
  divider(ctx, VW / 2, fy - 18 * s, Math.min(CW * 0.7, 560), rgba(accent.startsWith("#") ? accent : "#888888", 0.8));
  f.draw(fy);
  return c;
}

export const toJpg = (c: HTMLCanvasElement, q = 0.9) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("JPG failed"))), "image/jpeg", q));

/** PDF: A4 page for the A4 size, otherwise a page with the card's own proportions (card embedded as JPEG so Devanagari is exact). */
export async function toPdf(c: HTMLCanvasElement, title: string): Promise<Blob> {
  const pdf = await PDFDocument.create(); pdf.setTitle(title); pdf.setProducer("Kalchuri One");
  const img = await pdf.embedJpg(new Uint8Array(await (await toJpg(c, 0.92)).arrayBuffer()));
  const wPt = 595.28, hPt = (c.height / c.width) * wPt;
  const page = pdf.addPage([wPt, hPt]); page.drawImage(img, { x: 0, y: 0, width: wPt, height: hPt });
  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}
