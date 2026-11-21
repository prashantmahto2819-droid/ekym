// सभी वंश वृक्ष एक पन्ने पर + खोज — हर संस्था के लिए (उसी संस्था के मंज़ूर वृक्ष)।
// "रिश्ता खोजें": दो नाम चुनने पर रिश्ता (जुड़े हुए वंश और विवाह की कड़ी समेत)।
// जमावट: गाँव-वार कतारें (गाँव का शीर्षक + गिनती), हर वंश अपने डिब्बे में; दूर से देखने पर शीर्षक बड़े होते हैं।
// खोज: गाँव, परिवार और लोग — सबसे सटीक ऊपर, हर नाम के साथ पिता / पति, परिवार, गाँव (शोकपत्र ऐप के forest.js जैसा)।
// खिसकाना (खींचकर), बड़ा-छोटा (पहिया / बटन), नाम खोजना; नाम पर दबाने से उसका परिवार खुलता है।
import type { SupabaseClient } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

import { lineageRoot, relation } from "@/components/family/relation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLang } from "@/core/i18n";
import { useTenant } from "@/core/tenant-context";
import { normName } from "@/family/hindi";
import type { Person } from "@/family/layout";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as unknown as SupabaseClient;

export const Route = createFileRoute("/_authenticated/shok/forest")({ component: ForestPage });

type Link2 = { child_family_id: string; parent_member_id: string };
type Marriage = { daughter_id: string; husband_id: string; daughter_name: string; husband_name: string };
type N = Person & { kids: N[]; w: number; x: number; y: number; d: number; linked?: boolean };
const NW = 150, NH = 44, HG = 14, VG = 40, CP = 18, CT = 54;
type Card = { r: N; x: number; y: number; w: number; h: number; people: number; label: string };
type Head = { vil: string; x: number; y: number; n: number; people: number };
const norm = normName; // अंग्रेज़ी अक्षरों में लिखा नाम भी हिंदी नाम से मिलता है
const cut = (t: string, n: number) => { const a = [...t]; return a.length > n ? a.slice(0, n - 1).join("") + "…" : t; };

function layout(members: Person[], links: Link2[]) {
  const wifeOf = new Map<string, Person>();
  for (const p of members) if (p.member_kind === "spouse" && p.parent_id) wifeOf.set(p.parent_id, p);
  const byId = new Map<string, N>();
  for (const p of members) if (p.member_kind !== "spouse") byId.set(p.id, { ...p, kids: [], w: 0, x: 0, y: 0, d: 0 });
  const linkOf = new Map(links.map((l) => [l.child_family_id, l.parent_member_id] as const));
  const roots: N[] = [];
  const up = new Map<string, Person>(); // हर व्यक्ति, जुड़े वंश का पिता समेत — रिश्ता गिनने के लिए
  for (const n of byId.values()) {
    let par = n.parent_id ? byId.get(n.parent_id) : undefined;
    if (!par && n.family_id && linkOf.has(n.family_id)) { par = byId.get(linkOf.get(n.family_id)!); if (par) n.linked = true; }
    if (par && par !== n) { par.kids.push(n); up.set(n.id, { ...n, kids: [], parent_id: par.id } as Person); } else { roots.push(n); up.set(n.id, { ...n, kids: [], parent_id: null } as Person); }
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
  // गाँव-वार कतारें; हर वंश अपने डिब्बे में
  const count = (n: N): number => 1 + (wifeOf.has(n.id) ? 1 : 0) + n.kids.reduce((a, c) => a + count(c), 0);
  const groups = new Map<string, N[]>();
  for (const r of roots) { prep(r, 0); const v = r.village_name || "—"; groups.set(v, [...(groups.get(v) ?? []), r]); }
  const vils = [...groups.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], "hi"));
  const ROW = Math.max(2200, Math.sqrt(roots.reduce((a, r) => a + r.w + 80, 0) * 1100) * 1.5);
  const cards: Card[] = [], heads: Head[] = [];
  let y = 40, W = 0;
  for (const [vil, list] of vils) {
    list.sort((a, b) => b.w - a.w);
    heads.push({ vil, x: 30, y: y + 34, n: list.length, people: list.reduce((a, r) => a + count(r), 0) });
    y += 34 + 66;
    let x = 30, rowH = 0;
    for (const r of list) {
      if (x > 30 && x + r.w > ROW) { x = 30; y += rowH + CT + 60; rowH = 0; }
      place(r, x + CP, y + CT);
      const hgt = depth(r) * (NH + VG) - VG, people = count(r);
      cards.push({ r, x, y, w: r.w + CP * 2, h: hgt + CT + CP, people, label: r.family_name ?? "" });
      x += r.w + CP * 2 + 34; W = Math.max(W, x); rowH = Math.max(rowH, hgt + CP);
    }
    y += rowH + CT + 80;
  }
  return { all, roots, wifeOf, W: Math.max(W, 600), H: y + 40, byId, up, cards, heads };
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
  const fq = useQuery({ queryKey: ["k1_families_org", tenant.organization_id, "forest"], staleTime: 120000, queryFn: async () => { const { data } = await sb.rpc("k1_families", { p_org: tenant.organization_id, p_limit: 500 }); return (data ?? []) as { id: string; mine: boolean }[]; } });
  const lay = useMemo(() => layout(q.data?.members ?? [], q.data?.links ?? []), [q.data]);
  const [view, setView] = useState({ x: 0, y: 0, k: 0.7 });
  const [term, setTerm] = useState("");
  const [hit, setHit] = useState<string | null>(null);
  const [relMode, setRelMode] = useState(false);
  const [pick, setPick] = useState<string[]>([]);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const late = (p: Person) => (p.is_deceased ? (L ? "स्व. " : "Late ") : "") + p.name;
  type Hit = { key: string; sc: number; title: string; badge: string; sub: string; go: () => void };
  const matches = useMemo<Hit[]>(() => {
    const words = term.trim().split(/\s+/).map(norm).filter(Boolean);
    if (words.join("").length < 2) return [];
    const score = (text: string | null | undefined) => { const t = norm(text); if (!t) return 0; let sc = 0; for (const w of words) { const i = t.indexOf(w); if (i < 0) return 0; sc += i === 0 ? 3 : 1; } return sc + (t === words.join("") ? 4 : 0); };
    const rows: Hit[] = [];
    for (const h of lay.heads) { const sc = score(h.vil); if (sc) rows.push({ key: `v${h.vil}`, sc: sc + 5, title: h.vil, badge: L ? "गाँव" : "Village", sub: L ? `${h.n} परिवार · ${h.people} लोग` : `${h.n} families · ${h.people} people`, go: () => setView({ k: 0.55, x: 20 - h.x * 0.55, y: 20 - (h.y - 40) * 0.55 }) }); }
    for (const c of lay.cards) { const sc = score(c.label); if (sc) rows.push({ key: `f${c.r.id}`, sc: sc + 3, title: c.label, badge: L ? "परिवार" : "Family", sub: [c.r.village_name, L ? `${c.people} लोग` : `${c.people} people`].filter(Boolean).join(" · "), go: () => centerOn(c.r.id, 0.8, true) }); }
    for (const p of q.data?.members ?? []) {
      if (p.name_unknown) continue;
      const sc = score(p.name) || (words.length > 1 ? score(`${p.name} ${p.family_name ?? ""} ${p.village_name ?? ""} ${p.native_place ?? ""}`) / 2 : 0);
      if (!sc) continue;
      const par = p.parent_id ? lay.up.get(p.parent_id) ?? lay.byId.get(p.parent_id) : undefined;
      const wife = p.member_kind === "spouse";
      const rel = par && !par.name_unknown ? (wife ? (L ? "पति: " : "Husband: ") : (L ? "पिता: " : "Father: ")) + late(par) : "";
      rows.push({ key: p.id, sc: sc + (p.is_head ? 0.5 : 0), title: late(p), badge: wife ? (L ? "पत्नी" : "Wife") : p.member_kind === "daughter" ? (L ? "पुत्री" : "Daughter") : p.is_head ? (L ? "मुखिया" : "Head") : "", sub: [rel, p.family_name, p.village_name || p.native_place].filter(Boolean).join(" · "), go: () => centerOn(p.id) });
    }
    return rows.sort((a, b) => b.sc - a.sc || a.title.localeCompare(b.title, "hi"));
  }, [term, q.data, lay, L]);

  function centerOn(id: string, zoomTo = 1, top = false) {
    let n = lay.byId.get(id);
    if (!n) { const p = (q.data?.members ?? []).find((m) => m.id === id); if (p?.parent_id) n = lay.byId.get(p.parent_id); } // पत्नी → पति का डिब्बा
    if (!n || !box.current) return;
    const k = zoomTo;
    setView({ k, x: box.current.clientWidth / 2 - (n.x + NW / 2) * k, y: (top ? 110 : box.current.clientHeight / 2) - (n.y + NH / 2) * k });
    setHit(n.id);
  }
  // अपना परिवार: उस परिवार का सबसे ऊपर वाला नाम
  const myTop = useMemo(() => {
    const ids = new Set((fq.data ?? []).filter((f) => f.mine).map((f) => f.id));
    let best: N | undefined;
    for (const n of lay.all) if (n.family_id && ids.has(n.family_id) && (!best || n.d < best.d)) best = n;
    return best?.id ?? null;
  }, [fq.data, lay]);
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || !myTop || !box.current) return;
    opened.current = true;
    centerOn(myTop, 0.8, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myTop, q.data]);
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

  const relText = useMemo(() => {
    const a = pick[0] ? lay.up.get(pick[0]) : undefined, b = pick[1] ? lay.up.get(pick[1]) : undefined;
    if (!a || !b) return "";
    const ra = lineageRoot(a, lay.up), rb = lineageRoot(b, lay.up);
    if (ra === rb) return relation(a, b, lay.up, L);
    const m = (mq.data ?? []).find((x) => {
      const d = lay.up.get(x.daughter_id), h = lay.up.get(x.husband_id);
      if (!d || !h) return false;
      const rd = lineageRoot(d, lay.up), rh = lineageRoot(h, lay.up);
      return (rd === ra && rh === rb) || (rd === rb && rh === ra);
    });
    if (m) return L ? `ये दोनों अलग वंश के हैं, पर विवाह से संबंधी हैं: ${m.daughter_name} का विवाह ${m.husband_name} से हुआ है।` : `These two are of different lineages but related by marriage: ${m.daughter_name} is married to ${m.husband_name}.`;
    return L ? "इन दोनों के बीच कोई साझा पूर्वज या विवाह की कड़ी दर्ज नहीं है।" : "No common ancestor or marriage link is recorded between these two.";
  }, [pick, lay, mq.data, L]);

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
          {myTop ? <Button size="sm" variant="outline" onClick={() => centerOn(myTop, 0.8, true)}>🏠 {L ? "मेरा परिवार" : "My family"}</Button> : null}
          <Button size="sm" variant={relMode ? "default" : "outline"} onClick={() => { setRelMode((v) => !v); setPick([]); }}>🔗 {relMode ? (L ? "रिश्ता खोजना बंद करें" : "Stop finding relations") : (L ? "रिश्ता खोजें" : "Find a relation")}</Button>
        </div>
      </div>
      <div className="relative max-w-md">
        <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder={L ? "नाम, परिवार या गाँव खोजिए" : "Search a name, family or village"} />
        {term.trim().length >= 2 ? (
          <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-background shadow-lg">
            <p className="px-3 py-1.5 text-xs text-muted-foreground">{matches.length ? (matches.length > 14 ? (L ? `${matches.length} मिले — पहले 14; और शब्द लिखकर छाँटिए` : `${matches.length} found — first 14; add a word to narrow`) : (L ? `${matches.length} मिले` : `${matches.length} found`)) : (L ? "कोई नहीं मिला। पिता का नाम या गाँव लिखकर देखिए।" : "Nothing found. Try the father's name or the village.")}</p>
            <ul className="max-h-80 overflow-auto">
              {matches.slice(0, 14).map((m) => (
                <li key={m.key} className="border-t border-border"><button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-secondary" onClick={() => { m.go(); setTerm(""); }}>
                  <b>{m.title}</b>{m.badge ? <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[11px]">{m.badge}</span> : null}
                  {m.sub ? <span className="block text-xs text-muted-foreground">{m.sub}</span> : null}
                </button></li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      {relMode ? (
        <p className="rounded-md bg-secondary p-2 text-sm">
          {pick.length < 2
            ? (L ? `किन्हीं दो नामों पर दबाइए (${pick.length}/2 चुने)।` : `Click any two names (${pick.length}/2 chosen).`)
            : relText}
          {pick.length ? <button type="button" className="ml-2 underline" onClick={() => setPick([])}>{L ? "फिर से चुनें" : "Choose again"}</button> : null}
        </p>
      ) : null}
      {q.isLoading ? <p className="text-muted-foreground">…</p> : q.error ? <p className="text-destructive">{(q.error as Error).message}</p> : !lay.all.length ? <p className="text-muted-foreground">{L ? "अभी कोई मंज़ूर वंश वृक्ष नहीं है।" : "No approved family trees yet."}</p> : (
        <div
          ref={box}
          className="h-[70vh] cursor-grab touch-none overflow-hidden rounded-xl border border-border bg-[#f7f6f2] select-none active:cursor-grabbing"
          onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false }; (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId); }}
          onPointerMove={(e) => { const d = drag.current; if (!d) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true; if (d.moved) setView((v) => ({ ...v, x: d.vx + dx, y: d.vy + dy })); }}
          onPointerUp={() => { setTimeout(() => { drag.current = null; }, 0); }}
          onWheel={(e) => { const r = e.currentTarget.getBoundingClientRect(); zoom(e.deltaY < 0 ? 1.12 : 0.89, e.clientX - r.left, e.clientY - r.top); }}
        >
          <svg width="100%" height="100%" fontFamily="Mukta, 'Noto Sans Devanagari', sans-serif">
            <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
              {lay.heads.map((h) => (
                <g key={`v${h.vil}`}>
                  <text x={h.x} y={h.y} fontSize={Math.min(150, Math.max(26, 26 / view.k))} fill="#14213d">{h.vil}<tspan dx={12} fontSize="0.5em" fill="#6b7385">{L ? `${h.n} परिवार · ${h.people} लोग` : `${h.n} families · ${h.people} people`}</tspan></text>
                  <line x1={h.x} y1={h.y + 14} x2={lay.W} y2={h.y + 14} stroke="#d8d2c2" strokeWidth={1.5} />
                </g>
              ))}
              {lay.cards.map((c) => {
                const label = `${c.label} · ${c.people} ${L ? "लोग" : "people"}`;
                const fs = Math.min(34, Math.max(15, (c.w - 24) / ([...label].length * 0.62)), Math.max(15, 15 / view.k));
                return (
                  <g key={`c${c.r.id}`}>
                    <rect x={c.x} y={c.y} width={c.w} height={c.h} rx={16} fill="#ffffff" stroke="#e3ddcd" strokeWidth={1.5} />
                    <rect x={c.x} y={c.y} width={c.w} height={6} rx={3} fill="#b8924a" />
                    <text x={c.x + 14} y={c.y + 30} fontSize={fs} fontWeight={700} fill="#8a6a2c">{label}</text>
                  </g>
                );
              })}
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
              {lay.all.filter((n) => n.linked).map((n) => <text key={`t${n.id}`} x={n.x} y={n.y - 8} fontSize={12} fontWeight={700} fill="#b8924a">↳ {n.family_name}</text>)}
              {lay.all.map((n) => {
                const w = lay.wifeOf.get(n.id);
                const girl = n.member_kind === "daughter" || n.member_kind === "woman";
                return (
                  <g key={n.id} transform={`translate(${n.x},${n.y})`} style={{ cursor: "pointer" }} onClick={() => { if (drag.current?.moved) return; if (relMode) { setPick((v) => (v.includes(n.id) ? v.filter((i) => i !== n.id) : v.length >= 2 ? [n.id] : [...v, n.id])); return; } if (n.family_id) void nav({ to: "/shok/family/$id", params: { id: n.family_id } }); }}>
                    <rect width={NW} height={NH} rx={8} fill={pick.includes(n.id) ? "#dbeafe" : hit === n.id ? "#fff3c4" : n.is_deceased ? "#f1efe9" : girl ? "#fdf1f4" : "#ffffff"} stroke={pick.includes(n.id) ? "#1d4ed8" : hit === n.id ? "#d97706" : n.is_head ? "#14213d" : "#b8924a"} strokeWidth={pick.includes(n.id) || hit === n.id ? 3 : n.is_head ? 2.2 : 1.2} />
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
