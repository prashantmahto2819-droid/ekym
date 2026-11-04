// Canvas renderer for the Universal Design Engine (browser only).
// Ported and generalised from the शोकपत्र studio-engine: same text wrapping (**bold** markup), frames and clip art,
// plus merge fields, QR codes, tables, flowing body text with pagination and mm-based page sizes.
import QRCode from "qrcode";

import { FONTS, pagePx, type ArtLayer, type DesignDoc, type FlowLayer, type FontKey, type FrameLayer, type Layer, type TableLayer, type TextLayer } from "./model";
import { mergeText, lookup, type MergeData } from "./merge";

export type Bounds = { x: number; y: number; w: number; h: number };
export type RenderedLayer = { layer: Layer; bounds: Bounds | null; page: number };

const fontCss = (key?: FontKey) => (FONTS[key ?? "mukta"] ?? FONTS.mukta).css;
const fstr = (key: FontKey | undefined, weight: number, size: number, italic?: boolean) =>
  `${italic ? "italic " : ""}${weight} ${Math.max(4, Math.round(size * 100) / 100)}px ${fontCss(key)}, "Noto Sans Devanagari", sans-serif`;

let measureCtx: CanvasRenderingContext2D | null = null;
export function mctx() {
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
  return measureCtx!;
}

export async function ensureFonts(keys: (FontKey | undefined)[]) {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  const list = [...new Set(keys.filter(Boolean))] as FontKey[];
  await Promise.all(list.flatMap((k) => [400, 700].map((w) => document.fonts.load(`${w} 40px ${fontCss(k)}`, "अआइक Ab")))).catch(() => {});
}

const imgCache = new Map<string, Promise<HTMLImageElement | null>>();
export function loadImage(src: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  const hit = imgCache.get(src);
  if (hit) return hit;
  const p = new Promise<HTMLImageElement | null>((res) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = src;
  });
  imgCache.set(src, p);
  return p;
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

/* ---------------- text with **bold** markup ---------------- */
type Tok = { t: string; b: boolean; space: boolean; w: number };
type Line = { toks: Tok[]; ind: number; w: number; last?: boolean };

function markup(p: string) {
  const out: { t: string; b: boolean }[] = [];
  let b = false;
  p.split("**").forEach((t, i) => { if (i > 0) b = !b; if (t) out.push({ t, b }); });
  return out;
}
function wrapPara(ctx: CanvasRenderingContext2D, L: { font?: FontKey; size?: number; weight?: number; italic?: boolean }, segs: { t: string; b: boolean }[], maxW: number, indent: number): Line[] {
  const size = L.size || 16, base = L.weight || 400;
  const toks: Omit<Tok, "w">[] = [];
  for (const s of segs) for (const p of s.t.split(/(\s+)/).filter(Boolean)) toks.push({ t: p, b: s.b, space: /^\s+$/.test(p) });
  const lines: Line[] = [{ toks: [], ind: indent, w: 0 }];
  let x = indent;
  for (const tk of toks) {
    ctx.font = fstr(L.font, tk.b ? 700 : base, size, L.italic);
    const w = ctx.measureText(tk.t).width;
    const cur = lines[lines.length - 1]!;
    if (tk.space) { if (!cur.toks.length) continue; cur.toks.push({ ...tk, w }); x += w; continue; }
    if (x + w > maxW && cur.toks.some((q) => !q.space)) {
      while (cur.toks.length && cur.toks[cur.toks.length - 1]!.space) cur.toks.pop();
      lines.push({ toks: [], ind: 0, w: 0 });
      x = 0;
    }
    lines[lines.length - 1]!.toks.push({ ...tk, w });
    x += w;
  }
  for (const l of lines) {
    while (l.toks.length && l.toks[l.toks.length - 1]!.space) l.toks.pop();
    l.w = l.toks.reduce((a, t) => a + t.w, 0);
  }
  lines[lines.length - 1]!.last = true;
  return lines;
}
export function textLines(ctx: CanvasRenderingContext2D, L: TextLayer | FlowLayer, text: string): Line[] {
  const out: Line[] = [];
  const nowrap = (L as TextLayer).nowrap;
  const indent = (L as TextLayer).indent || 0;
  String(text ?? "").split("\n").forEach((p, i) => out.push(...wrapPara(ctx, L, markup(p), nowrap ? 1e9 : L.w || 400, i === 0 ? indent : 0)));
  return out;
}
const lhOf = (L: TextLayer | FlowLayer) => L.lh || (L.size || 16) * 1.45;
export const textHeight = (L: TextLayer, text = L.text) => textLines(mctx(), L, text).length * lhOf(L);
export const textWidth = (L: TextLayer, text = L.text) => Math.max(0, ...textLines(mctx(), L, text).map((l) => l.w + l.ind));

function drawTextLines(ctx: CanvasRenderingContext2D, L: TextLayer | FlowLayer, lines: Line[], x0: number, y0: number, justify = false) {
  const lh = lhOf(L), size = L.size || 16, weight = (L as TextLayer).weight || 400;
  ctx.fillStyle = L.color || "#111";
  lines.forEach((ln, i) => {
    let x = x0 + ln.ind;
    const align = L.align;
    if (align === "center") x = x0 + (L.w - ln.w) / 2;
    else if (align === "right") x = x0 + L.w - ln.w;
    const cy = y0 + i * lh + lh / 2;
    const xs = x;
    let extra = 0;
    if (justify && !ln.last) {
      const spaces = ln.toks.filter((t) => t.space).length;
      if (spaces) extra = (L.w - ln.ind - ln.w) / spaces;
    }
    for (const tk of ln.toks) {
      ctx.font = fstr(L.font, tk.b ? 700 : weight, size, (L as TextLayer).italic);
      ctx.fillText(tk.t, x, cy);
      x += tk.w + (tk.space ? extra : 0);
    }
    if ((L as TextLayer).underline && ln.w) {
      ctx.strokeStyle = L.color || "#111"; ctx.lineWidth = Math.max(1, size / 22);
      ctx.beginPath(); ctx.moveTo(xs, cy + size * 0.62); ctx.lineTo(xs + ln.w, cy + size * 0.62); ctx.stroke();
    }
  });
}

/* ---------------- clip art (from शोकपत्र) ---------------- */
export function drawArt(ctx: CanvasRenderingContext2D, name: ArtLayer["art"], w: number, h: number, color?: string) {
  ctx.save(); ctx.translate(w / 2, h / 2);
  const c = color || "#b8924a";
  if (name === "diya") {
    const s = Math.min(w / 90, h / 116); ctx.scale(s, s); ctx.translate(0, 23);
    ctx.fillStyle = "#f4b547"; ctx.beginPath(); ctx.moveTo(0, -78); ctx.bezierCurveTo(14, -54, 22, -42, 12, -24); ctx.bezierCurveTo(8, -17, -8, -17, -12, -24); ctx.bezierCurveTo(-22, -42, -12, -56, 0, -78); ctx.fill();
    ctx.fillStyle = "#fff6dc"; ctx.beginPath(); ctx.moveTo(0, -52); ctx.bezierCurveTo(5, -40, 7, -32, 2, -24); ctx.bezierCurveTo(0, -21, -2, -21, -4, -24); ctx.bezierCurveTo(-8, -32, -4, -40, 0, -52); ctx.fill();
    ctx.fillStyle = "#3a2b12"; ctx.fillRect(-2, -26, 4, 12);
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-42, -12); ctx.bezierCurveTo(-42, 20, -22, 32, 0, 32); ctx.bezierCurveTo(22, 32, 42, 20, 42, -12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.beginPath(); ctx.ellipse(0, -12, 42, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(60,40,10,.75)"; ctx.beginPath(); ctx.ellipse(0, -12, 36, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  } else if (name === "lotus") {
    const s = Math.min(w / 120, h / 80); ctx.scale(s, s); ctx.translate(0, 34);
    const petal = (a: number, len: number, wd: number, fill: string) => { ctx.save(); ctx.rotate(a); ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(wd, -len * 0.3, wd * 0.8, -len * 0.85, 0, -len); ctx.bezierCurveTo(-wd * 0.8, -len * 0.85, -wd, -len * 0.3, 0, 0); ctx.fill(); ctx.restore(); };
    [-70, 70].forEach((a) => petal((a * Math.PI) / 180, 56, 24, c + "99")); [-38, 38].forEach((a) => petal((a * Math.PI) / 180, 66, 26, c + "cc")); petal(0, 74, 28, c);
    ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, -62); ctx.stroke();
  } else if (name === "flower") {
    const s = Math.min(w, h) / 100; ctx.scale(s, s);
    for (let i = 0; i < 8; i++) { ctx.save(); ctx.rotate((i * Math.PI) / 4); ctx.fillStyle = c + "cc"; ctx.beginPath(); ctx.ellipse(0, -28, 13, 26, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    ctx.fillStyle = "#f4b547"; ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#8a6a2b"; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
  } else if (name === "om") {
    ctx.fillStyle = c; ctx.font = fstr("notoserif", 700, Math.min(h, w) * 0.95); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("ॐ", 0, 0);
  } else if (name === "divider") {
    ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = Math.max(1.5, h * 0.08);
    const m = h * 0.5; ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(-m * 1.6, 0); ctx.moveTo(m * 1.6, 0); ctx.lineTo(w / 2, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -m); ctx.lineTo(m, 0); ctx.lineTo(0, m); ctx.lineTo(-m, 0); ctx.closePath(); ctx.fill();
    [-1, 1].forEach((sg) => { ctx.beginPath(); ctx.arc(sg * m * 1.25, 0, h * 0.09, 0, Math.PI * 2); ctx.fill(); });
  } else if (name === "ornament") {
    ctx.translate(-w / 2, -h / 2); ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.05); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(w, 0); ctx.lineTo(w * 0.28, 0); ctx.bezierCurveTo(w * 0.08, 0, 0, w * 0.08, 0, h * 0.28); ctx.lineTo(0, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w * 0.7, h * 0.12); ctx.lineTo(w * 0.3, h * 0.12); ctx.bezierCurveTo(w * 0.18, h * 0.12, w * 0.12, h * 0.18, w * 0.12, h * 0.3); ctx.lineTo(w * 0.12, h * 0.7); ctx.stroke();
    ctx.beginPath(); ctx.arc(w * 0.26, h * 0.26, Math.min(w, h) * 0.05, 0, Math.PI * 2); ctx.fill();
  } else if (name === "leaf") {
    const s = Math.min(w / 80, h / 100); ctx.scale(s, s); ctx.translate(0, -4);
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, -46); ctx.bezierCurveTo(10, -36, 40, -20, 36, 6); ctx.bezierCurveTo(32, 24, 12, 30, 4, 36); ctx.lineTo(3, 50); ctx.lineTo(-3, 50); ctx.lineTo(-4, 36); ctx.bezierCurveTo(-12, 30, -32, 24, -36, 6); ctx.bezierCurveTo(-40, -20, -10, -36, 0, -46); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 46); ctx.lineTo(0, -38); ctx.stroke();
    for (let i = -2; i <= 2; i++) if (i) { ctx.beginPath(); ctx.moveTo(0, 18 - Math.abs(i) * 5); ctx.lineTo(i * 12, 4 - Math.abs(i) * 10); ctx.stroke(); }
  } else if (name === "garland") {
    const n = Math.max(3, Math.round(w / (h * 0.85))), r = h * 0.42; ctx.translate(-w / 2, 0);
    ctx.strokeStyle = "#7a5a1a"; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= n; i++) { const x = (w / n) * i, y = Math.sin((i / n) * Math.PI) * h * 0.12; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    for (let i = 0; i <= n; i++) { const x = (w / n) * i, y = Math.sin((i / n) * Math.PI) * h * 0.12; ctx.fillStyle = i % 2 ? "#f4a11d" : "#f6c445"; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.35, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}

function drawFrame(ctx: CanvasRenderingContext2D, L: FrameLayer) {
  const { x, y, w } = L, h = L.h ?? 0, lw = L.lw || 3, st = L.style || "single";
  ctx.strokeStyle = L.color || "#111"; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.fillStyle = L.color || "#111";
  ctx.lineWidth = lw; rr(ctx, x, y, w, h, st === "rounded" ? 30 : (L.radius ?? 12)); ctx.stroke();
  if (st === "double" || st === "ornate") { ctx.lineWidth = Math.max(0.8, lw * 0.3); rr(ctx, x + lw * 2.8, y + lw * 2.8, w - lw * 5.6, h - lw * 5.6, Math.max(3, (L.radius ?? 12) - 4)); ctx.stroke(); }
  if (st === "corner") {
    ctx.lineWidth = lw * 1.7; const k = Math.min(w, h) * 0.075, g = lw * 2.6;
    for (const [cx, cy, sx, sy] of [[x + g, y + g, 1, 1], [x + w - g, y + g, -1, 1], [x + g, y + h - g, 1, -1], [x + w - g, y + h - g, -1, -1]] as const) { ctx.beginPath(); ctx.moveTo(cx + sx * k, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy * k); ctx.stroke(); }
  }
  if (st === "ornate") for (const [cx, cy] of [[x + lw * 2.8, y + lw * 2.8], [x + w - lw * 2.8, y + lw * 2.8], [x + lw * 2.8, y + h - lw * 2.8], [x + w - lw * 2.8, y + h - lw * 2.8]] as const) { ctx.beginPath(); ctx.arc(cx, cy, lw * 1.6, 0, Math.PI * 2); ctx.fill(); }
}

/* ---------------- pagination of flow text ---------------- */
/** Splits a flow layer's text into per-page line groups. Returns lines for page 0..n. */
function paginateFlow(ctx: CanvasRenderingContext2D, L: FlowLayer, text: string): Line[][] {
  const lh = lhOf(L);
  const perPage = Math.max(1, Math.floor((L.h ?? 0) / lh));
  const lines = textLines(ctx, L, text);
  const pages: Line[][] = [];
  for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
  return pages.length ? pages : [[]];
}

/** How many pages a document needs once flow layers are expanded. */
export function pageCount(doc: DesignDoc, data: MergeData = {}): number {
  const ctx = mctx();
  let n = doc.pages.length;
  doc.pages.forEach((p, pi) => {
    for (const L of p.layers) {
      if (L.type === "flow") n = Math.max(n, pi + paginateFlow(ctx, L, mergeText(L.text, data)).length);
    }
  });
  return n;
}

/* ---------------- QR ---------------- */
const qrCache = new Map<string, Promise<HTMLCanvasElement | null>>();
function qrCanvas(data: string, color: string): Promise<HTMLCanvasElement | null> {
  const key = data + "|" + color;
  const hit = qrCache.get(key);
  if (hit) return hit;
  const p = (async () => {
    try {
      const c = document.createElement("canvas");
      await QRCode.toCanvas(c, data || " ", { margin: 0, width: 512, color: { dark: color, light: "#ffffff00" } });
      return c;
    } catch { return null; }
  })();
  qrCache.set(key, p);
  return p;
}

/* ---------------- main ---------------- */
export type RenderOptions = {
  /** output width in px; default = page width at 96 dpi */
  width?: number;
  data?: MergeData;
  /** draw dotted guides for empty merge fields (editor) */
  guides?: boolean;
};

/**
 * Renders one page of the document onto `canvas`. Returns bounds of every layer (page px) for the editor.
 * Flow layers continue on later pages; master layers repeat on every page.
 */
export async function renderPage(canvas: HTMLCanvasElement, doc: DesignDoc, pageIndex: number, o: RenderOptions = {}): Promise<RenderedLayer[]> {
  const { W, H } = pagePx(doc);
  const width = o.width ?? W;
  canvas.width = Math.round(width);
  canvas.height = Math.round((width * H) / W);
  const data = o.data ?? {};
  const ctx = canvas.getContext("2d")!;
  const sc = canvas.width / W;

  // which layers appear on this page: master + the page's own + flow continuations
  const own = doc.pages[pageIndex]?.layers ?? [];
  const flows: { L: FlowLayer; lines: Line[] }[] = [];
  doc.pages.forEach((p, pi) => {
    for (const L of p.layers) {
      if (L.type === "flow" && pi <= pageIndex) {
        const pages = paginateFlow(mctx(), L, mergeText(L.text, data));
        const k = pageIndex - pi;
        if (k < pages.length && (k === 0 || !own.includes(L))) flows.push({ L, lines: pages[k]! });
      }
    }
  });
  const layers: Layer[] = [...doc.master, ...own.filter((l) => l.type !== "flow")];

  await ensureFonts([...layers, ...flows.map((f) => f.L)].map((l) => (l as TextLayer).font));
  const images = new Map<string, HTMLImageElement | null>();
  await Promise.all(layers.filter((l): l is Extract<Layer, { type: "image" }> => l.type === "image").map(async (l) => images.set(l.id, await loadImage(mergeText(l.src, data)))));
  const qrs = new Map<string, HTMLCanvasElement | null>();
  await Promise.all(layers.filter((l): l is Extract<Layer, { type: "qr" }> => l.type === "qr").map(async (l) => qrs.set(l.id, await qrCanvas(mergeText(l.data, data), l.color || "#111"))));

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(sc, 0, 0, sc, 0, 0);
  ctx.fillStyle = doc.bg || "#fff";
  ctx.fillRect(0, 0, W, H);

  const out: RenderedLayer[] = [];
  const drawOne = (L: Layer, flowLines?: Line[]) => {
    if (L.hidden) { out.push({ layer: L, bounds: null, page: pageIndex }); return; }
    const Lh = L.h ?? 0;
    ctx.save(); ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.globalAlpha = L.opacity ?? 1;
    let bw = L.w || 0, bh = Lh;
    let bounds: Bounds;
    if (L.type === "line") { bh = Math.max(L.lw || 2, 8); bounds = { x: L.x, y: L.y - bh / 2, w: bw, h: bh }; }
    else bounds = { x: L.x, y: L.y, w: bw, h: bh };
    if (L.rot) { const cx = bounds.x + bounds.w / 2, cy = bounds.y + bounds.h / 2; ctx.translate(cx, cy); ctx.rotate((L.rot * Math.PI) / 180); ctx.translate(-cx, -cy); }
    switch (L.type) {
      case "frame": drawFrame(ctx, L); break;
      case "rect":
        rr(ctx, L.x, L.y, L.w, Lh, L.radius || 0);
        if (L.fill) { ctx.fillStyle = L.fill; ctx.fill(); }
        if (L.lw) { ctx.strokeStyle = L.color || "#111"; ctx.lineWidth = L.lw; ctx.stroke(); }
        break;
      case "line":
        ctx.strokeStyle = L.color || "#111"; ctx.lineWidth = L.lw || 2; ctx.lineCap = "round";
        if (L.dash) ctx.setLineDash([(L.lw || 2) * 0.8, (L.lw || 2) * 2.4]);
        ctx.beginPath(); ctx.moveTo(L.x, L.y); ctx.lineTo(L.x + L.w, L.y); ctx.stroke();
        break;
      case "art": ctx.translate(L.x, L.y); drawArt(ctx, L.art, L.w, Lh, L.color); break;
      case "image": {
        const img = images.get(L.id);
        if (img) {
          ctx.save();
          if (L.shape === "circle") { ctx.beginPath(); ctx.ellipse(L.x + L.w / 2, L.y + Lh / 2, L.w / 2, Lh / 2, 0, 0, Math.PI * 2); ctx.clip(); }
          else { rr(ctx, L.x, L.y, L.w, Lh, L.radius || 0); ctx.clip(); }
          const s = L.fit === "contain" ? Math.min(L.w / img.width, Lh / img.height) : Math.max(L.w / img.width, Lh / img.height);
          ctx.drawImage(img, L.x + L.w / 2 - (img.width * s) / 2, L.y + Lh / 2 - (img.height * s) / 2, img.width * s, img.height * s);
          ctx.restore();
          if (L.ring) { ctx.strokeStyle = L.color || "#111"; ctx.lineWidth = L.ring; ctx.beginPath(); if (L.shape === "circle") ctx.ellipse(L.x + L.w / 2, L.y + Lh / 2, L.w / 2, Lh / 2, 0, 0, Math.PI * 2); else rr(ctx, L.x, L.y, L.w, Lh, L.radius || 0); ctx.stroke(); }
        } else { ctx.fillStyle = "#e6e9ef"; ctx.fillRect(L.x, L.y, L.w, Lh); ctx.fillStyle = "#9aa3b2"; ctx.font = fstr("manrope", 500, Math.min(14, Lh / 3)); ctx.textAlign = "center"; ctx.fillText("image", L.x + L.w / 2, L.y + Lh / 2); }
        break;
      }
      case "qr": {
        const q = qrs.get(L.id);
        if (q) ctx.drawImage(q, L.x, L.y, L.w, (L.h ?? L.w));
        else { ctx.strokeStyle = "#9aa3b2"; ctx.setLineDash([3, 3]); ctx.strokeRect(L.x, L.y, L.w, (L.h ?? L.w)); }
        break;
      }
      case "table": {
        const rows = (lookup(data, L.rowsField) as Record<string, unknown>[] | undefined) ?? [];
        const size = L.size || 12, rowH = L.rowH || size * 2, font = L.font;
        let y = L.y;
        const total = L.columns.reduce((a, c) => a + c.width, 0) || 1;
        const cols = L.columns.map((c) => ({ ...c, px: (c.width / total) * L.w }));
        ctx.strokeStyle = L.color || "#111"; ctx.lineWidth = 0.8;
        const drawRow = (cells: string[], bold: boolean, fill?: string) => {
          if (fill) { ctx.fillStyle = fill; ctx.fillRect(L.x, y, L.w, rowH); }
          let x = L.x;
          cols.forEach((c, i) => {
            ctx.strokeRect(x, y, c.px, rowH);
            ctx.fillStyle = L.color || "#111"; ctx.font = fstr(font, bold ? 700 : 400, size);
            const t = cells[i] ?? "";
            const tw = ctx.measureText(t).width;
            const tx = c.align === "right" ? x + c.px - 6 - tw : c.align === "center" ? x + (c.px - tw) / 2 : x + 6;
            ctx.fillText(t, tx, y + rowH / 2);
            x += c.px;
          });
          y += rowH;
        };
        drawRow(cols.map((c) => c.label), true, L.headerFill || "#f1f3f6");
        for (const r of rows) { if (y + rowH > L.y + (Lh)) break; drawRow(cols.map((c) => String(r[c.key] ?? "")), false); }
        bounds.h = Math.max(Lh, y - L.y);
        break;
      }
      case "text": {
        const text = mergeText(L.text, data);
        if (o.guides && /\{\{/.test(L.text) && !text.trim()) { ctx.setLineDash([3, 4]); ctx.strokeStyle = "#9aa3b2"; ctx.strokeRect(L.x, L.y, L.w, (L.h ?? (L.size || 16) * 1.45)); ctx.setLineDash([]); }
        let size = L.size || 16;
        let Lx: TextLayer = L;
        if (L.fit) {
          while (size > 5 && textWidth({ ...L, size, nowrap: true } as TextLayer, text) > L.w) size -= 0.5;
          Lx = { ...L, size, lh: L.lh ?? size * 1.45, nowrap: true };
        }
        const lines = textLines(ctx, Lx, text);
        drawTextLines(ctx, Lx, lines, L.x, L.y);
        bounds.h = lines.length * lhOf(Lx);
        break;
      }
      case "flow": {
        drawTextLines(ctx, L, flowLines ?? [], L.x, L.y, L.align === "justify");
        break;
      }
    }
    ctx.restore();
    out.push({ layer: L, bounds, page: pageIndex });
  };

  for (const L of layers) drawOne(L);
  for (const f of flows) drawOne(f.L, f.lines);
  return out;
}

/** Render every page at `scale` × 96dpi and return canvases (for PDF/PNG export). */
export async function renderAll(doc: DesignDoc, data: MergeData = {}, scale = 300 / 96): Promise<HTMLCanvasElement[]> {
  const { W } = pagePx(doc);
  const n = pageCount(doc, data);
  const out: HTMLCanvasElement[] = [];
  for (let i = 0; i < n; i++) {
    const c = document.createElement("canvas");
    await renderPage(c, doc, i, { width: W * scale, data });
    out.push(c);
  }
  return out;
}
