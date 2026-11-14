// सदस्यों को संदेश (Phase 39 UI): a dialog to send one message to many members — bell always, WhatsApp / e-mail
// optional — with audience filters, a live count, a WhatsApp-style preview and a confirm step; plus a history list
// with progress and cancel. Backend: k1_broadcast_count / k1_broadcast_create / k1_broadcasts_list / k1_broadcast_cancel
// (sending runs on the server, 25 a minute; WhatsApp/e-mail once per 30 minutes per organization).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Mail, Megaphone, MessageCircle, Send, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLang } from "@/core/i18n";
import { useTenant } from "@/core/tenant-context";
import { supabase } from "@/integrations/supabase/client";

export type BroadcastPreset = { kind?: "general" | "announcement" | "event" | "blood"; title?: string; body?: string; link?: string; ref_table?: string; ref?: string };
type Audience = { include_children: boolean; district: string; gender: string; category: string };
type Row = { id: string; kind: string; title: string; email: boolean; whatsapp: boolean; status: string; total: number; sent: number; created_at: string; finished_at: string | null; created_by_name: string | null };

const rpc = async <T,>(fn: string, args: Record<string, unknown>) => {
  const { data, error } = await supabase.rpc(fn as never, args as never);
  if (error) throw new Error(error.message);
  return data as unknown as T;
};
const KINDS: [BroadcastPreset["kind"], string, string][] = [["announcement", "सूचना", "Announcement"], ["event", "आयोजन", "Event"], ["blood", "रक्त सेवा", "Blood"], ["general", "सामान्य", "General"]];
const CATS: [string, string, string][] = [["", "सभी श्रेणी", "All categories"], ["general", "साधारण", "General"], ["life", "आजीवन", "Life"], ["patron", "संरक्षक", "Patron"], ["executive", "कार्यकारिणी", "Executive"], ["honorary", "मानद", "Honorary"]];

/** Toolbar button that opens the dialog. */
export function BroadcastButton({ preset, label, size = "default", variant = "default" }: { preset?: BroadcastPreset; label?: string; size?: "default" | "sm"; variant?: "default" | "outline" }) {
  const L = useLang().lang === "hi";
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size={size} variant={variant} onClick={() => setOpen(true)}><Megaphone className="size-4" /> {label ?? (L ? "सदस्यों को संदेश" : "Message members")}</Button>
      {open ? <BroadcastDialog open onOpenChange={setOpen} {...(preset ? { preset } : {})} /> : null}
    </>
  );
}

export function BroadcastDialog({ open, onOpenChange, preset }: { open: boolean; onOpenChange: (o: boolean) => void; preset?: BroadcastPreset }) {
  const tenant = useTenant();
  const org = tenant.organization_id;
  const L = useLang().lang === "hi";
  const qc = useQueryClient();
  const [kind, setKind] = useState<BroadcastPreset["kind"]>(preset?.kind ?? "announcement");
  const [title, setTitle] = useState(preset?.title ?? "");
  const [body, setBody] = useState(preset?.body ?? "");
  const [link, setLink] = useState(preset?.link ?? "");
  const [wa, setWa] = useState(false);
  const [email, setEmail] = useState(false);
  const [aud, setAud] = useState<Audience>({ include_children: false, district: "", gender: "", category: "" });
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  // count again 400 ms after the filters stop changing
  const [audKey, setAudKey] = useState(JSON.stringify(aud));
  useEffect(() => { const t = setTimeout(() => setAudKey(JSON.stringify(aud)), 400); return () => clearTimeout(t); }, [aud]);
  const count = useQuery({ queryKey: ["k1_broadcast_count", org, audKey], enabled: open, queryFn: () => rpc<number>("k1_broadcast_count", { p_org: org, p_audience: JSON.parse(audKey) }) });
  const n = count.data ?? 0;
  const fullLink = link.trim() ? (link.trim().startsWith("/") && typeof window !== "undefined" ? `${window.location.origin}${link.trim()}` : link.trim()) : "";
  const ok = title.trim().length > 1 && body.trim().length > 1 && n > 0;
  const minutes = wa || email ? Math.max(1, Math.ceil(n / 25)) : 0;

  async function send() {
    setBusy(true);
    try {
      const r = await rpc<{ id: string; total: number }>("k1_broadcast_create", {
        p_org: org, p_kind: kind, p_title: title.trim(), p_body: body.trim(), p_link: fullLink || null, p_email: email, p_whatsapp: wa,
        p_audience: aud, p_ref_table: preset?.ref_table ?? null, p_ref: preset?.ref ?? null,
      });
      toast.success(wa || email ? (L ? `${r.total} लोगों के लिए कतार में — लगभग ${minutes} मिनट में पूरा` : `Queued for ${r.total} people — about ${minutes} min`) : (L ? `${r.total} लोगों की घंटी में पहुँच गया` : `Delivered to ${r.total} bells`));
      await qc.invalidateQueries({ queryKey: ["k1_broadcasts"] });
      onOpenChange(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); setConfirm(false); } finally { setBusy(false); }
  }

  const sel = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Megaphone className="size-5 text-primary" /> {L ? "सदस्यों को संदेश" : "Message members"}</DialogTitle>
          <DialogDescription>{L ? "घंटी (सूचनाएँ) में सबको तुरंत; WhatsApp / ईमेल चुनें तो सर्वर 25 संदेश प्रति मिनट भेजता है।" : "Bell notifications go at once; WhatsApp / e-mail go from the server, 25 a minute."}</DialogDescription>
        </DialogHeader>
        {!confirm ? (
          <div className="grid gap-5 md:grid-cols-[1fr_16rem]">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {KINDS.map(([k, hi, en]) => <button key={k} type="button" onClick={() => setKind(k)} className={`rounded-full border px-3 py-1 text-sm ${kind === k ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"}`}>{L ? hi : en}</button>)}
              </div>
              <label className="block text-sm font-medium">{L ? "शीर्षक" : "Title"}<Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder={L ? "जैसे: वार्षिक सम्मेलन 20 दिसंबर को" : "e.g. Annual meet on 20 December"} className="mt-1" /></label>
              <label className="block text-sm font-medium">{L ? "संदेश" : "Message"}
                <Textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} rows={6} placeholder={L ? "पूरी बात यहाँ लिखिए…" : "Write the message…"} className="mt-1" />
                <span className="mt-0.5 block text-right text-[11px] text-muted-foreground">{body.length} / 2000</span>
              </label>
              <label className="block text-sm font-medium">{L ? "लिंक (वैकल्पिक)" : "Link (optional)"}<Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/events/... या https://..." className="mt-1" /></label>
              <fieldset className="rounded-lg border border-border p-3">
                <legend className="px-1 text-sm font-medium">{L ? "किस रास्ते से" : "Channels"}</legend>
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-1.5 opacity-80"><input type="checkbox" checked disabled /> <Bell className="size-4" /> {L ? "घंटी (हमेशा)" : "Bell (always)"}</label>
                  <label className="flex items-center gap-1.5"><input type="checkbox" checked={wa} onChange={(e) => setWa(e.target.checked)} /> <MessageCircle className="size-4 text-[#25D366]" /> WhatsApp</label>
                  <label className="flex items-center gap-1.5"><input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} /> <Mail className="size-4 text-sky-600" /> {L ? "ईमेल" : "E-mail"}</label>
                </div>
                {wa || email ? <p className="mt-2 text-xs text-muted-foreground">{L ? "WhatsApp / ईमेल संगठन के अपने चैनल से जाते हैं (एडमिन → Messaging)। हर संगठन 30 मिनट में एक बार ही भेज सकता है।" : "Sent through the organization's own channel (Admin → Messaging); once per 30 minutes per organization."}</p> : null}
              </fieldset>
              <fieldset className="rounded-lg border border-border p-3">
                <legend className="px-1 text-sm font-medium">{L ? "किसे भेजें" : "Who gets it"}</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Input value={aud.district} onChange={(e) => setAud({ ...aud, district: e.target.value })} placeholder={L ? "ज़िला (खाली = सब)" : "District (empty = all)"} className="h-9" />
                  <select className={sel} value={aud.gender} onChange={(e) => setAud({ ...aud, gender: e.target.value })}><option value="">{L ? "सभी (पुरुष/महिला)" : "Everyone"}</option><option value="male">{L ? "पुरुष" : "Men"}</option><option value="female">{L ? "महिलाएँ" : "Women"}</option></select>
                  <select className={sel} value={aud.category} onChange={(e) => setAud({ ...aud, category: e.target.value })}>{CATS.map(([v, hi, en]) => <option key={v} value={v}>{L ? hi : en}</option>)}</select>
                </div>
                <label className="mt-2 flex items-center gap-1.5 text-sm"><input type="checkbox" checked={aud.include_children} onChange={(e) => setAud({ ...aud, include_children: e.target.checked })} /> {L ? "नीचे की इकाइयों (ज़िला / शाखा) के सदस्य भी" : "Include members of sub-units"}</label>
                <p className="mt-2 flex items-center gap-1.5 text-sm"><Users className="size-4 text-primary" /> {count.isFetching ? "…" : <b>{n}</b>} {L ? "सक्रिय सदस्य मिलेंगे" : "active members"}</p>
              </fieldset>
            </div>
            <aside className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">{L ? "झलक (WhatsApp)" : "Preview (WhatsApp)"}</p>
              <div className="chat-wall rounded-xl p-3">
                <div className="relative rounded-lg rounded-tl-none bg-white p-2 text-[13.5px] leading-snug text-[#111b21] shadow-sm dark:bg-[#202c33] dark:text-[#e9edef]">
                  <p className="whitespace-pre-wrap break-words"><b>{title || (L ? "शीर्षक" : "Title")}</b>{"\n\n"}{body || (L ? "संदेश यहाँ दिखेगा…" : "Message shows here…")}{fullLink ? `\n\n${fullLink}` : ""}</p>
                  <p className="mt-1 text-right text-[10px] opacity-60">{new Date().toLocaleTimeString(L ? "hi-IN" : "en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">{L ? "घंटी में: शीर्षक — संदेश (400 अक्षर तक)।" : "Bell shows: title — message (up to 400 characters)."}</p>
            </aside>
          </div>
        ) : (
          <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
            <p className="text-base font-semibold">{L ? `${n} सदस्यों को यह संदेश भेजें?` : `Send this to ${n} members?`}</p>
            <ul className="list-inside list-disc space-y-1">
              <li>{L ? "घंटी: तुरंत" : "Bell: now"}</li>
              {wa ? <li>WhatsApp: {L ? `लगभग ${minutes} मिनट में (25 प्रति मिनट)` : `about ${minutes} min (25 a minute)`}</li> : null}
              {email ? <li>{L ? "ईमेल" : "E-mail"}: {L ? `लगभग ${minutes} मिनट में` : `about ${minutes} min`}</li> : null}
            </ul>
            <p className="text-xs">{L ? "भेजने के बाद नीचे की सूची से बाकी संदेश रोक सकते हैं, पर जो पहुँच गए वे वापस नहीं होंगे।" : "You can stop the rest from the list below, but delivered messages cannot be recalled."}</p>
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
          {confirm ? <Button variant="outline" onClick={() => setConfirm(false)} disabled={busy}>{L ? "वापस, बदलें" : "Back"}</Button> : <Button variant="outline" onClick={() => onOpenChange(false)}>{L ? "रद्द" : "Cancel"}</Button>}
          {confirm
            ? <Button onClick={() => void send()} disabled={busy}><Send className="size-4" /> {busy ? (L ? "भेज रहे हैं…" : "Sending…") : (L ? `हाँ, ${n} को भेजें` : `Yes, send to ${n}`)}</Button>
            : <Button onClick={() => setConfirm(true)} disabled={!ok}>{L ? "आगे" : "Next"} →</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Sent broadcasts with progress; refreshes every 10 s while one is sending. */
export function BroadcastHistory() {
  const tenant = useTenant();
  const org = tenant.organization_id;
  const L = useLang().lang === "hi";
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["k1_broadcasts", org],
    queryFn: () => rpc<Row[]>("k1_broadcasts_list", { p_org: org, p_limit: 30 }),
    refetchInterval: (query) => ((query.state.data as Row[] | undefined)?.some((r) => r.status === "queued" || r.status === "sending") ? 10_000 : false),
  });
  async function cancel(id: string) {
    if (!confirm(L ? "बाकी संदेश रोकें?" : "Stop the remaining messages?")) return;
    try { await rpc("k1_broadcast_cancel", { p_id: id }); await qc.invalidateQueries({ queryKey: ["k1_broadcasts"] }); toast.success(L ? "रोक दिया" : "Stopped"); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  const ST: Record<string, [string, string, string]> = {
    queued: ["कतार में", "Queued", "bg-amber-100 text-amber-900"], sending: ["भेज रहे हैं", "Sending", "bg-sky-100 text-sky-900"],
    done: ["पूरा", "Done", "bg-emerald-100 text-emerald-900"], cancelled: ["रोका गया", "Stopped", "bg-slate-100 text-slate-800"],
  };
  const rows = q.data ?? [];
  if (q.isError) return null;
  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const pct = r.total ? Math.round((r.sent / r.total) * 100) : 100;
        const live = r.status === "queued" || r.status === "sending";
        const s = ST[r.status] ?? [r.status, r.status, "bg-secondary"];
        return (
          <div key={r.id} className="rounded-lg border border-border bg-card p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <p className="min-w-0 flex-1 truncate font-medium">{r.title}</p>
              <span className="flex items-center gap-1 text-muted-foreground"><Bell className="size-3.5" />{r.whatsapp ? <MessageCircle className="size-3.5 text-[#25D366]" /> : null}{r.email ? <Mail className="size-3.5 text-sky-600" /> : null}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${s[2]}`}>{L ? s[0] : s[1]}</span>
              {live ? <Button size="sm" variant="ghost" className="h-7 text-red-600" onClick={() => void cancel(r.id)}><X className="size-3.5" /> {L ? "रोकें" : "Stop"}</Button> : null}
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary"><div className={`h-full rounded-full ${live ? "bg-sky-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} /></div>
            <p className="mt-1 text-xs text-muted-foreground">{r.sent} / {r.total} · {new Date(r.created_at).toLocaleString(L ? "hi-IN" : "en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}{r.created_by_name ? ` · ${r.created_by_name}` : ""}</p>
          </div>
        );
      })}
      {q.isSuccess && !rows.length ? <p className="text-sm text-muted-foreground">{L ? "अभी तक कोई संदेश नहीं भेजा गया।" : "Nothing sent yet."}</p> : null}
    </div>
  );
}
