// Port of shokpatra's js/letterImage.js: writes one person's name (father, village) into the
// "name box" of an uploaded शोकपत्र photo. The box is stored as fractions (0..1) of the image, so the
// same name_box works at every resolution and is compatible with the shokpatra app.

export type NameBox = { x: number; y: number; w: number; h: number };
export type LetterVars = { name: string; father?: string | null; village?: string | null };

export const DEFAULT_BOX_TEMPLATE = "{नाम}[ (पिता: {पिता})][, {गाँव}]";
const TOKENS: Record<string, keyof LetterVars> = { "{नाम}": "name", "{पिता}": "father", "{गाँव}": "village" };

/** Replace {नाम} {पिता} {गाँव}; a [segment] is dropped when a token inside it is empty. */
export function fillTemplate(template: string, vars: LetterVars): string {
  const sub = (s: string, strict: boolean) => {
    let empty = false;
    const out = s.replace(/\{[^}]+\}/g, (tok) => {
      const key = TOKENS[tok];
      if (!key) return tok;
      const v = (vars[key] ?? "").trim();
      if (!v) empty = true;
      return v;
    });
    return strict && empty ? "" : out;
  };
  return sub(template.replace(/\[([^\]]*)\]/g, (_, seg: string) => sub(seg, true)), false).replace(/[ \t]+/g, " ").replace(/ +\n/g, "\n").trim();
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("फोटो खुल नहीं सकी। JPG या PNG फोटो चुनिए।"));
    img.src = src;
  });
}

function sampleColor(ctx: CanvasRenderingContext2D, x: number, y: number): string {
  try {
    const px = ctx.getImageData(Math.max(0, Math.round(x)), Math.max(0, Math.round(y)), 6, 6).data;
    let r = 0, g = 0, b = 0;
    const n = px.length / 4;
    for (let i = 0; i < px.length; i += 4) { r += px[i]!; g += px[i + 1]!; b += px[i + 2]!; }
    return `rgb(${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)})`;
  } catch { return "#fff"; }
}

let fontReady: Promise<unknown> | undefined;
function ensureFont(sample = "अआइ") {
  if (typeof document === "undefined" || !("fonts" in document)) return Promise.resolve();
  fontReady ||= Promise.all([document.fonts.load("600 40px Mukta", sample), document.fonts.load("700 40px Mukta", sample)]).catch(() => undefined);
  return fontReady;
}

/** Draw the photo and the person's line into the box. `cover` hides the printed dotted line with the paper colour. */
export async function renderLetter(
  img: HTMLImageElement, box: NameBox | null, template: string, vars: LetterVars, cover = true,
  canvas: HTMLCanvasElement = document.createElement("canvas"), maxWidth = 1600, fontCss = "Mukta", ink = "#111",
): Promise<HTMLCanvasElement> {
  await ensureFont(vars.name || "");
  if (fontCss !== "Mukta") await document.fonts.load(`700 40px ${fontCss}`, vars.name || "अ").catch(() => undefined);
  const scale = Math.min(1, maxWidth / img.naturalWidth);
  const W = Math.round(img.naturalWidth * scale), H = Math.round(img.naturalHeight * scale);
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, W, H);
  if (box) {
    const bx = box.x * W, by = box.y * H, bw = box.w * W, bh = box.h * H;
    if (cover) { ctx.fillStyle = sampleColor(ctx, bx - 10, by + bh / 2); ctx.fillRect(bx, by, bw, bh); }
    const text = fillTemplate(template || DEFAULT_BOX_TEMPLATE, vars);
    let size = Math.max(10, bh * 0.82);
    ctx.textBaseline = "middle";
    ctx.fillStyle = ink;
    do { ctx.font = `700 ${size}px ${fontCss}, "Noto Sans Devanagari", sans-serif`; size -= 1; }
    while (ctx.measureText(text).width > bw * 0.99 && size > 8);
    ctx.fillText(text, bx + 2, by + bh / 2 + size * 0.04, bw);
  }
  return canvas;
}

export const canvasToBlob = (canvas: HTMLCanvasElement, type = "image/jpeg", q = 0.9) =>
  new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("फोटो बनाई नहीं जा सकी।"))), type, q));
