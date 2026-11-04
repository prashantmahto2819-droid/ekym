// Template editor: canvas + toolbar + layer list + property panel, with undo/redo.
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Lock, Plus, Redo2, Trash2, Undo2, Unlock } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cleanDoc, FONTS, PAGE_PRESETS, pageCount, uid, mm, type DesignDoc, type Layer, type LayerInput, type MergeData, type ArtName, type FontKey } from "@/design-engine";

import { DesignCanvas } from "./DesignCanvas";

const ARTS: ArtName[] = ["divider", "ornament", "om", "lotus", "flower", "leaf", "garland", "diya"];
const sel = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm";

export function StudioEditor({ initial, data, onSave, saving }: { initial: DesignDoc; data: MergeData; onSave: (doc: DesignDoc) => void; saving?: boolean }) {
  const [doc, setDocState] = useState<DesignDoc>(initial);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [onMaster, setOnMaster] = useState(false);
  const [preview, setPreview] = useState(true);
  const history = useRef<{ past: DesignDoc[]; future: DesignDoc[] }>({ past: [], future: [] });
  const wrapRef = useRef<HTMLDivElement>(null);
  const [wrapW, setWrapW] = useState(600);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWrapW(el.clientWidth));
    ro.observe(el);
    setWrapW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const setDoc = useCallback((next: DesignDoc | ((d: DesignDoc) => DesignDoc), record = true) => {
    setDocState((prev) => {
      const n = typeof next === "function" ? next(prev) : next;
      if (record) { history.current.past.push(prev); if (history.current.past.length > 60) history.current.past.shift(); history.current.future = []; }
      return n;
    });
  }, []);
  const undo = () => { const p = history.current.past.pop(); if (p) { history.current.future.push(doc); setDocState(p); } };
  const redo = () => { const f = history.current.future.pop(); if (f) { history.current.past.push(doc); setDocState(f); } };

  const layers = onMaster ? doc.master : (doc.pages[page]?.layers ?? []);
  const layer = useMemo(() => [...doc.master, ...doc.pages.flatMap((p) => p.layers)].find((l) => l.id === selected) ?? null, [doc, selected]);
  const isMasterLayer = !!layer && doc.master.some((l) => l.id === layer.id);

  function updateLayer(id: string, patch: Partial<Layer>, record = true) {
    setDoc((d) => ({
      ...d,
      master: d.master.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l)),
      pages: d.pages.map((p) => ({ ...p, layers: p.layers.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l)) })),
    }), record);
  }
  function setLayers(fn: (ls: Layer[]) => Layer[]) {
    setDoc((d) => (onMaster ? { ...d, master: fn(d.master) } : { ...d, pages: d.pages.map((p, i) => (i === page ? { ...p, layers: fn(p.layers) } : p)) }));
  }
  function add(l: LayerInput) {
    const L = { ...l, id: uid() } as Layer;
    setLayers((ls) => [...ls, L]);
    setSelected(L.id);
  }
  const cx = Math.round(mm(doc.wMm) / 2), cy = Math.round(mm(doc.hMm) / 2);
  const addText = () => add({ type: "text", name: "Text", text: "New text", x: cx - 120, y: cy - 10, w: 240, h: 24, size: 14, font: "manrope", color: "#1b2a4a", lh: 20 });
  const addHeading = () => add({ type: "text", name: "Heading", text: "**Heading**", x: cx - 160, y: cy - 20, w: 320, h: 36, size: 24, font: "sora", weight: 700, color: "#1b2a4a", align: "center", lh: 32 });
  const addField = (key: string) => add({ type: "text", name: key, text: `{{${key}}}`, x: cx - 100, y: cy, w: 200, h: 20, size: 12, font: "manrope", color: "#1b2a4a", lh: 17 });
  const addFlow = () => add({ type: "flow", name: "Body", text: "{{doc.body}}", x: mm(14), y: mm(60), w: Math.round(mm(doc.wMm) - mm(28)), h: Math.round(mm(doc.hMm) - mm(110)), size: 11.5, font: "manrope", color: "#1b2a4a", lh: 17, align: "justify" });
  const addLine = () => add({ type: "line", name: "Line", x: cx - 150, y: cy, w: 300, h: 0, lw: 2, color: "#1b2a4a" });
  const addRect = () => add({ type: "rect", name: "Box", x: cx - 100, y: cy - 50, w: 200, h: 100, lw: 1.5, color: "#1b2a4a", radius: 6 });
  const addFrame = () => add({ type: "frame", name: "Frame", style: "double", x: mm(10), y: mm(10), w: Math.round(mm(doc.wMm) - mm(20)), h: Math.round(mm(doc.hMm) - mm(20)), lw: 3, color: "#b8924a", radius: 10 });
  const addImage = (src: string) => add({ type: "image", name: "Image", src, x: cx - 60, y: cy - 60, w: 120, h: 120, shape: "rect" });
  const addQr = () => add({ type: "qr", name: "QR", data: "{{doc.verify_url}}", x: cx - 30, y: cy - 30, w: 60, h: 60, color: "#1b2a4a" });
  const addArt = (art: ArtName) => add({ type: "art", name: art, art, x: cx - 60, y: cy - 60, w: 120, h: art === "divider" || art === "garland" ? 36 : 120, color: "#b8924a" });

  function pickImage(cb: (src: string) => void) {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = () => {
      const f = input.files?.[0]; if (!f) return;
      const img = new Image();
      img.onload = () => {
        const max = 1200, s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        cb(c.toDataURL(f.type === "image/png" ? "image/png" : "image/jpeg", 0.85));
      };
      img.src = URL.createObjectURL(f);
    };
    input.click();
  }

  function moveZ(dir: 1 | -1) {
    if (!layer) return;
    setLayers((ls) => { const i = ls.findIndex((l) => l.id === layer.id); if (i < 0) return ls; const j = i + dir; if (j < 0 || j >= ls.length) return ls; const copy = [...ls]; [copy[i], copy[j]] = [copy[j]!, copy[i]!]; return copy; });
  }
  function remove() { if (!layer) return; setDoc((d) => ({ ...d, master: d.master.filter((l) => l.id !== layer.id), pages: d.pages.map((p) => ({ ...p, layers: p.layers.filter((l) => l.id !== layer.id) })) })); setSelected(null); }
  function duplicate() { if (!layer) return; const L = { ...layer, id: uid(), x: layer.x + 12, y: layer.y + 12 } as Layer; setLayers((ls) => [...ls, L]); setSelected(L.id); }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
      if (!layer) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") { e.preventDefault(); duplicate(); return; }
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); remove(); return; }
      const step = e.shiftKey ? 10 : 1;
      if (e.key === "ArrowLeft") updateLayer(layer.id, { x: layer.x - step });
      if (e.key === "ArrowRight") updateLayer(layer.id, { x: layer.x + step });
      if (e.key === "ArrowUp") updateLayer(layer.id, { y: layer.y - step });
      if (e.key === "ArrowDown") updateLayer(layer.id, { y: layer.y + step });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const pages = Math.max(doc.pages.length, preview ? pageCount(doc, data) : doc.pages.length);
  const canvasW = Math.min(wrapW - 16, 900);

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr_280px]">
      {/* left: layers */}
      <aside className="space-y-3">
        <div className="surface-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Page</p>
            <select className="h-8 rounded-md border border-input bg-background px-2 text-xs" value={doc.preset} onChange={(e) => { const p = PAGE_PRESETS.find((x) => x.key === e.target.value); if (p) setDoc((d) => ({ ...d, preset: p.key, wMm: p.wMm, hMm: p.hMm })); }}>
              {PAGE_PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs">Background <input type="color" value={doc.bg} onChange={(e) => setDoc((d) => ({ ...d, bg: e.target.value }), false)} /></label>
          <div className="mt-2 flex flex-wrap gap-1">
            {Array.from({ length: pages }).map((_, i) => (
              <button key={i} type="button" onClick={() => { setPage(i); setOnMaster(false); }} className={`rounded px-2 py-1 text-xs ${!onMaster && page === i ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{i + 1}</button>
            ))}
            <button type="button" onClick={() => setDoc((d) => ({ ...d, pages: [...d.pages, { id: uid(), layers: [] }] }))} className="rounded bg-secondary px-2 py-1 text-xs"><Plus className="inline size-3" /></button>
            <button type="button" onClick={() => setOnMaster(true)} className={`rounded px-2 py-1 text-xs ${onMaster ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>Letterhead (all pages)</button>
          </div>
        </div>
        <div className="surface-card p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{onMaster ? "Letterhead layers" : `Page ${page + 1} layers`}</p>
          <ul className="max-h-[50vh] space-y-0.5 overflow-y-auto text-sm">
            {[...layers].reverse().map((l) => (
              <li key={l.id} className={`flex items-center gap-1 rounded px-1 py-0.5 ${selected === l.id ? "bg-primary/10" : "hover:bg-secondary"}`}>
                <button type="button" className="min-w-0 flex-1 truncate text-left" onClick={() => setSelected(l.id)}>{l.name || l.type}</button>
                <button type="button" aria-label="hide" onClick={() => updateLayer(l.id, { hidden: !l.hidden })}>{l.hidden ? <EyeOff className="size-3.5 opacity-60" /> : <Eye className="size-3.5 opacity-60" />}</button>
                <button type="button" aria-label="lock" onClick={() => updateLayer(l.id, { locked: !l.locked })}>{l.locked ? <Lock className="size-3.5 opacity-60" /> : <Unlock className="size-3.5 opacity-30" />}</button>
              </li>
            ))}
            {layers.length === 0 ? <li className="text-xs text-muted-foreground">No layers yet. Add from the toolbar.</li> : null}
          </ul>
        </div>
      </aside>

      {/* centre: toolbar + canvas */}
      <div ref={wrapRef} className="min-w-0 space-y-3">
        <div className="surface-card flex flex-wrap items-center gap-1 p-2 text-xs">
          <Button size="sm" variant="outline" onClick={addText}>+ Text</Button>
          <Button size="sm" variant="outline" onClick={addHeading}>+ Heading</Button>
          <Button size="sm" variant="outline" onClick={addFlow}>+ Body (flows)</Button>
          <Button size="sm" variant="outline" onClick={addLine}>+ Line</Button>
          <Button size="sm" variant="outline" onClick={addRect}>+ Box</Button>
          <Button size="sm" variant="outline" onClick={addFrame}>+ Frame</Button>
          <Button size="sm" variant="outline" onClick={() => pickImage(addImage)}>+ Image</Button>
          <Button size="sm" variant="outline" onClick={addQr}>+ QR</Button>
          <select className="h-8 rounded-md border border-input bg-background px-2" value="" onChange={(e) => { if (e.target.value) addArt(e.target.value as ArtName); }}>
            <option value="">+ Clip art…</option>
            {ARTS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select className="h-8 rounded-md border border-input bg-background px-2" value="" onChange={(e) => { if (e.target.value) addField(e.target.value); }}>
            <option value="">+ Merge field…</option>
            {["org.name", "org.name_hi", "org.address", "org.phone", "org.email", "org.website", "doc.ref_no", "doc.date|date", "doc.subject", "doc.title", "recipient.name", "recipient.address", "signatory.name", "signatory.designation", "receipt.amount|inr", "receipt.amount|words", "receipt.payer_name", "member.name", "member.member_no", "doc.verify_url"].map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <span className="mx-1 h-5 w-px bg-border" />
          <Button size="sm" variant="ghost" onClick={undo} aria-label="Undo"><Undo2 className="size-4" /></Button>
          <Button size="sm" variant="ghost" onClick={redo} aria-label="Redo"><Redo2 className="size-4" /></Button>
          <label className="ml-auto flex items-center gap-1"><input type="checkbox" checked={preview} onChange={(e) => setPreview(e.target.checked)} /> Sample data</label>
          <Button size="sm" onClick={() => onSave(cleanDoc(doc))} disabled={saving}>{saving ? "Saving…" : "Save template"}</Button>
        </div>
        <div className="overflow-auto rounded-lg bg-secondary/50 p-2">
          <DesignCanvas
            doc={doc}
            page={page}
            width={canvasW}
            editable
            guides={!preview}
            selectedId={selected}
            onSelect={setSelected}
            onChange={(p) => updateLayer(p.id, p, false)}
            {...(preview ? { data } : {})}
          />
        </div>
        <p className="text-xs text-muted-foreground">Drag to move, handles to resize, Alt = no snapping. Arrows nudge (Shift ×10), Delete removes, Ctrl+D duplicates, Ctrl+Z/Y undo/redo. Text supports **bold** and {"{{merge.fields}}"}.</p>
      </div>

      {/* right: properties */}
      <aside className="surface-card space-y-3 p-3 text-sm">
        {layer ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{layer.type}{isMasterLayer ? " · letterhead" : ""}</p>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => moveZ(-1)} aria-label="Send back"><ArrowDown className="size-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => moveZ(1)} aria-label="Bring forward"><ArrowUp className="size-4" /></Button>
                <Button size="icon" variant="ghost" onClick={duplicate} aria-label="Duplicate"><Copy className="size-4" /></Button>
                <Button size="icon" variant="ghost" onClick={remove} aria-label="Delete"><Trash2 className="size-4 text-destructive" /></Button>
              </div>
            </div>
            <Prop label="Name"><Input value={layer.name ?? ""} onChange={(e) => updateLayer(layer.id, { name: e.target.value }, false)} /></Prop>
            {!isMasterLayer ? <label className="text-xs"><input type="checkbox" checked={!!layer.lastPageOnly} onChange={(e) => updateLayer(layer.id, { lastPageOnly: e.target.checked })} /> only on the last page (signature, QR)</label> : null}
            <div className="grid grid-cols-4 gap-1">
              {(["x", "y", "w", "h"] as const).map((k) => (
                <Prop key={k} label={k.toUpperCase()}><Input type="number" value={Math.round((layer as unknown as Record<string, number>)[k] ?? 0)} onChange={(e) => updateLayer(layer.id, { [k]: Number(e.target.value) } as Partial<Layer>, false)} /></Prop>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1">
              <Prop label="Rotate°"><Input type="number" value={layer.rot ?? 0} onChange={(e) => updateLayer(layer.id, { rot: Number(e.target.value) }, false)} /></Prop>
              <Prop label="Opacity"><Input type="number" step="0.05" min="0" max="1" value={layer.opacity ?? 1} onChange={(e) => updateLayer(layer.id, { opacity: Number(e.target.value) }, false)} /></Prop>
            </div>
            {(layer.type === "text" || layer.type === "flow") ? (
              <>
                <Prop label="Text"><Textarea rows={4} value={layer.text} onChange={(e) => updateLayer(layer.id, { text: e.target.value } as Partial<Layer>, false)} /></Prop>
                <div className="grid grid-cols-2 gap-1">
                  <Prop label="Font"><select className={sel} value={layer.font ?? "mukta"} onChange={(e) => updateLayer(layer.id, { font: e.target.value as FontKey } as Partial<Layer>)}>{Object.entries(FONTS).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}</select></Prop>
                  <Prop label="Size"><Input type="number" step="0.5" value={layer.size ?? 14} onChange={(e) => updateLayer(layer.id, { size: Number(e.target.value), lh: Number(e.target.value) * 1.45 } as Partial<Layer>, false)} /></Prop>
                  <Prop label="Line h."><Input type="number" step="0.5" value={Math.round((layer.lh ?? 0) * 10) / 10} onChange={(e) => updateLayer(layer.id, { lh: Number(e.target.value) } as Partial<Layer>, false)} /></Prop>
                  <Prop label="Colour"><input type="color" className="h-9 w-full" value={layer.color ?? "#111111"} onChange={(e) => updateLayer(layer.id, { color: e.target.value } as Partial<Layer>, false)} /></Prop>
                  <Prop label="Align"><select className={sel} value={layer.align ?? "left"} onChange={(e) => updateLayer(layer.id, { align: e.target.value } as Partial<Layer>)}>{(layer.type === "flow" ? ["left", "justify"] : ["left", "center", "right"]).map((a) => <option key={a}>{a}</option>)}</select></Prop>
                  {layer.type === "text" ? (
                    <Prop label="Weight"><select className={sel} value={layer.weight ?? 400} onChange={(e) => updateLayer(layer.id, { weight: Number(e.target.value) } as Partial<Layer>)}>{[400, 500, 600, 700].map((w) => <option key={w} value={w}>{w}</option>)}</select></Prop>
                  ) : null}
                </div>
                {layer.type === "text" ? (
                  <div className="flex flex-wrap gap-3 text-xs">
                    <label><input type="checkbox" checked={!!layer.italic} onChange={(e) => updateLayer(layer.id, { italic: e.target.checked } as Partial<Layer>)} /> italic</label>
                    <label><input type="checkbox" checked={!!layer.underline} onChange={(e) => updateLayer(layer.id, { underline: e.target.checked } as Partial<Layer>)} /> underline</label>
                    <label><input type="checkbox" checked={!!layer.nowrap} onChange={(e) => updateLayer(layer.id, { nowrap: e.target.checked } as Partial<Layer>)} /> no wrap</label>
                    <label><input type="checkbox" checked={!!layer.fit} onChange={(e) => updateLayer(layer.id, { fit: e.target.checked } as Partial<Layer>)} /> shrink to fit</label>
                  </div>
                ) : null}
              </>
            ) : null}
            {layer.type === "rect" ? (
              <div className="grid grid-cols-2 gap-1">
                <Prop label="Fill"><input type="color" className="h-9 w-full" value={layer.fill ?? "#ffffff"} onChange={(e) => updateLayer(layer.id, { fill: e.target.value } as Partial<Layer>, false)} /></Prop>
                <Prop label="Border"><input type="color" className="h-9 w-full" value={layer.color ?? "#111111"} onChange={(e) => updateLayer(layer.id, { color: e.target.value } as Partial<Layer>, false)} /></Prop>
                <Prop label="Border w"><Input type="number" step="0.5" value={layer.lw ?? 0} onChange={(e) => updateLayer(layer.id, { lw: Number(e.target.value) } as Partial<Layer>, false)} /></Prop>
                <Prop label="Radius"><Input type="number" value={layer.radius ?? 0} onChange={(e) => updateLayer(layer.id, { radius: Number(e.target.value) } as Partial<Layer>, false)} /></Prop>
                <label className="col-span-2 text-xs"><input type="checkbox" checked={!layer.fill} onChange={(e) => updateLayer(layer.id, { fill: e.target.checked ? undefined : "#ffffff" } as Partial<Layer>)} /> no fill</label>
              </div>
            ) : null}
            {(layer.type === "line" || layer.type === "frame" || layer.type === "art" || layer.type === "qr") ? (
              <div className="grid grid-cols-2 gap-1">
                <Prop label="Colour"><input type="color" className="h-9 w-full" value={layer.color ?? "#111111"} onChange={(e) => updateLayer(layer.id, { color: e.target.value } as Partial<Layer>, false)} /></Prop>
                {layer.type !== "art" && layer.type !== "qr" ? <Prop label="Width"><Input type="number" step="0.5" value={layer.lw ?? 2} onChange={(e) => updateLayer(layer.id, { lw: Number(e.target.value) } as Partial<Layer>, false)} /></Prop> : null}
                {layer.type === "frame" ? <Prop label="Style"><select className={sel} value={layer.style ?? "single"} onChange={(e) => updateLayer(layer.id, { style: e.target.value } as Partial<Layer>)}>{["single", "double", "corner", "ornate", "rounded"].map((s) => <option key={s}>{s}</option>)}</select></Prop> : null}
                {layer.type === "line" ? <label className="text-xs"><input type="checkbox" checked={!!layer.dash} onChange={(e) => updateLayer(layer.id, { dash: e.target.checked } as Partial<Layer>)} /> dashed</label> : null}
                {layer.type === "qr" ? <Prop label="Data"><Input value={layer.data} onChange={(e) => updateLayer(layer.id, { data: e.target.value } as Partial<Layer>, false)} /></Prop> : null}
                {layer.type === "art" ? <Prop label="Art"><select className={sel} value={layer.art} onChange={(e) => updateLayer(layer.id, { art: e.target.value } as Partial<Layer>)}>{ARTS.map((a) => <option key={a}>{a}</option>)}</select></Prop> : null}
              </div>
            ) : null}
            {layer.type === "image" ? (
              <div className="space-y-1">
                <div className="grid grid-cols-2 gap-1">
                  <Prop label="Shape"><select className={sel} value={layer.shape ?? "rect"} onChange={(e) => updateLayer(layer.id, { shape: e.target.value } as Partial<Layer>)}><option value="rect">rect</option><option value="circle">circle</option></select></Prop>
                  <Prop label="Fit"><select className={sel} value={layer.fit ?? "cover"} onChange={(e) => updateLayer(layer.id, { fit: e.target.value } as Partial<Layer>)}><option value="cover">cover</option><option value="contain">contain</option></select></Prop>
                  <Prop label="Ring"><Input type="number" value={layer.ring ?? 0} onChange={(e) => updateLayer(layer.id, { ring: Number(e.target.value) } as Partial<Layer>, false)} /></Prop>
                  <Prop label="Radius"><Input type="number" value={layer.radius ?? 0} onChange={(e) => updateLayer(layer.id, { radius: Number(e.target.value) } as Partial<Layer>, false)} /></Prop>
                </div>
                <Prop label="Source (URL or {{field}})"><Input value={layer.src.startsWith("data:") ? "(uploaded image)" : layer.src} onChange={(e) => updateLayer(layer.id, { src: e.target.value } as Partial<Layer>, false)} /></Prop>
                <Button size="sm" variant="outline" onClick={() => pickImage((src) => updateLayer(layer.id, { src } as Partial<Layer>))}>Replace image…</Button>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Select a layer on the canvas or in the list to edit it.</p>
        )}
      </aside>
    </div>
  );
}

function Prop({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
