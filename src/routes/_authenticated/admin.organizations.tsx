// Platform / umbrella admin: organizations on the platform — approve registrations, see admins, members, sites.
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/organizations")({ component: Orgs });

type Org = { id: string; slug: string; name: string; name_hi: string | null; kind: string; level: string; city: string | null; district: string | null; state: string | null; status: string; parent_id: string | null; parent_name: string | null; hostname: string | null; members: number; admins: string | null; created_at: string; requester: string | null; phone: string | null };

function Orgs() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["k1_org_list"], queryFn: async () => { const { data, error } = await supabase.rpc("k1_org_list" as never); if (error) throw new Error(error.message); return (data ?? []) as unknown as Org[]; } });
  async function decide(o: Org, ok: boolean) {
    const note = ok ? null : prompt("Reason (optional)");
    if (!ok && note === null) return;
    const { error } = await supabase.rpc("k1_org_decide", { p_org: o.id, p_approve: ok, p_note: note } as never);
    if (error) toast.error(error.message); else { toast.success(ok ? `Approved — ${o.slug}.kalchuri.org` : "Rejected"); qc.invalidateQueries({ queryKey: ["k1_org_list"] }); }
  }
  const rows = q.data ?? [];
  return (
    <div className="space-y-4">
      <header><h1 className="font-display text-2xl font-semibold">Organizations</h1><p className="text-sm text-muted-foreground">Every samiti / sanstha on the platform. Registrations from <code>/register-organization</code> wait here; approving creates the sub-site and the requester becomes its admin.</p></header>
      {q.error ? <p className="text-sm text-destructive">{(q.error as Error).message}</p> : null}
      <div className="overflow-x-auto rounded-lg border border-border bg-background"><table className="w-full text-left text-sm">
        <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground"><tr><th className="p-2">Organization</th><th className="p-2">Kind / level</th><th className="p-2">Place</th><th className="p-2">Status</th><th className="p-2">Site</th><th className="p-2 text-right">Members</th><th className="p-2">Admins</th><th className="p-2">Requested by</th><th className="p-2"></th></tr></thead>
        <tbody>{rows.map((o) => <tr key={o.id} className={`border-t border-border ${o.status === "pending" ? "bg-amber-50/60 dark:bg-amber-950/20" : ""}`}>
          <td className="p-2"><b>{o.name}</b>{o.name_hi ? <span className="block text-xs text-muted-foreground">{o.name_hi}</span> : null}{o.parent_name ? <span className="block text-[11px] text-muted-foreground">↳ under {o.parent_name}</span> : null}</td>
          <td className="p-2 text-xs">{o.kind} · {o.level}</td>
          <td className="p-2 text-xs">{[o.city, o.district, o.state].filter(Boolean).join(", ")}</td>
          <td className="p-2"><Badge variant={o.status === "active" ? "default" : o.status === "pending" ? "secondary" : "destructive"}>{o.status}</Badge></td>
          <td className="p-2 text-xs">{o.hostname ? <a className="underline" href={`https://${o.hostname}`} target="_blank" rel="noreferrer">{o.hostname}</a> : <span className="text-muted-foreground">{o.slug}.kalchuri.org (on approval)</span>}</td>
          <td className="p-2 text-right">{o.members}</td>
          <td className="p-2 text-xs">{o.admins ?? "—"}</td>
          <td className="p-2 text-xs">{o.requester ?? "—"}{o.phone ? <span className="block text-muted-foreground">{o.phone}</span> : null}<span className="block text-muted-foreground">{new Date(o.created_at).toLocaleDateString("en-IN")}</span></td>
          <td className="p-2"><span className="flex gap-1">{o.status === "pending" ? <><Button size="sm" onClick={() => decide(o, true)}>Approve</Button><Button size="sm" variant="outline" onClick={() => decide(o, false)}>Reject</Button></> : null}{o.status === "suspended" ? <Button size="sm" variant="outline" onClick={() => decide(o, true)}>Activate</Button> : null}</span></td>
        </tr>)}{q.isSuccess && !rows.length ? <tr><td className="p-3 text-muted-foreground" colSpan={9}>None.</td></tr> : null}</tbody></table></div>
    </div>
  );
}
