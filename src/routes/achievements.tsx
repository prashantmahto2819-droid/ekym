// समाज की उपलब्धियाँ — public wall of approved achievements; signed-in members can submit one (admin approves).
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLang } from "@/core/i18n";
import { pageMeta } from "@/core/seo";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { uploadPhoto } from "@/lib/images";

export const Route = createFileRoute("/achievements")({
  head: ({ matches }) => pageMeta(matches, { en: "Achievements", hi: "समाज की उपलब्धियाँ" }, { en: "Achievements of community members in education, sports, service, business and awards.", hi: "शिक्षा, खेल, सेवा, व्यवसाय और सम्मान में समाज के सदस्यों की उपलब्धियाँ।" }),
  component: AchievementsPage,
});

export const CATS: Record<string, [string, string]> = { education: ["Education", "शिक्षा"], sports: ["Sports", "खेल"], service: ["Service", "सेवा"], business: ["Business", "व्यवसाय"], award: ["Award", "सम्मान"], culture: ["Culture", "कला-संस्कृति"], other: ["Other", "अन्य"] };
export type Ach = { id: string; person_name: string; person_name_hi: string | null; title: string; title_hi: string | null; description: string | null; description_hi: string | null; category: string; photo_path: string | null; achieved_on: string | null; village: string | null; featured: boolean };

export function useAchievements(org: string, limit = 60) {
  return useQuery({ queryKey: ["achievements", org, limit], queryFn: async () => { const { data, error } = await supabase.from("cm_achievements").select("id,person_name,person_name_hi,title,title_hi,description,description_hi,category,photo_path,achieved_on,village,featured").eq("organization_id", org).eq("status", "approved").order("featured", { ascending: false }).order("achieved_on", { ascending: false, nullsFirst: false }).limit(limit); if (error) throw error; return (data ?? []) as Ach[]; } });
}

export function AchievementCard({ a, hi }: { a: Ach; hi: boolean }) {
  return (
    <div className="surface-card flex flex-col overflow-hidden">
      {a.photo_path ? <img src={a.photo_path} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" /> : <div className="gradient-teal grid aspect-[4/3] place-items-center text-5xl">🏅</div>}
      <div className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{(CATS[a.category] ?? CATS["other"]!)[hi ? 1 : 0]}{a.village ? ` · ${a.village}` : ""}</p>
        <h3 className="mt-1 font-display text-lg font-semibold leading-tight">{(hi && a.person_name_hi) || a.person_name}</h3>
        <p className="font-medium">{(hi && a.title_hi) || a.title}</p>
        {(hi && a.description_hi) || a.description ? <p className="mt-2 line-clamp-4 text-sm text-muted-foreground">{(hi && a.description_hi) || a.description}</p> : null}
        {a.achieved_on ? <p className="mt-2 text-xs text-muted-foreground">{new Date(a.achieved_on).toLocaleDateString(hi ? "hi-IN" : "en-IN", { dateStyle: "medium" })}</p> : null}
      </div>
    </div>
  );
}

function AchievementsPage() {
  const tenant = useTenant();
  const { lang } = useLang();
  const hi = lang === "hi";
  const { user } = useAuth();
  const qc = useQueryClient();
  const list = useAchievements(tenant.organization_id);
  const [cat, setCat] = useState("");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ person: "", person_hi: "", title: "", title_hi: "", description: "", category: "education", achieved_on: "", village: "" });
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (!f.person.trim() || !f.title.trim()) { toast.error(hi ? "नाम और उपलब्धि लिखें" : "Name and achievement are required"); return; }
    setBusy(true);
    try {
      let url: string | null = null;
      if (photo) url = await uploadPhoto("site-media", `${tenant.organization_id}/achievements/${Date.now()}.jpg`, photo, 1400);
      const { error } = await supabase.rpc("k1_achievement_submit", { p_org: tenant.organization_id, p_person: f.person, p_person_hi: f.person_hi, p_title: f.title, p_title_hi: f.title_hi, p_description: f.description, p_category: f.category, p_photo: url, p_achieved_on: f.achieved_on || null, p_village: f.village } as never);
      if (error) throw error;
      toast.success(hi ? "जमा हो गया — एडमिन की मंज़ूरी के बाद दिखेगा" : "Submitted — visible after admin approval"); setOpen(false); setPhoto(null);
      setF({ person: "", person_hi: "", title: "", title_hi: "", description: "", category: "education", achieved_on: "", village: "" });
      qc.invalidateQueries({ queryKey: ["achievements"] });
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  const rows = (list.data ?? []).filter((a) => !cat || a.category === cat);
  return (
    <>
      <PageHeader title={hi ? "समाज की उपलब्धियाँ" : "Achievements"} description={hi ? "हमारे सदस्यों की उपलब्धियाँ — शिक्षा, खेल, सेवा, व्यवसाय, सम्मान" : "Achievements of our members — education, sports, service, business, awards"} crumbs={[{ label: hi ? "उपलब्धियाँ" : "Achievements" }]} />
      <section className="section-y">
        <div className="container-page space-y-5">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button type="button" className={`rounded-full px-3 py-1 ${!cat ? "bg-primary text-primary-foreground" : "bg-secondary"}`} onClick={() => setCat("")}>{hi ? "सब" : "All"}</button>
            {Object.entries(CATS).map(([k, v]) => <button key={k} type="button" className={`rounded-full px-3 py-1 ${cat === k ? "bg-primary text-primary-foreground" : "bg-secondary"}`} onClick={() => setCat(k)}>{v[hi ? 1 : 0]}</button>)}
            <span className="ml-auto">{user ? <Button size="sm" onClick={() => setOpen((v) => !v)}>+ {hi ? "उपलब्धि जमा करें" : "Submit an achievement"}</Button> : <Link to="/auth" className="underline">{hi ? "उपलब्धि जमा करने के लिए लॉगिन करें" : "Sign in to submit"}</Link>}</span>
          </div>
          {open ? (
            <div className="surface-card grid gap-3 p-4 sm:grid-cols-2">
              <Input placeholder={hi ? "व्यक्ति का नाम (English)" : "Person's name (English)"} value={f.person} onChange={(e) => setF({ ...f, person: e.target.value })} />
              <Input placeholder="नाम (हिंदी)" value={f.person_hi} onChange={(e) => setF({ ...f, person_hi: e.target.value })} />
              <Input placeholder={hi ? "उपलब्धि (English) — जैसे: State topper, Class 12" : "Achievement (English)"} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
              <Input placeholder="उपलब्धि (हिंदी)" value={f.title_hi} onChange={(e) => setF({ ...f, title_hi: e.target.value })} />
              <select className="h-9 rounded-md border border-input bg-background px-2" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v[hi ? 1 : 0]}</option>)}</select>
              <Input type="date" value={f.achieved_on} onChange={(e) => setF({ ...f, achieved_on: e.target.value })} />
              <Input placeholder={hi ? "गाँव / शहर" : "Village / city"} value={f.village} onChange={(e) => setF({ ...f, village: e.target.value })} />
              <label className="flex items-center gap-2 text-sm"><span className="rounded-md border border-border px-3 py-1.5">📷 {hi ? "फोटो" : "Photo"}</span><input type="file" accept="image/*" hidden onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />{photo ? <span className="text-xs text-muted-foreground">{photo.name}</span> : null}</label>
              <Textarea className="sm:col-span-2" rows={3} placeholder={hi ? "विवरण (वैकल्पिक)" : "Details (optional)"} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
              <div className="flex gap-2 sm:col-span-2"><Button onClick={submit} disabled={busy}>{hi ? "जमा करें" : "Submit"}</Button><Button variant="ghost" onClick={() => setOpen(false)}>{hi ? "रद्द" : "Cancel"}</Button></div>
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{rows.map((a) => <AchievementCard key={a.id} a={a} hi={hi} />)}</div>
          {list.isSuccess && !rows.length ? <p className="text-muted-foreground">{hi ? "अभी कोई उपलब्धि प्रकाशित नहीं।" : "No achievements published yet."}</p> : null}
        </div>
      </section>
    </>
  );
}
