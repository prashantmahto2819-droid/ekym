// Exam detail: rules, dates, categories, registration (child-safe), leaderboard when results are out.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { RichText } from "@/components/site/Blocks";
import { PageHeader } from "@/components/site/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useLang } from "@/core/i18n";
import { pageMeta } from "@/core/seo";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { dt, STATUS_HI, useExamList, useMyRegs } from "./exams.index";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const Route = createFileRoute("/exams/$slug/")({
  head: ({ matches, params }) => pageMeta(matches, { en: `Exam ${params.slug}`, hi: `परीक्षा ${params.slug}` }),
  component: ExamPage,
});

type Cat = { id: string; name: string; name_hi: string | null; class_from: number | null; class_to: number | null; questions_per_paper: number; display_order: number };
type Full = { id: string; organization_id: string; slug: string; title: string; title_hi: string | null; summary: string | null; summary_hi: string | null; rules: string | null; rules_hi: string | null; cover_image: string | null; status: string; languages: string[]; reg_opens_at: string | null; reg_closes_at: string | null; starts_at: string | null; ends_at: string | null; duration_minutes: number; negative_mark: number; pass_percent: number; winners: number; cert_participation: boolean; cert_merit: boolean; show_answers_after: boolean; max_tab_switches: number };
type Lead = { category_id: string | null; category_name: string | null; rank: number; student_name: string; school: string | null; city: string | null; percent: number; result: string };

function ExamPage() {
  const { slug } = Route.useParams();
  const tenant = useTenant();
  const { lang } = useLang();
  const hi = lang === "hi";
  const { user } = useAuth();
  const qc = useQueryClient();
  const list = useExamList(tenant.organization_id);
  const row = list.data?.find((e) => e.slug === slug);
  const exam = useQuery({ queryKey: ["ex_exam", row?.id], enabled: !!row, queryFn: async () => { const { data, error } = await supabase.from("ex_exams").select("*").eq("id", row!.id).single(); if (error) throw error; return data as unknown as Full; } });
  const cats = useQuery({ queryKey: ["ex_cats", row?.id], enabled: !!row, queryFn: async () => { const { data } = await supabase.from("ex_categories").select("*").eq("exam_id", row!.id).order("display_order"); return (data ?? []) as Cat[]; } });
  const lead = useQuery({ queryKey: ["ex_lead", row?.id], enabled: !!row && row.status === "results", queryFn: async () => { const { data } = await supabase.rpc("ex_leaderboard", { p_exam: row!.id } as never); return (data ?? []) as unknown as Lead[]; } });
  const orgs = useQuery({ queryKey: ["contact_targets", tenant.organization_id], queryFn: async () => { const { data } = await supabase.rpc("k1_contact_targets", { p_org: tenant.organization_id } as never); return (data ?? []) as unknown as { id: string; name: string; name_hi: string | null }[]; } });
  const mine = useMyRegs(!!user);
  const myRegs = (mine.data ?? []).filter((r) => r.exam_id === row?.id);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ category: "", student: "", student_hi: "", dob: "", gender: "", class_level: "", school: "", city: "", district: "", org: "", lang: "hi", mobile: "", parent_name: "", parent_mobile: "", consent: false, blood: "" });
  const [busy, setBusy] = useState(false);
  const e = exam.data;
  const minor = !f.dob || new Date(f.dob) > new Date(Date.now() - 18 * 365.25 * 86400000);
  async function register() {
    if (!e) return;
    if (cats.data?.length && !f.category) { toast.error(hi ? "श्रेणी / कक्षा चुनें" : "Choose a category"); return; }
    if (!f.blood) { toast.error(hi ? "रक्त समूह चुनें (पता न हो तो \"पता नहीं\")" : "Choose the blood group (or \"Don't know\")"); return; }
    setBusy(true);
    try {
      const { error } = await supabase.rpc("ex_register", { p_exam: e.id, p_category: f.category || null, p_student: f.student, p_student_hi: f.student_hi, p_dob: f.dob || null, p_gender: f.gender || null, p_class: f.class_level || null, p_school: f.school || null, p_city: f.city || null, p_district: f.district || null, p_org: f.org || null, p_lang: f.lang, p_mobile: f.mobile || null, p_parent_name: f.parent_name || null, p_parent_mobile: f.parent_mobile || null, p_consent: f.consent, p_blood: f.blood || null } as never);
      if (error) throw error;
      toast.success(hi ? "पंजीयन हो गया — WhatsApp/ईमेल पर पुष्टि भेजी गई" : "Registered — confirmation sent"); setOpen(false);
      qc.invalidateQueries({ queryKey: ["ex_my"] }); qc.invalidateQueries({ queryKey: ["ex_list"] });
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  }
  if (!row && list.isSuccess) return <section className="section-y"><div className="container-page">{hi ? "परीक्षा नहीं मिली।" : "Exam not found."}</div></section>;
  if (!e) return null;
  const canRegister = (e.status === "open" || e.status === "running") && (!e.reg_closes_at || new Date(e.reg_closes_at) > new Date());
  return (
    <>
      <PageHeader title={(hi && e.title_hi) || e.title} description={(hi && e.summary_hi) || e.summary || undefined} crumbs={[{ label: hi ? "परीक्षा" : "Exams", to: "/exams" }, { label: (hi && e.title_hi) || e.title }]} />
      <section className="section-y">
        <div className="container-page grid gap-8 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-6">
            {e.cover_image ? <img src={e.cover_image} alt="" className="w-full rounded-xl object-cover" /> : null}
            <div className="surface-card grid gap-3 p-4 text-sm sm:grid-cols-2">
              <p><b>{hi ? "स्थिति" : "Status"}:</b> <Badge>{(STATUS_HI[e.status] ?? ["", ""])[hi ? 1 : 0]}</Badge></p>
              <p><b>{hi ? "परीक्षा" : "Exam"}:</b> {dt(e.starts_at, hi)}{e.ends_at ? ` – ${dt(e.ends_at, hi)}` : ""}</p>
              <p><b>{hi ? "पंजीयन" : "Registration"}:</b> {dt(e.reg_opens_at, hi)} – {dt(e.reg_closes_at, hi)}</p>
              <p><b>{hi ? "अवधि" : "Duration"}:</b> {e.duration_minutes} {hi ? "मिनट" : "min"} · {hi ? "ऋणात्मक अंक" : "Negative"}: {e.negative_mark} · {hi ? "उत्तीर्ण" : "Pass"}: {e.pass_percent}%</p>
              <p><b>{hi ? "भाषा" : "Languages"}:</b> {e.languages.join(", ")}</p>
              <p><b>{hi ? "प्रमाण-पत्र" : "Certificates"}:</b> {[e.cert_participation && (hi ? "सहभागिता" : "participation"), e.cert_merit && (hi ? `मेरिट (प्रथम ${e.winners})` : `merit (top ${e.winners})`)].filter(Boolean).join(", ") || "—"}</p>
            </div>
            {cats.data?.length ? <div><h2 className="font-display text-lg font-semibold">{hi ? "श्रेणियाँ / कक्षाएँ" : "Categories"}</h2><ul className="mt-2 flex flex-wrap gap-2 text-sm">{cats.data.map((c) => <li key={c.id} className="rounded-full border border-border px-3 py-1">{(hi && c.name_hi) || c.name}{c.class_from ? ` (${hi ? "कक्षा" : "class"} ${c.class_from}–${c.class_to ?? c.class_from})` : ""} · {c.questions_per_paper} {hi ? "प्रश्न" : "Q"}</li>)}</ul></div> : null}
            {(hi && e.rules_hi) || e.rules ? <div><h2 className="font-display text-lg font-semibold">{hi ? "नियम व निर्देश" : "Rules"}</h2><RichText className="mt-2" text={((hi && e.rules_hi) || e.rules) ?? ""} /></div> : null}
            <div className="rounded-lg border border-border bg-secondary/40 p-4 text-sm">
              <p className="font-semibold">{hi ? "परीक्षा कैसे होगी" : "How the exam works"}</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                <li>{hi ? "परीक्षा के समय इसी खाते से लॉगिन करके 'परीक्षा शुरू करें' दबाएँ; प्रश्न-पत्र अपने-आप बनेगा, समय ऊपर दिखेगा।" : "At exam time sign in with this account and press Start; the paper is generated and timed."}</li>
                <li>{hi ? `टैब बदलना/दूसरी विंडो खोलना गिना जाता है (अधिकतम ${e.max_tab_switches}); समय पूरा होने पर उत्तर अपने-आप जमा हो जाते हैं।` : `Switching tabs is counted (max ${e.max_tab_switches}); answers auto-submit when time is up.`}</li>
                <li>{hi ? "उत्तर सर्वर पर जाँचे जाते हैं; परिणाम घोषित होने पर WhatsApp/ईमेल पर सूचना और प्रमाण-पत्र का लिंक मिलेगा।" : "Grading is on the server; results and certificate link arrive on WhatsApp/email."}</li>
              </ul>
            </div>
            {e.status === "results" && lead.data?.length ? (
              <div><h2 className="font-display text-lg font-semibold">🏆 {hi ? "मेरिट सूची" : "Merit list"}</h2>
                <table className="mt-2 w-full text-sm"><tbody>{lead.data.map((l, i) => <tr key={i} className="border-t border-border"><td className="py-1 pr-2">{l.rank}</td><td className="py-1 pr-2 font-medium">{l.student_name}</td><td className="py-1 pr-2 text-muted-foreground">{[l.school, l.city].filter(Boolean).join(", ")}</td><td className="py-1 pr-2 text-muted-foreground">{l.category_name}</td><td className="py-1 text-right">{l.percent}%</td></tr>)}</tbody></table></div>
            ) : null}
          </div>
          <aside className="space-y-3">
            {myRegs.length ? <div className="surface-card p-4 text-sm"><p className="font-semibold">{hi ? "आपके पंजीयन" : "Your registrations"}</p>{myRegs.map((r) => <div key={r.id} className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2"><span>{r.student_name}<span className="block text-xs text-muted-foreground">{r.reg_no}{r.category_name ? ` · ${r.category_name}` : ""}</span></span>{e.status === "results" ? <Button asChild size="sm" variant="outline"><Link to="/exams/$slug/result/$token" params={{ slug: e.slug, token: r.public_token }}>{hi ? "परिणाम" : "Result"}</Link></Button> : r.attempted ? <Badge variant="secondary">{hi ? "दी गई" : "done"}</Badge> : <Button asChild size="sm"><Link to="/exams/$slug/attempt" params={{ slug: e.slug }} search={{ reg: r.id }}>{hi ? "शुरू करें" : "Start"}</Link></Button>}</div>)}</div> : null}
            {canRegister ? (
              !user ? <div className="surface-card p-4 text-sm"><p>{hi ? "पंजीयन के लिए लॉगिन करें (अभिभावक या विद्यार्थी का WhatsApp नंबर)।" : "Sign in to register (parent's or student's WhatsApp number)."}</p><Button asChild className="mt-2 w-full"><Link to="/auth" search={{ redirect: `/exams/${e.slug}` }}>{hi ? "लॉगिन / खाता बनाएँ" : "Sign in / sign up"}</Link></Button></div>
              : !open ? <Button className="w-full" onClick={() => setOpen(true)}>+ {hi ? "विद्यार्थी का पंजीयन करें" : "Register a student"}</Button>
              : (
                <div className="surface-card space-y-2 p-4 text-sm">
                  <p className="font-semibold">{hi ? "विद्यार्थी का पंजीयन" : "Student registration"}</p>
                  {cats.data?.length ? <select className="h-9 w-full rounded-md border border-input bg-background px-2" value={f.category} onChange={(ev) => setF({ ...f, category: ev.target.value })}><option value="">{hi ? "— श्रेणी / कक्षा —" : "— category —"}</option>{cats.data.map((c) => <option key={c.id} value={c.id}>{(hi && c.name_hi) || c.name}</option>)}</select> : null}
                  <Input placeholder={hi ? "विद्यार्थी का नाम (English)" : "Student name (English)"} value={f.student} onChange={(ev) => setF({ ...f, student: ev.target.value })} />
                  <Input placeholder="नाम (हिंदी)" value={f.student_hi} onChange={(ev) => setF({ ...f, student_hi: ev.target.value })} />
                  <label className="block text-xs text-muted-foreground">{hi ? "जन्म तिथि" : "Date of birth"}<Input type="date" value={f.dob} onChange={(ev) => setF({ ...f, dob: ev.target.value })} /></label>
                  <div className="grid grid-cols-2 gap-2">
                    <select className="h-9 rounded-md border border-input bg-background px-2" value={f.gender} onChange={(ev) => setF({ ...f, gender: ev.target.value })}><option value="">{hi ? "लिंग" : "Gender"}</option><option value="male">{hi ? "छात्र" : "Male"}</option><option value="female">{hi ? "छात्रा" : "Female"}</option></select>
                    <Input placeholder={hi ? "कक्षा" : "Class"} value={f.class_level} onChange={(ev) => setF({ ...f, class_level: ev.target.value })} />
                  </div>
                  <label className="block text-xs text-muted-foreground">{hi ? "रक्त समूह (ज़रूरी)" : "Blood group (required)"}
                    <select required className={`mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm text-foreground ${f.blood ? "border-input" : "border-amber-500"}`} value={f.blood} onChange={(ev) => setF({ ...f, blood: ev.target.value })}>
                      <option value="">{hi ? "— रक्त समूह चुनें —" : "— choose blood group —"}</option>
                      {BLOOD_GROUPS.map((b) => <option key={b} value={b}>{b}</option>)}
                      <option value="unknown">{hi ? "पता नहीं" : "Don't know"}</option>
                    </select>
                  </label>
                  <Input placeholder={hi ? "स्कूल / कॉलेज" : "School / college"} value={f.school} onChange={(ev) => setF({ ...f, school: ev.target.value })} />
                  <div className="grid grid-cols-2 gap-2"><Input placeholder={hi ? "शहर / गाँव" : "City"} value={f.city} onChange={(ev) => setF({ ...f, city: ev.target.value })} /><Input placeholder={hi ? "ज़िला" : "District"} value={f.district} onChange={(ev) => setF({ ...f, district: ev.target.value })} /></div>
                  {orgs.data?.length ? <select className="h-9 w-full rounded-md border border-input bg-background px-2" value={f.org} onChange={(ev) => setF({ ...f, org: ev.target.value })}><option value="">{hi ? "— किस समाज/संस्था से —" : "— organization —"}</option>{orgs.data.map((o) => <option key={o.id} value={o.id}>{(hi && o.name_hi) || o.name}</option>)}</select> : null}
                  <div className="grid grid-cols-2 gap-2">
                    <select className="h-9 rounded-md border border-input bg-background px-2" value={f.lang} onChange={(ev) => setF({ ...f, lang: ev.target.value })}>{e.languages.map((l) => <option key={l} value={l}>{l === "hi" ? "हिंदी" : "English"}</option>)}</select>
                    <Input placeholder={hi ? "मोबाइल" : "Mobile"} value={f.mobile} onChange={(ev) => setF({ ...f, mobile: ev.target.value })} />
                  </div>
                  {minor ? (
                    <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-900">
                      <p className="text-xs font-semibold">{hi ? "18 वर्ष से कम — अभिभावक की जानकारी ज़रूरी" : "Under 18 — parent/guardian details required"}</p>
                      <Input className="mt-1" placeholder={hi ? "अभिभावक का नाम" : "Parent / guardian name"} value={f.parent_name} onChange={(ev) => setF({ ...f, parent_name: ev.target.value })} />
                      <Input className="mt-1" placeholder={hi ? "अभिभावक का मोबाइल (WhatsApp)" : "Parent mobile (WhatsApp)"} value={f.parent_mobile} onChange={(ev) => setF({ ...f, parent_mobile: ev.target.value })} />
                      <label className="mt-2 flex items-start gap-2 text-xs"><Checkbox checked={f.consent} onCheckedChange={(v) => setF({ ...f, consent: v === true })} /> <span>{hi ? "मैं अभिभावक हूँ और इस विद्यार्थी के पंजीयन, परीक्षा और परिणाम (नाम, स्कूल, कक्षा मेरिट सूची में) प्रकाशित होने की सहमति देता/देती हूँ। विद्यार्थी की जानकारी केवल परीक्षा के लिए रखी जाएगी।" : "I am the parent/guardian and consent to this student's registration, exam and publication of results (name, school, class in the merit list). Data is kept only for the exam."}</span></label>
                    </div>
                  ) : null}
                  <div className="flex gap-2"><Button onClick={register} disabled={busy}>{hi ? "पंजीयन करें" : "Register"}</Button><Button variant="ghost" onClick={() => setOpen(false)}>{hi ? "रद्द" : "Cancel"}</Button></div>
                </div>
              )
            ) : <p className="rounded-lg border border-border p-3 text-sm text-muted-foreground">{e.status === "results" ? (hi ? "परिणाम घोषित हो चुके हैं।" : "Results are out.") : (hi ? "पंजीयन अभी खुला नहीं है।" : "Registration is not open.")}</p>}
          </aside>
        </div>
      </section>
    </>
  );
}
