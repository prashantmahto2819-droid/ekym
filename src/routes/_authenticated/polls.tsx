// Polls for members / team: vote once, see results when allowed.
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/site/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLang } from "@/core/i18n";
import { useTenant } from "@/core/tenant-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/polls")({ head: () => ({ meta: [{ title: "Polls" }, { name: "robots", content: "noindex" }] }), component: PollsPage });

type Poll = { id: string; question: string; question_hi: string | null; description: string | null; options: { key: string; label: string; label_hi?: string }[]; audience: string; status: string; ends_at: string | null; multi: boolean; open_results: boolean };
type Res = { total: number; counts?: Record<string, number>; hidden?: boolean; voters?: { name: string; choices: string[] }[] | null };

function PollsPage() {
  const tenant = useTenant();
  const { lang } = useLang();
  const L = lang === "hi";
  const qc = useQueryClient();
  const polls = useQuery({ queryKey: ["polls_member", tenant.organization_id], queryFn: async () => { const { data } = await supabase.from("cm_polls").select("*").eq("organization_id", tenant.organization_id).in("status", ["open", "closed"]).order("created_at", { ascending: false }); return (data ?? []) as unknown as Poll[]; } });
  const myVotes = useQuery({ queryKey: ["my_votes"], queryFn: async () => { const { data } = await supabase.from("cm_votes").select("poll_id,choices"); return Object.fromEntries((data ?? []).map((v) => [v.poll_id, v.choices as string[]])); } });
  return (
    <>
      <PageHeader title={L ? "मतदान" : "Polls"} description={L ? "संगठन के निर्णयों में अपनी राय दें — हर सदस्य का एक मत।" : "Have your say in organization decisions — one vote per member."} crumbs={[{ label: L ? "मतदान" : "Polls" }]} />
      <section className="section-y"><div className="container-page grid gap-4 md:grid-cols-2">
        {(polls.data ?? []).map((p) => <PollCard key={p.id} p={p} voted={myVotes.data?.[p.id]} L={L} onVoted={() => { qc.invalidateQueries({ queryKey: ["my_votes"] }); }} />)}
        {polls.isSuccess && !polls.data.length ? <p className="text-muted-foreground">{L ? "अभी कोई मतदान नहीं।" : "No polls right now."}</p> : null}
      </div></section>
    </>
  );
}

function PollCard({ p, voted, L, onVoted }: { p: Poll; voted: string[] | undefined; L: boolean; onVoted: () => void }) {
  const [sel, setSel] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const res = useQuery({ queryKey: ["poll_res", p.id, !!voted], queryFn: async () => { const { data } = await supabase.rpc("k1_poll_results", { p_poll: p.id } as never); return data as unknown as Res; } });
  const closed = p.status === "closed" || (p.ends_at && new Date(p.ends_at) < new Date());
  async function vote() {
    if (!sel.length) return;
    setBusy(true);
    try { const { error } = await supabase.rpc("k1_vote", { p_poll: p.id, p_choices: sel } as never); if (error) throw error; toast.success(L ? "मत दर्ज हुआ" : "Vote recorded"); onVoted(); qc.invalidateQueries({ queryKey: ["poll_res", p.id] }); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  const r = res.data; const total = r?.total ?? 0;
  return (
    <article className="surface-card p-4 text-sm">
      <div className="flex items-start justify-between gap-2"><h3 className="font-display text-lg font-semibold">{L && p.question_hi ? p.question_hi : p.question}</h3><Badge variant={closed ? "secondary" : "default"}>{closed ? (L ? "बंद" : "closed") : (L ? "खुला" : "open")}</Badge></div>
      {p.description ? <p className="mt-1 text-muted-foreground">{p.description}</p> : null}
      {p.ends_at ? <p className="text-xs text-muted-foreground">{L ? "तक" : "until"} {new Date(p.ends_at).toLocaleString("en-IN")}</p> : null}
      <div className="mt-3 space-y-2">
        {p.options.map((o) => {
          const n = r?.counts?.[o.key] ?? 0; const pct = total ? Math.round((n / total) * 100) : 0; const show = r && !r.hidden;
          return (
            <label key={o.key} className="block">
              <div className="flex items-center gap-2">
                {!voted && !closed ? <input type={p.multi ? "checkbox" : "radio"} name={p.id} checked={sel.includes(o.key)} onChange={(e) => setSel(p.multi ? (e.target.checked ? [...sel, o.key] : sel.filter((x) => x !== o.key)) : [o.key])} /> : null}
                <span className={voted?.includes(o.key) ? "font-semibold" : ""}>{L && o.label_hi ? o.label_hi : o.label}{voted?.includes(o.key) ? " ✓" : ""}</span>
                {show ? <span className="ml-auto text-xs text-muted-foreground">{n} · {pct}%</span> : null}
              </div>
              {show ? <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-secondary"><div className="h-1.5 bg-primary" style={{ width: `${pct}%` }} /></div> : null}
            </label>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-3">
        {!voted && !closed ? <Button size="sm" onClick={vote} disabled={busy || !sel.length}>{L ? "मत दें" : "Vote"}</Button> : null}
        <span className="text-xs text-muted-foreground">{total} {L ? "मत" : "votes"}{r?.hidden ? ` · ${L ? "परिणाम बंद होने पर" : "results after closing"}` : ""}</span>
      </div>
    </article>
  );
}
