// A samiti / sanstha registers itself on the platform; a platform admin approves, then <slug>.kalchuri.org goes live
// and the requester is its admin.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLang } from "@/core/i18n";
import { useTenant } from "@/core/tenant-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/register-organization")({ component: RegisterOrg });

const KINDS: [string, string, string][] = [["committee", "Committee", "समिति"], ["samaj", "Samaj", "समाज"], ["youth_wing", "Youth wing", "युवा मंच"], ["women_wing", "Women's wing", "महिला मंच"], ["association", "Association", "संघ"], ["trust", "Trust", "ट्रस्ट"], ["foundation", "Foundation", "फ़ाउंडेशन"], ["business", "Business body", "व्यापार मंडल"], ["other", "Other", "अन्य"]];
const LEVELS: [string, string, string][] = [["local", "Local / village", "स्थानीय / गाँव"], ["city", "City", "शहर"], ["tehsil", "Tehsil", "तहसील"], ["district", "District", "ज़िला"], ["state", "State", "राज्य"], ["national", "National", "राष्ट्रीय"]];

function RegisterOrg() {
  const { lang } = useLang();
  const hi = lang === "hi";
  const tenant = useTenant();
  const [f, setF] = useState<Record<string, string>>({ kind: "committee", level: "local" });
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }));
  async function submit() {
    if (!f["name"]?.trim() || !f["contact_name"]?.trim() || !f["phone"]?.trim()) { toast.error(hi ? "संगठन का नाम, संपर्क व्यक्ति और मोबाइल ज़रूरी हैं" : "Organization name, contact person and mobile are required"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("k1_org_register", { p_name: f["name"], p_name_hi: f["name_hi"] ?? "", p_kind: f["kind"], p_level: f["level"], p_city: f["city"] ?? null, p_district: f["district"] ?? null, p_state: f["state"] ?? null, p_about: f["about"] ?? null, p_contact_name: f["contact_name"], p_phone: f["phone"], p_email: f["email"] ?? null, p_parent: null } as never);
      if (error) throw new Error(error.message);
      setDone((data as { slug: string }).slug);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  const sel = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
  return (
    <>
      <PageHeader title={hi ? "अपना संगठन जोड़ें" : "Register your organization"} description={hi ? "समाज की कोई भी समिति, संस्था, युवा/महिला मंच या ट्रस्ट Kalchuri One पर अपनी वेबसाइट, सदस्य, पदाधिकारी, आयोजन, पत्राचार और लेखा चला सकती है — मुफ़्त।" : "Any samiti, sanstha, youth/women's wing or trust of the community can run its website, members, office bearers, events, documents and accounts on Kalchuri One — free."} crumbs={[{ label: hi ? "संगठन पंजीकरण" : "Register organization" }]} />
      <section className="section-y"><div className="container-page max-w-3xl">
        {done ? (
          <div className="surface-card p-6 text-sm">
            <p className="font-display text-lg font-semibold">{hi ? "आवेदन मिल गया 🙏" : "Request received 🙏"}</p>
            <p className="mt-2">{hi ? "Kalchuri One की टीम जाँच कर मंज़ूरी देगी; तब आपको WhatsApp पर सूचना मिलेगी और आपकी साइट " : "The Kalchuri One team will review and approve; you get a WhatsApp notice and your site "}<code>https://{done}.{tenant.slug === "kalchuri-one" ? "kalchuri.org" : "kalchuri.org"}</code>{hi ? " पर चालू हो जाएगी। आप उसके admin होंगे।" : " goes live. You will be its admin."}</p>
            <p className="mt-3"><Link to="/" className="underline">{hi ? "होम" : "Home"}</Link></p>
          </div>
        ) : (
          <div className="surface-card grid gap-4 p-6 sm:grid-cols-2">
            <label className="block sm:col-span-2"><span className="mb-1 block text-xs font-medium text-muted-foreground">{hi ? "संगठन का नाम (English) *" : "Organization name (English) *"}</span><Input value={f["name"] ?? ""} onChange={(e) => set("name", e.target.value)} /></label>
            <label className="block sm:col-span-2"><span className="mb-1 block text-xs font-medium text-muted-foreground">संगठन का नाम (हिंदी)</span><Input value={f["name_hi"] ?? ""} onChange={(e) => set("name_hi", e.target.value)} /></label>
            <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">{hi ? "प्रकार" : "Kind"}</span><select className={sel} value={f["kind"]} onChange={(e) => set("kind", e.target.value)}>{KINDS.map(([v, e, h]) => <option key={v} value={v}>{hi ? h : e}</option>)}</select></label>
            <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">{hi ? "स्तर" : "Level"}</span><select className={sel} value={f["level"]} onChange={(e) => set("level", e.target.value)}>{LEVELS.map(([v, e, h]) => <option key={v} value={v}>{hi ? h : e}</option>)}</select></label>
            <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">{hi ? "शहर / गाँव" : "City / village"}</span><Input value={f["city"] ?? ""} onChange={(e) => set("city", e.target.value)} /></label>
            <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">{hi ? "ज़िला" : "District"}</span><Input value={f["district"] ?? ""} onChange={(e) => set("district", e.target.value)} /></label>
            <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">{hi ? "राज्य" : "State"}</span><Input value={f["state"] ?? ""} onChange={(e) => set("state", e.target.value)} /></label>
            <label className="block sm:col-span-2"><span className="mb-1 block text-xs font-medium text-muted-foreground">{hi ? "संगठन के बारे में (संक्षेप)" : "About the organization (short)"}</span><Textarea rows={3} value={f["about"] ?? ""} onChange={(e) => set("about", e.target.value)} /></label>
            <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">{hi ? "संपर्क व्यक्ति (पदाधिकारी) *" : "Contact person (office bearer) *"}</span><Input value={f["contact_name"] ?? ""} onChange={(e) => set("contact_name", e.target.value)} /></label>
            <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">{hi ? "मोबाइल (WhatsApp) *" : "Mobile (WhatsApp) *"}</span><Input inputMode="tel" value={f["phone"] ?? ""} onChange={(e) => set("phone", e.target.value)} /></label>
            <label className="block sm:col-span-2"><span className="mb-1 block text-xs font-medium text-muted-foreground">Email</span><Input type="email" value={f["email"] ?? ""} onChange={(e) => set("email", e.target.value)} /></label>
            <div className="sm:col-span-2"><Button onClick={submit} disabled={busy}>{busy ? "…" : hi ? "पंजीकरण भेजें" : "Submit registration"}</Button></div>
          </div>
        )}
      </div></section>
    </>
  );
}
