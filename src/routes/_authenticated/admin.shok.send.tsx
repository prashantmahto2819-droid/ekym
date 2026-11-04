// शोक संदेश wizard: details → recipients → review & send. Uses shokpatra's letters/letter_recipients tables and
// its server-side sender (pg_cron → send-letters); images come from the design engine (template kind shok_patra).
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { DesignCanvas } from "@/components/studio/DesignCanvas";
import { orgMergeData, SAMPLE_DATA } from "@/components/studio/merge-data";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLang } from "@/core/i18n";
import { useTenant } from "@/core/tenant-context";
import { renderAll, type DesignDoc, type MergeData } from "@/design-engine";
import { rpc } from "@/family/api";
import { useFamilyCtx } from "@/family/hooks";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { organizationQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin/shok/send")({ component: ShokSend });

type Dir = { member_id: string; family_id: string; family_name: string; member_name: string; relation: string; father_name: string | null; village_id: string | null; village_name: string | null; is_head: boolean; has_phone: boolean; native_place: string | null; lineage_id: string | null; member_kind: string; parent_deceased: boolean; region_id: string | null; region_name: string | null; region_sort: number | null };
type Tpl = { id: string; name: string; name_hi: string | null; design: DesignDoc };

const DEFAULT_MESSAGE = `श्रीमान/श्रीमती {नाम}[ (पिता: {पिता})][, {गाँव}]

अत्यंत दुःख के साथ सूचित करना पड़ रहा है कि {दिवंगत} का निधन दिनांक {निधन} को हो गया है। उनका दशगात्र एवं चन्दनपान दिनांक {दशगात्र} को संपन्न होगा।

स्थान: {स्थान}

आप सपरिवार पधारकर मृतात्मा को शांति प्रदान कर हमें अनुग्रहित करें।`;
const dmy = (iso: string) => (iso ? iso.split("-").reverse().join(".") : "");

function ShokSend() {
  const { lang } = useLang();
  const L = lang === "hi";
  const tenant = useTenant();
  const { user } = useAuth();
  const ctx = useFamilyCtx();
  const { data: org } = useSuspenseQuery(organizationQuery());
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ deceased: "", death: "", ceremony: "", venue: "", family: "", message: DEFAULT_MESSAGE, mode: "family_main" as "family_main" | "each_member", templateId: "" });
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<"village" | "region" | "family" | "lineage">("village");
  const [q, setQ] = useState("");
  const [allowRepeat, setAllowRepeat] = useState(false);
  const [sure, setSure] = useState(false);
  const [progress, setProgress] = useState<{ pct: number; text: string } | null>(null);
  const [result, setResult] = useState<{ status: string; n: number; skipped: number } | null>(null);

  const templates = useQuery({
    queryKey: ["shok_templates", tenant.organization_id],
    queryFn: async () => { const { data } = await supabase.from("docs_templates").select("id,name,name_hi,design").eq("kind", "shok_patra").eq("status", "active").or(`organization_id.eq.${tenant.organization_id},organization_id.is.null`).order("is_default", { ascending: false }); return (data ?? []) as unknown as Tpl[]; },
  });
  const dir = useQuery({
    queryKey: ["directory_members"],
    enabled: ctx.data?.approved === true,
    queryFn: async () => { const { data, error } = await supabase.rpc("directory_members", { p_village: null as never }); if (error) throw error; return (data ?? []) as unknown as Dir[]; },
  });
  const covered = useQuery({
    queryKey: ["already_covered", f.deceased, f.ceremony],
    enabled: step >= 2 && !!f.deceased,
    queryFn: async () => { const { data } = await supabase.rpc("already_covered_members", { p_deceased: f.deceased, p_ceremony: (f.ceremony || null) as never }); return new Set(((data ?? []) as { member_id: string }[]).map((x) => x.member_id)); },
  });
  const coveredSet = covered.data ?? new Set<string>();
  useEffect(() => { if (!f.templateId && templates.data?.length) setF((x) => ({ ...x, templateId: templates.data![0]!.id })); }, [templates.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const template = templates.data?.find((t) => t.id === f.templateId) ?? null;
  const shokData = (rec: { name: string; father: string | null; village: string | null }): MergeData => ({
    ...orgMergeData(tenant, org),
    shok: { deceased: f.deceased, death_date: f.death, ceremony_date: f.ceremony, venue: f.venue, family: f.family },
    recipient: { name: rec.name, father: rec.father ?? "", father_line: rec.father ? `(पिता: ${rec.father})` : "", village: rec.village ?? "" },
  });
  const previewData = useMemo(() => shokData({ name: String((SAMPLE_DATA["recipient"] as Record<string, unknown>)["name"] ?? ""), father: "श्री मोहन लाल", village: "कुसमुण्डा" }), [f, tenant, org]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- recipients ----------
  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (dir.data ?? []).filter((m) => !n || [m.member_name, m.father_name, m.family_name, m.village_name, m.native_place].some((t) => (t ?? "").toLowerCase().includes(n)));
  }, [dir.data, q]);
  const lineageName = useMemo(() => { const m = new Map<string, string>(); (dir.data ?? []).forEach((x) => { const lid = x.lineage_id ?? x.family_id; if (x.family_id === lid && !m.has(lid)) m.set(lid, x.family_name); }); return m; }, [dir.data]);
  const groupOf = (m: Dir): [string, string, number] =>
    groupBy === "family" ? [m.family_id, m.family_name || "परिवार", 0]
      : groupBy === "lineage" ? [m.lineage_id ?? m.family_id, `${lineageName.get(m.lineage_id ?? m.family_id) ?? m.family_name} वंश`, 0]
        : groupBy === "region" ? [m.region_id ?? "none", m.region_name ?? (L ? "मूल ग्राम / क्षेत्र दर्ज नहीं" : "No origin region"), m.region_sort ?? 9999]
          : [m.village_id ?? "none", m.village_name ?? (L ? "गाँव दर्ज नहीं" : "No village"), 0];
  const groups = useMemo(() => {
    const g = new Map<string, { label: string; sort: number; ms: Dir[] }>();
    rows.forEach((m) => { const [k, label, sort] = groupOf(m); (g.get(k) ?? g.set(k, { label, sort, ms: [] }).get(k)!).ms.push(m); });
    return [...g.entries()].sort((a, b) => a[1].sort - b[1].sort || a[1].label.localeCompare(b[1].label, "hi"));
  }, [rows, groupBy]); // eslint-disable-line react-hooks/exhaustive-deps
  const pickable = (m: Dir) => (allowRepeat || !coveredSet.has(m.member_id)) && !(m.member_kind === "spouse" && !m.parent_deceased) && (f.mode === "family_main" || m.has_phone);
  const toggle = (id: string, on: boolean) => setPicked((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; });
  const toggleGroup = (ms: Dir[], on: boolean) => setPicked((s) => { const n = new Set(s); ms.filter(pickable).forEach((m) => (on ? n.add(m.member_id) : n.delete(m.member_id))); return n; });

  // ---------- send ----------
  function resolveMessage() {
    const map: Record<string, string> = { "{दिवंगत}": f.deceased, "{निधन}": dmy(f.death) || "—", "{दशगात्र}": dmy(f.ceremony) || "—", "{स्थान}": f.venue || "—" };
    return f.message.replace(/\{(दिवंगत|निधन|दशगात्र|स्थान)\}/g, (t) => map[t] ?? t);
  }
  async function renderJpeg(data: MergeData): Promise<Blob> {
    const [c] = await renderAll(template!.design, data, 1.5);
    return new Promise((res, rej) => c!.toBlob((b) => (b ? res(b) : rej(new Error("render failed"))), "image/jpeg", 0.86));
  }
  async function doSend() {
    if (!user) return;
    const uid = user.id;
    setProgress({ pct: 1, text: L ? "पत्र सहेजा जा रहा है…" : "Saving letter…" });
    try {
      const fields = { created_by: uid, organization_id: tenant.organization_id, deceased_name: f.deceased, death_date: f.death || null, ceremony_date: f.ceremony || null, venue: f.venue || null, message_text: resolveMessage(), message_template: f.message, send_mode: f.mode, name_box: template ? { designId: template.id, engine: "kalchuri-one" } : null };
      const { data: ins, error } = await supabase.from("letters").insert(fields as never).select("id").single();
      if (error) throw error;
      const letterId = (ins as { id: string }).id;
      if (template) {
        setProgress({ pct: 3, text: L ? "आधार चित्र…" : "Base image…" });
        const base = await renderJpeg(shokData({ name: "", father: null, village: null }));
        const path = `${uid}/${letterId}/base.jpg`;
        const { error: e1 } = await supabase.storage.from("letters").upload(path, base, { contentType: "image/jpeg", upsert: true }); if (e1) throw e1;
        await supabase.from("letters").update({ base_image_path: path } as never).eq("id", letterId);
      }
      setProgress({ pct: 5, text: L ? "सूची बन रही है…" : "Creating recipient list…" });
      const recips = await rpc<{ recipient_id: string; member_id: string; recipient_name: string; father_name: string | null; village_name: string | null }[]>("create_letter_recipients", { p_letter_id: letterId, p_member_ids: [...picked], p_allow_repeat: allowRepeat });
      const skipped = picked.size - (recips?.length ?? 0);
      if (!recips?.length) throw new Error(L ? "चुने हुए सभी लोगों को यही पत्र पहले भेजा जा चुका है।" : "Everyone selected already received this letter.");
      if (template) {
        let done = 0; const queue = [...recips];
        const worker = async () => {
          while (queue.length) {
            const r = queue.shift()!;
            const blob = await renderJpeg(shokData({ name: r.recipient_name, father: r.father_name, village: r.village_name }));
            const path = `${uid}/${letterId}/${r.recipient_id}.jpg`;
            const { error: e2 } = await supabase.storage.from("letters").upload(path, blob, { contentType: "image/jpeg", upsert: true }); if (e2) throw e2;
            await supabase.from("letter_recipients").update({ image_path: path } as never).eq("id", r.recipient_id);
            done++; setProgress({ pct: 5 + Math.round((done / recips.length) * 90), text: `${L ? "चित्र बने" : "Images"}: ${done}/${recips.length}` });
          }
        };
        await Promise.all([worker(), worker(), worker()]);
      }
      setProgress({ pct: 97, text: L ? "जमा हो रहा है…" : "Submitting…" });
      const res = await rpc<{ status: string; n: number }>("submit_letter", { p_letter_id: letterId });
      setResult({ status: res.status, n: res.n, skipped });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setProgress(null); }
  }

  const steps = L ? ["पत्र की जानकारी", "किन्हें भेजना है", "जाँचकर भेजें"] : ["Letter details", "Recipients", "Review & send"];
  const chosen = (dir.data ?? []).filter((m) => picked.has(m.member_id));
  const famCover = useMemo(() => { const m = new Map<string, { name: string; n: number; all: number }>(); (dir.data ?? []).forEach((x) => { const e = m.get(x.family_id) ?? m.set(x.family_id, { name: x.family_name, n: 0, all: 0 }).get(x.family_id)!; e.all++; if (picked.has(x.member_id)) e.n++; }); return [...m.values()].filter((e) => e.n); }, [dir.data, picked]);

  if (ctx.data && !ctx.data.approved) return <p className="text-sm text-muted-foreground">{L ? "अनुमति नहीं" : "Not allowed"}</p>;
  if (result) {
    return (
      <div className="space-y-3 rounded-lg border border-border bg-background p-6 text-sm">
        <h1 className="font-display text-xl font-semibold">{result.status === "pending_approval" ? (L ? "मंज़ूरी के लिए जमा हो गया" : "Submitted for approval") : (L ? "भेजना शुरू हो गया" : "Sending started")}</h1>
        <p className="text-muted-foreground">{result.n} {L ? "लोगों के नाम से शोकपत्र बना।" : "personalised letters created."} {result.skipped ? (L ? `${result.skipped} को यही पत्र पहले भेजा जा चुका था, इसलिए छोड़ा गया।` : `${result.skipped} skipped (already received this letter).`) : ""} {result.status === "pending_approval" ? (L ? "एडमिन की मंज़ूरी के बाद भेजना सर्वर पर अपने आप शुरू होगा।" : "After admin approval, sending starts automatically on the server.") : (L ? "सर्वर हर मिनट कतार से संदेश भेजता है; स्थिति सूची में दिखेगी।" : "The server sends from the queue every minute; see the list for status.")}</p>
        <Button asChild><Link to="/admin/shok">{L ? "शोक संदेश सूची" : "Back to list"}</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-semibold">{L ? "शोक संदेश भेजें" : "Send shok sandesh"}</h1>
        <div className="flex gap-1 text-xs">{steps.map((s, i) => <span key={s} className={`rounded-full px-3 py-1 ${step === i + 1 ? "bg-primary text-primary-foreground" : step > i + 1 ? "bg-secondary" : "bg-secondary/50 text-muted-foreground"}`}>{i + 1}. {s}</span>)}</div>
      </div>

      {step === 1 ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <div className="space-y-3 rounded-lg border border-border bg-background p-4 text-sm">
            <Lbl label={L ? "दिवंगत का नाम" : "Deceased name"}><Input value={f.deceased} onChange={(e) => setF({ ...f, deceased: e.target.value })} placeholder="श्री संतोष कुमार कश्यप" /></Lbl>
            <div className="grid grid-cols-2 gap-2">
              <Lbl label={L ? "निधन की तारीख" : "Date of death"}><Input type="date" value={f.death} onChange={(e) => setF({ ...f, death: e.target.value })} /></Lbl>
              <Lbl label={L ? "दशगात्र / चन्दनपान" : "Ceremony date"}><Input type="date" value={f.ceremony} onChange={(e) => setF({ ...f, ceremony: e.target.value })} /></Lbl>
            </div>
            <Lbl label={L ? "स्थान" : "Venue"}><Input value={f.venue} onChange={(e) => setF({ ...f, venue: e.target.value })} /></Lbl>
            <Lbl label={L ? "शोकाकुल परिवार (चित्र में)" : "Bereaved family (shown on the letter)"}><Input value={f.family} onChange={(e) => setF({ ...f, family: e.target.value })} placeholder="कश्यप परिवार, कुसमुण्डा" /></Lbl>
            <Lbl label={L ? "शोकपत्र का डिज़ाइन" : "Letter design"} hint={L ? "Design Studio में 'शोकपत्र' starter से बनाएँ" : "create from the 'Condolence letter' starter in Design Studio"}>
              <select className="h-9 w-full rounded-md border border-input bg-background px-2" value={f.templateId} onChange={(e) => setF({ ...f, templateId: e.target.value })}>
                <option value="">{L ? "— सिर्फ़ संदेश (बिना चित्र) —" : "— text only (no image) —"}</option>
                {(templates.data ?? []).map((t) => <option key={t.id} value={t.id}>{L && t.name_hi ? t.name_hi : t.name}</option>)}
              </select>
            </Lbl>
            <Lbl label={L ? "साथ में जाने वाला संदेश" : "WhatsApp message"} hint={L ? "{नाम} {पिता} {गाँव} हर व्यक्ति के हिसाब से बदलते हैं; [ ] का हिस्सा खाली होने पर हटता है" : "{नाम} {पिता} {गाँव} are replaced per person; [ ] segments drop when empty"}><Textarea rows={8} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></Lbl>
            <Lbl label={L ? "किस नंबर पर" : "Send to"}>
              <div className="space-y-1">
                <label className="flex items-start gap-2"><input type="radio" checked={f.mode === "family_main"} onChange={() => setF({ ...f, mode: "family_main" })} /> <span><b>{L ? "परिवार के मुख्य नंबर पर" : "Family's main WhatsApp"}</b> <span className="text-muted-foreground">— {L ? "हर चुने सदस्य का पत्र उसके परिवार के मुख्य नंबर पर (सुझाया गया)" : "each selected person's letter goes to their family's main number (recommended)"}</span></span></label>
                <label className="flex items-start gap-2"><input type="radio" checked={f.mode === "each_member"} onChange={() => setF({ ...f, mode: "each_member" })} /> <span><b>{L ? "हर सदस्य के अपने नंबर पर" : "Each member's own number"}</b> <span className="text-muted-foreground">— {L ? "जिनका नंबर दर्ज है" : "only those with a number"}</span></span></label>
              </div>
            </Lbl>
            <div className="flex justify-between"><Button asChild variant="ghost"><Link to="/admin/shok">{L ? "रद्द" : "Cancel"}</Link></Button><Button onClick={() => { if (!f.deceased.trim()) { toast.error(L ? "दिवंगत का नाम लिखिए।" : "Enter the deceased name."); return; } setStep(2); }}>{L ? "आगे" : "Next"}</Button></div>
          </div>
          <div className="space-y-2">
            {template ? <div className="overflow-auto rounded-lg bg-secondary/50 p-2"><DesignCanvas doc={template.design} page={0} width={360} data={previewData} renderScale={1.5} /></div> : <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">{L ? "कोई चित्र नहीं जाएगा; सिर्फ़ संदेश।" : "No image; text only."}</p>}
            <p className="text-xs text-muted-foreground">{L ? "पूर्वावलोकन (नमूना नाम के साथ)। हर व्यक्ति का चित्र उसके नाम से बनेगा।" : "Preview with a sample name. Each person gets their own image."}</p>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {(["village", "region", "family", "lineage"] as const).map((k) => <Button key={k} size="sm" variant={groupBy === k ? "default" : "outline"} onClick={() => setGroupBy(k)}>{{ village: L ? "गाँव-वार" : "By village", region: L ? "क्षेत्र-वार (मूल ग्राम)" : "By origin region", family: L ? "परिवार-वार" : "By family", lineage: L ? "वंश-वार" : "By lineage" }[k]}</Button>)}
            <Input className="w-56" placeholder={L ? "नाम / पिता / परिवार / गाँव खोजें" : "Search"} value={q} onChange={(e) => setQ(e.target.value)} />
            <label className="flex items-center gap-2 text-xs"><Checkbox checked={allowRepeat} onCheckedChange={(v) => setAllowRepeat(v === true)} /> {L ? "पहले भेजे गए लोगों को भी चुनने दें" : "Allow people who already received it"}</label>
            <span className="ml-auto text-xs text-muted-foreground">{picked.size} {L ? "चुने" : "selected"} · {dir.data?.length ?? 0} {L ? "कुल" : "total"}</span>
          </div>
          {groupBy !== "village" ? <p className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-900">{L ? "पूरे परिवार / वंश एक साथ चुने जाते हैं — भेजने से पहले क्रॉस-चेक कर लें कि कोई गलत नाम न हो और कोई छूटे नहीं।" : "Whole families / lineages are selected at once — cross-check before sending."}</p> : null}
          <div className="max-h-[60vh] space-y-3 overflow-auto rounded-lg border border-border p-3 text-sm">
            {groups.map(([k, g]) => { const pk = g.ms.filter(pickable); const all = pk.length > 0 && pk.every((m) => picked.has(m.member_id)); return (
              <div key={k}>
                <label className="flex items-center gap-2 font-semibold"><Checkbox checked={all} onCheckedChange={(v) => toggleGroup(g.ms, v === true)} /> {g.label} <span className="text-xs font-normal text-muted-foreground">({g.ms.length})</span></label>
                <ul className="ml-6 mt-1 grid gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
                  {g.ms.map((m) => { const ok = pickable(m); const cov = coveredSet.has(m.member_id); return (
                    <li key={m.member_id} className={`flex items-start gap-2 py-0.5 ${!ok ? "opacity-50" : ""}`}>
                      <Checkbox checked={picked.has(m.member_id)} disabled={!ok && !picked.has(m.member_id)} onCheckedChange={(v) => toggle(m.member_id, v === true)} />
                      <span><span className="font-medium">{m.member_name}</span>{m.is_head ? " ★" : ""}
                        <span className="block text-xs text-muted-foreground">{[m.relation, m.father_name && (m.member_kind === "spouse" ? "पति: " : "पिता: ") + m.father_name + (m.member_kind === "spouse" && m.parent_deceased ? " (स्व.)" : ""), m.member_kind === "spouse" && !m.parent_deceased && (L ? "पति जीवित — अलग से चुनें" : "husband living — select manually"), m.native_place && "मूल: " + m.native_place, groupBy !== "family" && m.family_name, groupBy !== "village" && m.village_name, cov && (L ? "पहले भेजा जा चुका" : "already sent"), f.mode === "each_member" && !m.has_phone && (L ? "नंबर नहीं" : "no number")].filter(Boolean).join(" · ")}</span>
                      </span>
                    </li>
                  ); })}
                </ul>
              </div>
            ); })}
            {dir.isSuccess && !groups.length ? <p className="text-muted-foreground">{L ? "कोई सदस्य नहीं मिला।" : "No members found."}</p> : null}
          </div>
          <div className="flex justify-between"><Button variant="ghost" onClick={() => setStep(1)}>{L ? "पीछे" : "Back"}</Button><Button onClick={() => { if (!picked.size) { toast.error(L ? "कम से कम एक व्यक्ति चुनिए।" : "Select at least one person."); return; } setStep(3); }}>{L ? "आगे" : "Next"}</Button></div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-3 rounded-lg border border-border bg-background p-4 text-sm">
          <h2 className="font-display text-lg font-semibold">{f.deceased} · {chosen.length} {L ? "लोग" : "people"}</h2>
          <p className="text-muted-foreground">{L ? "दशगात्र" : "Ceremony"}: {dmy(f.ceremony) || "—"} · {L ? "स्थान" : "Venue"}: {f.venue || "—"} · {f.mode === "family_main" ? (L ? "परिवार के मुख्य नंबर पर" : "family main number") : (L ? "हर सदस्य के नंबर पर" : "each member's number")} · {template ? (L ? "चित्र: " : "Image: ") + template.name : (L ? "सिर्फ़ संदेश" : "text only")}</p>
          <details><summary className="cursor-pointer">{L ? "संदेश का नमूना" : "Message sample"}</summary><pre className="mt-2 whitespace-pre-wrap rounded bg-secondary/50 p-3 text-xs">{resolveMessage()}</pre></details>
          <div>
            <p className="font-medium">{L ? "परिवार-वार गिनती" : "Families covered"}</p>
            <ul className="mt-1 grid gap-x-4 text-xs sm:grid-cols-2 lg:grid-cols-3">{famCover.map((e) => <li key={e.name + e.all} className={e.n < e.all ? "text-amber-800" : ""}>{e.name}: {e.n}/{e.all}</li>)}</ul>
          </div>
          <label className="flex items-start gap-2"><Checkbox checked={sure} onCheckedChange={(v) => setSure(v === true)} /> <span>{L ? "मैंने नाम, तारीख़ और चुने हुए लोग क्रॉस-चेक कर लिए हैं।" : "I have cross-checked the names, dates and the selected people."}</span></label>
          {progress ? <div><div className="h-2 w-full overflow-hidden rounded bg-secondary"><div className="h-2 bg-primary transition-all" style={{ width: `${progress.pct}%` }} /></div><p className="mt-1 text-xs text-muted-foreground">{progress.text}</p></div> : null}
          <div className="flex justify-between"><Button variant="ghost" onClick={() => setStep(2)} disabled={!!progress}>{L ? "पीछे" : "Back"}</Button><Button onClick={doSend} disabled={!sure || !!progress}>{ctx.data?.shok_admin ? `${chosen.length} ${L ? "शोकपत्र भेजें" : "letters — send"}` : (L ? "मंज़ूरी के लिए जमा करें" : "Submit for approval")}</Button></div>
        </div>
      ) : null}
    </div>
  );
}

function Lbl({ label, hint, children }: { label: string; hint?: string | undefined; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">{label}{hint ? <span className="font-normal"> · {hint}</span> : null}</span>{children}</label>;
}
