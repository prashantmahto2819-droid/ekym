// सभी वंश वृक्ष एक पन्ने पर + खोज — हर संस्था के लिए (उसी संस्था के मंज़ूर वृक्ष)।
// खिसकाना (खींचकर), बड़ा-छोटा (पहिया / बटन), नाम खोजना; नाम पर दबाने से उसका परिवार खुलता है।
import type { SupabaseClient } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLang } from "@/core/i18n";
import { useTenant } from "@/core/tenant-context";
import type { Person } from "@/family/layout";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as unknown as SupabaseClient;

export const Route = createFileRoute("/_authenticated/shok/forest")({ component: ForestPage });

type Link2 = { child_family_id: string; parent_member_id: string };
type Marriage = { daughter_id: string; husband_id: string; daughter_name: string; husband_name: string };
type N = Person & { kids: N[]; w: number; x: number; y: number; d: number; linked?: boolean };
const NW = 150, NH = 44, HG = 14, VG = 40;
const cut = (t: string, n: number) => { const a = [...t]; return a.length > n ? a.slice(0, n - 1).join("") + "…" : t; };

function layout(members: Person[], links: Link2[]) {
  const wifeOf = new Map<string, Person>();
  for (const p of members) if (p.member_kind === "spouse" && p.parent_id) wifeOf.set(p.parent_id, p);
  const byId = new Map<string, N>();
  for (const p of members) if (p.member_kind !== "spouse") byId.set(p.id, { ...p, kids: [], w: 0, x: 0, y: 0, d: 0 });
  const linkOf = new Map(links.map((l) => [l.child_family_id, l.parent_member_id] as const));
  const roots: N[] = [];
  for (const n of byId.values()) {
    let par = n.parent_id ? byId.get(n.parent_id) : undefined;
    if (!par && n.family_id && linkOf.has(n.family_id)) { par = byId.get(linkOf.get(n.family_id)!); if (par) n.linked = true; }
    if (par && par !== n) par.kids.push(n); else roots.push(n);
  }
  const rank = (n: N) => (n.member_kind === "daughter" ? 1 : 0);
  const seen = new Set<string>();
  const prep = (n: N, d: number): number => {
    if (seen.has(n.id)) { n.kids = []; } // चक्र से बचाव
    seen.add(n.id);
    n.d = d;
    n.kids.sort((a, b) => rank(a) - rank(b) || (a.sort_order ?? 0) - (b.sort_order ?? 0));
    n.w = Math.max(NW, n.kids.reduce((a, c) => a + prep(c, d + 1), 0) + HG * Math.max(0, n.kids.length - 1));
    return n.w;
  };
  const all: N[] = [];
  const place = (n: N, x: number, y0: number) => {
    const total = n.kids.reduce((a, c) => a + c.w, 0) + HG * Math.max(0, n.kids.length - 1);
    let cx = x + (n.w - total) / 2;
    for (const c of n.kids) { place(c, cx, y0); cx += c.w + HG; }
    n.x = x + n.w / 2 - NW / 2; n.y = y0 + n.d * (NH + VG); all.push(n);
  };
  const depth = (n: N): number => 1 + Math.max(0, ...n.kids.map(depth));
  // वृक्षों को पंक्तियों में जमाना
  roots.sort((a, b) => (a.family_name ?? "").localeCompare(b.family_name ?? "", "hi"));
  const ROW = 4200;
  let x = 30, y = 60, rowH = 0, W = 0;
  for (const r of roots) {
    prep(r, 0);
    if (x > 30 && x + r.w > ROW) { x = 30; y += rowH + 90; rowH = 0; }
    place(r, x, y);
    x += r.w + 70; rowH = Math.max(rowH, depth(r) * (NH + VG)); W = Math.max(W, x);
  }
  return { all, roots, wifeOf, W: Math.max(W, 600), H: y + rowH + 40, byId };
}

function ForestPage() {
  const tenant = useTenant();
  const L = useLang().lang === "hi";
  const nav = useNavigate();
  const q = useQuery({
    queryKey: ["shok_forest", tenant.organization_id], staleTime: 120000,
    queryFn: async () => { const { data, error } = await sb.rpc("shok_forest", { p_org: tenant.organization_id }); if (error) throw new Error(error.message); return (data ?? { members: [], links: [] }) as { members: Person[]; links: Link2[] }; },
  });
  const mq = useQuery({ queryKey: ["shok_forest_marriages"], staleTime: 120000, queryFn: async () => { const { data } = await sb.rpc("shok_marriage_links", { p_family: null }); return (data ?? []) as Marriage[]; } });
  const lay = useMemo(() => layout(q.data?.members ?? [], q.data?.links ?? []), [q.data]);
  const [view, setView] = useState({ x: 0, y: 0, k: 0.6 });
  const [term, setTerm] = useState("");
  const [hit, setHit] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const late = (p: Person) => (p.is_deceased ? (L ? "स्व. " : "Late ") : "") + p.name;
  const matches = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (t.length < 2) return [];
    return (q.data?.members ?? []).filter((p) => !p.name_unknown && [p.name, p.family_name, p.native_place, p.village_name].some((x) => (x ?? "").toLowerCase().includes(t))).slice(0, 30);
  }, [term, q.data]);

  function centerOn(id: string) {
    let n = lay.byId.get(id);
    if (!n) { const p = (q.data?.members ?? []).find((m) => m.id === id); if (p?.parent_id) n = lay.byId.get(p.parent_id); } // पत्नी → पति का डिब्बा
    if (!n || !box.current) return;
    const k = 1;
    setView({ k, x: box.current.clientWidth / 2 - (n.x + NW / 2) * k, y: box.current.clientHeight / 2 - (n.y + NH / 2) * k });
    setHit(n.id);
  }
  function fit() {
    if (!box.current) return;
    const k = Math.min(1, Math.max(0.08, Math.min(box.current.clientWidth / lay.W, box.current.clientHeight / lay.H)));
    setView({ k, x: 0, y: 0 });
  }
  function zoom(f: number, cx?: number, cy?: number) {
    setView((v) => {
      const k = Math.min(2.2, Math.max(0.08, v.k * f));
      const px = cx ?? (box.current?.clientWidth ?? 0) / 2, py = cy ?? (box.current?.clientHeight ?? 0) / 2;
      return { k, x: px - ((px - v.x) / v.k) * k, y: py - ((py - v.y) / v.k) * k };
    });
  }

  const families = new Set((q.data?.members ?? []).map((m) => m.family_id)).size;
  return (
    <section className="container-page space-y-3 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link to="/shok" className="text-xs text-muted-foreground hover:underline">← {L ? "शोक पत्र व वंश वृक्ष" : "Shok & family tree"}</Link>
          <h1 className="font-display text-2xl font-semibold">{L ? "सभी वंश वृक्ष" : "All family trees"}</h1>
          <p className="text-sm text-muted-foreground">{L ? `${families} परिवार · ${(q.data?.members ?? []).length} नाम। खींचकर खिसकाइए, पहिये या बटन से बड़ा-छोटा कीजिए, नाम पर दबाकर परिवार खोलिए।` : `${families} families · ${(q.data?.members ?? []).length} names. Drag to move, zoom with the wheel or buttons, click a name to open the family.`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => zoom(1.25)}>+</Button>
          <Button size="sm" variant="outline" onClick={() => zoom(0.8)}>−</Button>
          <Button size="sm" variant="outline" onClick={fit}>{L ? "पूरा दिखाएँ" : "Fit all"}</Button>
        </div>
      </div>
      <div className="relative max-w-md">
        <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder={L ? "नाम, परिवार या गाँव खोजिए" : "Search a name, family or village"} />
        {matches.length ? (
          <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-md border border-border bg-background shadow">
            {matches.map((p) => (
              <li key={p.id}><button type="button" className="block w-full px-3 py-1.5 text-left text-sm hover:bg-secondary" onClick={() => { centerOn(p.id); setTerm(""); }}>
                <b>{late(p)}</b> <span className="text-muted-foreground">— {[p.family_name, p.native_place || p.village_name].filter(Boolean).join(" · ")}</span>
              </button></li>
            ))}
          </ul>
        ) : null}
      </div>
      {q.isLoading ? <p className="text-muted-foreground">…</p> : q.error ? <p className="text-destructive">{(q.error as Error).message}</p> : !lay.all.length ? <p className="text-muted-foreground">{L ? "अभी कोई मंज़ूर वंश वृक्ष नहीं है।" : "No approved family trees yet."}</p> : (
        <div
          ref={box}
          className="h-[70vh] cursor-grab touch-none overflow-hidden rounded-xl border border-border bg-[#fffdf8] select-none active:cursor-grabbing"
          onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false }; (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId); }}
          onPointerMove={(e) => { const d = drag.current; if (!d) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true; if (d.moved) setView((v) => ({ ...v, x: d.vx + dx, y: d.vy + dy })); }}
          onPointerUp={() => { setTimeout(() => { drag.current = null; }, 0); }}
          onWheel={(e) => { const r = e.currentTarget.getBoundingClientRect(); zoom(e.deltaY < 0 ? 1.12 : 0.89, e.clientX - r.left, e.clientY - r.top); }}
        >
          <svg width="100%" height="100%" fontFamily="Mukta, 'Noto Sans Devanagari', sans-serif">
            <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
              {lay.all.filter((n) => n.kids.length).map((n) => {
                const px = n.x + NW / 2, my = n.y + NH + VG / 2;
                return n.kids.map((c) => <path key={c.id} d={`M${px} ${n.y + NH}V${my}H${c.x + NW / 2}V${c.y}`} fill="none" stroke={c.linked ? "#b8924a" : "#9aa3b5"} strokeWidth={1.3} strokeDasharray={c.linked ? "6 4" : undefined} />);
              })}
              {(mq.data ?? []).map((m) => {
                const a = lay.byId.get(m.daughter_id), b = lay.byId.get(m.husband_id);
                if (!a || !b) return null;
                const x1 = a.x + NW / 2, y1 = a.y + NH, x2 = b.x + NW / 2, y2 = b.y + NH, dip = Math.max(y1, y2) + 50;
                return <path key={m.daughter_id} d={`M${x1},${y1} C${x1},${dip} ${x2},${dip} ${x2},${y2}`} fill="none" stroke="#c2528b" strokeWidth={2} strokeDasharray="3 5"><title>{`${m.daughter_name} 💍 ${m.husband_name}`}</title></path>;
              })}
              {lay.roots.map((r) => <text key={`t${r.id}`} x={r.x} y={r.y - 12} fontSize={13} fontWeight={700} fill="#b8924a">{r.family_name}</text>)}
              {lay.all.map((n) => {
                const w = lay.wifeOf.get(n.id);
                const girl = n.member_kind === "daughter" || n.member_kind === "woman";
                return (
                  <g key={n.id} transform={`translate(${n.x},${n.y})`} style={{ cursor: "pointer" }} onClick={() => { if (drag.current?.moved) return; if (n.family_id) void nav({ to: "/shok/family/$id", params: { id: n.family_id } }); }}>
                    <rect width={NW} height={NH} rx={8} fill={hit === n.id ? "#fff3c4" : n.is_deceased ? "#f1efe9" : girl ? "#fdf1f4" : "#ffffff"} stroke={hit === n.id ? "#d97706" : n.is_head ? "#14213d" : "#b8924a"} strokeWidth={hit === n.id ? 3 : n.is_head ? 2.2 : 1.2} />
                    <text x={NW / 2} y={w ? 18 : 26} textAnchor="middle" fontSize={13} fontWeight={700} fill="#14213d">{cut(late(n), 18)}</text>
                    {w && !w.name_unknown ? <text x={NW / 2} y={34} textAnchor="middle" fontSize={10.5} fill="#6b7385">{cut((L ? "पत्नी: " : "Wife: ") + w.name, 22)}</text> : null}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      )}
      <p className="text-xs text-muted-foreground">{L ? "सुनहरी बिंदीदार रेखा = जुड़ा हुआ वंश (दूसरा परिवार); गुलाबी बिंदीदार रेखा = विवाह की कड़ी। इसमें मोबाइल नंबर नहीं दिखते।" : "Gold dashed line = linked lineage (another family); pink dotted line = marriage link. No phone numbers are shown."}</p>
    </section>
  );
}
