// Interactive family chart: SVG, pan/zoom, click to select, highlight the selected person's line.
import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent, type WheelEvent as RWheelEvent } from "react";

import { Button } from "@/components/ui/button";
import { ancestorsOf, BOX_H, BOX_W, descendantsOf, layoutFamily, type Person } from "@/family/layout";

export type FamilyChartProps = {
  people: Person[];
  selectedId?: string | null;
  onSelect?: (p: Person | null) => void;
  /** colour per family_id (lineage view) */
  familyColors?: Record<string, string>;
  height?: number;
  /** Extra actions rendered inside the chart toolbar */
  toolbar?: React.ReactNode;
  lang?: "en" | "hi";
};

const PALETTE = ["#b8924a", "#2f7d5b", "#3b5bdb", "#a64b8c", "#c2571a", "#0f7b8a", "#6b4f1d", "#4b6b2f"];

export function familyPalette(ids: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  [...new Set(ids)].forEach((id, i) => { out[id] = PALETTE[i % PALETTE.length]!; });
  return out;
}

export function FamilyChart({ people, selectedId, onSelect, familyColors, height = 560, toolbar, lang = "en" }: FamilyChartProps) {
  const layout = useMemo(() => layoutFamily(people), [people]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [drag, setDrag] = useState<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const movedRef = useRef(false);
  const [wrapW, setWrapW] = useState(900);

  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setWrapW(el.clientWidth));
    ro.observe(el); setWrapW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  function fit() {
    const k = Math.min(1.2, Math.max(0.15, Math.min((wrapW - 16) / layout.width, (height - 16) / layout.height)));
    setView({ k, x: (wrapW - layout.width * k) / 2, y: 8 });
  }
  // fit on first layout / size change
  useEffect(() => { fit(); }, [layout.width, layout.height, wrapW]); // eslint-disable-line react-hooks/exhaustive-deps

  function centerOn(id: string) {
    const b = layout.boxes.find((x) => x.person.id === id); if (!b) return;
    setView((v) => ({ ...v, x: wrapW / 2 - (b.x + BOX_W / 2) * v.k, y: height / 2 - (b.y + BOX_H / 2) * v.k }));
  }
  useEffect(() => { if (selectedId) centerOn(selectedId); }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const highlight = useMemo(() => {
    if (!selectedId) return null;
    return new Set([selectedId, ...ancestorsOf(people, selectedId), ...descendantsOf(people, selectedId)]);
  }, [people, selectedId]);

  function onWheel(e: RWheelEvent<HTMLDivElement>) {
    e.preventDefault();
    const rect = wrapRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    setView((v) => {
      const k = Math.max(0.15, Math.min(3, v.k * (e.deltaY < 0 ? 1.12 : 0.89)));
      return { k, x: mx - (mx - v.x) * (k / v.k), y: my - (my - v.y) * (k / v.k) };
    });
  }
  function onDown(e: RPointerEvent<HTMLDivElement>) { movedRef.current = false; setDrag({ sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y }); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }
  function onMove(e: RPointerEvent<HTMLDivElement>) {
    if (!drag) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (Math.abs(dx) + Math.abs(dy) > 3) movedRef.current = true;
    setView((v) => ({ ...v, x: drag.ox + dx, y: drag.oy + dy }));
  }
  function onUp() { setDrag(null); }

  const zoom = (f: number) => setView((v) => { const k = Math.max(0.15, Math.min(3, v.k * f)); return { k, x: wrapW / 2 - (wrapW / 2 - v.x) * (k / v.k), y: height / 2 - (height / 2 - v.y) * (k / v.k) }; });
  const L = lang === "hi";

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-[radial-gradient(circle,rgba(0,0,0,.06)_1px,transparent_1px)] bg-[length:22px_22px]" style={{ height }} ref={wrapRef}
      onWheel={onWheel} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <div className="absolute left-2 top-2 z-10 flex flex-wrap items-center gap-1 rounded-md bg-background/90 p-1 shadow-sm">
        <Button size="sm" variant="ghost" onClick={() => zoom(1.25)} title={L ? "बड़ा करें" : "Zoom in"}>+</Button>
        <Button size="sm" variant="ghost" onClick={() => zoom(0.8)} title={L ? "छोटा करें" : "Zoom out"}>−</Button>
        <Button size="sm" variant="ghost" onClick={fit}>{L ? "पूरा दिखाएँ" : "Fit"}</Button>
        <span className="px-2 text-xs text-muted-foreground">{layout.boxes.length} {L ? "सदस्य" : "people"} · {layout.generations} {L ? "पीढ़ियाँ" : "generations"}</span>
        {toolbar}
      </div>
      <svg width="100%" height="100%" style={{ cursor: drag ? "grabbing" : "grab", touchAction: "none" }}>
        <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
          {layout.lines.map((l, i) => (
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.kind === "spouse" ? "#b8924a" : "#9aa3b2"} strokeWidth={l.kind === "spouse" ? 3 : 1.6} strokeLinecap="round" />
          ))}
          {layout.boxes.map((b) => {
            const p = b.person;
            const sel = p.id === selectedId;
            const dim = highlight ? !highlight.has(p.id) && !(b.isSpouse && highlight.has(b.unit.person.id)) : false;
            const color = familyColors?.[p.family_id ?? ""] ?? (p.is_head ? "#14213d" : "#b8924a");
            const kindLabel = p.member_kind === "spouse" ? (L ? "पत्नी" : "wife") : p.member_kind === "daughter" ? (L ? "पुत्री" : "daughter") : null;
            const sub = [p.relation, p.village_name ? (L ? "निवास: " : "") + p.village_name : null, p.native_place ? (L ? "मूल: " : "from ") + p.native_place : null].filter(Boolean).join(" · ");
            return (
              <g key={p.id} transform={`translate(${b.x},${b.y})`} opacity={dim ? 0.35 : 1} style={{ cursor: "pointer" }}
                onClick={(e) => { e.stopPropagation(); if (!movedRef.current) onSelect?.(sel ? null : p); }}>
                <rect width={BOX_W} height={BOX_H} rx={10} fill={sel ? "#fff7e6" : "#ffffff"} stroke={sel ? "#b8924a" : "#d8dde6"} strokeWidth={sel ? 2.5 : 1.2} />
                <rect width={5} height={BOX_H} rx={2} fill={color} />
                <text x={14} y={24} fontFamily="'Tiro Devanagari Hindi', 'Noto Serif Devanagari', serif" fontSize={15} fontWeight={700} fill={p.name_unknown ? "#7b8494" : "#14213d"} fontStyle={p.name_unknown ? "italic" : "normal"}>
                  {clip((p.is_deceased ? "स्व. " : "") + p.name, 18)}
                </text>
                <text x={14} y={42} fontFamily="Mukta, sans-serif" fontSize={11} fill="#5a6475">{clip(sub, 26)}</text>
                <g transform={`translate(14,${BOX_H - 14})`}>
                  {[p.is_head ? (L ? "मुखिया" : "head") : null, kindLabel, p.is_deceased ? (L ? "दिवंगत" : "late") : null, p.family_name && familyColors ? p.family_name : null].filter(Boolean).map((t, i, arr) => {
                    const offset = arr.slice(0, i).reduce((s, x) => s + String(x).length * 6.2 + 14, 0);
                    return (
                      <g key={i} transform={`translate(${offset},0)`}>
                        <rect width={String(t).length * 6.2 + 10} height={13} rx={6} fill={i === arr.length - 1 && p.family_name && familyColors ? color : "#eef1f6"} />
                        <text x={5} y={10} fontSize={9.5} fontFamily="Mukta, sans-serif" fill={i === arr.length - 1 && p.family_name && familyColors ? "#fff" : "#3b465a"}>{t}</text>
                      </g>
                    );
                  })}
                </g>
              </g>
            );
          })}
        </g>
      </svg>
      {!people.length ? <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">{L ? "अभी कोई सदस्य नहीं" : "No members yet"}</div> : null}
    </div>
  );
}

function clip(s: string, n: number) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }
