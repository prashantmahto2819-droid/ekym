// Renders one page of a DesignDoc; optional editing overlay (select, drag, resize, snap).
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";

import { pagePx, renderPage, type Bounds, type DesignDoc, type Layer, type MergeData, type RenderedLayer } from "@/design-engine";

export type CanvasProps = {
  doc: DesignDoc;
  page: number;
  data?: MergeData;
  /** displayed width in CSS px */
  width: number;
  editable?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onChange?: (patch: { id: string; x?: number; y?: number; w?: number; h?: number }) => void;
  guides?: boolean;
  renderScale?: number;
};

const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;
type Handle = (typeof HANDLES)[number];

export function DesignCanvas({ doc, page, data, width, editable, selectedId, onSelect, onChange, guides, renderScale = 2 }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState<RenderedLayer[]>([]);
  const [drag, setDrag] = useState<{ id: string; handle: Handle | "move"; sx: number; sy: number; start: Bounds; snapLines: { x?: number; y?: number }[] } | null>(null);
  const { W, H } = pagePx(doc);
  const scale = width / W;
  const height = H * scale;

  useEffect(() => {
    let alive = true;
    const c = canvasRef.current;
    if (!c) return;
    const opts: Parameters<typeof renderPage>[3] = { width: W * renderScale };
    if (data) opts.data = data;
    if (guides) opts.guides = true;
    renderPage(c, doc, page, opts).then((r) => alive && setRendered(r));
    return () => { alive = false; };
  }, [doc, page, data, guides, W, renderScale]);

  const layerBounds = (id: string) => rendered.find((r) => r.layer.id === id)?.bounds ?? null;
  const findById = (id: string): Layer | undefined => [...doc.master, ...(doc.pages[page]?.layers ?? []), ...doc.pages.flatMap((p) => p.layers.filter((l) => l.type === "flow"))].find((l) => l.id === id);

  function hitTest(px: number, py: number): string | null {
    for (let i = rendered.length - 1; i >= 0; i--) {
      const r = rendered[i]!;
      if (!r.bounds || r.layer.locked || r.layer.hidden) continue;
      const b = r.bounds;
      if (px >= b.x - 2 && px <= b.x + b.w + 2 && py >= b.y - 2 && py <= b.y + b.h + 2) return r.layer.id;
    }
    return null;
  }

  function toPage(e: RPointerEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
  }

  function onDown(e: RPointerEvent<HTMLDivElement>) {
    if (!editable) return;
    const p = toPage(e);
    const handle = (e.target as HTMLElement).dataset["handle"] as Handle | undefined;
    if (handle && selectedId) {
      const b = layerBounds(selectedId);
      if (b) { setDrag({ id: selectedId, handle, sx: p.x, sy: p.y, start: { ...b }, snapLines: [] }); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }
      return;
    }
    const id = hitTest(p.x, p.y);
    onSelect?.(id);
    if (id) {
      const b = layerBounds(id);
      if (b) { setDrag({ id, handle: "move", sx: p.x, sy: p.y, start: { ...b }, snapLines: [] }); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }
    }
  }

  function snap(v: number, targets: number[], tol = 6 / scale) {
    for (const t of targets) if (Math.abs(v - t) <= tol) return t;
    return v;
  }

  function onMove(e: RPointerEvent<HTMLDivElement>) {
    if (!drag) return;
    const p = toPage(e);
    const dx = p.x - drag.sx, dy = p.y - drag.sy;
    const L = findById(drag.id);
    if (!L) return;
    const others = rendered.filter((r) => r.layer.id !== drag.id && r.bounds).map((r) => r.bounds!);
    const xs = [0, W / 2, W, ...others.flatMap((b) => [b.x, b.x + b.w / 2, b.x + b.w])];
    const ys = [0, H / 2, H, ...others.flatMap((b) => [b.y, b.y + b.h / 2, b.y + b.h])];
    const noSnap = e.altKey;
    const b = drag.start;
    if (drag.handle === "move") {
      let nx = b.x + dx, ny = b.y + dy;
      if (!noSnap) {
        const sxs = [nx, nx + b.w / 2, nx + b.w].map((v) => snap(v, xs));
        const sys = [ny, ny + b.h / 2, ny + b.h].map((v) => snap(v, ys));
        const ax = [0, b.w / 2, b.w], ay = [0, b.h / 2, b.h];
        for (let i = 0; i < 3; i++) { if (sxs[i] !== [nx, nx + b.w / 2, nx + b.w][i]) { nx = sxs[i]! - ax[i]!; break; } }
        for (let i = 0; i < 3; i++) { if (sys[i] !== [ny, ny + b.h / 2, ny + b.h][i]) { ny = sys[i]! - ay[i]!; break; } }
      }
      const yOff = L.type === "line" ? b.h / 2 : 0;
      onChange?.({ id: L.id, x: Math.round(nx * 10) / 10, y: Math.round((ny + yOff) * 10) / 10 });
      return;
    }
    let { x, y, w, h } = b;
    const hd = drag.handle;
    if (hd.includes("e")) w = Math.max(8, b.w + dx);
    if (hd.includes("s")) h = Math.max(8, b.h + dy);
    if (hd.includes("w")) { x = b.x + dx; w = Math.max(8, b.w - dx); }
    if (hd.includes("n")) { y = b.y + dy; h = Math.max(8, b.h - dy); }
    if (!noSnap) { const r = snap(x + w, xs); if (hd.includes("e")) w = r - x; const bb = snap(y + h, ys); if (hd.includes("s")) h = bb - y; }
    const patch: { id: string; x?: number; y?: number; w?: number; h?: number } = { id: L.id, x: Math.round(x * 10) / 10, w: Math.round(w * 10) / 10 };
    if (L.type !== "line") { patch.y = Math.round(y * 10) / 10; patch.h = Math.round(h * 10) / 10; }
    onChange?.(patch);
  }

  function onUp(e: RPointerEvent<HTMLDivElement>) {
    if (drag) { try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ } }
    setDrag(null);
  }

  const sel = selectedId ? layerBounds(selectedId) : null;

  return (
    <div
      className="relative select-none overflow-hidden rounded-md shadow-md ring-1 ring-border"
      style={{ width, height, touchAction: editable ? "none" : "auto", cursor: editable ? (drag ? "grabbing" : "default") : "default" }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <canvas ref={canvasRef} style={{ width, height, display: "block" }} />
      {editable ? (
        <>
          {rendered.map((r) => r.bounds && r.layer.id !== selectedId && !r.layer.hidden ? (
            <div key={r.layer.id} className="pointer-events-none absolute border border-transparent hover:border-primary/40" style={{ left: r.bounds.x * scale, top: r.bounds.y * scale, width: r.bounds.w * scale, height: r.bounds.h * scale }} />
          ) : null)}
          {sel ? (
            <div className="pointer-events-none absolute border-2 border-primary" style={{ left: sel.x * scale - 1, top: sel.y * scale - 1, width: sel.w * scale + 2, height: sel.h * scale + 2 }}>
              {HANDLES.map((h) => {
                const pos: Record<Handle, [number, number]> = { nw: [0, 0], n: [50, 0], ne: [100, 0], e: [100, 50], se: [100, 100], s: [50, 100], sw: [0, 100], w: [0, 50] };
                const [px, py] = pos[h];
                const cursor = ({ nw: "nwse-resize", se: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize", n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize" } as const)[h];
                return (
                  <span
                    key={h}
                    data-handle={h}
                    className="pointer-events-auto absolute size-3 rounded-sm border border-primary bg-background"
                    style={{ left: `calc(${px}% - 6px)`, top: `calc(${py}% - 6px)`, cursor }}
                  />
                );
              })}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
