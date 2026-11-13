// Members-only matrimony: my profiles, browse verified profiles, send/accept interest, contact after mutual acceptance.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { CardDesigner } from "@/components/matrimony/CardDesigner";
import { ExtraEditor } from "@/components/matrimony/ExtraEditor";
import { ExtraList, Points } from "@/components/matrimony/ExtraList";
import { readExtra, type ExtraField } from "@/components/matrimony/extraFields";
import { PageHeader } from "@/components/site/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { placeName } from "@/core/formText";
import { useLang } from "@/core/i18n";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { signedUrls, uploadPhoto } from "@/lib/images";
import { normPhone } from "@/lib/comms";
import { CHHATTISGARH_DISTRICTS } from "@/lib/locations";

export const Route = createFileRoute("/_authenticated/matrimony")({ head: () => ({ meta: [{ title: "Matrimony" }, { name: "robots", content: "noindex" }] }), component: MatrimonyPage });

type Mine = { id: string; display_name: string; gender: string; birth_year: number; created_for: string; status: string; verified_at: string | null; city: string | null };
type Card = { id: string; display_name: string; gender: string; age: number; height_cm: number | null; education: string | null; profession: string | null; income_range: string | null; city: string | null; district: string | null; gotra: string | null; native_place: string | null; about: string | null; expectations: string | null; photo_path: string | null; created_for: string; verified: boolean; my_interest: string | null; their_interest: string | null; photos: string[]; interests: string | null; special_note: string | null; extra_fields: unknown };
type Inbox = { interest_id: string; direction: string; status: string; other_id: string; other_name: string; other_age: number; other_city: string | null; created_at: string };
const rpc = async <T,>(fn: string, args: Record<string, unknown>): Promise<T> => { const { data, error } = await supabase.rpc(fn as never, args as never); if (error) throw new Error(error.message); return data as T; };

const FOR: Record<string, [string, string]> = { self: ["स्वयं", "Self"], son: ["बेटा", "Son"], daughter: ["बेटी", "Daughter"], brother: ["भाई", "Brother"], sister: ["बहन", "Sister"], relative: ["रिश्तेदार", "Relative"] };

function MatrimonyPage() {
  const tenant = useTenant();
  const org = tenant.organization_id;
  const { user } = useAuth();
  const { lang } = useLang();
  const L = lang === "hi";
  const qc = useQueryClient();
  const [tab, setTab] = useState<"browse" | "inbox" | "mine">("browse");
  const [gender, setGender] = useState("");
  const member = useQuery({ queryKey: ["is_member", org], queryFn: () => rpc<boolean>("k1_is_member", { p_org: org }) });
  const mine = useQuery({ queryKey: ["matri_mine", org], queryFn: async () => { const { data } = await supabase.from("cm_matrimony_profiles").select("id,display_name,gender,birth_year,created_for,status,verified_at,city").eq("organization_id", org).eq("user_id", user!.id); return (data ?? []) as Mine[]; } });
  const cards = useQuery({ queryKey: ["matri_browse", org, gender], enabled: member.data === true, queryFn: () => rpc<Card[]>("k1_matrimony_browse", { p_org: org, p_gender: gender || null }) });
  const inbox = useQuery({ queryKey: ["matri_inbox", org], enabled: member.data === true, queryFn: () => rpc<Inbox[]>("k1_matrimony_inbox", { p_org: org }) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["matri_browse"] }); qc.invalidateQueries({ queryKey: ["matri_inbox"] }); qc.invalidateQueries({ queryKey: ["matri_mine"] }); };
  const myActive = (mine.data ?? []).find((m) => m.status === "active" && m.verified_at);
  // private bucket → signed URLs for every photo on the visible cards
  const allPaths = (cards.data ?? []).flatMap((c) => [c.photo_path, ...(c.photos ?? [])]).filter((x): x is string => !!x);
  const urls = useQuery({ queryKey: ["matri_urls", allPaths.join("|")], enabled: allPaths.length > 0, staleTime: 50 * 60_000, queryFn: () => signedUrls("matrimony", allPaths) });
  const photoUrl = (p: string | null) => (p ? urls.data?.[p] ?? "" : "");

  async function interest(to: string) {
    if (!myActive) { toast.error(L ? "पहले अपना प्रोफ़ाइल बनाएँ और सत्यापित कराएँ।" : "Create and verify your own profile first."); return; }
    try { await rpc("k1_matrimony_interest", { p_from: myActive.id, p_to: to }); toast.success(L ? "रुचि भेज दी" : "Interest sent"); refresh(); } catch (e) { toast.error((e as Error).message); }
  }
  async function respond(i: Inbox, ok: boolean) { try { await rpc("k1_matrimony_respond", { p_interest: i.interest_id, p_accept: ok }); refresh(); } catch (e) { toast.error((e as Error).message); } }
  async function showContact(id: string) { try { const c = await rpc<{ display_name: string; contact_phone: string } | null>("k1_matrimony_contact", { p_profile: id }); if (!c) throw new Error(L ? "संपर्क तभी दिखेगा जब दोनों ओर से स्वीकृति हो" : "Contact is shared only after both sides accept"); alert(`${c.display_name}: ${c.contact_phone}`); } catch (e) { toast.error((e as Error).message); } }

  if (member.isSuccess && !member.data) return <><PageHeader title={L ? "वैवाहिक" : "Matrimony"} crumbs={[{ label: "Matrimony" }]} /><section className="section-y"><div className="container-page text-sm text-muted-foreground">{L ? "यह सुविधा सिर्फ़ संगठन के सक्रिय सदस्यों के लिए है। " : "This is for active members of the organization. "}<Link to="/join" className="underline">{L ? "सदस्य बनें" : "Become a member"}</Link></div></section></>;
  return (
    <>
      <PageHeader title={L ? "वैवाहिक परिचय" : "Matrimony"} description={L ? "समाज के सदस्यों के सत्यापित परिचय। फ़ोन नंबर तभी दिखता है जब दोनों ओर से रुचि स्वीकार हो।" : "Verified profiles of community members. Phone numbers are shared only when both sides accept."} crumbs={[{ label: L ? "वैवाहिक" : "Matrimony" }]} />
      <section className="section-y"><div className="container-page space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-border p-0.5 text-xs">{([["browse", L ? "परिचय देखें" : "Browse"], ["inbox", L ? "रुचियाँ" : "Interests"], ["mine", L ? "मेरे प्रोफ़ाइल" : "My profiles"]] as const).map(([k, l]) => <button key={k} type="button" className={`rounded px-3 py-1 ${tab === k ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setTab(k)}>{l}</button>)}</div>
          {tab === "browse" ? <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={gender} onChange={(e) => setGender(e.target.value)}><option value="">{L ? "सभी" : "All"}</option><option value="male">{L ? "वर" : "Grooms"}</option><option value="female">{L ? "वधू" : "Brides"}</option></select> : null}
        </div>
        {tab === "browse" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(cards.data ?? []).map((c) => (
              <article key={c.id} className="surface-card p-4 text-sm">
                <Gallery paths={[c.photo_path, ...(c.photos ?? [])].filter((x): x is string => !!x)} url={photoUrl} />
                <h3 className="font-display text-lg font-semibold">{c.display_name} <span className="text-sm font-normal text-muted-foreground">· {c.age} {L ? "वर्ष" : "yrs"}</span></h3>
                <p className="text-muted-foreground">{[c.education, c.profession, c.income_range].filter(Boolean).join(" · ")}</p>
                <p className="text-muted-foreground">{[c.city, c.district].filter(Boolean).join(", ")}{c.gotra ? ` · ${L ? "गोत्र" : "gotra"}: ${c.gotra}` : ""}{c.native_place ? ` · ${L ? "मूल" : "native"}: ${c.native_place}` : ""}{c.height_cm ? ` · ${c.height_cm} cm` : ""}</p>
                <Points text={c.about} className="mt-2" />
                {c.interests ? <p className="mt-1 text-xs text-muted-foreground">{L ? "रुचियाँ" : "Interests"}: {c.interests}</p> : null}
                {c.expectations ? <div className="mt-1 text-xs text-muted-foreground"><span>{L ? "अपेक्षाएँ" : "Looking for"}: </span><Points text={c.expectations} /></div> : null}
                {c.special_note ? <div className="mt-1 rounded bg-secondary/60 px-2 py-1 text-xs">{L ? "विशेष" : "Note"}: <Points text={c.special_note} /></div> : null}
                <ExtraList rows={readExtra(c.extra_fields)} L={L} />
                <div className="mt-3 flex flex-wrap gap-2">
                  {c.my_interest === "accepted" || c.their_interest === "accepted" ? <Button size="sm" onClick={() => showContact(c.id)}>{L ? "संपर्क देखें" : "View contact"}</Button>
                    : c.my_interest ? <Badge variant="secondary">{L ? "रुचि भेजी" : "Interest sent"} · {c.my_interest}</Badge>
                    : c.their_interest === "sent" ? <Badge>{L ? "इन्होंने रुचि भेजी है — 'रुचियाँ' में देखें" : "They sent interest — see Interests"}</Badge>
                    : <Button size="sm" variant="outline" onClick={() => interest(c.id)}>{L ? "रुचि भेजें" : "Send interest"}</Button>}
                </div>
              </article>
            ))}
            {cards.isSuccess && !cards.data.length ? <p className="text-muted-foreground">{L ? "अभी कोई सत्यापित परिचय नहीं।" : "No verified profiles yet."}</p> : null}
          </div>
        ) : null}
        {tab === "inbox" ? (
          <ul className="space-y-2 text-sm">
            {(inbox.data ?? []).map((i) => (
              <li key={i.interest_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background p-3">
                <span>{i.direction === "received" ? (L ? "रुचि मिली" : "Received from") : (L ? "रुचि भेजी" : "Sent to")}: <b>{i.other_name}</b> · {i.other_age} {L ? "वर्ष" : "yrs"} {i.other_city ? `· ${i.other_city}` : ""} <Badge variant={i.status === "accepted" ? "default" : i.status === "declined" ? "destructive" : "secondary"} className="ml-1">{i.status}</Badge></span>
                <span className="flex gap-1">{i.direction === "received" && i.status === "sent" ? <><Button size="sm" onClick={() => respond(i, true)}>{L ? "स्वीकार" : "Accept"}</Button><Button size="sm" variant="ghost" onClick={() => respond(i, false)}>{L ? "अस्वीकार" : "Decline"}</Button></> : null}{i.status === "accepted" ? <Button size="sm" variant="outline" onClick={() => showContact(i.other_id)}>{L ? "संपर्क" : "Contact"}</Button> : null}</span>
              </li>
            ))}
            {inbox.isSuccess && !inbox.data.length ? <li className="text-muted-foreground">{L ? "अभी कोई रुचि नहीं।" : "No interests yet."}</li> : null}
          </ul>
        ) : null}
        {tab === "mine" ? <MyProfiles org={org} mine={mine.data ?? []} onChange={refresh} L={L} /> : null}
      </div></section>
    </>
  );
}

function MyProfiles({ org, mine, onChange, L }: { org: string; mine: Mine[]; onChange: () => void; L: boolean }) {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [design, setDesign] = useState<string | null>(null);   // biodata card designer
  const [f, setF] = useState<Record<string, string>>({ created_for: "self", gender: "male" });
  async function startEdit(id: string) {
    const { data, error } = await supabase.from("cm_matrimony_profiles").select("*").eq("id", id).single();
    if (error || !data) { toast.error(error?.message ?? "Not found"); return; }
    const r = data as Record<string, unknown>;
    const vals: Record<string, string> = {};
    for (const k of ["created_for", "gender", "display_name", "birth_year", "height_cm", "education", "profession", "income_range", "city", "district", "gotra", "native_place", "about", "expectations", "interests", "special_note", "contact_phone"]) vals[k] = r[k] == null ? "" : String(r[k]);
    setF(vals); setExtras(readExtra(r["extra_fields"])); setFiles([]); setConsent(true); setEditId(id); setOpen(true);
  }
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [extras, setExtras] = useState<ExtraField[]>([]);
  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }));
  async function save() {
    if (!consent) { toast.error(L ? "सहमति ज़रूरी है" : "Consent is required"); return; }
    const by = Number(f["birth_year"]); if (!f["display_name"]?.trim() || !by || !f["contact_phone"]) { toast.error(L ? "नाम, जन्म वर्ष और मोबाइल ज़रूरी" : "Name, birth year and mobile are required"); return; }
    setBusy(true);
    try {
      const uid = (await supabase.auth.getUser()).data.user!.id;
      const row = { organization_id: org, user_id: uid, created_for: f["created_for"], display_name: f["display_name"].trim(), gender: f["gender"], birth_year: by, height_cm: f["height_cm"] ? Number(f["height_cm"]) : null, education: f["education"] || null, profession: f["profession"] || null, income_range: f["income_range"] || null, city: f["city"] || null, district: f["district"] || null, gotra: f["gotra"] || null, native_place: f["native_place"] || null, about: f["about"] || null, expectations: f["expectations"] || null, interests: f["interests"] || null, special_note: f["special_note"] || null, contact_phone: normPhone(f["contact_phone"]), extra_fields: readExtra(extras) };
      let pid = editId;
      if (editId) {
        const { error } = await supabase.from("cm_matrimony_profiles").update({ ...row, verified_at: null } as never).eq("id", editId); if (error) throw error;
      } else {
        const { data: ins, error } = await supabase.from("cm_matrimony_profiles").insert(row as never).select("id").single();
        if (error) throw error; pid = (ins as { id: string }).id;
      }
      if (files.length && pid) {
        const paths: string[] = [];
        for (let i = 0; i < Math.min(files.length, 6); i++) paths.push(await uploadPhoto("matrimony", `${org}/${pid}/${i + 1}.jpg`, files[i]!, 1000));
        const { error: e2 } = await supabase.from("cm_matrimony_profiles").update({ photo_path: paths[0], photos: paths } as never).eq("id", pid); if (e2) throw e2;
      }
      toast.success(editId ? (L ? "प्रोफ़ाइल बदला — एडमिन दोबारा सत्यापित करेगा" : "Profile updated — admin will re-verify") : (L ? "प्रोफ़ाइल बना — एडमिन सत्यापन के बाद दिखेगा" : "Profile created — visible after admin verification")); setOpen(false); setEditId(null); onChange();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function setStatus(id: string, status: string) { const { error } = await supabase.from("cm_matrimony_profiles").update({ status } as never).eq("id", id); if (error) toast.error(error.message); else onChange(); }
  const In = (k: string, label: string, type = "text", extra: Record<string, unknown> = {}, req = false) => <label key={k} className="block text-sm"><span className="mb-1 block text-xs text-muted-foreground">{label}{req ? <span className="text-destructive"> *</span> : null}</span><Input type={type} value={f[k] ?? ""} onChange={(e) => set(k, e.target.value)} {...extra} /></label>;
  const cm = Number(f["height_cm"]); const ftIn = cm > 90 && cm < 230 ? (() => { const i = Math.round(cm / 2.54); return `${Math.floor(i / 12)}'${i % 12}"`; })() : "";
  return (
    <div className="space-y-3 text-sm">
      <ul className="space-y-2">{mine.map((m) => <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background p-3"><span><b>{m.display_name}</b> · {m.gender === "female" ? (L ? "वधू" : "Bride") : (L ? "वर" : "Groom")} · {new Date().getFullYear() - m.birth_year} {L ? "वर्ष" : "yrs"} · {FOR[m.created_for]?.[L ? 0 : 1] ?? m.created_for} {m.verified_at ? <Badge className="ml-1">{L ? "सत्यापित" : "verified"}</Badge> : <Badge variant="secondary" className="ml-1">{L ? "सत्यापन बाकी" : "pending verification"}</Badge>} <Badge variant="outline" className="ml-1">{L ? ({ active: "चालू", paused: "रुका हुआ", removed: "हटाया गया", pending: "बाकी" } as Record<string, string>)[m.status] ?? m.status : m.status}</Badge></span><span className="flex flex-wrap gap-1">{m.status !== "removed" ? <Button size="sm" onClick={() => setDesign(m.id)}>🎨 {L ? "बायोडाटा कार्ड / QR / शेयर" : "Biodata card / QR / share"}</Button> : null}{m.status !== "removed" ? <Button size="sm" variant="outline" onClick={() => void startEdit(m.id)}>{L ? "बदलें" : "Edit"}</Button> : null}{m.status === "active" ? <Button size="sm" variant="outline" onClick={() => setStatus(m.id, "paused")}>{L ? "रोकें" : "Pause"}</Button> : m.status === "paused" ? <Button size="sm" variant="outline" onClick={() => setStatus(m.id, "active")}>{L ? "फिर चालू" : "Resume"}</Button> : null}{m.status !== "removed" ? <Button size="sm" variant="ghost" onClick={() => { if (confirm(L ? "प्रोफ़ाइल हटाएँ?" : "Remove profile?")) setStatus(m.id, "removed"); }}>{L ? "हटाएँ" : "Remove"}</Button> : null}</span></li>)}</ul>
      {design ? <CardDesigner profileId={design} L={L} onClose={() => setDesign(null)} /> : null}
      {!open ? <Button onClick={() => { setEditId(null); setF({ created_for: "self", gender: "male" }); setExtras([]); setFiles([]); setConsent(false); setOpen(true); }}>+ {L ? "नया प्रोफ़ाइल" : "New profile"}</Button> : (
        <div className="grid gap-3 rounded-lg border border-border bg-background p-4 sm:grid-cols-2">
          <label className="block"><span className="mb-1 block text-xs text-muted-foreground">{L ? "किसके लिए" : "Profile for"}</span><select className="h-9 w-full rounded-md border border-input bg-background px-2" value={f["created_for"]} onChange={(e) => set("created_for", e.target.value)}>{Object.entries(FOR).map(([o, [h2, en]]) => <option key={o} value={o}>{L ? h2 : en}</option>)}</select></label>
          <label className="block"><span className="mb-1 block text-xs text-muted-foreground">{L ? "वर / वधू" : "Gender"}</span><select className="h-9 w-full rounded-md border border-input bg-background px-2" value={f["gender"]} onChange={(e) => set("gender", e.target.value)}><option value="male">{L ? "वर (पुरुष)" : "Male"}</option><option value="female">{L ? "वधू (स्त्री)" : "Female"}</option></select></label>
          {In("display_name", L ? "नाम (जो दिखेगा)" : "Display name", "text", {}, true)}{In("birth_year", L ? "जन्म वर्ष (18+)" : "Birth year (18+)", "number", { min: new Date().getFullYear() - 70, max: new Date().getFullYear() - 18, inputMode: "numeric" }, true)}
          {In("height_cm", L ? `कद (सेमी में)${ftIn ? ` = ${ftIn}` : ""}` : `Height (cm)${ftIn ? ` = ${ftIn}` : ""}`, "number", { min: 120, max: 220, inputMode: "numeric", placeholder: L ? "जैसे 170" : "e.g. 170" })}{In("education", L ? "शिक्षा" : "Education")}
          {In("profession", L ? "व्यवसाय" : "Profession")}{In("income_range", L ? "वार्षिक आय (लगभग)" : "Annual income (approx.)", "text", { list: "mx-income" })}<datalist id="mx-income">{(L ? ["2 लाख तक", "2–5 लाख", "5–10 लाख", "10–20 लाख", "20 लाख से अधिक"] : ["Up to 2 lakh", "2–5 lakh", "5–10 lakh", "10–20 lakh", "Above 20 lakh"]).map((x) => <option key={x} value={x} />)}</datalist>
          {In("city", L ? "शहर / गाँव" : "City / village")}{In("district", L ? "ज़िला" : "District", "text", { list: "mx-districts" })}<datalist id="mx-districts">{CHHATTISGARH_DISTRICTS.map((d) => <option key={d} value={placeName(d, L)} />)}</datalist>
          {In("gotra", L ? "गोत्र" : "Gotra")}{In("native_place", L ? "मूल ग्राम" : "Native place")}
          <label className="block sm:col-span-2"><span className="mb-1 block text-xs text-muted-foreground">{L ? "परिचय (बिंदुवार लिखना हो तो हर बिंदु नई पंक्ति में)" : "About (for points, one point per line)"}</span><Textarea rows={4} value={f["about"] ?? ""} onChange={(e) => set("about", e.target.value)} /></label>
          <label className="block sm:col-span-2"><span className="mb-1 block text-xs text-muted-foreground">{L ? "अपेक्षाएँ (हर बिंदु नई पंक्ति में लिख सकते हैं)" : "Expectations (one point per line is fine)"}</span><Textarea rows={3} value={f["expectations"] ?? ""} onChange={(e) => set("expectations", e.target.value)} /></label>
          <label className="block sm:col-span-2"><span className="mb-1 block text-xs text-muted-foreground">{L ? "रुचियाँ / शौक" : "Interests / hobbies"}</span><Input value={f["interests"] ?? ""} onChange={(e) => set("interests", e.target.value)} placeholder={L ? "जैसे: संगीत, यात्रा, पढ़ना" : "e.g. music, travel, reading"} /></label>
          <label className="block sm:col-span-2"><span className="mb-1 block text-xs text-muted-foreground">{L ? "विशेष टिप्पणी (मांगलिक, पुनर्विवाह, विशेष अपेक्षा आदि)" : "Special note (manglik, remarriage, specific requirement …)"}</span><Textarea rows={2} value={f["special_note"] ?? ""} onChange={(e) => set("special_note", e.target.value)} /></label>
          <div className="sm:col-span-2"><p className="mb-1 text-sm font-semibold">{L ? "और जानकारी (बिंदुवार)" : "More details (point-wise)"}</p><ExtraEditor rows={extras} onChange={setExtras} L={L} /></div>
          <label className="block sm:col-span-2"><span className="mb-1 block text-xs text-muted-foreground">{L ? "फोटो (6 तक; पहली फोटो मुख्य)" : "Photos (up to 6; first is the main one)"}</span><input type="file" accept="image/*" multiple onChange={(e) => setFiles([...(e.target.files ?? [])].slice(0, 6))} />{files.length ? <div className="mt-2 flex flex-wrap gap-2">{files.map((fl, i) => <img key={i} src={URL.createObjectURL(fl)} alt="" className="h-16 w-16 rounded object-cover" />)}</div> : null}</label>
          {In("contact_phone", L ? "संपर्क मोबाइल (सिर्फ़ स्वीकृति के बाद दिखेगा)" : "Contact mobile (shared only after mutual acceptance)", "tel", { inputMode: "numeric", maxLength: 13, placeholder: "98XXXXXXXX" }, true)}
          <label className="flex items-start gap-2 sm:col-span-2 text-xs"><Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} /> <span>{L ? "मैं पुष्टि करता/करती हूँ कि यह व्यक्ति वयस्क है, जानकारी सही है, और इसे संगठन के सदस्यों को दिखाने की सहमति है। एडमिन सत्यापन के बाद ही दिखेगा।" : "I confirm the person is an adult, the details are true, and consent to showing this profile to members. Visible only after admin verification."}</span></label>
          <div className="sm:col-span-2 flex gap-2"><Button onClick={save} disabled={busy}>{L ? "सहेजें" : "Save"}</Button><Button variant="ghost" onClick={() => { setOpen(false); setEditId(null); }}>{L ? "रद्द" : "Cancel"}</Button></div>
        </div>
      )}
    </div>
  );
}

/** Photo strip with a main image and thumbnails (tap to switch). */
function Gallery({ paths, url }: { paths: string[]; url: (p: string | null) => string }) {
  const [i, setI] = useState(0);
  if (!paths.length) return null;
  const main = url(paths[Math.min(i, paths.length - 1)] ?? null);
  return (
    <div className="mb-3">
      {main ? <img src={main} alt="" className="aspect-square w-full rounded-md object-cover" /> : <div className="aspect-square w-full animate-pulse rounded-md bg-secondary" />}
      {paths.length > 1 ? <div className="mt-1 flex gap-1 overflow-x-auto">{paths.map((p, k) => <button key={p} type="button" onClick={() => setI(k)} className={`h-12 w-12 shrink-0 overflow-hidden rounded border ${k === i ? "border-primary" : "border-border"}`}>{url(p) ? <img src={url(p)} alt="" className="h-full w-full object-cover" /> : null}</button>)}</div> : null}
    </div>
  );
}

