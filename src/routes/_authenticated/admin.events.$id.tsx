// Event detail: guests (add / import members / CSV paste), invitations with per-guest image + RSVP link, reminders, QR check-in, report.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { orgMergeData } from "@/components/studio/merge-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLang } from "@/core/i18n";
import { useTenant } from "@/core/tenant-context";
import { renderAll, type DesignDoc, type MergeData } from "@/design-engine";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { enqueueMessage, kickWorker, normPhone } from "@/lib/comms";
import { downloadCsv } from "@/lib/fin";
import { organizationQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin/events/$id")({ component: EventDetail });

type Ev = { id: string; slug: string; title: string; title_hi: string | null; kind: string; starts_at: string; ends_at: string | null; venue: string | null; venue_hi: string | null; map_url: string | null; description: string | null; description_hi: string | null; cover_image: string | null; organizer: string | null; contact_phone: string | null; registration_open: boolean; capacity: number | null; status: string; invitation_template_id: string | null };
type Guest = { id: string; name: string; phone: string | null; email: string | null; group_name: string | null; seats: number; source: string; token: string; rsvp: string; rsvp_at: string | null; rsvp_note: string | null; invited_at: string | null; reminded_at: string | null; checkin_at: string | null };
type Stats = { guests: number; seats: number; yes: number; yes_seats: number; no: number; maybe: number; none: number; invited: number; checked_in: number; checked_in_seats: number };

const rpc = async <T,>(fn: string, args: Record<string, unknown>): Promise<T> => { const { data, error } = await supabase.rpc(fn as never, args as never); if (error) throw new Error(error.message); return data as T; };
const dmy = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
const hm = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

function EventDetail() {
  const { id } = Route.useParams();
  const tenant = useTenant();
  const org = tenant.organization_id;
  const { lang } = useLang();
  const L = lang === "hi";
  const { can } = useAuth();
  const qc = useQueryClient();
  const { data: orgSettings } = useSuspenseQuery(organizationQuery());
  const canManage = can("events.manage");
  const [tab, setTab] = useState<"guests" | "invite" | "checkin" | "report">("guests");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const ev = useQuery({ queryKey: ["ev_event", id], queryFn: async () => { const { data, error } = await supabase.from("ev_events").select("*").eq("id", id).single(); if (error) throw error; return data as unknown as Ev; } });
  const guests = useQuery({ queryKey: ["ev_guests", id], queryFn: async () => { const { data, error } = await supabase.from("ev_guests").select("*").eq("event_id", id).order("created_at"); if (error) throw error; return (data ?? []) as unknown as Guest[]; } });
  const stats = useQuery({ queryKey: ["ev_stats", id], queryFn: () => rpc<Stats>("k1_event_stats", { p_event: id }), refetchInterval: tab === "checkin" ? 10000 : false });
  const template = useQuery({ queryKey: ["ev_template", ev.data?.invitation_template_id], enabled: !!ev.data?.invitation_template_id, queryFn: async () => { const { data } = await supabase.from("docs_templates").select("id,name,design").eq("id", ev.data!.invitation_template_id!).maybeSingle(); return data as { id: string; name: string; design: DesignDoc } | null; } });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["ev_guests", id] }); qc.invalidateQueries({ queryKey: ["ev_stats", id] }); };
  const e = ev.data;
  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
  const rsvpUrl = (g: Guest) => `${siteUrl}/rsvp/${g.token}`;

  const list = useMemo(() => (guests.data ?? []).filter((g) => !q || [g.name, g.phone, g.group_name].some((t) => (t ?? "").toLowerCase().includes(q.toLowerCase()))), [guests.data, q]);
  const toggle = (gid: string, on: boolean) => setSel((s) => { const n = new Set(s); if (on) n.add(gid); else n.delete(gid); return n; });

  // ---------- guests ----------
  const [nm, setNm] = useState(""); const [ph, setPh] = useState(""); const [grp, setGrp] = useState(""); const [seats, setSeats] = useState(1);
  async function addGuest() {
    if (!nm.trim()) return;
    const { error } = await supabase.from("ev_guests").insert({ event_id: id, organization_id: org, name: nm.trim(), phone: ph.trim() ? normPhone(ph) : null, group_name: grp.trim() || null, seats } as never);
    if (error) { toast.error(error.message); return; }
    setNm(""); setPh(""); refresh();
  }
  async function importMembers() {
    const f = prompt(L ? "सिर्फ़ किसी गाँव/शहर या श्रेणी (general/life/patron) के सदस्य? खाली = सभी सक्रिय सदस्य" : "Only members of a village/city or category (general/life/patron)? Empty = all active members", "");
    if (f === null) return;
    setBusy("import");
    try { const n = await rpc<number>("k1_event_import_members", { p_event: id, p_filter: f.trim() || null }); toast.success(`${n} ${L ? "अतिथि जुड़े" : "guests added"}`); refresh(); } catch (er) { toast.error((er as Error).message); } finally { setBusy(null); }
  }
  async function pasteList() {
    const txt = prompt(L ? "हर पंक्ति में: नाम, मोबाइल, समूह (comma से अलग)" : "One per line: name, mobile, group (comma separated)");
    if (!txt) return;
    const rows = txt.split(/\n/).map((l) => l.split(/[,\t]/).map((x) => x.trim())).filter((r) => r[0]);
    const { error } = await supabase.from("ev_guests").insert(rows.map((r) => ({ event_id: id, organization_id: org, name: r[0], phone: r[1] ? normPhone(r[1]) : null, group_name: r[2] || null, source: "import" })) as never);
    if (error) toast.error(error.message); else { toast.success(`${rows.length} ${L ? "जुड़े" : "added"}`); refresh(); }
  }
  async function removeGuests(ids: string[]) {
    if (!ids.length || !confirm(L ? `${ids.length} अतिथि हटाएँ?` : `Remove ${ids.length} guest(s)?`)) return;
    const { error } = await supabase.from("ev_guests").delete().in("id", ids); if (error) toast.error(error.message); else { setSel(new Set()); refresh(); }
  }
  async function setRsvp(g: Guest, r: string) { await supabase.from("ev_guests").update({ rsvp: r, rsvp_at: new Date().toISOString() } as never).eq("id", g.id); refresh(); }

  // ---------- invitations ----------
  const [msg, setMsg] = useState("");
  useEffect(() => { if (e && !msg) setMsg(L ? `${tenant.name_hi ?? tenant.name}\n${e.title_hi ?? e.title}\nदिनांक: ${dmy(e.starts_at)} · समय: ${hm(e.starts_at)}${e.venue_hi || e.venue ? `\nस्थान: ${e.venue_hi ?? e.venue}` : ""}\n\nआप सपरिवार सादर आमंत्रित हैं। कृपया आने की पुष्टि करें: {{rsvp}}` : `${tenant.name}\n${e.title}\nDate: ${dmy(e.starts_at)} · Time: ${hm(e.starts_at)}${e.venue ? `\nVenue: ${e.venue}` : ""}\n\nYou are cordially invited. Please confirm: {{rsvp}}`); }, [e, L]); // eslint-disable-line react-hooks/exhaustive-deps
  const [withImage, setWithImage] = useState(true);
  const [target, setTarget] = useState<"all" | "uninvited" | "selected" | "yes">("uninvited");
  const eventData = (g: Guest): MergeData => ({ ...orgMergeData(tenant, orgSettings), event: { title: e!.title, title_hi: e!.title_hi ?? e!.title, date: dmy(e!.starts_at), time: hm(e!.starts_at), venue: e!.venue ?? "", venue_hi: e!.venue_hi ?? e!.venue ?? "", message: L ? "आप सपरिवार सादर आमंत्रित हैं।" : "You are cordially invited with family.", organizer: e!.organizer ?? "", contact: e!.contact_phone ?? "" }, guest: { name: g.name, group: g.group_name ?? "", rsvp_url: rsvpUrl(g) } });
  async function sendInvites(reminder = false) {
    if (!e) return;
    const targets = (guests.data ?? []).filter((g) => g.phone && (target === "all" || (target === "uninvited" && !g.invited_at) || (target === "selected" && sel.has(g.id)) || (target === "yes" && g.rsvp === "yes")));
    if (!targets.length) { toast.error(L ? "कोई अतिथि नहीं (मोबाइल ज़रूरी)" : "No guests to send to (mobile required)"); return; }
    if (!confirm(`${targets.length} ${L ? "को WhatsApp भेजें?" : "WhatsApp message(s) — send?"}`)) return;
    setBusy("send");
    let ok = 0;
    try {
      const useImg = withImage && template.data?.design && !reminder;
      for (let i = 0; i < targets.length; i++) {
        const g = targets[i]!;
        setProgress(`${i + 1}/${targets.length}`);
        const media: { type: "image"; bucket: string; path: string }[] = [];
        if (useImg) {
          const [c] = await renderAll(template.data!.design, eventData(g), 1.5);
          const blob = await new Promise<Blob>((res, rej) => c!.toBlob((b) => (b ? res(b) : rej(new Error("render"))), "image/jpeg", 0.86));
          const path = `${org}/events/${id}/${g.id}.jpg`;
          const { error } = await supabase.storage.from("documents").upload(path, blob, { upsert: true, contentType: "image/jpeg" }); if (error) throw error;
          media.push({ type: "image", bucket: "documents", path });
        }
        const body = msg.replace(/\{\{rsvp\}\}/g, rsvpUrl(g)).replace(/\{\{name\}\}/g, g.name);
        try {
          await enqueueMessage({ org, kind: "whatsapp", to: g.phone!, name: g.name, body, media, refTable: "ev_events", refId: id });
          await supabase.from("ev_guests").update(reminder ? { reminded_at: new Date().toISOString() } : { invited_at: new Date().toISOString() } as never).eq("id", g.id);
          ok++;
        } catch (er) { console.warn(er); }
      }
      kickWorker(); toast.success(`${ok} ${L ? "कतार में; Messaging में स्थिति देखें" : "queued — see Messaging for status"}`); refresh();
    } catch (er) { toast.error((er as Error).message); } finally { setBusy(null); setProgress(null); }
  }

  if (ev.error) return <p className="text-sm text-destructive">{(ev.error as Error).message}</p>;
  if (!e) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const s = stats.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground"><Link to="/admin/events" className="hover:underline">{L ? "आयोजन" : "Events"}</Link> · {e.kind} <Badge variant={e.status === "published" ? "default" : "secondary"} className="ml-1">{e.status}</Badge></p>
          <h1 className="font-display text-2xl font-semibold">{L && e.title_hi ? e.title_hi : e.title}</h1>
          <p className="text-sm text-muted-foreground">{new Date(e.starts_at).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" })}{e.venue ? ` · ${L && e.venue_hi ? e.venue_hi : e.venue}` : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {s ? <span className="rounded-md border border-border px-3 py-2">{L ? "अतिथि" : "Guests"} <b>{s.guests}</b> · {L ? "हाँ" : "Yes"} <b>{s.yes}</b> ({s.yes_seats} {L ? "सीट" : "seats"}) · {L ? "नहीं" : "No"} {s.no} · {L ? "शायद" : "Maybe"} {s.maybe} · {L ? "आमंत्रित" : "Invited"} {s.invited} · {L ? "उपस्थित" : "Checked in"} <b>{s.checked_in}</b></span> : null}
          {e.status === "published" ? <Button asChild size="sm" variant="outline"><a href={`/events/${e.slug}`} target="_blank" rel="noreferrer">{L ? "पेज देखें ↗" : "Public page ↗"}</a></Button> : null}
        </div>
      </div>
      <div className="flex w-fit rounded-md border border-border p-0.5 text-xs">{([["guests", L ? "अतिथि सूची" : "Guests"], ["invite", L ? "निमंत्रण भेजें" : "Invitations"], ["checkin", L ? "QR चेक-इन" : "Check-in"], ["report", L ? "रिपोर्ट" : "Report"]] as const).map(([k, l]) => <button key={k} type="button" className={`rounded px-3 py-1 ${tab === k ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setTab(k)}>{l}</button>)}</div>

      {tab === "guests" ? (
        <div className="space-y-3">
          {canManage ? (
            <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-background p-3 text-sm">
              <Input placeholder={L ? "नाम" : "Name"} value={nm} onChange={(x) => setNm(x.target.value)} className="w-48" /><Input placeholder={L ? "मोबाइल" : "Mobile"} value={ph} onChange={(x) => setPh(x.target.value)} className="w-36" /><Input placeholder={L ? "समूह / गाँव" : "Group / village"} value={grp} onChange={(x) => setGrp(x.target.value)} className="w-36" /><Input type="number" min={1} value={seats} onChange={(x) => setSeats(Number(x.target.value))} className="w-20" title="seats" />
              <Button size="sm" onClick={addGuest}>+ {L ? "अतिथि" : "Guest"}</Button>
              <Button size="sm" variant="outline" onClick={importMembers} disabled={!!busy}>{L ? "सदस्यों से लाएँ" : "Import members"}</Button>
              <Button size="sm" variant="outline" onClick={pasteList}>{L ? "सूची चिपकाएँ" : "Paste list"}</Button>
              <Button size="sm" variant="ghost" onClick={() => downloadCsv(`guests-${e.slug}.csv`, ["Name", "Phone", "Group", "Seats", "RSVP", "Invited", "Checked in", "RSVP link"], (guests.data ?? []).map((g) => [g.name, g.phone, g.group_name, g.seats, g.rsvp, g.invited_at ? "yes" : "", g.checkin_at ? "yes" : "", rsvpUrl(g)]))}>CSV</Button>
              {sel.size ? <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeGuests([...sel])}>{L ? `${sel.size} हटाएँ` : `Remove ${sel.size}`}</Button> : null}
              <Input placeholder={L ? "खोजें" : "Search"} value={q} onChange={(x) => setQ(x.target.value)} className="ml-auto w-44" />
            </div>
          ) : null}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground"><tr><th className="p-2"><Checkbox checked={list.length > 0 && list.every((g) => sel.has(g.id))} onCheckedChange={(v) => setSel(v === true ? new Set(list.map((g) => g.id)) : new Set())} /></th><th className="p-2">{L ? "नाम" : "Name"}</th><th className="p-2">{L ? "मोबाइल" : "Mobile"}</th><th className="p-2">{L ? "समूह" : "Group"}</th><th className="p-2">{L ? "सीट" : "Seats"}</th><th className="p-2">RSVP</th><th className="p-2">{L ? "आमंत्रण" : "Invited"}</th><th className="p-2">{L ? "उपस्थित" : "In"}</th></tr></thead>
              <tbody>
                {list.map((g) => (
                  <tr key={g.id} className="border-t border-border">
                    <td className="p-2"><Checkbox checked={sel.has(g.id)} onCheckedChange={(v) => toggle(g.id, v === true)} /></td>
                    <td className="p-2"><b>{g.name}</b>{g.rsvp_note ? <div className="text-xs text-muted-foreground">{g.rsvp_note}</div> : null}</td>
                    <td className="p-2 text-xs">{g.phone ?? "—"}</td><td className="p-2 text-xs">{g.group_name ?? ""}</td><td className="p-2">{g.seats}</td>
                    <td className="p-2"><select className="h-7 rounded border border-input bg-background px-1 text-xs" value={g.rsvp} onChange={(x) => setRsvp(g, x.target.value)} disabled={!canManage}><option value="none">—</option><option value="yes">{L ? "हाँ" : "yes"}</option><option value="no">{L ? "नहीं" : "no"}</option><option value="maybe">{L ? "शायद" : "maybe"}</option></select></td>
                    <td className="p-2 text-xs">{g.invited_at ? dmy(g.invited_at) : ""}{g.reminded_at ? <span className="text-muted-foreground"> · R</span> : null}</td>
                    <td className="p-2 text-xs">{g.checkin_at ? <Badge>{hm(g.checkin_at)}</Badge> : ""}</td>
                  </tr>
                ))}
                {guests.isSuccess && !list.length ? <tr><td className="p-3 text-muted-foreground" colSpan={8}>{L ? "अभी कोई अतिथि नहीं।" : "No guests yet."}</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "invite" ? (
        <div className="grid gap-3 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3 rounded-lg border border-border bg-background p-4 text-sm">
            <p className="text-muted-foreground">{L ? "WhatsApp संदेश + (चाहें तो) हर अतिथि के नाम वाला निमंत्रण चित्र, जिसमें उसका RSVP/चेक-इन QR है। {{rsvp}} = उस अतिथि का link, {{name}} = नाम।" : "WhatsApp message + optional personalised invitation image with each guest's RSVP/check-in QR. {{rsvp}} = that guest's link, {{name}} = name."}</p>
            <Textarea rows={7} value={msg} onChange={(x) => setMsg(x.target.value)} />
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2"><Checkbox checked={withImage} onCheckedChange={(v) => setWithImage(v === true)} disabled={!template.data} /> {L ? "निमंत्रण चित्र साथ भेजें" : "Attach invitation image"} {!e.invitation_template_id ? <span className="text-xs text-muted-foreground">({L ? "पहले आयोजन में 'Invitation design' चुनें — Design Studio में 'निमंत्रण' starter है" : "pick an 'Invitation design' on the event first — Design Studio has an 'Invitation' starter"})</span> : null}</label>
              <select className="h-9 rounded-md border border-input bg-background px-2" value={target} onChange={(x) => setTarget(x.target.value as typeof target)}><option value="uninvited">{L ? "जिन्हें अभी नहीं भेजा" : "Not yet invited"}</option><option value="all">{L ? "सभी" : "Everyone"}</option><option value="selected">{L ? `चुने हुए (${sel.size})` : `Selected (${sel.size})`}</option><option value="yes">{L ? "जिन्होंने हाँ कहा" : "RSVP yes"}</option></select>
              <Button onClick={() => sendInvites(false)} disabled={!!busy || !canManage}>{busy === "send" ? `${L ? "भेज रहे" : "Sending"} ${progress ?? ""}` : (L ? "निमंत्रण भेजें" : "Send invitations")}</Button>
              <Button variant="outline" onClick={() => sendInvites(true)} disabled={!!busy || !canManage}>{L ? "रिमाइंडर (सिर्फ़ संदेश)" : "Reminder (text only)"}</Button>
            </div>
            <p className="text-xs text-muted-foreground">{L ? "संदेश Messaging engine की कतार से धीरे-धीरे जाते हैं (gap के साथ); स्थिति Admin → Messaging में।" : "Messages go through the Messaging queue with safe gaps; status under Admin → Messaging."}</p>
          </div>
          <InvitePreview template={template.data?.design ?? null} data={list[0] ? eventData(list[0]) : null} />
        </div>
      ) : null}

      {tab === "checkin" ? <CheckIn eventId={id} guests={guests.data ?? []} onDone={refresh} L={L} /> : null}

      {tab === "report" && s ? (
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[[L ? "कुल अतिथि" : "Guests", s.guests], [L ? "हाँ (सीट)" : "Yes (seats)", `${s.yes} (${s.yes_seats})`], [L ? "आमंत्रित" : "Invited", s.invited], [L ? "उपस्थित (सीट)" : "Checked in (seats)", `${s.checked_in} (${s.checked_in_seats})`]].map(([k, v]) => <div key={String(k)} className="rounded-lg border border-border bg-background p-3"><p className="text-xs text-muted-foreground">{k}</p><p className="font-display text-2xl">{v}</p></div>)}
          </div>
          <div className="rounded-lg border border-border bg-background p-4">
            <p className="font-medium">{L ? "समूह-वार उपस्थिति" : "Attendance by group"}</p>
            <table className="mt-2 w-full text-left"><thead className="text-xs uppercase text-muted-foreground"><tr><th className="py-1">{L ? "समूह" : "Group"}</th><th className="py-1 text-right">{L ? "अतिथि" : "Guests"}</th><th className="py-1 text-right">{L ? "हाँ" : "Yes"}</th><th className="py-1 text-right">{L ? "उपस्थित" : "In"}</th></tr></thead>
              <tbody>{Object.entries((guests.data ?? []).reduce<Record<string, { n: number; y: number; c: number }>>((a, g) => { const k = g.group_name || "—"; a[k] = a[k] ?? { n: 0, y: 0, c: 0 }; a[k].n++; if (g.rsvp === "yes") a[k].y++; if (g.checkin_at) a[k].c++; return a; }, {})).sort((a, b) => b[1].n - a[1].n).map(([k, v]) => <tr key={k} className="border-t border-border"><td className="py-1">{k}</td><td className="py-1 text-right">{v.n}</td><td className="py-1 text-right">{v.y}</td><td className="py-1 text-right">{v.c}</td></tr>)}</tbody></table>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => downloadCsv(`attendance-${e.slug}.csv`, ["Name", "Phone", "Group", "Seats", "RSVP", "Checked in at"], (guests.data ?? []).map((g) => [g.name, g.phone, g.group_name, g.seats, g.rsvp, g.checkin_at ? new Date(g.checkin_at).toLocaleString("en-IN") : ""]))}>CSV</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InvitePreview({ template, data }: { template: DesignDoc | null; data: MergeData | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!template || !data || !ref.current) return;
    let alive = true;
    renderAll(template, data, 1).then(([c]) => { if (!alive || !c || !ref.current) return; const ctx = ref.current.getContext("2d")!; ref.current.width = c.width; ref.current.height = c.height; ctx.drawImage(c, 0, 0); });
    return () => { alive = false; };
  }, [template, data]);
  if (!template) return <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">No invitation design selected.</div>;
  return <div className="overflow-auto rounded-lg bg-secondary/50 p-2"><canvas ref={ref} style={{ width: "100%", height: "auto" }} /></div>;
}

/** QR / code check-in: camera (BarcodeDetector where available) or manual code/name search. */
function CheckIn({ eventId, guests, onDone, L }: { eventId: string; guests: Guest[]; onDone: () => void; L: boolean }) {
  const [code, setCode] = useState("");
  const [last, setLast] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopRef = useRef<() => void>(() => undefined);
  void eventId;
  async function check(token: string, undo = false) {
    try {
      const r = await rpc<{ ok: boolean; error?: string; name?: string; seats?: number; undone?: boolean }>("k1_event_checkin", { p_token: token, p_undo: undo });
      if (r.ok) { setLast(`✅ ${r.name}${r.undone ? (L ? " — चेक-इन हटाया" : " — undone") : ` · ${r.seats ?? 1} ${L ? "सीट" : "seat(s)"}`}`); toast.success(r.name ?? "ok"); }
      else { setLast(`⚠️ ${r.name ?? ""} ${r.error}`); toast.error(r.error ?? "error"); }
      onDone();
    } catch (e) { toast.error((e as Error).message); }
  }
  async function startScan() {
    const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
    if (!BD) { toast.error(L ? "इस browser में कैमरा QR scan नहीं है — कोड हाथ से लिखें या Chrome (Android) इस्तेमाल करें" : "No camera QR support in this browser — type the code or use Chrome on Android"); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      const v = videoRef.current!; v.srcObject = stream; await v.play(); setScanning(true);
      const det = new BD({ formats: ["qr_code"] });
      let lastSeen = ""; let alive = true;
      const loop = async () => { if (!alive) return; try { const codes = await det.detect(v); const raw = codes[0]?.rawValue; if (raw && raw !== lastSeen) { lastSeen = raw; const tok = raw.split("/rsvp/")[1] ?? raw; await check(tok.trim()); setTimeout(() => { lastSeen = ""; }, 3000); } } catch { /* frame */ } requestAnimationFrame(() => setTimeout(loop, 250)); };
      loop();
      stopRef.current = () => { alive = false; stream.getTracks().forEach((t) => t.stop()); setScanning(false); };
    } catch (e) { toast.error((e as Error).message); }
  }
  useEffect(() => () => stopRef.current(), []);
  const matches = code.length >= 2 ? guests.filter((g) => g.name.toLowerCase().includes(code.toLowerCase()) || g.token === code || (g.phone ?? "").includes(code)).slice(0, 8) : [];
  return (
    <div className="grid gap-3 lg:grid-cols-2 text-sm">
      <div className="space-y-2 rounded-lg border border-border bg-background p-4">
        <p className="font-medium">{L ? "कैमरे से QR" : "Scan QR with camera"}</p>
        <video ref={videoRef} className={`w-full rounded-md bg-black ${scanning ? "" : "hidden"}`} muted playsInline />
        {!scanning ? <Button onClick={startScan}>{L ? "कैमरा चालू करें" : "Start camera"}</Button> : <Button variant="outline" onClick={() => stopRef.current()}>{L ? "बंद करें" : "Stop"}</Button>}
        {last ? <p className="rounded bg-secondary/60 p-2">{last}</p> : null}
      </div>
      <div className="space-y-2 rounded-lg border border-border bg-background p-4">
        <p className="font-medium">{L ? "नाम / मोबाइल / कोड से" : "By name / mobile / code"}</p>
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder={L ? "नाम लिखना शुरू करें…" : "Start typing a name…"} />
        <ul className="divide-y divide-border">{matches.map((g) => <li key={g.id} className="flex items-center justify-between py-1"><span>{g.name} <span className="text-xs text-muted-foreground">{g.group_name ?? ""} · {g.seats} · {g.rsvp}</span></span>{g.checkin_at ? <Button size="sm" variant="ghost" onClick={() => check(g.token, true)}>{L ? "उपस्थित ✓ (हटाएँ)" : "In ✓ (undo)"}</Button> : <Button size="sm" onClick={() => check(g.token)}>{L ? "चेक-इन" : "Check in"}</Button>}</li>)}</ul>
      </div>
    </div>
  );
}
