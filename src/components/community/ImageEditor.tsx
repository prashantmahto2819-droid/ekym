// फोटो संपादक (पोस्ट और स्टोरी के लिए): काटना (crop, तय अनुपात या खुला), घुमाना, फ़िल्टर, स्टिकर / इमोजी और लिखावट।
// सब कुछ ब्राउज़र में canvas पर होता है; "लगाएँ" दबाने पर नई JPEG फ़ाइल लौटती है (लंबी भुजा ≤ maxSide)।
import { Check, Crop, RotateCw, Smile, Trash2, Type, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type PointerEvent as RPE, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Rect = { x: number; y: number; w: number; h: number };            // 0..1, घुमाई हुई फोटो के हिसाब से
type Layer = { id: number; kind: "text" | "emoji"; text: string; x: number; y: number; size: number; color: string; bg: boolean }; // x,y = केंद्र, 0..1 कटे हिस्से में; size = चौड़ाई का अंश
type Mode = "crop" | "decorate";

const ASPECTS: [string, string, number | null][] = [["खुला", "Free", null], ["1:1", "1:1", 1], ["4:5", "4:5", 4 / 5], ["9:16", "9:16", 9 / 16], ["16:9", "16:9", 16 / 9], ["3:4", "3:4", 3 / 4]];
const FILTERS: [string, string, string][] = [["मूल", "Original", "none"], ["चमक", "Bright", "brightness(1.15) contrast(1.05)"], ["गरम", "Warm", "sepia(0.25) saturate(1.2)"], ["ठंडा", "Cool", "hue-rotate(-12deg) saturate(1.1)"], ["गहरा", "Vivid", "contrast(1.2) saturate(1.35)"], ["श्वेत-श्याम", "B&W", "grayscale(1)"]];
const EMOJIS = ["🙏", "❤️", "🎉", "🎂", "🪔", "🌸", "🌺", "🌼", "✨", "⭐", "🔥", "👍", "😊", "😂", "😍", "🥳", "💐", "🕉️", "🚩", "🇮🇳", "🎊", "💯", "👏", "🙌", "😢", "💪", "🏆", "📿", "🛕", "☀️"];
const COLORS = ["#ffffff", "#111111", "#facc15", "#ef4444", "#22c55e", "#3b82f6", "#a855f7", "#f97316"];

async function loadImage(src: File | string): Promise<HTMLImageElement> {
  const url = typeof src === "string" ? src : URL.createObjectURL(src);
  const img = new Image();
  if (typeof src === "string") img.crossOrigin = "anonymous";
  img.src = url;
  await img.decode();
  return img;
}

function rotated(img: HTMLImageElement, rot: number, max = 2400): HTMLCanvasElement {
  const sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * sc), h = Math.round(img.naturalHeight * sc);
  const c = document.createElement("canvas");
  const side = rot % 180 !== 0;
  c.width = side ? h : w; c.height = side ? w : h;
  const ctx = c.getContext("2d")!;
  ctx.translate(c.width / 2, c.height / 2); ctx.rotate((rot * Math.PI) / 180); ctx.drawImage(img, -w / 2, -h / 2, w, h);
  return c;
}

function drawLayer(ctx: CanvasRenderingContext2D, l: Layer, W: number, H: number) {
  const fs = Math.max(8, l.size * W);
  ctx.save();
  ctx.font = `${l.kind === "text" ? "700 " : ""}${fs}px "Mukta", "Noto Sans Devanagari", "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const lines = l.text.split("\n");
  const lh = fs * 1.2, cx = l.x * W, cy = l.y * H, top = cy - (lh * lines.length) / 2 + lh / 2;
  if (l.kind === "text" && l.bg) {
    const wMax = Math.max(...lines.map((t) => ctx.measureText(t).width));
    const pad = fs * 0.35; ctx.fillStyle = l.color === "#ffffff" ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.85)";
    const x0 = cx - wMax / 2 - pad, y0 = cy - (lh * lines.length) / 2 - pad * 0.6, ww = wMax + pad * 2, hh = lh * lines.length + pad * 1.2, r = fs * 0.3;
    ctx.beginPath(); ctx.moveTo(x0 + r, y0); ctx.arcTo(x0 + ww, y0, x0 + ww, y0 + hh, r); ctx.arcTo(x0 + ww, y0 + hh, x0, y0 + hh, r); ctx.arcTo(x0, y0 + hh, x0, y0, r); ctx.arcTo(x0, y0, x0 + ww, y0, r); ctx.fill();
  }
  if (l.kind === "text" && !l.bg) { ctx.shadowColor = "rgba(0,0,0,0.55)"; ctx.shadowBlur = fs * 0.12; }
  ctx.fillStyle = l.color;
  lines.forEach((t, i) => ctx.fillText(t, cx, top + i * lh));
  ctx.restore();
}

export function ImageEditor({ src, L, onClose, onDone, defaultAspect = null, maxSide = 1600 }: { src: File | string; L: boolean; onClose: () => void; onDone: (f: File) => void; defaultAspect?: number | null; maxSide?: number }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [rot, setRot] = useState(0);
  const [aspect, setAspect] = useState<number | null>(defaultAspect);
  const [crop, setCrop] = useState<Rect>({ x: 0, y: 0, w: 1, h: 1 });
  const [filter, setFilter] = useState("none");
  const [layers, setLayers] = useState<Layer[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("crop");
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const [boxW, setBoxW] = useState(480);
  const drag = useRef<null | { kind: string; sx: number; sy: number; r: Rect; l?: Layer }>(null);
  const nextId = useRef(1);

  useEffect(() => { let off = false; loadImage(src).then((i) => { if (!off) setImg(i); }).catch(() => setErr(L ? "फोटो नहीं खुल सकी" : "Could not open the photo")); return () => { off = true; }; }, [src, L]);
  useEffect(() => { const el = boxRef.current; if (!el) return; const ro = new ResizeObserver(() => setBoxW(el.clientWidth)); ro.observe(el); setBoxW(el.clientWidth); return () => ro.disconnect(); }, [img]);

  const base = useMemo(() => (img ? rotated(img, rot) : null), [img, rot]);
  const BW = base?.width ?? 1, BH = base?.height ?? 1;
  // अनुपात बदलने / घुमाने पर बीच में सबसे बड़ा हिस्सा
  useEffect(() => {
    if (!base) return;
    if (aspect == null) { setCrop({ x: 0, y: 0, w: 1, h: 1 }); return; }
    let w = 1, h = (BW / aspect) / BH;
    if (h > 1) { h = 1; w = (BH * aspect) / BW; }
    setCrop({ x: (1 - w) / 2, y: (1 - h) / 2, w, h });
  }, [aspect, base, BW, BH]);

  const maxH = typeof window !== "undefined" ? Math.round(window.innerHeight * 0.55) : 500;
  // crop mode: पूरी फोटो; decorate mode: कटा हिस्सा
  const viewW = mode === "crop" ? BW : BW * crop.w, viewH = mode === "crop" ? BH : BH * crop.h;
  const sc = Math.min(boxW / viewW, maxH / viewH);
  const dispW = Math.max(1, Math.round(viewW * sc)), dispH = Math.max(1, Math.round(viewH * sc));

  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvasRef.current; if (!c || !base) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = dispW * dpr; c.height = dispH * dpr;
    const ctx = c.getContext("2d")!; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.filter = filter;
    if (mode === "crop") ctx.drawImage(base, 0, 0, dispW, dispH);
    else ctx.drawImage(base, crop.x * BW, crop.y * BH, crop.w * BW, crop.h * BH, 0, 0, dispW, dispH);
  }, [base, mode, dispW, dispH, crop, filter, BW, BH]);

  function down(e: RPE, kind: string, l?: Layer) {
    e.preventDefault(); e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { kind, sx: e.clientX, sy: e.clientY, r: { ...crop }, ...(l ? { l: { ...l } } : {}) };
    if (l) setSel(l.id);
  }
  function move(e: RPE) {
    const d = drag.current; if (!d) return;
    const dx = (e.clientX - d.sx) / dispW, dy = (e.clientY - d.sy) / dispH;
    if (d.l) { const l0 = d.l; setLayers((ls) => ls.map((l) => (l.id === l0.id ? { ...l, x: Math.min(1, Math.max(0, l0.x + dx)), y: Math.min(1, Math.max(0, l0.y + dy)) } : l))); return; }
    const r = d.r; const min = 0.06;
    if (d.kind === "move") { setCrop({ ...r, x: Math.min(1 - r.w, Math.max(0, r.x + dx)), y: Math.min(1 - r.h, Math.max(0, r.y + dy)) }); return; }
    const left = d.kind.includes("w"), top = d.kind.includes("n");
    let x = r.x, y = r.y, w = r.w, h = r.h;
    if (left) { x = Math.min(r.x + r.w - min, Math.max(0, r.x + dx)); w = r.x + r.w - x; } else w = Math.min(1 - r.x, Math.max(min, r.w + dx));
    if (aspect == null) {
      if (top) { y = Math.min(r.y + r.h - min, Math.max(0, r.y + dy)); h = r.y + r.h - y; } else h = Math.min(1 - r.y, Math.max(min, r.h + dy));
    } else {
      h = (w * BW) / aspect / BH;
      if (top) y = r.y + r.h - h;
      if (y < 0 || y + h > 1) { // सीमा पर रुकें
        h = top ? r.y + r.h : 1 - r.y; w = (h * BH * aspect) / BW; if (left) x = r.x + r.w - w; y = top ? r.y + r.h - h : r.y;
      }
    }
    setCrop({ x, y, w, h });
  }
  function up() { drag.current = null; }

  function addLayer(kind: Layer["kind"], text: string) {
    const id = nextId.current++;
    setLayers((ls) => [...ls, { id, kind, text, x: 0.5, y: kind === "text" ? 0.82 : 0.3 + ((ls.length * 0.12) % 0.4), size: kind === "text" ? 0.07 : 0.12, color: "#ffffff", bg: kind === "text" }]);
    setSel(id); setMode("decorate");
  }
  const cur = layers.find((l) => l.id === sel) ?? null;
  const upd = (p: Partial<Layer>) => cur && setLayers((ls) => ls.map((l) => (l.id === cur.id ? { ...l, ...p } : l)));

  async function done() {
    if (!base) return;
    setBusy(true);
    try {
      const cw = crop.w * BW, ch = crop.h * BH, k = Math.min(1, maxSide / Math.max(cw, ch));
      const W = Math.round(cw * k), H = Math.round(ch * k);
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
      ctx.filter = filter; ctx.drawImage(base, crop.x * BW, crop.y * BH, cw, ch, 0, 0, W, H); ctx.filter = "none";
      try { await document.fonts?.load(`700 32px "Mukta"`); } catch { /* फ़ॉन्ट न मिले तो भी चलेगा */ }
      for (const l of layers) if (l.text.trim()) drawLayer(ctx, l, W, H);
      const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/jpeg", 0.88));
      onDone(new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" }));
    } catch (e) {
      setErr(e instanceof Error && e.name === "SecurityError" ? (L ? "यह पुरानी फोटो यहाँ संपादित नहीं हो सकती — नई फोटो चुनकर बदलें" : "This photo can't be edited here — replace it with a new one") : (L ? "फोटो नहीं बन सकी" : "Could not create the photo"));
    } finally { setBusy(false); }
  }

  const tab = (m: Mode, icon: ReactNode, label: string) => <button type="button" onClick={() => setMode(m)} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${mode === m ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{icon}{label}</button>;
  const handle = "absolute size-4 rounded-full border-2 border-white bg-primary shadow";

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !busy) onClose(); }}>
      <DialogContent className="max-h-[96vh] max-w-2xl gap-3 overflow-y-auto p-3 sm:p-4">
        <DialogHeader><DialogTitle className="font-display">✏️ {L ? "फोटो संपादित करें" : "Edit photo"}</DialogTitle></DialogHeader>
        <div className="flex flex-wrap gap-1.5">
          {tab("crop", <Crop className="size-4" />, L ? "काटें / घुमाएँ" : "Crop / rotate")}
          {tab("decorate", <Smile className="size-4" />, L ? "स्टिकर व लिखावट" : "Stickers & text")}
        </div>
        <div ref={boxRef} className="w-full">
          {err ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">{err}</p> : null}
          {!base && !err ? <div className="h-64 animate-pulse rounded-xl bg-muted" /> : null}
          {base ? (
            <div className="relative mx-auto touch-none select-none overflow-hidden rounded-lg bg-[repeating-conic-gradient(#e5e7eb_0_25%,#fff_0_50%)] bg-[length:16px_16px]" style={{ width: dispW, height: dispH }}
              onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerDown={() => mode === "decorate" && setSel(null)}>
              <canvas ref={canvasRef} style={{ width: dispW, height: dispH }} className="block" />
              {mode === "crop" ? (
                <div className="absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
                  style={{ left: crop.x * dispW, top: crop.y * dispH, width: crop.w * dispW, height: crop.h * dispH }} onPointerDown={(e) => down(e, "move")}>
                  <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,transparent_33%,rgba(255,255,255,.5)_33%,rgba(255,255,255,.5)_calc(33%+1px),transparent_calc(33%+1px),transparent_66%,rgba(255,255,255,.5)_66%,rgba(255,255,255,.5)_calc(66%+1px),transparent_calc(66%+1px)),linear-gradient(to_bottom,transparent_33%,rgba(255,255,255,.5)_33%,rgba(255,255,255,.5)_calc(33%+1px),transparent_calc(33%+1px),transparent_66%,rgba(255,255,255,.5)_66%,rgba(255,255,255,.5)_calc(66%+1px),transparent_calc(66%+1px))]" />
                  {(["nw", "ne", "sw", "se"] as const).map((k) => <span key={k} onPointerDown={(e) => down(e, k)} className={`${handle} ${k.includes("n") ? "-top-2" : "-bottom-2"} ${k.includes("w") ? "-left-2" : "-right-2"} ${k === "nw" || k === "se" ? "cursor-nwse-resize" : "cursor-nesw-resize"}`} />)}
                </div>
              ) : layers.map((l) => (
                <span key={l.id} onPointerDown={(e) => down(e, "layer", l)}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-move whitespace-pre text-center leading-[1.2] ${sel === l.id ? "outline-dashed outline-2 outline-offset-4 outline-white" : ""}`}
                  style={{ left: l.x * dispW, top: l.y * dispH, fontSize: Math.max(8, l.size * dispW), color: l.color, fontWeight: l.kind === "text" ? 700 : 400, fontFamily: '"Mukta", sans-serif',
                    ...(l.kind === "text" && l.bg ? { background: l.color === "#ffffff" ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.85)", padding: "0.15em 0.35em", borderRadius: "0.3em" } : l.kind === "text" ? { textShadow: "0 1px 6px rgba(0,0,0,.6)" } : {}) }}>{l.text || " "}</span>
              ))}
            </div>
          ) : null}
        </div>

        {mode === "crop" ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{L ? "अनुपात:" : "Ratio:"}</span>
              {ASPECTS.map(([hi, en, a]) => <button key={en} type="button" onClick={() => setAspect(a)} className={`rounded-full border px-2.5 py-1 text-xs ${aspect === a ? "border-primary bg-primary/10 font-semibold text-primary" : "border-border"}`}>{L ? hi : en}</button>)}
              <Button type="button" size="sm" variant="outline" className="ml-auto" onClick={() => setRot((r) => (r + 90) % 360)}><RotateCw className="size-4" /> {L ? "घुमाएँ" : "Rotate"}</Button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{L ? "रंग-रूप:" : "Filter:"}</span>
              {FILTERS.map(([hi, en, f]) => <button key={en} type="button" onClick={() => setFilter(f)} className={`rounded-full border px-2.5 py-1 text-xs ${filter === f ? "border-primary bg-primary/10 font-semibold text-primary" : "border-border"}`}>{L ? hi : en}</button>)}
            </div>
            <p className="text-xs text-muted-foreground">{L ? "सफ़ेद डिब्बे को खिसकाएँ, कोनों से छोटा-बड़ा करें।" : "Drag the box; resize from the corners."}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              <Button type="button" size="sm" onClick={() => addLayer("text", L ? "यहाँ लिखें" : "Your text")}><Type className="size-4" /> {L ? "लिखावट जोड़ें" : "Add text"}</Button>
            </div>
            <div className="flex flex-wrap gap-1">{EMOJIS.map((e) => <button key={e} type="button" onClick={() => addLayer("emoji", e)} className="grid size-9 place-items-center rounded-lg text-xl hover:bg-secondary">{e}</button>)}</div>
            {cur ? (
              <div className="space-y-2 rounded-xl border border-border p-2.5">
                {cur.kind === "text" ? <Input value={cur.text} onChange={(e) => upd({ text: e.target.value })} maxLength={120} placeholder={L ? "लिखें" : "Type"} /> : null}
                <label className="flex items-center gap-2 text-xs">{L ? "आकार" : "Size"}<input type="range" min={0.03} max={0.35} step={0.005} value={cur.size} onChange={(e) => upd({ size: Number(e.target.value) })} className="flex-1" /></label>
                {cur.kind === "text" ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {COLORS.map((c) => <button key={c} type="button" aria-label={c} onClick={() => upd({ color: c })} className={`size-7 rounded-full border ${cur.color === c ? "ring-2 ring-primary ring-offset-1" : ""}`} style={{ background: c }} />)}
                    <label className="ml-2 flex items-center gap-1 text-xs"><input type="checkbox" checked={cur.bg} onChange={(e) => upd({ bg: e.target.checked })} /> {L ? "पीछे पट्टी" : "Background"}</label>
                  </div>
                ) : null}
                <Button type="button" size="sm" variant="ghost" className="text-red-600" onClick={() => { setLayers((ls) => ls.filter((l) => l.id !== cur.id)); setSel(null); }}><Trash2 className="size-4" /> {L ? "हटाएँ" : "Remove"}</Button>
              </div>
            ) : <p className="text-xs text-muted-foreground">{L ? "स्टिकर या लिखावट को उँगली / माउस से खिसकाएँ; बदलने के लिए उस पर टैप करें।" : "Drag stickers and text; tap one to change it."}</p>}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}><X className="size-4" /> {L ? "रद्द" : "Cancel"}</Button>
          <Button type="button" onClick={() => void done()} disabled={busy || !base}><Check className="size-4" /> {busy ? "…" : L ? "लगाएँ" : "Apply"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
