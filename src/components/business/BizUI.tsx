// Business community UI pieces: follow button, directory card, page editor (create / edit), verified tick.
import { Link, useNavigate } from "@tanstack/react-router";
import { BadgeCheck, ImagePlus, MapPin, Phone, Plus, Star, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { bizTrack, catLabel, catOf, CATEGORIES, telLink, useBizRefresh, waLink, type BizPage, type Service } from "@/components/business/biz";
import { useConsent } from "@/components/community/ConsentGate";
import { DistrictInput } from "@/components/site/DistrictInput";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { call, uploadCommunityImage } from "@/community/chat";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";

export const Verified = ({ on, className = "size-4" }: { on: boolean; className?: string }) => (on ? <BadgeCheck className={`${className} shrink-0 fill-sky-500 text-white`} aria-label="verified" /> : null);

export function TierBadge({ tier, hi }: { tier: string; hi: boolean }) {
  if (tier === "gold") return <span className="rounded-full bg-gradient-to-r from-amber-400 to-yellow-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">{hi ? "गोल्ड" : "Gold"}</span>;
  if (tier === "silver") return <span className="rounded-full bg-gradient-to-r from-slate-300 to-slate-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">{hi ? "सिल्वर" : "Silver"}</span>;
  return null;
}

export function BizLogo({ url, name, className = "size-12" }: { url: string | null | undefined; name: string; className?: string }) {
  return url ? <img src={url} alt="" className={`${className} shrink-0 rounded-2xl object-cover ring-1 ring-border`} loading="lazy" />
    : <span className={`${className} grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-700 font-display text-lg font-semibold text-white`}>{[...name.trim()][0] ?? "?"}</span>;
}

/** Follow / unfollow a business page. */
export function BizFollowButton({ pageId, following, hi, size = "sm", variant = "button", onChanged }: { pageId: string; following: boolean; hi: boolean; size?: "sm" | "default"; variant?: "button" | "link"; onChanged?: (f: boolean) => void }) {
  const { user } = useAuth();
  const consent = useConsent();
  const refresh = useBizRefresh();
  const [f, setF] = useState(following);
  const [busy, setBusy] = useState(false);
  async function run() {
    if (!user) { toast.error(hi ? "फ़ॉलो करने के लिए लॉगिन करें" : "Sign in to follow"); return; }
    setBusy(true); const next = !f; setF(next);
    try { await call("biz_follow", { p_page: pageId, p_on: next }); onChanged?.(next); void refresh(); if (next) toast.success(hi ? "फ़ॉलो किया — इस व्यापार की पोस्ट आपके फ़ीड में आएँगी" : "Following — this business will show up in your feed"); }
    catch (e) { setF(!next); toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  }
  const go = () => (f ? void run() : consent.ensure(() => void run()));
  if (variant === "link") return <button type="button" disabled={busy} onClick={go} className={`text-sm font-semibold hover:underline ${f ? "text-muted-foreground" : "text-primary"}`}>{f ? (hi ? "फ़ॉलो कर रहे हैं" : "Following") : (hi ? "फ़ॉलो करें" : "Follow")}</button>;
  return <Button size={size} variant={f ? "outline" : "default"} disabled={busy} onClick={go} className="rounded-full">{f ? (hi ? "✓ फ़ॉलो कर रहे हैं" : "✓ Following") : (hi ? "+ फ़ॉलो करें" : "+ Follow")}</Button>;
}

/** Directory card. */
export function BizCard({ b, hi }: { b: BizPage; hi: boolean }) {
  const c = catOf(b.category);
  return (
    <article className={`group flex flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-lg ${b.tier === "gold" ? "ring-amber-400" : b.tier === "silver" ? "ring-slate-400" : "ring-border/70"}`}>
      <Link to="/business/$slug" params={{ slug: b.slug }} className="relative block h-24 overflow-hidden bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100 dark:from-amber-950/40 dark:to-rose-950/30">
        {b.cover_url ? <img src={b.cover_url} alt="" className="size-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" /> : <span className="absolute right-3 top-2 text-4xl opacity-40">{c.icon}</span>}
        <span className="absolute left-3 top-3"><TierBadge tier={b.tier} hi={hi} /></span>
      </Link>
      <div className="relative z-10 -mt-7 flex flex-1 flex-col px-4 pb-4">
        <Link to="/business/$slug" params={{ slug: b.slug }}><BizLogo url={b.logo_url} name={b.name} className="size-14 border-4 border-card" /></Link>
        <Link to="/business/$slug" params={{ slug: b.slug }} className="mt-2 flex items-center gap-1 font-semibold leading-tight hover:underline"><span className="line-clamp-1">{b.name}</span><Verified on={b.verified} /></Link>
        <p className="mt-0.5 text-xs text-muted-foreground">{c.icon} {catLabel(b.category, hi)}{b.city ? ` · ${b.city}` : ""}</p>
        {b.rating?.count ? <p className="mt-1 flex items-center gap-1 text-xs"><Star className="size-3.5 fill-amber-400 text-amber-400" /><b>{b.rating.avg?.toFixed(1)}</b><span className="text-muted-foreground">({b.rating.count})</span></p> : null}
        {b.offer ? <p className="mt-2 line-clamp-2 rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">🏷️ {b.offer}</p> : b.about ? <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{b.about}</p> : null}
        <div className="mt-auto flex items-center gap-2 pt-3">
          <span className="text-xs text-muted-foreground">{b.followers} {hi ? "फ़ॉलोअर्स" : "followers"}</span>
          <span className="ml-auto flex gap-1">
            {b.phone ? <a onClick={() => bizTrack(b.id, "call")} href={telLink(b.phone)} aria-label={hi ? "कॉल" : "Call"} className="grid size-8 place-items-center rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground"><Phone className="size-4" /></a> : null}
            {b.whatsapp || b.phone ? <a onClick={() => bizTrack(b.id, "whatsapp")} href={waLink(b.whatsapp || b.phone!)} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="grid size-8 place-items-center rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white dark:bg-emerald-950/40">✆</a> : null}
            {b.map_url ? <a onClick={() => bizTrack(b.id, "map")} href={b.map_url} target="_blank" rel="noreferrer" aria-label={hi ? "नक्शा" : "Map"} className="grid size-8 place-items-center rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground"><MapPin className="size-4" /></a> : null}
          </span>
        </div>
      </div>
    </article>
  );
}

const FIELDS: { k: keyof BizPage; hi: string; en: string; ph?: string; type?: string }[] = [
  { k: "phone", hi: "मोबाइल", en: "Mobile", ph: "98765 43210", type: "tel" },
  { k: "whatsapp", hi: "WhatsApp (अलग हो तो)", en: "WhatsApp (if different)", ph: "98765 43210", type: "tel" },
  { k: "email", hi: "ईमेल", en: "Email", type: "email" },
  { k: "website", hi: "वेबसाइट", en: "Website", ph: "https://" },
  { k: "address", hi: "पता", en: "Address" },
  { k: "map_url", hi: "Google Maps लिंक", en: "Google Maps link", ph: "https://maps.app.goo.gl/…" },
  { k: "hours", hi: "खुलने का समय", en: "Opening hours", ph: "सुबह 9 – रात 9, रविवार बंद" },
  { k: "offer", hi: "समाज के लिए खास छूट (वैकल्पिक)", en: "Special offer for the community (optional)", ph: "समाज के सदस्यों को 10% छूट" },
];

/** Create or edit a business page. */
export function BizEditor({ page, hi, onClose }: { page?: BizPage | null; hi: boolean; onClose: (slug?: string) => void }) {
  const tenant = useTenant();
  const { user } = useAuth();
  const refresh = useBizRefresh();
  const navigate = useNavigate();
  const consent = useConsent();
  const [d, setD] = useState<Partial<BizPage>>(() => page ?? { name: "", category: "", services: [] });
  const [busy, setBusy] = useState<string | null>(null);
  const set = (k: keyof BizPage, v: unknown) => setD((x) => ({ ...x, [k]: v }));
  const services = (d.services ?? []) as Service[];
  async function upload(kind: "logo_url" | "cover_url", f: File | undefined) {
    if (!f || !user) return; setBusy(kind);
    try { set(kind, await uploadCommunityImage(f, `${tenant.organization_id}/biz/${user.id}`, kind === "cover_url" ? 1600 : 500)); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); } finally { setBusy(null); }
  }
  async function save() {
    if (!d.name?.trim() || d.name.trim().length < 2) { toast.error(hi ? "व्यापार का नाम लिखें" : "Enter the business name"); return; }
    if (!d.category) { toast.error(hi ? "श्रेणी चुनें" : "Pick a category"); return; }
    if (!consent.accepted) { consent.ensure(() => void save()); return; }
    setBusy("save");
    try {
      const body: Record<string, unknown> = { ...d, services: services.filter((s) => s.name.trim()) };
      ["owner_name", "followers", "posts", "i_follow", "mine", "can_moderate", "today_posts", "daily_limit", "tier", "tier_until", "verified", "status", "admin_note", "created_at", "updated_at", "owner_id", "organization_id"].forEach((k) => delete body[k]);
      const r = await call<{ id: string; slug: string }>("biz_page_save", { p_org: tenant.organization_id, p: body });
      await refresh();
      toast.success(page ? (hi ? "पेज सहेजा गया" : "Page saved") : (hi ? "आपका व्यापार पेज बन गया 🎉" : "Your business page is live 🎉"));
      onClose(r.slug);
      if (!page) void navigate({ to: "/business/$slug", params: { slug: r.slug } });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(null); }
  }
  const L = (h: string, e: string) => (hi ? h : e);
  return (
    <Dialog open onOpenChange={(o) => { if (!o && !busy) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-2xl gap-0 overflow-y-auto p-0">
        <DialogHeader className="border-b border-border px-5 py-3"><DialogTitle className="font-display text-lg">{page ? L("व्यापार पेज सुधारें", "Edit business page") : L("अपना व्यापार पेज बनाएँ", "Create your business page")}</DialogTitle></DialogHeader>
        <div className="relative h-32 bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100 dark:from-amber-950/40 dark:to-rose-950/30">
          {d.cover_url ? <img src={d.cover_url} alt="" className="size-full object-cover" /> : null}
          <label className="absolute bottom-2 right-2 flex cursor-pointer items-center gap-1 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold shadow hover:bg-background"><ImagePlus className="size-4" />{busy === "cover_url" ? "…" : L("कवर फोटो", "Cover")}<input type="file" accept="image/*" hidden onChange={(e) => void upload("cover_url", e.target.files?.[0])} /></label>
          <label className="absolute -bottom-8 left-5 cursor-pointer">
            <span className="relative block"><BizLogo url={d.logo_url} name={d.name || "?"} className="size-20 border-4 border-background" /><span className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full bg-primary text-primary-foreground shadow"><ImagePlus className="size-3.5" /></span></span>
            <input type="file" accept="image/*" hidden onChange={(e) => void upload("logo_url", e.target.files?.[0])} />
          </label>
        </div>
        <div className="space-y-4 p-5 pt-12">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm sm:col-span-2"><span className="font-medium">{L("व्यापार का नाम", "Business name")} *</span><Input value={d.name ?? ""} onChange={(e) => set("name", e.target.value)} maxLength={120} placeholder={L("जैसे: जायसवाल किराना स्टोर", "e.g. Jaiswal General Store")} /></label>
            <label className="space-y-1 text-sm"><span className="font-medium">{L("श्रेणी", "Category")} *</span>
              <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={d.category ?? ""} onChange={(e) => set("category", e.target.value)}>
                <option value="">{L("— चुनें —", "— choose —")}</option>{CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.icon} {hi ? c.hi : c.en}</option>)}
              </select></label>
            <label className="space-y-1 text-sm"><span className="font-medium">{L("शहर / क़स्बा", "City / town")}</span><Input value={d.city ?? ""} onChange={(e) => set("city", e.target.value)} /></label>
            <label className="space-y-1 text-sm"><span className="font-medium">{L("ज़िला", "District")}</span><DistrictInput value={d.district ?? ""} onChange={(v) => set("district", v)} onPick={(_, st) => set("state", st)} state={d.state} hi={hi} /></label>
            <label className="space-y-1 text-sm"><span className="font-medium">{L("राज्य", "State")}</span><Input value={d.state ?? ""} onChange={(e) => set("state", e.target.value)} /></label>
            <label className="space-y-1 text-sm sm:col-span-2"><span className="font-medium">{L("अपने व्यापार के बारे में", "About your business")}</span><Textarea rows={3} value={d.about ?? ""} onChange={(e) => set("about", e.target.value)} maxLength={3000} placeholder={L("क्या बेचते/करते हैं, कब से, क्या खास है…", "What you sell or do, since when, what's special…")} /></label>
            {FIELDS.map((f) => <label key={f.k} className={`space-y-1 text-sm ${f.k === "address" || f.k === "offer" ? "sm:col-span-2" : ""}`}><span className="font-medium">{hi ? f.hi : f.en}</span><Input type={f.type ?? "text"} value={(d[f.k] as string | null) ?? ""} onChange={(e) => set(f.k, e.target.value)} placeholder={f.ph} /></label>)}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between"><p className="text-sm font-medium">{L("सेवाएँ / उत्पाद", "Services / products")}</p><Button type="button" size="sm" variant="outline" onClick={() => set("services", [...services, { name: "", price: "" }])} disabled={services.length >= 30}><Plus className="size-4" /> {L("जोड़ें", "Add")}</Button></div>
            {services.map((s, i) => (
              <div key={i} className="flex gap-2">
                <Input className="flex-1" value={s.name} placeholder={L("नाम", "Name")} onChange={(e) => set("services", services.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                <Input className="w-32" value={s.price ?? ""} placeholder={L("कीमत", "Price")} onChange={(e) => set("services", services.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
                <Button type="button" size="icon" variant="ghost" aria-label="remove" onClick={() => set("services", services.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button>
              </div>
            ))}
          </div>
          {!page ? <p className="rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">{L("मुफ़्त पेज पर रोज़ 1 पोस्ट कर सकते हैं। व्यापार की पोस्ट \"व्यापार\" टैब में और आपके फ़ॉलोअर्स को दिखती है। राजनीतिक या गलत सामग्री वाली पोस्ट एडमिन रोक सकते हैं।", "A free page can post once a day. Business posts appear in the Business tab and to your followers. Admins may stop political or misleading posts.")}</p> : null}
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => onClose()} disabled={!!busy}><X className="size-4" /> {L("रहने दें", "Cancel")}</Button><Button onClick={() => void save()} disabled={!!busy}>{busy === "save" ? "…" : page ? L("सहेजें", "Save") : L("पेज बनाएँ", "Create page")}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
