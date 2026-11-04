// Ads & revenue: settings (AdSense, ads.txt, consent, slots), sponsor campaigns, revenue dashboard.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CrudPage } from "@/components/admin/CrudPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { fyBounds, inr } from "@/lib/fin";

export const Route = createFileRoute("/_authenticated/admin/ads")({ component: AdsPage });

const SLOTS = ["header", "sidebar", "feed", "footer", "post_bottom"] as const;
type Settings = { organization_id: string; enabled: boolean; adsense_client: string | null; adsense_slots: Record<string, string>; ads_txt: string | null; consent_banner: boolean; consent_text: string | null; consent_text_hi: string | null; slots: Record<string, boolean>; excluded_paths: string[] };
const rpc = async <T,>(fn: string, args: Record<string, unknown>): Promise<T> => { const { data, error } = await supabase.rpc(fn as never, args as never); if (error) throw new Error(error.message); return data as T; };

function AdsPage() {
  const tenant = useTenant();
  const org = tenant.organization_id;
  const { can } = useAuth();
  const [tab, setTab] = useState<"campaigns" | "settings" | "revenue">("campaigns");
  return (
    <div className="space-y-4">
      <header><h1 className="font-display text-2xl font-semibold">Ads & revenue</h1><p className="text-sm text-muted-foreground">Sponsor banners first, Google AdSense as fallback. Ads never appear on condolence, family-tree, matrimony, RSVP, donation or admin pages.</p></header>
      <div className="flex w-fit rounded-md border border-border p-0.5 text-xs">{(["campaigns", "settings", "revenue"] as const).map((k) => <button key={k} type="button" className={`rounded px-3 py-1 capitalize ${tab === k ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setTab(k)}>{k}</button>)}</div>
      {tab === "campaigns" ? <Campaigns org={org} canEdit={can("ads.manage")} /> : null}
      {tab === "settings" ? <SettingsTab org={org} canEdit={can("ads.manage")} /> : null}
      {tab === "revenue" ? <Revenue org={org} canEdit={can("ads.manage")} /> : null}
    </div>
  );
}

function Campaigns({ org, canEdit }: { org: string; canEdit: boolean }) {
  const qc = useQueryClient();
  async function paid(id: string) {
    const mode = prompt("Payment mode (cash / upi / bank / cheque)", "upi"); if (!mode) return;
    const ref = prompt("Reference no. (optional)") ?? null;
    try { await rpc("k1_ad_campaign_paid", { p_campaign: id, p_mode: mode, p_ref: ref || null, p_date: new Date().toISOString().slice(0, 10) }); toast.success("Receipt voucher created (Accounts → Vouchers)"); qc.invalidateQueries({ queryKey: ["admin", "ad_campaigns"] }); } catch (e) { toast.error((e as Error).message); }
  }
  return (
    <CrudPage table="ad_campaigns" title="Sponsor campaigns" description="A banner (image) or text ad from a sponsor, shown in the chosen slots between the dates. Mark as paid to create the receipt voucher under Sponsorship / advertisement income." orderBy="starts_on" createdBy
      columns={[{ key: "title", label: "Campaign" }, { key: "sponsor_name", label: "Sponsor" }, { key: "status", label: "Status", render: (r) => <Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge> }, { key: "dates", label: "Dates", render: (r) => `${r.starts_on} → ${r.ends_on ?? "∞"}` }, { key: "price", label: "Price", render: (r) => <span>{inr(r.price)} {r.voucher_id ? <Badge variant="outline">paid</Badge> : null}</span> }, { key: "stats", label: "Views / clicks", render: (r) => `${r.impressions} / ${r.clicks}` }]}
      fields={[
        { key: "title", label: "Campaign name", required: true, full: true },
        { key: "sponsor_name", label: "Sponsor", required: true }, { key: "sponsor_phone", label: "Sponsor phone" }, { key: "sponsor_email", label: "Sponsor email" },
        { key: "creative_image", label: "Banner image URL (e.g. 970×250 or 300×250)", type: "url", full: true },
        { key: "creative_text", label: "Text ad (English)", full: true }, { key: "creative_text_hi", label: "विज्ञापन पाठ (हिंदी)", full: true },
        { key: "link_url", label: "Click-through link", type: "url", full: true },
        { key: "starts_on", label: "Starts", type: "date", required: true }, { key: "ends_on", label: "Ends", type: "date" },
        { key: "price", label: "Agreed price (₹)", type: "number" }, { key: "weight", label: "Weight 1–10 (share of rotation)", type: "number" },
        { key: "status", label: "Status", type: "select", options: ["draft", "active", "paused", "ended"] },
      ]}
      defaults={{ slots: ["header", "sidebar", "feed", "footer", "post_bottom"], weight: 1 }}
      extraActions={(r) => <span className="inline-flex gap-1">{canEdit && !r.voucher_id && Number(r.price) > 0 ? <Button size="sm" variant="outline" onClick={() => paid(r.id)}>Mark paid</Button> : null}{r.voucher_id ? <Button asChild size="sm" variant="ghost"><Link to="/admin/vouchers/$id" params={{ id: r.voucher_id }}>Receipt</Link></Button> : null}</span>}
    />
  );
}

function SettingsTab({ org, canEdit }: { org: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["ad_settings", org], queryFn: async () => { const { data } = await supabase.from("ad_settings").select("*").eq("organization_id", org).maybeSingle(); return (data as unknown as Settings | null) ?? null; } });
  const [s, setS] = useState<Settings | null>(null);
  useEffect(() => { if (q.isSuccess && !s) setS(q.data ?? { organization_id: org, enabled: false, adsense_client: null, adsense_slots: {}, ads_txt: null, consent_banner: true, consent_text: null, consent_text_hi: null, slots: Object.fromEntries(SLOTS.map((k) => [k, true])), excluded_paths: ["/shok", "/families", "/lineage", "/matrimony", "/rsvp", "/admin", "/verify", "/donate", "/donation-status"] }); }, [q.isSuccess, q.data, s, org]);
  async function save() {
    if (!s) return;
    const { error } = await supabase.from("ad_settings").upsert(s as never, { onConflict: "organization_id" });
    if (error) toast.error(error.message); else { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["ad_settings", org] }); qc.invalidateQueries({ queryKey: ["ads"] }); }
  }
  if (!s) return null;
  return (
    <fieldset disabled={!canEdit} className="grid max-w-3xl gap-3 rounded-lg border border-border bg-background p-4 text-sm sm:grid-cols-2">
      <label className="flex items-center gap-2 sm:col-span-2"><input type="checkbox" checked={s.enabled} onChange={(e) => setS({ ...s, enabled: e.target.checked })} /> <b>Show ads on this site</b></label>
      <div className="sm:col-span-2 flex flex-wrap gap-3">{SLOTS.map((k) => <label key={k} className="flex items-center gap-1"><input type="checkbox" checked={s.slots?.[k] ?? true} onChange={(e) => setS({ ...s, slots: { ...s.slots, [k]: e.target.checked } })} /> {k}</label>)}</div>
      <L label="AdSense client (ca-pub-…)"><Input value={s.adsense_client ?? ""} onChange={(e) => setS({ ...s, adsense_client: e.target.value || null })} placeholder="ca-pub-1234567890123456" /></L>
      <div className="grid grid-cols-2 gap-2">{SLOTS.map((k) => <L key={k} label={`AdSense slot id · ${k}`}><Input value={s.adsense_slots?.[k] ?? ""} onChange={(e) => setS({ ...s, adsense_slots: { ...s.adsense_slots, [k]: e.target.value } })} /></L>)}</div>
      <L label="ads.txt (served at /ads.txt)"><Textarea rows={3} value={s.ads_txt ?? ""} onChange={(e) => setS({ ...s, ads_txt: e.target.value || null })} placeholder="google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0" /></L>
      <L label="Pages without ads (path prefixes, one per line)"><Textarea rows={3} value={s.excluded_paths.join("\n")} onChange={(e) => setS({ ...s, excluded_paths: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })} /></L>
      <label className="flex items-center gap-2 sm:col-span-2"><input type="checkbox" checked={s.consent_banner} onChange={(e) => setS({ ...s, consent_banner: e.target.checked })} /> Cookie / ads consent banner (AdSense loads only after "Accept")</label>
      <L label="Consent text (English)"><Input value={s.consent_text ?? ""} onChange={(e) => setS({ ...s, consent_text: e.target.value || null })} /></L>
      <L label="सहमति पाठ (हिंदी)"><Input value={s.consent_text_hi ?? ""} onChange={(e) => setS({ ...s, consent_text_hi: e.target.value || null })} /></L>
      <div className="sm:col-span-2"><Button onClick={save}>Save</Button></div>
      <div className="sm:col-span-2 rounded bg-secondary/50 p-3 text-xs">
        <p className="font-medium">AdSense setup (owner)</p>
        <ol className="ml-4 list-decimal space-y-1"><li>Open <a className="underline" href="https://www.google.com/adsense" target="_blank" rel="noreferrer">google.com/adsense</a> → Sites → Add site (this organization's domain) and get it reviewed.</li><li>Copy the publisher id (ca-pub-…) above; create "Display ad" units and paste each unit's slot id in the matching box.</li><li>AdSense → Sites → your site → ads.txt snippet → paste in the ads.txt box; it is served at <code>/ads.txt</code>.</li><li>Tick "Show ads" and save. Sponsor banners always take priority over AdSense.</li></ol>
      </div>
    </fieldset>
  );
}

function Revenue({ org, canEdit }: { org: string; canEdit: boolean }) {
  const fy = fyBounds();
  const [from, setFrom] = useState(fy.from); const [to, setTo] = useState(fy.to);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["ad_revenue", org, from, to], queryFn: () => rpc<{ sponsor_vouchers: number; manual: { source: string; month: string; amount: number; note: string | null }[]; campaigns: { id: string; title: string; sponsor: string; price: number; paid: boolean; status: string; impressions: number; clicks: number; starts_on: string; ends_on: string | null }[]; by_slot: Record<string, number> }>("k1_ad_revenue", { p_org: org, p_from: from, p_to: to }) });
  const [m, setM] = useState({ source: "adsense", month: new Date().toISOString().slice(0, 7), amount: "", note: "" });
  async function addManual() {
    const { error } = await supabase.from("ad_revenue").upsert({ organization_id: org, source: m.source, month: `${m.month}-01`, amount: Number(m.amount), note: m.note || null } as never, { onConflict: "organization_id,source,month" });
    if (error) toast.error(error.message); else { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["ad_revenue", org] }); }
  }
  const d = q.data; const manualTotal = (d?.manual ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const expected = (d?.campaigns ?? []).filter((c) => c.status !== "draft").reduce((s, c) => s + Number(c.price), 0);
  const paid = (d?.campaigns ?? []).filter((c) => c.paid).reduce((s, c) => s + Number(c.price), 0);
  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center gap-2"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" /> – <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" /></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Sponsorship received (vouchers)", inr(d?.sponsor_vouchers ?? 0)], ["Campaigns expected", inr(expected)], ["Campaigns paid", inr(paid)], ["AdSense & other (manual)", inr(manualTotal)]].map(([k, v]) => <div key={k} className="rounded-lg border border-border bg-background p-3"><p className="text-xs text-muted-foreground">{k}</p><p className="font-display text-xl">{v}</p></div>)}
      </div>
      <div className="rounded-lg border border-border bg-background p-3"><p className="font-medium">Impressions by slot</p><p className="text-muted-foreground">{Object.entries(d?.by_slot ?? {}).map(([k, v]) => `${k}: ${v}`).join(" · ") || "—"}</p></div>
      <div className="rounded-lg border border-border bg-background p-3">
        <p className="font-medium">Record AdSense / other income (monthly)</p>
        <p className="text-xs text-muted-foreground">AdSense pays into your bank; enter the amount here for the dashboard and post a receipt voucher under Accounts when it arrives.</p>
        {canEdit ? <div className="mt-2 flex flex-wrap gap-2"><select className="h-9 rounded-md border border-input bg-background px-2" value={m.source} onChange={(e) => setM({ ...m, source: e.target.value })}><option value="adsense">AdSense</option><option value="sponsor">Sponsor (off-platform)</option><option value="other">Other</option></select><Input type="month" value={m.month} onChange={(e) => setM({ ...m, month: e.target.value })} className="w-40" /><Input type="number" placeholder="₹" value={m.amount} onChange={(e) => setM({ ...m, amount: e.target.value })} className="w-32" /><Input placeholder="note" value={m.note} onChange={(e) => setM({ ...m, note: e.target.value })} className="w-48" /><Button size="sm" onClick={addManual} disabled={!m.amount}>Save</Button></div> : null}
        <ul className="mt-2 divide-y divide-border">{(d?.manual ?? []).map((r, i) => <li key={i} className="flex justify-between py-1"><span>{r.source} · {r.month.slice(0, 7)} {r.note ? `· ${r.note}` : ""}</span><b>{inr(r.amount)}</b></li>)}</ul>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border"><table className="w-full text-left"><thead className="bg-secondary/60 text-xs uppercase text-muted-foreground"><tr><th className="p-2">Campaign</th><th className="p-2">Sponsor</th><th className="p-2">Dates</th><th className="p-2 text-right">Price</th><th className="p-2">Paid</th><th className="p-2 text-right">Views</th><th className="p-2 text-right">Clicks</th><th className="p-2 text-right">CTR</th></tr></thead>
        <tbody>{(d?.campaigns ?? []).map((c) => <tr key={c.id} className="border-t border-border"><td className="p-2">{c.title} <Badge variant="outline">{c.status}</Badge></td><td className="p-2">{c.sponsor}</td><td className="p-2 text-xs">{c.starts_on} → {c.ends_on ?? "∞"}</td><td className="p-2 text-right">{inr(c.price)}</td><td className="p-2">{c.paid ? "✓" : ""}</td><td className="p-2 text-right">{c.impressions}</td><td className="p-2 text-right">{c.clicks}</td><td className="p-2 text-right">{c.impressions ? ((c.clicks / c.impressions) * 100).toFixed(2) + "%" : "—"}</td></tr>)}</tbody></table></div>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}
