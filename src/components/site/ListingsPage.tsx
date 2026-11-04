// Public listing pages (directory / jobs / scholarships / help) + the "submit a listing" form (login required).
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLang } from "@/core/i18n";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { KIND_FIELDS, KIND_LABEL, type ListingKind } from "@/lib/community";
import { normPhone } from "@/lib/comms";
import { listingsQuery } from "@/lib/queries";

export function ListingsPage({ kinds }: { kinds: ListingKind[] }) {
  const { data } = useSuspenseQuery(listingsQuery(kinds));
  const { lang, loc } = useLang();
  const L = lang === "hi";
  const { user } = useAuth();
  const main = KIND_LABEL[kinds[0]!];
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [kind, setKind] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const cats = useMemo(() => [...new Set(data.map((l) => l.category).filter(Boolean))] as string[], [data]);
  const rows = data.filter((l) => (!kind || l.kind === kind) && (!cat || l.category === cat) && (!q || [l.title, l.title_hi, l.body, l.category, l.city, l.contact_name].some((t) => (t ?? "").toLowerCase().includes(q.toLowerCase()))));
  return (
    <>
      <PageHeader title={L ? main.hi : main.en} description={L ? main.blurb_hi : main.blurb_en} crumbs={[{ label: L ? main.hi : main.en }]} />
      <section className="section-y"><div className="container-page space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder={L ? "खोजें…" : "Search…"} value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
          {kinds.length > 1 ? <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={kind} onChange={(e) => setKind(e.target.value)}><option value="">{L ? "सभी" : "All"}</option>{kinds.map((k) => <option key={k} value={k}>{L ? KIND_LABEL[k].hi : KIND_LABEL[k].en}</option>)}</select> : null}
          {cats.length ? <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">{L ? "सभी श्रेणियाँ" : "All categories"}</option>{cats.map((c) => <option key={c} value={c}>{c}</option>)}</select> : null}
          <Button className="ml-auto" variant={showForm ? "outline" : "default"} onClick={() => setShowForm((v) => !v)}>{showForm ? (L ? "फ़ॉर्म बंद" : "Close form") : (L ? "+ अपनी जानकारी जोड़ें" : "+ Add a listing")}</Button>
        </div>
        {showForm ? (user ? <SubmitForm kinds={kinds} onDone={() => setShowForm(false)} /> : <p className="rounded-lg border border-border bg-secondary/40 p-4 text-sm">{L ? "जानकारी जोड़ने के लिए " : "Please "}<Link to="/auth" className="underline">{L ? "लॉगिन करें" : "sign in"}</Link>{L ? "।" : " to add a listing."}</p>) : null}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((l) => (
            <article key={l.id} className={`surface-card p-4 ${l.featured ? "ring-1 ring-accent" : ""}`}>
              {l.image ? <img src={l.image} alt="" className="mb-3 aspect-[16/9] w-full rounded-md object-cover" loading="lazy" /> : null}
              <p className="text-xs text-muted-foreground">{kinds.length > 1 ? (L ? KIND_LABEL[l.kind as ListingKind].hi : KIND_LABEL[l.kind as ListingKind].en) + " · " : ""}{l.category ?? ""}{l.city ? ` · ${l.city}` : ""}</p>
              <h3 className="mt-1 font-display text-lg font-semibold">{loc(l, "title")}</h3>
              {loc(l, "body") ? <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{loc(l, "body")}</p> : null}
              <dl className="mt-2 grid grid-cols-2 gap-x-3 text-xs">{KIND_FIELDS[l.kind as ListingKind].filter((f) => (l.fields as Record<string, string>)?.[f.key]).map((f) => <div key={f.key}><dt className="text-muted-foreground">{L ? f.hi : f.en}</dt><dd>{f.key.endsWith("_url") ? <a href={(l.fields as Record<string, string>)[f.key]} target="_blank" rel="noreferrer" className="underline">{L ? "खोलें" : "open"}</a> : (l.fields as Record<string, string>)[f.key]}</dd></div>)}</dl>
              <p className="mt-3 flex flex-wrap gap-2 text-sm">{l.contact_name ? <span>{l.contact_name}</span> : null}{l.phone ? <a href={`tel:+${l.phone}`} className="underline">📞 {l.phone}</a> : null}{l.phone ? <a href={`https://wa.me/${l.phone}`} target="_blank" rel="noreferrer" className="underline">WhatsApp</a> : null}{l.website ? <a href={l.website} target="_blank" rel="noreferrer" className="underline">{L ? "वेबसाइट" : "Website"}</a> : null}</p>
              {l.address ? <p className="mt-1 text-xs text-muted-foreground">{l.address}</p> : null}
            </article>
          ))}
          {!rows.length ? <p className="text-muted-foreground">{L ? "अभी कोई प्रविष्टि नहीं।" : "No listings yet."}</p> : null}
        </div>
      </div></section>
    </>
  );
}

function SubmitForm({ kinds, onDone }: { kinds: ListingKind[]; onDone: () => void }) {
  const tenant = useTenant();
  const { lang } = useLang();
  const L = lang === "hi";
  const [kind, setKind] = useState<ListingKind>(kinds[0]!);
  const [f, setF] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }));
  async function submit() {
    if (!f["title"]?.trim()) { toast.error(L ? "शीर्षक लिखिए" : "Enter a title"); return; }
    setBusy(true);
    try {
      const uid = (await supabase.auth.getUser()).data.user?.id;
      const fields = Object.fromEntries(KIND_FIELDS[kind].map((x) => [x.key, f[`x_${x.key}`] ?? ""]).filter(([, v]) => v));
      const { error } = await supabase.from("cm_listings").insert({ organization_id: tenant.organization_id, kind, title: f["title"], title_hi: f["title_hi"] || null, body: f["body"] || null, body_hi: f["body_hi"] || null, category: f["category"] || null, fields, contact_name: f["contact_name"] || null, phone: f["phone"] ? normPhone(f["phone"]) : null, email: f["email"] || null, website: f["website"] || null, address: f["address"] || null, city: f["city"] || null, image: f["image"] || null, expires_at: f["expires_at"] || null, submitted_by: uid } as never);
      if (error) throw error;
      toast.success(L ? "भेज दिया — मंज़ूरी के बाद दिखेगा।" : "Submitted — it appears after approval."); onDone();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  const field = (k: string, label: string, type?: string) => <Field key={k} k={k} label={label} type={type} value={f[k] ?? ""} onChange={set} />;
  return (
    <div className="grid gap-3 rounded-lg border border-border bg-background p-4 sm:grid-cols-2">
      {kinds.length > 1 ? <label className="block text-sm sm:col-span-2"><span className="mb-1 block text-xs text-muted-foreground">{L ? "प्रकार" : "Type"}</span><select className="h-9 w-full rounded-md border border-input bg-background px-2" value={kind} onChange={(e) => setKind(e.target.value as ListingKind)}>{kinds.map((k) => <option key={k} value={k}>{L ? KIND_LABEL[k].hi : KIND_LABEL[k].en}</option>)}</select></label> : null}
      {field("title", L ? "शीर्षक / नाम (English)" : "Title / name (English)")}{field("title_hi", "शीर्षक (हिंदी)")}
      {field("category", L ? "श्रेणी (जैसे: किराना, डॉक्टर, IT)" : "Category (e.g. grocery, doctor, IT)")}{field("city", L ? "शहर / गाँव" : "City / village")}
      <label className="block text-sm sm:col-span-2"><span className="mb-1 block text-xs text-muted-foreground">{L ? "विवरण" : "Details"}</span><Textarea rows={3} value={f["body"] ?? ""} onChange={(e) => set("body", e.target.value)} /></label>
      {KIND_FIELDS[kind].map((x) => field(`x_${x.key}`, L ? x.hi : x.en))}
      {field("contact_name", L ? "संपर्क व्यक्ति" : "Contact person")}{field("phone", L ? "मोबाइल" : "Mobile")}
      {field("email", "Email")}{field("website", "Website / link")}
      {field("address", L ? "पता" : "Address")}{field("image", L ? "फोटो URL" : "Image URL")}
      {field("expires_at", L ? "कब तक दिखे (वैकल्पिक)" : "Show until (optional)", "date")}
      <div className="sm:col-span-2 flex items-center gap-3"><Button onClick={submit} disabled={busy}>{L ? "मंज़ूरी के लिए भेजें" : "Submit for approval"}</Button><span className="text-xs text-muted-foreground">{L ? "एडमिन जाँच के बाद प्रकाशित करेगा।" : "An admin reviews before it goes live."}</span></div>
    </div>
  );
}

function Field({ k, label, type, value, onChange }: { k: string; label: string; type?: string | undefined; value: string; onChange: (k: string, v: string) => void }) {
  return <label className="block text-sm"><span className="mb-1 block text-xs text-muted-foreground">{label}</span><Input type={type ?? "text"} value={value} onChange={(e) => onChange(k, e.target.value)} /></label>;
}
