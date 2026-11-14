// Admin → Community → "व्यापार पैकेज": approve offline-paid plan requests (UTR / screenshot), payment details (QR / UPI / bank),
// plan prices and limits, and free plan grants (launch offers).
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { inr, planName, usePaySettings, usePlans, type BizPage, type BoostOrder, type PaySettings, type Plan, type Revenue, type Sub } from "@/components/business/biz";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { call, uploadCommunityImage } from "@/community/chat";
import { useAuth } from "@/hooks/use-auth";

const MODE: Record<string, string> = { upi: "UPI / QR", bank: "बैंक ट्रांसफ़र", cash: "नकद", grant: "मुफ़्त (एडमिन)" };
const STATUS: Record<string, string> = { pending: "मंज़ूरी बाकी", approved: "मंज़ूर", rejected: "अस्वीकार", cancelled: "रद्द" };
const d = (x: string | null | undefined) => (x ? new Date(x).toLocaleDateString("hi-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");

export function BizAdmin({ org }: { org: string }) {
  const [tab, setTab] = useState<"requests" | "boosts" | "pay" | "plans" | "grant" | "revenue">("requests");
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">व्यापार पेज के पेड पैकेज अभी ऑफ़लाइन भुगतान (QR / UPI / बैंक / नकद) से चलते हैं। सदस्य भुगतान करके UTR भरता है, आप भुगतान जाँचकर मंज़ूर करते हैं — पैकेज उसी समय चालू होता है और सदस्य को WhatsApp पर सूचना जाती है।</p>
      <div className="flex w-fit flex-wrap rounded-md border border-border p-0.5 text-xs">
        {([["requests", "पैकेज अनुरोध"], ["boosts", "बूस्ट अनुरोध"], ["revenue", "कमाई रिपोर्ट"], ["pay", "भुगतान की जानकारी"], ["plans", "पैकेज व कीमत"], ["grant", "मुफ़्त पैकेज दें"]] as const).map(([k, l]) => <button key={k} type="button" onClick={() => setTab(k)} className={`rounded px-3 py-1 ${tab === k ? "bg-primary text-primary-foreground" : ""}`}>{l}</button>)}
      </div>
      {tab === "requests" ? <Requests org={org} /> : tab === "boosts" ? <BoostRequests org={org} /> : tab === "revenue" ? <RevenueReport org={org} /> : tab === "pay" ? <PayForm org={org} /> : tab === "plans" ? <PlansForm org={org} /> : <Grant org={org} />}
    </div>
  );
}

function Requests({ org }: { org: string }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState("pending");
  const q = useQuery({ queryKey: ["biz_subs_admin", org, status], queryFn: () => call<Sub[]>("biz_subscriptions_admin", { p_org: org, p_status: status || null }) });
  const [busy, setBusy] = useState<string | null>(null);
  async function decide(s: Sub, ok: boolean) {
    const note = ok ? null : prompt("अस्वीकार करने का कारण (सदस्य को WhatsApp पर जाएगा)");
    if (!ok && !note) return;
    if (ok && !confirm(`${s.page_name} — ${planName(s.plan, true)} (${s.period === "year" ? "साल" : "महीना"}) ${inr(s.amount)}\nभुगतान ${s.pay_ref ? `UTR ${s.pay_ref}` : MODE[s.pay_mode]} मिल गया है? मंज़ूर करें?`)) return;
    setBusy(s.id);
    try { await call("biz_decide_subscription", { p_id: s.id, p_approve: ok, p_note: note }); toast.success(ok ? "मंज़ूर — पैकेज चालू" : "अस्वीकार किया"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(null); void qc.invalidateQueries({ queryKey: ["biz_subs_admin"] }); }
  }
  const rows = q.data ?? [];
  return (
    <div className="space-y-2">
      <div className="flex gap-2 text-xs">{["pending", "approved", "rejected", ""].map((x) => <button key={x} type="button" onClick={() => setStatus(x)} className={`rounded-full border px-3 py-1 ${status === x ? "border-primary bg-primary/10" : "border-border"}`}>{x ? STATUS[x] : "सभी"}</button>)}</div>
      {rows.map((s) => (
        <div key={s.id} className="flex flex-wrap items-start gap-3 rounded-lg border border-border bg-background p-3 text-sm">
          {s.pay_proof_url ? <a href={s.pay_proof_url} target="_blank" rel="noreferrer" title="भुगतान का स्क्रीनशॉट"><img src={s.pay_proof_url} alt="" className="h-20 w-20 rounded-md object-cover ring-1 ring-border" /></a> : null}
          <div className="min-w-0 flex-1 space-y-0.5">
            <p><Link to="/business/$slug" params={{ slug: s.page_slug ?? "" }} className="font-semibold hover:underline">{s.page_name}</Link> · {s.owner_name}{s.owner_phone ? ` · ${s.owner_phone}` : ""}</p>
            <p><b>{planName(s.plan, true)}</b> · {s.period === "year" ? "1 साल" : "1 महीना"} · <b>{inr(s.amount)}</b> · {MODE[s.pay_mode]}{s.pay_ref ? <> · UTR <code className="rounded bg-secondary px-1">{s.pay_ref}</code></> : null} · भुगतान {d(s.paid_on)}</p>
            {s.buyer_gstin || s.buyer_name ? <p className="text-xs text-muted-foreground">बिल: {[s.buyer_name, s.buyer_gstin ? `GSTIN ${s.buyer_gstin}` : null, s.buyer_address].filter(Boolean).join(" · ")}</p> : null}
            <p className="text-xs text-muted-foreground">अनुरोध {d(s.created_at)} · {STATUS[s.status]}{s.decided_by_name ? ` (${s.decided_by_name}, ${d(s.decided_at)})` : ""}{s.ends_at ? ` · वैध ${d(s.ends_at)} तक` : ""}{s.admin_note ? ` · ${s.admin_note}` : ""}</p>
          </div>
          {s.status === "pending" ? <div className="flex gap-1"><Button size="sm" disabled={busy === s.id} onClick={() => void decide(s, true)}>भुगतान मिला — मंज़ूर करें</Button><Button size="sm" variant="outline" disabled={busy === s.id} onClick={() => void decide(s, false)}>अस्वीकार</Button></div> : null}
        </div>
      ))}
      {q.isSuccess && !rows.length ? <p className="text-sm text-muted-foreground">कुछ नहीं।</p> : null}
    </div>
  );
}

function PayForm({ org }: { org: string }) {
  const { user } = useAuth();
  const q = usePaySettings();
  const qc = useQueryClient();
  const [f, setF] = useState<PaySettings>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (q.data) setF(q.data); }, [q.data]);
  async function upload(file: File | undefined) {
    if (!file || !user) return; setBusy(true);
    try { const url = await uploadCommunityImage(file, `${org}/biz/${user.id}`, 900); setF((x) => ({ ...x, qr_url: url })); } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); } finally { setBusy(false); }
  }
  async function save() {
    setBusy(true);
    try { await call("biz_pay_settings_save", { p_org: org, p: f }); toast.success("सहेजा"); void qc.invalidateQueries({ queryKey: ["biz_pay_settings"] }); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  }
  return (
    <div className="grid max-w-3xl gap-4 rounded-lg border border-border bg-background p-4 text-sm md:grid-cols-[200px_1fr]">
      <div className="space-y-2">
        {f.qr_url ? <img src={f.qr_url} alt="QR" className="size-48 rounded-lg bg-white object-contain p-2 ring-1 ring-border" /> : <div className="grid size-48 place-items-center rounded-lg bg-secondary text-xs text-muted-foreground">QR नहीं लगा</div>}
        <label className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-border px-3 py-1.5 hover:bg-secondary"><ImagePlus className="size-4" />{busy ? "…" : "QR फोटो लगाएँ"}<input type="file" accept="image/*" hidden onChange={(e) => void upload(e.target.files?.[0])} /></label>
      </div>
      <div className="space-y-3">
        <label className="block space-y-1"><span className="font-medium">किसके नाम भुगतान (Payee)</span><Input value={f.payee_name ?? ""} onChange={(e) => setF({ ...f, payee_name: e.target.value })} placeholder="Vivid Brandify" /></label>
        <label className="block space-y-1"><span className="font-medium">UPI ID</span><Input value={f.upi_id ?? ""} onChange={(e) => setF({ ...f, upi_id: e.target.value })} placeholder="vividbrandify@okhdfcbank" /></label>
        <label className="block space-y-1"><span className="font-medium">बैंक खाता (वैकल्पिक)</span><Textarea rows={3} value={f.bank_text ?? ""} onChange={(e) => setF({ ...f, bank_text: e.target.value })} placeholder={"खाता नाम: …\nखाता नंबर: …\nIFSC: …"} /></label>
        <div className="grid grid-cols-3 gap-2 rounded-md bg-secondary/50 p-2">
          <p className="col-span-3 text-xs font-semibold">🚀 एक पोस्ट बूस्ट (हर पेज के लिए, मुफ़्त वाले भी)</p>
          <label className="space-y-1"><span className="text-xs">कीमत (₹)</span><Input type="number" value={String(f.boost_price ?? 99)} onChange={(e) => setF({ ...f, boost_price: Number(e.target.value) })} /></label>
          <label className="space-y-1"><span className="text-xs">कितने लोगों तक</span><Input type="number" value={String(f.boost_reach ?? 1000)} onChange={(e) => setF({ ...f, boost_reach: Number(e.target.value) })} /></label>
          <label className="space-y-1"><span className="text-xs">कितने दिन</span><Input type="number" value={String(f.boost_days ?? 3)} onChange={(e) => setF({ ...f, boost_days: Number(e.target.value) })} /></label>
        </div>
        <label className="block space-y-1"><span className="font-medium">सदस्यों के लिए नोट</span><Input value={f.note ?? ""} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="भुगतान के 24 घंटे में पैकेज चालू होगा। GST बिल चाहिए तो GSTIN भरें।" /></label>
        <Button onClick={() => void save()} disabled={busy}>सहेजें</Button>
      </div>
    </div>
  );
}

function PlansForm({ org }: { org: string }) {
  const q = usePlans();
  const qc = useQueryClient();
  const [rows, setRows] = useState<Plan[]>([]);
  useEffect(() => { if (q.data) setRows(q.data); }, [q.data]);
  const set = (k: string, f: keyof Plan, v: unknown) => setRows((r) => r.map((p) => (p.key === k ? { ...p, [f]: v } : p)));
  async function save(p: Plan) {
    try { await call("biz_plan_save", { p_org: org, p_key: p.key, p }); toast.success(`${p.name_hi} सहेजा`); void qc.invalidateQueries({ queryKey: ["biz_plans"] }); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  const field = (p: Plan, f: keyof Plan, label: string) => <label key={f} className="space-y-1"><span className="text-xs text-muted-foreground">{label}</span><Input type="number" value={String(p[f] ?? "")} onChange={(e) => set(p.key, f, e.target.value === "" ? "" : Number(e.target.value))} /></label>;
  return (
    <div className="grid max-w-4xl gap-4 md:grid-cols-2">
      {rows.map((p) => (
        <div key={p.key} className="space-y-3 rounded-lg border border-border bg-background p-4 text-sm">
          <div className="flex items-center justify-between"><p className="font-display text-lg font-semibold">{p.name_hi}</p><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={p.active} onChange={(e) => set(p.key, "active", e.target.checked)} /> चालू</label></div>
          <div className="grid grid-cols-2 gap-2">
            {field(p, "price_month", "कीमत / महीना (₹)")}{field(p, "price_year", "कीमत / साल (₹)")}
            {field(p, "daily_posts", "रोज़ की पोस्ट")}{field(p, "sponsored_per_month", "प्रायोजित पोस्ट / महीना")}
            {field(p, "sponsored_reach", "एक प्रायोजित पोस्ट की पहुँच (लोग)")}{field(p, "sponsored_days", "प्रायोजित कितने दिन")}
            {field(p, "managers", "मैनेजर (कितने लोग)")}{field(p, "board_days", "बोर्ड पर विज्ञापन कार्ड (दिन/महीना)")}
          </div>
          <Button size="sm" onClick={() => void save(p)}>सहेजें</Button>
        </div>
      ))}
      <p className="text-xs text-muted-foreground md:col-span-2">बदली कीमत नए अनुरोधों पर लागू होती है; पहले से चल रहे पैकेज वैसे ही चलते रहेंगे। रोज़ की पोस्ट और प्रायोजित सीमा तुरंत सब पेड पेजों पर लागू होती है।</p>
    </div>
  );
}

function Grant({ org }: { org: string }) {
  const [qText, setQText] = useState("");
  const pages = useQuery({ queryKey: ["biz_directory", org, "grant", qText], queryFn: () => call<BizPage[]>("biz_directory", { p_org: org, p_q: qText.trim() || null, p_category: null, p_city: null, p_offset: 0, p_limit: 30 }) });
  const [page, setPage] = useState<BizPage | null>(null);
  const [plan, setPlan] = useState<"silver" | "gold">("silver");
  const [months, setMonths] = useState(1);
  const [note, setNote] = useState("शुरुआती ऑफ़र");
  const qc = useQueryClient();
  async function go() {
    if (!page) return;
    if (!confirm(`${page.name} को ${planName(plan, true)} पैकेज ${months} महीने मुफ़्त दें?`)) return;
    try { await call("biz_grant_plan", { p_page: page.id, p_plan: plan, p_months: months, p_note: note }); toast.success("पैकेज दिया गया"); setPage(null); void qc.invalidateQueries({ queryKey: ["biz_directory"] }); void qc.invalidateQueries({ queryKey: ["biz_subs_admin"] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  return (
    <div className="max-w-3xl space-y-3 rounded-lg border border-border bg-background p-4 text-sm">
      <p className="text-muted-foreground">शुरुआती ऑफ़र, समाज की सेवा या किसी कारण से किसी व्यापार पेज को बिना भुगतान पैकेज दें। यह "अनुरोध → मंज़ूर" सूची में ₹0 (मुफ़्त) के रूप में दर्ज होगा।</p>
      <Input placeholder="व्यापार का नाम खोजें…" value={qText} onChange={(e) => setQText(e.target.value)} />
      <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
        {(pages.data ?? []).map((b) => <button key={b.id} type="button" onClick={() => setPage(b)} className={`flex justify-between rounded-md border px-3 py-1.5 text-left ${page?.id === b.id ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"}`}><span>{b.name} <span className="text-xs text-muted-foreground">· {b.owner_name} · {b.city ?? ""}</span></span><span className="text-xs">{planName(b.tier, true)}</span></button>)}
        {pages.isSuccess && !pages.data.length ? <p className="text-muted-foreground">कोई पेज नहीं मिला।</p> : null}
      </div>
      {page ? (
        <div className="flex flex-wrap items-end gap-2 rounded-md bg-secondary/50 p-3">
          <p className="w-full font-medium">{page.name}</p>
          <label className="space-y-1"><span className="text-xs">पैकेज</span><select className="h-9 rounded-md border border-input bg-background px-2" value={plan} onChange={(e) => setPlan(e.target.value as typeof plan)}><option value="silver">सिल्वर</option><option value="gold">गोल्ड</option></select></label>
          <label className="space-y-1"><span className="text-xs">महीने</span><Input type="number" min={1} max={24} className="w-20" value={months} onChange={(e) => setMonths(Math.max(1, Math.min(24, Number(e.target.value) || 1)))} /></label>
          <label className="flex-1 space-y-1"><span className="text-xs">नोट</span><Input value={note} onChange={(e) => setNote(e.target.value)} /></label>
          <Button onClick={() => void go()}>पैकेज दें</Button>
        </div>
      ) : null}
    </div>
  );
}

function BoostRequests({ org }: { org: string }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState("pending");
  const q = useQuery({ queryKey: ["biz_boost_admin", org, status], queryFn: () => call<BoostOrder[]>("biz_boost_orders_admin", { p_org: org, p_status: status || null }) });
  const [busy, setBusy] = useState<string | null>(null);
  async function decide(o: BoostOrder, ok: boolean) {
    const note = ok ? null : prompt("अस्वीकार करने का कारण (सदस्य को WhatsApp पर जाएगा)");
    if (!ok && !note) return;
    if (ok && !confirm(`${o.page_name} — बूस्ट ${inr(o.amount)}\nभुगतान ${o.pay_ref ? `UTR ${o.pay_ref}` : MODE[o.pay_mode]} मिल गया है? मंज़ूर करें?`)) return;
    setBusy(o.id);
    try { await call("biz_decide_boost", { p_id: o.id, p_approve: ok, p_note: note }); toast.success(ok ? "मंज़ूर — पोस्ट बूस्ट हो गई" : "अस्वीकार किया"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(null); void qc.invalidateQueries({ queryKey: ["biz_boost_admin"] }); }
  }
  const rows = q.data ?? [];
  return (
    <div className="space-y-2">
      <div className="flex gap-2 text-xs">{["pending", "approved", "rejected", ""].map((x) => <button key={x} type="button" onClick={() => setStatus(x)} className={`rounded-full border px-3 py-1 ${status === x ? "border-primary bg-primary/10" : "border-border"}`}>{x ? STATUS[x] : "सभी"}</button>)}</div>
      {rows.map((o) => (
        <div key={o.id} className="flex flex-wrap items-start gap-3 rounded-lg border border-border bg-background p-3 text-sm">
          {o.pay_proof_url ? <a href={o.pay_proof_url} target="_blank" rel="noreferrer"><img src={o.pay_proof_url} alt="" className="h-20 w-20 rounded-md object-cover ring-1 ring-border" /></a> : null}
          <div className="min-w-0 flex-1 space-y-0.5">
            <p><Link to="/business/$slug" params={{ slug: o.page_slug ?? "" }} className="font-semibold hover:underline">{o.page_name}</Link> · {o.owner_name}{o.owner_phone ? ` · ${o.owner_phone}` : ""}</p>
            <p>🚀 <b>{inr(o.amount)}</b> · {o.days} दिन · {o.reach.toLocaleString("en-IN")} लोग · {MODE[o.pay_mode]}{o.pay_ref ? <> · UTR <code className="rounded bg-secondary px-1">{o.pay_ref}</code></> : null} · भुगतान {d(o.paid_on)}</p>
            {o.post_body ? <p className="line-clamp-1 text-xs text-muted-foreground">पोस्ट: {o.post_body}</p> : null}
            <p className="text-xs text-muted-foreground">अनुरोध {d(o.created_at)} · {STATUS[o.status]}{o.decided_by_name ? ` (${o.decided_by_name}, ${d(o.decided_at)})` : ""}{o.admin_note ? ` · ${o.admin_note}` : ""}</p>
          </div>
          {o.status === "pending" ? <div className="flex gap-1"><Button size="sm" disabled={busy === o.id} onClick={() => void decide(o, true)}>भुगतान मिला — मंज़ूर करें</Button><Button size="sm" variant="outline" disabled={busy === o.id} onClick={() => void decide(o, false)}>अस्वीकार</Button></div> : null}
        </div>
      ))}
      {q.isSuccess && !rows.length ? <p className="text-sm text-muted-foreground">कुछ नहीं।</p> : null}
    </div>
  );
}

function RevenueReport({ org }: { org: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(() => `${today.slice(0, 4)}-04-01` <= today ? `${today.slice(0, 4)}-04-01` : `${Number(today.slice(0, 4)) - 1}-04-01`);
  const [to, setTo] = useState(today);
  const q = useQuery({ queryKey: ["biz_revenue", org, from, to], queryFn: () => call<Revenue | null>("biz_revenue", { p_org: org, p_from: from, p_to: to }) });
  const r = q.data;
  function csv() {
    if (!r) return;
    const head = ["तारीख़", "प्रकार", "व्यापार", "मालिक", "विवरण", "राशि", "भुगतान", "UTR", "बिल नाम", "GSTIN"];
    const lines = r.rows.map((x) => [d(x.decided_at), x.kind === "plan" ? "पैकेज" : "बूस्ट", x.page, x.owner, x.what, x.amount, x.pay_mode, x.pay_ref ?? "", x.buyer_name ?? "", x.buyer_gstin ?? ""]);
    const text = [head, ...lines].map((l) => l.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + text], { type: "text/csv;charset=utf-8" })); a.download = `business-revenue-${from}-to-${to}.csv`; a.click();
  }
  const Tile = ({ label, value }: { label: string; value: string }) => <div className="rounded-lg border border-border bg-background p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="font-display text-xl font-bold">{value}</p></div>;
  return (
    <div className="max-w-4xl space-y-4 text-sm">
      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1"><span className="text-xs">से</span><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="space-y-1"><span className="text-xs">तक</span><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <Button variant="outline" onClick={csv} disabled={!r?.rows.length}>CSV डाउनलोड (Excel)</Button>
      </div>
      {r ? (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile label="कुल कमाई" value={inr(r.total)} /><Tile label="पैकेज से" value={inr(r.plans)} /><Tile label="बूस्ट से" value={inr(r.boosts)} /><Tile label="मंज़ूरी बाकी (राशि)" value={inr(r.pending_amount)} />
            <Tile label="भुगतान (संख्या)" value={String(r.count)} /><Tile label="अभी चल रहे पेड पेज" value={String(r.active_paid_pages)} /><Tile label="मुफ़्त दिए पैकेज" value={String(r.free_grants)} />
          </div>
          <table className="w-full overflow-hidden rounded-lg border border-border bg-background text-left">
            <thead className="bg-secondary/60 text-xs"><tr><th className="p-2">महीना</th><th className="p-2 text-right">पैकेज</th><th className="p-2 text-right">बूस्ट</th><th className="p-2 text-right">कुल</th></tr></thead>
            <tbody>{r.by_month.map((m) => <tr key={m.month} className="border-t border-border"><td className="p-2">{m.month}</td><td className="p-2 text-right">{inr(m.plans)}</td><td className="p-2 text-right">{inr(m.boosts)}</td><td className="p-2 text-right font-semibold">{inr(m.total)}</td></tr>)}
              {!r.by_month.length ? <tr><td colSpan={4} className="p-3 text-center text-muted-foreground">इस अवधि में कोई भुगतान नहीं।</td></tr> : null}</tbody>
          </table>
          <p className="text-xs text-muted-foreground">सिर्फ़ मंज़ूर किए गए भुगतान गिने जाते हैं (मुफ़्त दिए पैकेज ₹0 हैं, कमाई में नहीं)। CSV में हर भुगतान की पंक्ति, UTR और GSTIN है — Vivid Brandify के GST बिल बनाने में काम आएगी।</p>
        </>
      ) : q.isLoading ? <div className="h-32 animate-pulse rounded-lg bg-muted" /> : <p className="text-muted-foreground">रिपोर्ट सिर्फ़ एडमिन देख सकते हैं।</p>}
    </div>
  );
}
