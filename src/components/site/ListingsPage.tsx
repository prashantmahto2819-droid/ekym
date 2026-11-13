// Public listing pages (directory / jobs / scholarships / help) + the "submit a listing" form (login required).
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Globe, LayoutGrid, MapPin, MessageCircle, Phone, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Chips, EmptyState, Initial, SearchBox } from "@/components/site/kit";
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
  const rows = data
    .filter((l) => (!kind || l.kind === kind) && (!cat || l.category === cat) && (!q || [l.title, l.title_hi, l.body, l.category, l.city, l.contact_name].some((t) => (t ?? "").toLowerCase().includes(q.toLowerCase()))))
    .sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
  const addBtn = (
    <button type="button" onClick={() => setShowForm((v) => !v)} className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground shadow-lg hover:opacity-95">
      {showForm ? <X className="size-4" /> : <Plus className="size-4" />}{showForm ? (L ? "फ़ॉर्म बंद करें" : "Close form") : (L ? "अपनी जानकारी जोड़ें" : "Add a listing")}
    </button>
  );
  return (
    <>
      <PageHeader icon={<LayoutGrid />} title={L ? main.hi : main.en} description={L ? main.blurb_hi : main.blurb_en} crumbs={[{ label: L ? main.hi : main.en }]}
        stats={data.length ? [{ label: L ? "प्रविष्टियाँ" : "listings", value: data.length }] : undefined} actions={addBtn} />
      <section className="section-y pt-8 md:pt-10"><div className="container-page space-y-5">
        {showForm ? (user ? <SubmitForm kinds={kinds} onDone={() => setShowForm(false)} /> : <div className="rounded-2xl border border-border bg-secondary/40 p-5 text-sm">{L ? "जानकारी जोड़ने के लिए " : "Please "}<Link to="/auth" className="font-semibold text-primary underline">{L ? "लॉगिन करें" : "sign in"}</Link>{L ? "।" : " to add a listing."}</div>) : null}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchBox value={q} onChange={setQ} placeholder={L ? "नाम, काम या शहर से खोजें…" : "Search by name, service or city…"} className="lg:w-96" />
          {kinds.length > 1 ? <Chips items={[{ value: "", label: L ? "सभी" : "All", count: data.length }, ...kinds.map((k) => ({ value: k, label: L ? KIND_LABEL[k].hi : KIND_LABEL[k].en, count: data.filter((x) => x.kind === k).length }))]} value={kind} onChange={setKind} /> : null}
        </div>
        {cats.length > 1 ? <Chips items={[{ value: "", label: L ? "सभी श्रेणियाँ" : "All categories" }, ...cats.map((c) => ({ value: c, label: c }))]} value={cat} onChange={setCat} /> : null}
        {rows.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((l) => {
              const fields = KIND_FIELDS[l.kind as ListingKind].filter((f) => (l.fields as Record<string, string>)?.[f.key]);
              return (
                <article key={l.id} className={`surface-card flex flex-col overflow-hidden transition hover:shadow-lg ${l.featured ? "ring-2 ring-accent" : ""}`}>
                  {l.image ? <div className="zoom-media relative aspect-[16/9]"><img src={l.image} alt="" className="size-full object-cover" loading="lazy" />{l.featured ? <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground shadow">★ {L ? "विशेष" : "Featured"}</span> : null}</div> : null}
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start gap-3">
                      {!l.image ? <Initial name={loc(l, "title")} className="size-12 text-lg" /> : null}
                      <div className="min-w-0">
                        <h3 className="font-display text-lg font-semibold leading-snug">{loc(l, "title")}</h3>
                        <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                          {kinds.length > 1 ? <span className="rounded-full bg-primary-soft px-2 py-0.5 font-medium text-primary-deep">{L ? KIND_LABEL[l.kind as ListingKind].hi : KIND_LABEL[l.kind as ListingKind].en}</span> : null}
                          {l.category ? <span className="rounded-full bg-secondary px-2 py-0.5">{l.category}</span> : null}
                          {l.city ? <span className="inline-flex items-center gap-0.5 rounded-full bg-secondary px-2 py-0.5"><MapPin className="size-3" />{l.city}</span> : null}
                        </div>
                      </div>
                    </div>
                    {loc(l, "body") ? <p className="mt-3 line-clamp-4 whitespace-pre-line text-sm text-muted-foreground">{loc(l, "body")}</p> : null}
                    {fields.length ? <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-xl bg-secondary/50 p-3 text-xs">{fields.map((f) => <div key={f.key} className="min-w-0"><dt className="text-muted-foreground">{L ? f.hi : f.en}</dt><dd className="truncate font-medium">{f.key.endsWith("_url") ? <a href={(l.fields as Record<string, string>)[f.key]} target="_blank" rel="noreferrer" className="text-primary underline">{L ? "खोलें" : "Open"}</a> : (l.fields as Record<string, string>)[f.key]}</dd></div>)}</dl> : null}
                    {l.address ? <p className="mt-2 text-xs text-muted-foreground">{l.address}</p> : null}
                    <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                      {l.contact_name ? <span className="mr-auto text-sm font-medium">{l.contact_name}</span> : null}
                      {l.phone ? <a href={`tel:+${l.phone}`} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-sm hover:border-primary hover:text-primary"><Phone className="size-4" />{L ? "कॉल" : "Call"}</a> : null}
                      {l.phone ? <a href={`https://wa.me/${l.phone}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#25D366] px-3 text-sm font-medium text-white hover:opacity-90"><MessageCircle className="size-4" />WhatsApp</a> : null}
                      {l.website ? <a href={l.website} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-sm hover:border-primary hover:text-primary"><Globe className="size-4" />{L ? "वेबसाइट" : "Website"}</a> : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={<LayoutGrid />} title={q || cat || kind ? (L ? "इस खोज से कुछ नहीं मिला" : "Nothing matches this search") : (L ? "अभी कोई प्रविष्टि नहीं" : "No listings yet")} text={L ? "अपनी या जान-पहचान की जानकारी जोड़कर शुरुआत करें।" : "Be the first to add one."} />
        )}
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
