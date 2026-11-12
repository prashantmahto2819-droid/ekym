// Matrimony biodata card renderer (browser canvas): 5 templates, accent colour, chosen fields, photo shape, sizes
// (WhatsApp story 1080×1920, portrait 1080×1350, A4 1240×1754), QR code to the profile's share page. JPG / PDF export.
import { PDFDocument } from "pdf-lib";
import QRCode from "qrcode";

export type FieldKey = "age" | "height" | "education" | "profession" | "income" | "city" | "gotra" | "native" | "created_for" | "interests" | "about" | "expectations" | "special_note";
export type CardOpts = {
  template: string; accent?: string | undefined; lang: "hi" | "en"; headline?: string | undefined; invocation: boolean;
  photoShape: "circle" | "rounded" | "arch"; fields: Partial<Record<FieldKey, boolean>>; extraPhotos: boolean; showContact: boolean;
  size: "story" | "portrait" | "a4"; font: "tiro" | "mukta" | "notoserif"; footerNote?: string | undefined;
};
export type CardData = {
  name: string; gender: string; birth_year: number; height_cm: number | null; education: string | null; profession: string | null; income_range: string | null;
  city: string | null; district: string | null; gotra: string | null; native_place: string | null; created_for: string | null; interests: string | null;
  about: string | null; expectations: string | null; special_note: string | null; contact_phone: string | null; org: string | null;
  photos: string[]; qrUrl: string | null;
};

export const DEFAULT_FIELDS: Record<FieldKey, boolean> = { age: true, height: true, education: true, profession: true, income: false, city: true, gotra: true, native: true, created_for: false, interests: true, about: true, expectations: true, special_note: false };
export const DEFAULT_OPTS: CardOpts = { template: "royal", lang: "hi", invocation: true, photoShape: "circle", fields: DEFAULT_FIELDS, extraPhotos: true, showContact: false, size: "story", font: "tiro" };

type Tpl = { id: string; name: string; name_hi: string; bg: [string, string]; ink: string; sub: string; accent: string; panel: string; border: "ornate" | "double" | "floral" | "line" | "none" };
export const TEMPLATES: Tpl[] = [
  { id: "royal", name: "Royal maroon", name_hi: "शाही मैरून", bg: ["#5b0f1a", "#8b1e2d"], ink: "#fff7e6", sub: "#f3d9a4", accent: "#d4a64a", panel: "rgba(0,0,0,0.18)", border: "ornate" },
  { id: "floral", name: "Floral rose", name_hi: "गुलाबी फूल", bg: ["#fff1f2", "#ffe4e6"], ink: "#3f1d24", sub: "#7c2d3a", accent: "#be123c", panel: "rgba(255,255,255,0.65)", border: "floral" },
  { id: "classic", name: "Classic ivory", name_hi: "क्लासिक हाथीदाँत", bg: ["#fffaf0", "#f8efd9"], ink: "#1f2937", sub: "#57534e", accent: "#b8924a", panel: "rgba(255,255,255,0.7)", border: "double" },
  { id: "saffron", name: "Saffron festive", name_hi: "केसरिया उत्सव", bg: ["#fff7ed", "#fdba74"], ink: "#431407", sub: "#7c2d12", accent: "#c2410c", panel: "rgba(255,255,255,0.55)", border: "ornate" },
  { id: "modern", name: "Modern navy", name_hi: "आधुनिक नीला", bg: ["#0f172a", "#1e3a8a"], ink: "#f8fafc", sub: "#cbd5e1", accent: "#38bdf8", panel: "rgba(255,255,255,0.08)", border: "line" },
];
export const SIZES = { story: [1080, 1920], portrait: [1080, 1350], a4: [1240, 1754] } as const;
const FONT_CSS = { tiro: '"Tiro Devanagari Hindi"', mukta: "Mukta", notoserif: '"Noto Serif Devanagari"' } as const;

type Labels = { headline: string; inv: string; age: string; height: string; education: string; profession: string; income: string; city: string; gotra: string; native: string; created_for: string; interests: string; about: string; expectations: string; special_note: string; contact: string; years: string; groom: string; bride: string; scan: string; via: string };
const LBL: Record<"hi" | "en", Labels> = {
  hi: { headline: "शुभ विवाह हेतु परिचय", inv: "॥ श्री गणेशाय नमः ॥", age: "आयु", height: "कद", education: "शिक्षा", profession: "व्यवसाय", income: "आय", city: "निवास", gotra: "गोत्र", native: "मूल ग्राम", created_for: "प्रोफ़ाइल", interests: "रुचियाँ", about: "परिचय", expectations: "अपेक्षाएँ", special_note: "विशेष", contact: "संपर्क", years: "वर्ष", groom: "वर", bride: "वधू", scan: "स्कैन करें — पूरा परिचय देखें", via: "Kalchuri One · kalchuri.org" },
  en: { headline: "Marriage Biodata", inv: "|| Shri Ganeshaya Namah ||", age: "Age", height: "Height", education: "Education", profession: "Profession", income: "Income", city: "Lives in", gotra: "Gotra", native: "Native place", created_for: "Profile for", interests: "Interests", about: "About", expectations: "Looking for", special_note: "Note", contact: "Contact", years: "yrs", groom: "Groom", bride: "Bride", scan: "Scan to view the full profile", via: "Kalchuri One · kalchuri.org" },
};

const ft = (cm: number) => { const inch = Math.round(cm / 2.54); return `${Math.floor(inch / 12)}'${inch % 12}"`; };

async function loadImg(src: string): Promise<HTMLImageElement | null> {
  if (!src) return null;
  try {
    const r = await fetch(src, { mode: "cors" }); if (!r.ok) return null;
    const url = URL.createObjectURL(await r.blob());
    return await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = url; });
  } catch { return null; }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split(/\n+/)) {
    let line = "";
    for (const w of para.split(/\s+/)) {
      const t = line ? `${line} ${w}` : w;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
    }
    if (line) out.push(line);
  }
  return out;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function drawBorder(ctx: CanvasRenderingContext2D, W: number, H: number, t: Tpl, accent: string) {
  const m = W * 0.03;
  ctx.save(); ctx.strokeStyle = accent;
  if (t.border === "ornate" || t.border === "double") {
    ctx.lineWidth = W * 0.006; ctx.strokeRect(m, m, W - 2 * m, H - 2 * m);
    ctx.lineWidth = W * 0.002; ctx.strokeRect(m * 1.6, m * 1.6, W - 3.2 * m, H - 3.2 * m);
  }
  if (t.border === "ornate") {
    // corner flourishes: quarter circles + dots
    const r = W * 0.07;
    for (const [cx, cy, a0] of [[m * 1.6, m * 1.6, 0], [W - m * 1.6, m * 1.6, Math.PI / 2], [W - m * 1.6, H - m * 1.6, Math.PI], [m * 1.6, H - m * 1.6, Math.PI * 1.5]] as const) {
      ctx.lineWidth = W * 0.004; ctx.beginPath(); ctx.arc(cx, cy, r, a0, a0 + Math.PI / 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.6, a0, a0 + Math.PI / 2); ctx.stroke();
      ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(cx + Math.cos(a0 + Math.PI / 4) * r * 0.8, cy + Math.sin(a0 + Math.PI / 4) * r * 0.8, W * 0.008, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (t.border === "floral") {
    ctx.lineWidth = W * 0.004; roundRect(ctx, m, m, W - 2 * m, H - 2 * m, W * 0.04); ctx.stroke();
    const petals = (cx: number, cy: number, s: number) => { for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; ctx.globalAlpha = 0.55; ctx.fillStyle = accent; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * s, cy + Math.sin(a) * s, s * 0.9, s * 0.45, a, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; ctx.fillStyle = "#f59e0b"; ctx.beginPath(); ctx.arc(cx, cy, s * 0.45, 0, Math.PI * 2); ctx.fill(); };
    const s = W * 0.028;
    petals(m + s * 1.5, m + s * 1.5, s); petals(W - m - s * 1.5, m + s * 1.5, s); petals(m + s * 1.5, H - m - s * 1.5, s); petals(W - m - s * 1.5, H - m - s * 1.5, s);
  }
  if (t.border === "line") { ctx.lineWidth = W * 0.003; ctx.globalAlpha = 0.6; roundRect(ctx, m, m, W - 2 * m, H - 2 * m, W * 0.03); ctx.stroke(); }
  ctx.restore();
}

function divider(ctx: CanvasRenderingContext2D, cx: number, y: number, w: number, accent: string) {
  ctx.save(); ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx - w / 2, y); ctx.lineTo(cx - 14, y); ctx.moveTo(cx + 14, y); ctx.lineTo(cx + w / 2, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, y - 8); ctx.lineTo(cx + 8, y); ctx.lineTo(cx, y + 8); ctx.lineTo(cx - 8, y); ctx.closePath(); ctx.fill();
  ctx.restore();
}

export async function renderCard(d: CardData, o: CardOpts): Promise<HTMLCanvasElement> {
  const [W, H] = SIZES[o.size];
  const t = TEMPLATES.find((x) => x.id === o.template) ?? TEMPLATES[0]!;
  const accent = o.accent || t.accent;
  const L = LBL[o.lang];
  const font = FONT_CSS[o.font] ?? FONT_CSS.tiro;
  if (typeof document !== "undefined" && "fonts" in document) {
    await Promise.all([font, "Mukta"].flatMap((f) => [400, 700].map((w) => document.fonts.load(`${w} 40px ${f}`, "अआक Ab")))).catch(() => undefined);
  }
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, W * 0.4, H); g.addColorStop(0, t.bg[0]); g.addColorStop(1, t.bg[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // soft pattern
  ctx.save(); ctx.globalAlpha = 0.06; ctx.fillStyle = accent;
  for (let y = 0; y < H; y += W * 0.09) for (let x = (y / (W * 0.09)) % 2 ? W * 0.045 : 0; x < W; x += W * 0.09) { ctx.beginPath(); ctx.arc(x, y, W * 0.006, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  drawBorder(ctx, W, H, t, accent);

  const pad = W * 0.09; const cx = W / 2; let y = W * 0.1;
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  if (o.invocation) { ctx.fillStyle = accent; ctx.font = `600 ${W * 0.03}px ${font}, Mukta, sans-serif`; ctx.fillText(L.inv, cx, y); y += W * 0.055; }
  ctx.fillStyle = t.ink; ctx.font = `700 ${W * 0.058}px ${font}, Mukta, sans-serif`;
  ctx.fillText(o.headline?.trim() || L.headline, cx, y); y += W * 0.035;
  divider(ctx, cx, y, W * 0.5, accent); y += W * 0.05;

  // main photo
  const imgs = (await Promise.all(d.photos.slice(0, o.extraPhotos ? 4 : 1).map(loadImg))).filter((x): x is HTMLImageElement => !!x);
  const ph = o.size === "portrait" ? W * 0.3 : W * 0.38;
  if (imgs[0]) {
    const im = imgs[0]; const px = cx - ph / 2, py = y;
    ctx.save();
    if (o.photoShape === "circle") { ctx.beginPath(); ctx.arc(cx, py + ph / 2, ph / 2, 0, Math.PI * 2); ctx.closePath(); }
    else if (o.photoShape === "arch") { ctx.beginPath(); ctx.moveTo(px, py + ph * 1.15); ctx.lineTo(px, py + ph / 2); ctx.arc(cx, py + ph / 2, ph / 2, Math.PI, 0); ctx.lineTo(px + ph, py + ph * 1.15); ctx.closePath(); }
    else roundRect(ctx, px, py, ph, ph * 1.15, W * 0.03);
    ctx.clip();
    const boxH = o.photoShape === "circle" ? ph : ph * 1.15; const s = Math.max(ph / im.width, boxH / im.height);
    ctx.drawImage(im, cx - (im.width * s) / 2, py + boxH / 2 - (im.height * s) / 2, im.width * s, im.height * s);
    ctx.restore();
    ctx.save(); ctx.strokeStyle = accent; ctx.lineWidth = W * 0.008;
    if (o.photoShape === "circle") { ctx.beginPath(); ctx.arc(cx, py + ph / 2, ph / 2 + W * 0.006, 0, Math.PI * 2); ctx.stroke(); }
    else if (o.photoShape === "arch") { ctx.beginPath(); ctx.moveTo(px - 4, py + ph * 1.15 + 4); ctx.lineTo(px - 4, py + ph / 2); ctx.arc(cx, py + ph / 2, ph / 2 + 4, Math.PI, 0); ctx.lineTo(px + ph + 4, py + ph * 1.15 + 4); ctx.closePath(); ctx.stroke(); }
    else { roundRect(ctx, px - 4, py - 4, ph + 8, ph * 1.15 + 8, W * 0.034); ctx.stroke(); }
    ctx.restore();
    y += (o.photoShape === "circle" ? ph : ph * 1.15) + W * 0.07;
  }

  // name + line
  ctx.fillStyle = t.ink; ctx.font = `700 ${W * 0.07}px ${font}, Mukta, sans-serif`; ctx.fillText(d.name, cx, y); y += W * 0.045;
  const age = new Date().getFullYear() - d.birth_year;
  ctx.fillStyle = t.sub; ctx.font = `500 ${W * 0.033}px Mukta, sans-serif`;
  ctx.fillText([d.gender === "female" ? L.bride : L.groom, `${age} ${L.years}`, d.height_cm ? ft(d.height_cm) : null, d.city].filter(Boolean).join("  •  "), cx, y);
  y += W * 0.05;

  // details panel
  const rows: [string, string][] = [];
  const F = { ...DEFAULT_FIELDS, ...o.fields };
  if (F.age) rows.push([L.age, `${age} ${L.years} (${d.birth_year})`]);
  if (F.height && d.height_cm) rows.push([L.height, `${ft(d.height_cm)} (${d.height_cm} cm)`]);
  if (F.education && d.education) rows.push([L.education, d.education]);
  if (F.profession && d.profession) rows.push([L.profession, d.profession]);
  if (F.income && d.income_range) rows.push([L.income, d.income_range]);
  if (F.city && (d.city || d.district)) rows.push([L.city, [d.city, d.district].filter(Boolean).join(", ")]);
  if (F.gotra && d.gotra) rows.push([L.gotra, d.gotra]);
  if (F.native && d.native_place) rows.push([L.native, d.native_place]);
  if (F.created_for && d.created_for) rows.push([L.created_for, d.created_for]);
  if (F.interests && d.interests) rows.push([L.interests, d.interests]);
  if (o.showContact && d.contact_phone) rows.push([L.contact, `+${d.contact_phone.replace(/\D/g, "")}`]);
  const paras: [string, string][] = [];
  if (F.about && d.about) paras.push([L.about, d.about]);
  if (F.expectations && d.expectations) paras.push([L.expectations, d.expectations]);
  if (F.special_note && d.special_note) paras.push([L.special_note, d.special_note]);

  const footerH = d.qrUrl ? W * 0.26 : W * 0.1;
  const extraH = o.extraPhotos && imgs.length > 1 ? W * 0.2 : 0;
  const panelX = pad * 0.85, panelW = W - panelX * 2;
  const rowFs = W * 0.031, lh = rowFs * 1.55, labelW = panelW * 0.32;
  ctx.font = `500 ${rowFs}px Mukta, sans-serif`;
  const rowLines = rows.map(([, v]) => wrap(ctx, v, panelW - labelW - W * 0.06));
  const paraFs = W * 0.029; ctx.font = `400 ${paraFs}px Mukta, sans-serif`;
  const avail = H - y - footerH - extraH - W * 0.08;
  const rowsH = rowLines.reduce((a, l) => a + Math.max(1, l.length) * lh, 0) + W * 0.04;
  let paraBudget = Math.max(0, avail - rowsH - W * 0.03);
  const paraLines = paras.map(([, v]) => wrap(ctx, v, panelW - W * 0.06));
  const paraH = paraLines.reduce((a, l) => a + paraFs * 1.4 + Math.min(l.length, 6) * paraFs * 1.45 + W * 0.015, 0);
  const panelH = Math.min(avail, rowsH + (paras.length ? Math.min(paraH, paraBudget) + W * 0.02 : 0));
  ctx.save(); ctx.fillStyle = t.panel; roundRect(ctx, panelX, y, panelW, panelH, W * 0.025); ctx.fill();
  ctx.strokeStyle = accent; ctx.globalAlpha = 0.5; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  let ry = y + W * 0.035 + rowFs;
  ctx.textAlign = "left";
  rows.forEach(([k], i) => {
    const lines = rowLines[i]!;
    if (ry + (lines.length - 1) * lh > y + panelH - W * 0.01) return;
    ctx.fillStyle = accent; ctx.font = `700 ${rowFs}px Mukta, sans-serif`; ctx.fillText(k, panelX + W * 0.03, ry);
    ctx.fillStyle = t.ink; ctx.font = `500 ${rowFs}px Mukta, sans-serif`;
    lines.forEach((ln, j) => ctx.fillText(ln, panelX + labelW, ry + j * lh));
    ry += Math.max(1, lines.length) * lh;
  });
  ry += W * 0.01;
  paras.forEach(([k], i) => {
    if (paraBudget <= paraFs * 3) return;
    ctx.fillStyle = accent; ctx.font = `700 ${paraFs}px Mukta, sans-serif`; ctx.fillText(k, panelX + W * 0.03, ry); ry += paraFs * 1.45; paraBudget -= paraFs * 1.45;
    ctx.fillStyle = t.ink; ctx.font = `400 ${paraFs}px Mukta, sans-serif`;
    const lines = paraLines[i]!; const maxL = Math.max(1, Math.min(lines.length, 6, Math.floor((paraBudget - W * 0.015) / (paraFs * 1.45))));
    lines.slice(0, maxL).forEach((ln, j) => ctx.fillText(j === maxL - 1 && lines.length > maxL ? ln.replace(/\s*\S*$/, " …") : ln, panelX + W * 0.03, ry + j * paraFs * 1.45));
    ry += maxL * paraFs * 1.45 + W * 0.015; paraBudget -= maxL * paraFs * 1.45 + W * 0.015;
  });
  y += panelH + W * 0.03;

  // extra photos strip
  if (extraH && imgs.length > 1) {
    const n = imgs.length - 1, s = Math.min(W * 0.17, (panelW - (n - 1) * W * 0.02) / n);
    let x = cx - (n * s + (n - 1) * W * 0.02) / 2;
    for (const im of imgs.slice(1)) {
      ctx.save(); roundRect(ctx, x, y, s, s, W * 0.02); ctx.clip();
      const sc = Math.max(s / im.width, s / im.height); ctx.drawImage(im, x + s / 2 - (im.width * sc) / 2, y + s / 2 - (im.height * sc) / 2, im.width * sc, im.height * sc);
      ctx.restore(); ctx.strokeStyle = accent; ctx.lineWidth = 3; roundRect(ctx, x, y, s, s, W * 0.02); ctx.stroke();
      x += s + W * 0.02;
    }
  }

  // footer: QR + org
  const fy = H - footerH - W * 0.04;
  if (d.qrUrl) {
    const qs = W * 0.2; const qx = panelX + W * 0.02, qy = fy + (footerH - qs) / 2;
    const qc = document.createElement("canvas");
    await QRCode.toCanvas(qc, d.qrUrl, { margin: 1, width: Math.round(qs), color: { dark: "#111111", light: "#ffffff" }, errorCorrectionLevel: "M" });
    ctx.save(); ctx.fillStyle = "#ffffff"; roundRect(ctx, qx - 8, qy - 8, qs + 16, qs + 16, 14); ctx.fill(); ctx.restore();
    ctx.drawImage(qc, qx, qy, qs, qs);
    ctx.textAlign = "left"; ctx.fillStyle = t.ink; ctx.font = `700 ${W * 0.032}px Mukta, sans-serif`;
    const tx = qx + qs + W * 0.04; let ty = qy + W * 0.05;
    for (const ln of wrap(ctx, L.scan, W - tx - pad)) { ctx.fillText(ln, tx, ty); ty += W * 0.04; }
    ctx.fillStyle = t.sub; ctx.font = `500 ${W * 0.026}px Mukta, sans-serif`;
    if (d.org) { for (const ln of wrap(ctx, d.org, W - tx - pad).slice(0, 2)) { ctx.fillText(ln, tx, ty); ty += W * 0.034; } }
    ctx.fillStyle = accent; ctx.fillText(o.footerNote?.trim() || L.via, tx, ty);
  } else {
    ctx.textAlign = "center"; ctx.fillStyle = t.sub; ctx.font = `500 ${W * 0.026}px Mukta, sans-serif`;
    ctx.fillText([d.org, o.footerNote?.trim() || L.via].filter(Boolean).join(" · "), cx, fy + footerH / 2);
  }
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
