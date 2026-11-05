import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const letters = useQuery({
    queryKey: ["shok_letters"],
    enabled: ctx.data?.approved === true,
    refetchInterval: 15000,
    queryFn: async () => { const { data, error } = await supabase.from("letters").select("id,deceased_name,death_date,ceremony_date,venue,status,created_at,created_by,admin_note,last_error,letter_recipients(status)").order("created_at", { ascending: false }).limit(100); if (error) throw error; return (data ?? []) as unknown as Letter[]; },
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
                    <Button asChild size="sm" variant="ghost"><a href="https://shokpatra.kalchuri.org/app.html#/letters" target="_blank" rel="noreferrer">↗</a></Button>
                  </div>
                </td>
              </tr>
            ); })}
            {letters.isSuccess && !letters.data.length ? <tr><td className="p-3 text-muted-foreground" colSpan={6}>{L ? "अभी कोई शोक संदेश नहीं।" : "No letters yet."}</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
