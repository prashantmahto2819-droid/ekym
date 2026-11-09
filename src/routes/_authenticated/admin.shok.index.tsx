import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLang } from "@/core/i18n";
import { DecidedMsg, rpc } from "@/family/api";
import { useFamilyCtx } from "@/family/hooks";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/shok/")({ component: ShokList });

type Letter = { id: string; deceased_name: string; death_date: string | null; ceremony_date: string | null; venue: string | null; status: string; created_at: string; created_by: string; admin_note: string | null; last_error: string | null; letter_recipients: { status: string }[] };

const dmy = (iso: string | null) => (iso ? iso.split("-").reverse().join(".") : "—");

function ShokList() {
  const { lang } = useLang();
  const L = lang === "hi";
  const ctx = useFamilyCtx();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [limit, setLimit] = useState(100);
  const [detail, setDetail] = useState<Letter | null>(null); // per-recipient popup
  const letters = useQuery({
    queryKey: ["shok_letters", limit],
    enabled: ctx.data?.approved === true,
    refetchInterval: 15000,
    queryFn: async () => { const { data, error } = await supabase.from("letters").select("id,deceased_name,death_date,ceremony_date,venue,status,created_at,created_by,admin_note,last_error,letter_recipients(status)").order("created_at", { ascending: false }).limit(limit); if (error) throw error; return (data ?? []) as unknown as Letter[]; },
    placeholderData: (prev) => prev,
  });
  const isAdmin = !!ctx.data?.shok_admin;

  async function act(id: string, label: string, fn: () => Promise<unknown>) {
    setBusy(id);
    try { await fn(); toast.success(label); qc.invalidateQueries({ queryKey: ["shok_letters"] }); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(null); }
  }
  async function decide(l: Letter, approve: boolean) {
    const note = approve ? null : prompt(L ? "अस्वीकार का कारण" : "Reason for rejection");
    if (!approve && !note) return;
    await act(l.id, approve ? (L ? "मंज़ूर; भेजना शुरू" : "Approved; sending starts") : (L ? "अस्वीकार" : "Rejected"), async () => {
      const r = await rpc<{ ok: boolean; by?: string; status?: string }>("decide_letter", { p_id: l.id, p_status: approve ? "approved" : "rejected", p_note: note });
      if (!r.ok) throw new Error(DecidedMsg(r, L));
    });
  }
  async function retry(l: Letter) {
    await act(l.id, L ? "असफल संदेश दोबारा कतार में" : "Failed messages re-queued", async () => {
      const { data, error } = await supabase.functions.invoke("send-letters", { body: { action: "retry", letter_id: l.id } });
      if (error) throw error;
      const r = data as { ok: boolean; error?: string };
      if (!r.ok) throw new Error(r.error ?? "retry failed");
    });
  }

  if (ctx.data && !ctx.data.approved) return <p className="text-sm text-muted-foreground">{L ? "अनुमति नहीं" : "Not allowed"}</p>;
  const counts = (l: Letter) => { const c = { sent: 0, failed: 0, left: 0, total: l.letter_recipients.length }; l.letter_recipients.forEach((r) => (r.status === "sent" ? c.sent++ : r.status === "failed" ? c.failed++ : c.left++)); return c; };
  const statusVariant = (s: string) => (s === "done" ? "default" : s === "failed" || s === "rejected" ? "destructive" : "secondary");

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">{L ? "शोक संदेश" : "Condolence messages (शोक संदेश)"}</h1>
          <p className="text-sm text-muted-foreground">{L ? "शोकपत्र बनाकर गाँव/परिवार/वंश के लोगों को WhatsApp पर भेजें। भेजना सर्वर पर अपने आप चलता है।" : "Create a condolence letter and send it on WhatsApp village-, family- or lineage-wise. Sending runs on the server automatically."}</p>
        </div>
        <Button asChild><Link to="/admin/shok/send">+ {L ? "नया शोक संदेश" : "New shok sandesh"}</Link></Button>
      </header>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground"><tr><th className="p-2">{L ? "दिवंगत" : "Deceased"}</th><th className="p-2">{L ? "दशगात्र" : "Ceremony"}</th><th className="p-2">{L ? "बनाया" : "Created"}</th><th className="p-2">{L ? "स्थिति" : "Status"}</th><th className="p-2">{L ? "भेजे / असफल / बाकी" : "Sent / failed / left"}</th><th className="p-2"></th></tr></thead>
          <tbody>
            {(letters.data ?? []).map((l) => { const c = counts(l); return (
              <tr key={l.id} className="border-t border-border align-top">
                <td className="p-2"><b>{l.deceased_name}</b>{l.venue ? <div className="text-xs text-muted-foreground">{l.venue}</div> : null}{l.admin_note && l.status === "rejected" ? <div className="text-xs text-destructive">{l.admin_note}</div> : null}{l.last_error ? <div className="text-xs text-destructive">{l.last_error}</div> : null}</td>
                <td className="p-2 whitespace-nowrap">{dmy(l.ceremony_date)}</td>
                <td className="p-2 whitespace-nowrap text-xs">{new Date(l.created_at).toLocaleString("en-IN")}</td>
                <td className="p-2"><Badge variant={statusVariant(l.status)}>{l.status.replace(/_/g, " ")}</Badge></td>
                <td className="p-2 whitespace-nowrap">{c.sent} / {c.failed} / {c.left} <span className="text-xs text-muted-foreground">({c.total})</span></td>
                <td className="p-2">
                  <div className="flex flex-wrap gap-1">
                    {isAdmin && l.status === "pending_approval" ? <><Button size="sm" onClick={() => decide(l, true)} disabled={busy === l.id}>{L ? "मंज़ूर" : "Approve"}</Button><Button size="sm" variant="outline" onClick={() => decide(l, false)} disabled={busy === l.id}>{L ? "अस्वीकार" : "Reject"}</Button></> : null}
                    {c.failed > 0 && ["done", "failed", "sending", "queued"].includes(l.status) ? <Button size="sm" variant="outline" onClick={() => retry(l)} disabled={busy === l.id}>{L ? "असफल दोबारा" : "Retry failed"}</Button> : null}
                    {l.status === "draft" ? <Button size="sm" variant="ghost" onClick={() => { if (confirm(L ? "ड्राफ़्ट हटाएँ?" : "Delete draft?")) act(l.id, L ? "हटाया" : "Deleted", async () => { const { error } = await supabase.from("letters").delete().eq("id", l.id); if (error) throw error; }); }}>{L ? "हटाएँ" : "Delete"}</Button> : null}
                    {c.total > 0 ? <Button size="sm" variant="outline" onClick={() => setDetail(l)}>{L ? "विवरण" : "Details"}</Button> : null}
                    <Button asChild size="sm" variant="ghost"><a href="https://shokpatra.kalchuri.org/app.html#/letters" target="_blank" rel="noreferrer">↗</a></Button>
                  </div>
                </td>
              </tr>
            ); })}
            {letters.isSuccess && !letters.data.length ? <tr><td className="p-3 text-muted-foreground" colSpan={6}>{L ? "अभी कोई शोक संदेश नहीं।" : "No letters yet."}</td></tr> : null}
          </tbody>
        </table>
        {(letters.data?.length ?? 0) >= limit ? <div className="p-3 text-center"><Button variant="outline" size="sm" onClick={() => setLimit((n) => n + 100)}>{L ? "और दिखाएँ" : "Show more"}</Button></div> : null}
      </div>
      {detail ? <RecipientsDialog letter={detail} L={L} onClose={() => setDetail(null)} /> : null}
    </div>
  );
}

type Recip = { recipient_id: string; recipient_name: string; father_name: string | null; village_name: string | null; via_name: string | null; status: string; error: string | null };

/** Who got (or will get) this letter — name, father, village, whose WhatsApp carried it, status/error. Polls while sending. */
function RecipientsDialog({ letter, L, onClose }: { letter: Letter; L: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<"all" | "sent" | "failed" | "left">("all");
  const rows = useQuery({
    queryKey: ["letter_recipients_review", letter.id],
    refetchInterval: letter.status === "sending" || letter.status === "queued" ? 5000 : false,
    queryFn: async () => { const { data, error } = await supabase.rpc("letter_recipients_review", { p_letter_id: letter.id } as never); if (error) throw error; return (data ?? []) as unknown as Recip[]; },
  });
  const all = rows.data ?? [];
  const list = all.filter((r) => (only === "all" || (only === "sent" ? r.status === "sent" : only === "failed" ? r.status === "failed" : r.status !== "sent" && r.status !== "failed"))
    && (!q || [r.recipient_name, r.father_name, r.village_name, r.via_name].some((x) => (x ?? "").toLowerCase().includes(q.toLowerCase()))));
  const n = { sent: all.filter((r) => r.status === "sent").length, failed: all.filter((r) => r.status === "failed").length };
  const badge = (s: string) => <Badge variant={s === "sent" ? "default" : s === "failed" ? "destructive" : "secondary"}>{s === "sent" ? (L ? "भेजा" : "sent") : s === "failed" ? (L ? "असफल" : "failed") : s === "sending" ? (L ? "जा रहा" : "sending") : (L ? "कतार में" : "queued")}</Badge>;
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-4xl p-3 sm:p-5">
        <DialogHeader><DialogTitle className="font-display">{letter.deceased_name} — {L ? "किस-किस को गया" : "Recipients"} <span className="text-sm font-normal text-muted-foreground">({all.length} · {L ? "भेजे" : "sent"} {n.sent} · {L ? "असफल" : "failed"} {n.failed})</span></DialogTitle></DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L ? "नाम / पिता / गाँव खोजें" : "Search name / father / village"} className="h-9 min-w-[200px] flex-1 rounded-md border border-input bg-background px-3 text-sm" />
          {(["all", "sent", "failed", "left"] as const).map((k) => <Button key={k} size="sm" variant={only === k ? "default" : "outline"} onClick={() => setOnly(k)}>{k === "all" ? (L ? "सब" : "All") : k === "sent" ? (L ? "भेजे" : "Sent") : k === "failed" ? (L ? "असफल" : "Failed") : (L ? "बाकी" : "Left")}</Button>)}
        </div>
        <div className="max-h-[60vh] overflow-auto rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-secondary/80 text-xs uppercase text-muted-foreground"><tr><th className="p-2">{L ? "नाम" : "Name"}</th><th className="p-2">{L ? "पिता" : "Father"}</th><th className="p-2">{L ? "गाँव" : "Village"}</th><th className="p-2">{L ? "किसके WhatsApp पर" : "Via"}</th><th className="p-2">{L ? "स्थिति" : "Status"}</th><th className="p-2">{L ? "कारण" : "Note"}</th></tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.recipient_id} className="border-t border-border/60">
                  <td className="p-2 font-medium">{r.recipient_name}</td>
                  <td className="p-2 text-muted-foreground">{r.father_name ?? "—"}</td>
                  <td className="p-2 text-muted-foreground">{r.village_name ?? "—"}</td>
                  <td className="p-2 text-xs">{r.via_name ?? (L ? "इन्हीं के नंबर पर" : "own number")}</td>
                  <td className="p-2">{badge(r.status)}</td>
                  <td className="p-2 text-xs text-muted-foreground">{r.error ?? ""}</td>
                </tr>
              ))}
              {rows.isSuccess && !list.length ? <tr><td className="p-3 text-muted-foreground" colSpan={6}>{L ? "कोई नहीं।" : "None."}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
