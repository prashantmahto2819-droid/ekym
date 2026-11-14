// Admin dashboard charts: one activity at a time over 7 / 30 / 90 days (bars, hover for the day), members by district,
// membership status split. Data: RPC k1_admin_trends (org team only). Plain SVG, no chart library.
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { useLang } from "@/core/i18n";
import { useTenant } from "@/core/tenant-context";
import { supabase } from "@/integrations/supabase/client";

type Day = { d: string; applied: number; approved: number; posts: number; donations: number; donation_count: number; chat: number; blood: number };
type Trends = { days: Day[]; districts: { name: string; n: number }[]; status: Record<string, number> };
type Metric = "applied" | "approved" | "posts" | "chat" | "donations" | "blood";

const METRICS: { k: Metric; hi: string; en: string; money?: boolean }[] = [
  { k: "applied", hi: "नए आवेदन", en: "Applications" },
  { k: "approved", hi: "मंज़ूर सदस्य", en: "Approved" },
  { k: "posts", hi: "चौपाल पोस्ट", en: "Posts" },
  { k: "chat", hi: "चैट संदेश", en: "Chat messages" },
  { k: "donations", hi: "दान (₹)", en: "Donations (₹)", money: true },
  { k: "blood", hi: "रक्त अनुरोध", en: "Blood requests" },
];
const STATUS: Record<string, [string, string, string]> = {
  active: ["सक्रिय", "Active", "bg-emerald-500"], applied: ["आवेदन बाकी", "Applied", "bg-amber-400"], rejected: ["अस्वीकार", "Rejected", "bg-rose-400"],
  suspended: ["निलंबित", "Suspended", "bg-slate-400"], expired: ["समाप्त", "Expired", "bg-slate-300"],
};
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export function AdminCharts() {
  const tenant = useTenant();
  const L = useLang().lang === "hi";
  const [days, setDays] = useState(30);
  const [metric, setMetric] = useState<Metric>("applied");
  const [hover, setHover] = useState<number | null>(null);
  const q = useQuery({
    queryKey: ["k1_admin_trends", tenant.organization_id, days],
    staleTime: 5 * 60_000,
    queryFn: async () => { const { data, error } = await supabase.rpc("k1_admin_trends" as never, { p_org: tenant.organization_id, p_days: days } as never); if (error) throw new Error(error.message); return data as unknown as Trends; },
  });
  const rows = q.data?.days ?? [];
  const totals = useMemo(() => Object.fromEntries(METRICS.map((m) => [m.k, rows.reduce((a, r) => a + Number(r[m.k] ?? 0), 0)])) as Record<Metric, number>, [rows]);
  const m = METRICS.find((x) => x.k === metric)!;
  const vals = rows.map((r) => Number(r[metric] ?? 0));
  const max = Math.max(1, ...vals);
  const nice = niceMax(max);
  const W = 900, H = 230, P = { l: 36, r: 8, t: 10, b: 22 };
  const bw = (W - P.l - P.r) / Math.max(1, vals.length);
  const y = (v: number) => P.t + (H - P.t - P.b) * (1 - v / nice);
  const fmt = (v: number) => (m.money ? inr(v) : v.toLocaleString("en-IN"));
  const label = (iso: string) => new Date(iso).toLocaleDateString(L ? "hi-IN" : "en-IN", { day: "numeric", month: "short" });
  const tickEvery = vals.length > 60 ? 15 : vals.length > 20 ? 7 : 1;
  const st = q.data?.status ?? {};
  const stTotal = Object.values(st).reduce((a, b) => a + b, 0);
  const dist = q.data?.districts ?? [];
  const dMax = Math.max(1, ...dist.map((d) => d.n));

  if (q.isError) return null; // not on the org team → no charts
  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_20rem]">
      <div className="surface-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">{L ? "गतिविधि" : "Activity"}</h2>
          <div className="flex rounded-md border border-border p-0.5 text-xs">
            {[7, 30, 90].map((d) => <button key={d} type="button" onClick={() => setDays(d)} className={`rounded px-2.5 py-1 ${days === d ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>{d} {L ? "दिन" : "days"}</button>)}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {METRICS.map((x) => (
            <button key={x.k} type="button" onClick={() => setMetric(x.k)} className={`rounded-lg border p-2 text-left transition ${metric === x.k ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-secondary/60"}`}>
              <p className="truncate text-[11px] text-muted-foreground">{L ? x.hi : x.en}</p>
              <p className="font-display text-lg font-semibold tabular-nums">{q.isLoading ? "…" : x.money ? inr(totals[x.k] ?? 0) : (totals[x.k] ?? 0).toLocaleString("en-IN")}</p>
            </button>
          ))}
        </div>
        <div className="relative mt-3" onMouseLeave={() => setHover(null)}>
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${L ? m.hi : m.en}: ${fmt(totals[metric] ?? 0)}`}>
            {[0, 0.5, 1].map((f) => <g key={f}><line x1={P.l} x2={W - P.r} y1={y(nice * f)} y2={y(nice * f)} stroke="currentColor" className="text-border" strokeDasharray={f ? "3 3" : undefined} /><text x={P.l - 4} y={y(nice * f) + 3} textAnchor="end" className="fill-muted-foreground text-[9px]">{m.money ? compactInr(nice * f) : Math.round(nice * f)}</text></g>)}
            {vals.map((v, i) => (
              <g key={rows[i]!.d} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)}>
                <rect x={P.l + i * bw} y={P.t} width={bw} height={H - P.t - P.b} fill="transparent" />
                <rect x={P.l + i * bw + Math.min(2, bw * 0.15)} y={y(v)} width={Math.max(1, bw - Math.min(4, bw * 0.3))} height={Math.max(0, H - P.b - y(v))} rx={Math.min(3, bw / 4)} className={hover === i ? "fill-primary" : "fill-primary/60"} />
                {i % tickEvery === 0 ? <text x={P.l + i * bw + bw / 2} y={H - 6} textAnchor="middle" className="fill-muted-foreground text-[9px]">{label(rows[i]!.d)}</text> : null}
              </g>
            ))}
          </svg>
          {hover !== null && rows[hover] ? (
            <div className="pointer-events-none absolute top-0 rounded-md border border-border bg-popover px-2 py-1 text-xs shadow" style={{ left: `clamp(0px, calc(${((P.l + hover * bw + bw / 2) / W) * 100}% - 60px), calc(100% - 120px))` }}>
              <p className="font-semibold">{new Date(rows[hover]!.d).toLocaleDateString(L ? "hi-IN" : "en-IN", { weekday: "short", day: "numeric", month: "short" })}</p>
              <p>{L ? m.hi : m.en}: <b>{fmt(vals[hover] ?? 0)}</b></p>
            </div>
          ) : null}
          {!q.isLoading && (totals[metric] ?? 0) === 0 ? <p className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">{L ? `पिछले ${days} दिन में कुछ नहीं` : `Nothing in the last ${days} days`}</p> : null}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{L ? "औसत प्रतिदिन" : "Daily average"}: <b>{m.money ? inr((totals[metric] ?? 0) / Math.max(1, vals.length)) : ((totals[metric] ?? 0) / Math.max(1, vals.length)).toFixed(1)}</b> · {L ? "सबसे ज़्यादा" : "Peak"}: <b>{fmt(Math.max(0, ...vals))}</b></p>
      </div>
      <div className="space-y-4">
        <div className="surface-card p-4">
          <h3 className="font-display font-semibold">{L ? "सदस्यता की स्थिति" : "Membership status"}</h3>
          {stTotal ? <>
            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-secondary">{Object.entries(st).map(([k, n]) => <div key={k} className={STATUS[k]?.[2] ?? "bg-slate-400"} style={{ width: `${(n / stTotal) * 100}%` }} title={`${STATUS[k]?.[L ? 0 : 1] ?? k}: ${n}`} />)}</div>
            <ul className="mt-2 space-y-1 text-sm">{Object.entries(st).sort((a, b) => b[1] - a[1]).map(([k, n]) => <li key={k} className="flex items-center gap-2"><span className={`size-2.5 rounded-full ${STATUS[k]?.[2] ?? "bg-slate-400"}`} /><span className="flex-1">{STATUS[k]?.[L ? 0 : 1] ?? k}</span><b className="tabular-nums">{n}</b></li>)}</ul>
          </> : <p className="mt-2 text-sm text-muted-foreground">{q.isLoading ? "…" : L ? "अभी कोई सदस्य नहीं" : "No members yet"}</p>}
        </div>
        <div className="surface-card p-4">
          <h3 className="font-display font-semibold">{L ? "ज़िले के अनुसार सदस्य" : "Members by district"}</h3>
          <ul className="mt-3 space-y-1.5 text-sm">
            {dist.map((d) => (
              <li key={d.name}>
                <div className="flex justify-between gap-2"><span className="truncate">{d.name === "—" ? (L ? "दर्ज नहीं" : "Not given") : d.name}</span><b className="tabular-nums">{d.n}</b></div>
                <div className="mt-0.5 h-1.5 rounded-full bg-secondary"><div className="h-full rounded-full bg-primary/70" style={{ width: `${(d.n / dMax) * 100}%` }} /></div>
              </li>
            ))}
            {q.isSuccess && !dist.length ? <li className="text-muted-foreground">{L ? "अभी कोई सक्रिय सदस्य नहीं" : "No active members yet"}</li> : null}
          </ul>
        </div>
      </div>
    </section>
  );
}

function niceMax(v: number) {
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}
function compactInr(n: number) {
  if (n >= 1e7) return `${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}k`;
  return String(Math.round(n));
}
