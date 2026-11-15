// मेरी संस्थाएँ: every organization I belong to (or applied to), which one is my मूल संस्था (base), change the base,
// cancel a pending application, and "दूसरी संस्था से जुड़ें" — apply with the details of my base membership; that
// organization's admins approve it in their normal list. Backend: k1_my_memberships / k1_set_base_membership /
// k1_orgs_to_join / k1_apply_to_org / k1_withdraw_membership (migration k1_base_org).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, ExternalLink, Plus, Search, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLang } from "@/core/i18n";
import { supabase } from "@/integrations/supabase/client";

type Mem = { id: string; organization_id: string; org_name: string; org_name_hi: string | null; org_kind: string | null; hostname: string | null; status: string; member_no: string | null; category: string | null; is_base: boolean; applied_at: string | null; decided_at: string | null };
type Org = { id: string; name: string; name_hi: string | null; kind: string | null; state: string | null; hostname: string | null; parent_name: string | null };

const rpc = async <T,>(fn: string, args: Record<string, unknown> = {}) => {
  const { data, error } = await supabase.rpc(fn as never, args as never);
  if (error) throw new Error(error.message);
  return data as unknown as T;
};

export function MyOrgs() {
  const L = useLang().lang === "hi";
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["k1_my_memberships"], queryFn: () => rpc<Mem[]>("k1_my_memberships") });
  const [joinOpen, setJoinOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const rows = q.data ?? [];
  const name = (m: Mem) => (L && m.org_name_hi) || m.org_name;
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["k1_my_memberships"] }), qc.invalidateQueries({ queryKey: ["k1_orgs_to_join"] })]);

  async function makeBase(m: Mem) {
    if (!confirm(L ? `"${name(m)}" को अपनी मूल संस्था बनाएँ?` : `Make "${name(m)}" your base organization?`)) return;
    setBusy(m.id);
    try { await rpc("k1_set_base_membership", { p_id: m.id }); toast.success(L ? "मूल संस्था बदल दी" : "Base organization changed"); await refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(null); }
  }
  async function withdraw(m: Mem) {
    if (!confirm(L ? "यह आवेदन वापस लें?" : "Withdraw this application?")) return;
    setBusy(m.id);
    try { await rpc("k1_withdraw_membership", { p_id: m.id }); toast.success(L ? "आवेदन वापस ले लिया" : "Withdrawn"); await refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(null); }
  }

  const ST: Record<string, [string, string, string]> = {
    active: ["सदस्य", "Member", "bg-emerald-100 text-emerald-900"],
    applied: ["मंज़ूरी बाकी", "Awaiting approval", "bg-amber-100 text-amber-900"],
    rejected: ["अस्वीकार", "Not approved", "bg-rose-100 text-rose-900"],
  };
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-semibold">{L ? "मेरी संस्थाएँ" : "My organizations"}</h2>
          <p className="text-xs text-muted-foreground">{L ? "आपकी एक मूल संस्था ⭐ रहती है; बाकी संस्थाओं से भी जुड़ सकते हैं — वहाँ के एडमिन मंज़ूर करेंगे।" : "You have one base organization ⭐; you can join others too — their admins approve."}</p>
        </div>
        <Button size="sm" onClick={() => setJoinOpen(true)} disabled={!rows.some((m) => m.status !== "rejected")} title={!rows.length ? (L ? "पहले सदस्य बनें" : "Become a member first") : undefined}><Plus className="size-4" /> {L ? "दूसरी संस्था से जुड़ें" : "Join another organization"}</Button>
      </div>
      <div className="mt-3 space-y-2">
        {q.isLoading ? <div className="h-16 animate-pulse rounded-xl bg-muted" /> : null}
        {rows.map((m) => {
          const st = ST[m.status] ?? [m.status, m.status, "bg-secondary"];
          return (
            <div key={m.id} className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 ${m.is_base ? "border-amber-400 bg-amber-50/60 dark:bg-amber-950/20" : "border-border"}`}>
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Building2 className="size-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {name(m)}
                  {m.is_base ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-semibold text-amber-950"><Star className="size-3 fill-current" /> {L ? "मूल संस्था" : "Base"}</span> : null}
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${st[2]}`}>{L ? st[0] : st[1]}</span>
                </p>
                <p className="text-xs text-muted-foreground">{m.member_no ? `${L ? "सदस्य क्रमांक" : "Member no."} ${m.member_no}` : m.status === "applied" ? (L ? "आवेदन भेजा गया — वहाँ के एडमिन देखेंगे" : "Sent — their admins will review") : ""}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {m.status === "active" && !m.is_base ? <Button size="sm" variant="outline" onClick={() => void makeBase(m)} disabled={busy === m.id}><Star className="size-3.5" /> {L ? "मूल बनाएँ" : "Make base"}</Button> : null}
                {m.status === "applied" ? <Button size="sm" variant="ghost" className="text-red-600" onClick={() => void withdraw(m)} disabled={busy === m.id}>{L ? "आवेदन वापस लें" : "Withdraw"}</Button> : null}
                {m.hostname ? <Button size="sm" variant="ghost" asChild><a href={`https://${m.hostname}`} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" /> {L ? "साइट" : "Site"}</a></Button> : null}
              </div>
            </div>
          );
        })}
        {q.isSuccess && !rows.length ? <p className="text-sm text-muted-foreground">{L ? "आप अभी किसी संस्था के सदस्य नहीं हैं। पहले \"सदस्य बनें\" फ़ॉर्म भरिए — वही आपकी मूल संस्था बनेगी।" : "You are not a member yet. Fill \"Become a member\" first — that becomes your base."} <a href="/join" className="font-medium text-primary underline">{L ? "सदस्य बनें" : "Join"}</a></p> : null}
      </div>
      {joinOpen ? <JoinDialog L={L} onClose={() => setJoinOpen(false)} onDone={() => { setJoinOpen(false); void refresh(); }} /> : null}
    </section>
  );
}

function JoinDialog({ L, onClose, onDone }: { L: boolean; onClose: () => void; onDone: () => void }) {
  const orgs = useQuery({ queryKey: ["k1_orgs_to_join"], queryFn: () => rpc<Org[]>("k1_orgs_to_join") });
  const [q, setQ] = useState("");
  const [pick, setPick] = useState<Org | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const k = q.trim().toLowerCase();
  const list = (orgs.data ?? []).filter((o) => !k || [o.name, o.name_hi, o.state, o.parent_name].some((x) => (x ?? "").toLowerCase().includes(k)));
  const nm = (o: Org) => (L && o.name_hi) || o.name;
  async function apply() {
    if (!pick) return;
    setBusy(true);
    try {
      await rpc("k1_apply_to_org", { p_org: pick.id, p_note: note.trim() || null });
      toast.success(L ? `आवेदन "${nm(pick)}" के एडमिन को भेज दिया। मंज़ूरी के बाद आप वहाँ के भी सदस्य होंगे।` : `Application sent to "${nm(pick)}".`);
      onDone();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{L ? "दूसरी संस्था से जुड़ें" : "Join another organization"}</DialogTitle>
          <DialogDescription>{L ? "आपकी मूल संस्था वाली जानकारी (नाम, मोबाइल, पता, फोटो) के साथ आवेदन जाएगा। मूल संस्था वही रहेगी, जब तक आप खुद न बदलें।" : "Your base membership details are sent with the application. Your base stays the same unless you change it."}</DialogDescription>
        </DialogHeader>
        {!pick ? (
          <>
            <div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L ? "संस्था, राज्य या ज़िला खोजें" : "Search organization or state"} className="pl-9" /></div>
            <div className="max-h-80 space-y-1 overflow-y-auto">
              {orgs.isLoading ? <div className="h-12 animate-pulse rounded-lg bg-muted" /> : null}
              {list.map((o) => (
                <button key={o.id} type="button" onClick={() => setPick(o)} className="flex w-full items-center gap-3 rounded-lg border border-border p-2.5 text-left hover:bg-secondary">
                  <Building2 className="size-5 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium">{nm(o)}</span><span className="block truncate text-xs text-muted-foreground">{[o.parent_name, o.state].filter(Boolean).join(" · ")}</span></span>
                </button>
              ))}
              {orgs.isSuccess && !list.length ? <p className="p-3 text-sm text-muted-foreground">{L ? "कोई संस्था नहीं मिली।" : "No organization found."}</p> : null}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-primary/40 bg-primary/5 p-3"><p className="font-medium">{nm(pick)}</p><p className="text-xs text-muted-foreground">{[pick.parent_name, pick.state].filter(Boolean).join(" · ")}</p></div>
            <label className="block text-sm font-medium">{L ? "एडमिन के लिए संदेश (वैकल्पिक)" : "Message for the admins (optional)"}
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={400} placeholder={L ? "जैसे: मैं इस शाखा के क्षेत्र में रहता हूँ / पद पर हूँ" : "e.g. I live in this branch's area"} className="mt-1" />
            </label>
            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setPick(null)} disabled={busy}>← {L ? "दूसरी चुनें" : "Back"}</Button>
              <Button onClick={() => void apply()} disabled={busy}>{busy ? "…" : L ? "आवेदन भेजें" : "Send application"}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
