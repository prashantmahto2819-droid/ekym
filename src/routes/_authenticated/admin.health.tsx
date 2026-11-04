// System health (platform admin) + per-organization data export (org settings editors).
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/fin";

export const Route = createFileRoute("/_authenticated/admin/health")({ component: HealthPage });

type Health = { ok: boolean; problems: string[]; checked_at: string; db_size_mb: number; comms: Record<string, number>; shok: Record<string, number | string | null>; moderation: Record<string, number>; approvals: Record<string, number>; counts: Record<string, number>; cron: { job: string; schedule: string; active: boolean; last_status: string | null; last_run: string | null; last_msg: string | null }[] };

function HealthPage() {
  const tenant = useTenant();
  const { isPlatformAdmin, can } = useAuth();
  const q = useQuery({ queryKey: ["k1_health"], enabled: isPlatformAdmin, refetchInterval: 60_000, queryFn: async () => { const { data, error } = await supabase.rpc("k1_health" as never); if (error) throw new Error(error.message); return data as unknown as Health; } });
  const [busy, setBusy] = useState(false);
  async function exportOrg() {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("k1_org_export", { p_org: tenant.organization_id } as never); if (error) throw new Error(error.message);
      const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${tenant.slug ?? "org"}-export-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(a.href);
      toast.success("Export downloaded");
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  const h = q.data;
  const Box = ({ title, rows }: { title: string; rows: [string, unknown][] }) => <div className="rounded-lg border border-border bg-background p-3 text-sm"><p className="font-medium">{title}</p><dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">{rows.map(([k, v]) => <><dt key={k + "k"} className="text-muted-foreground">{k}</dt><dd key={k + "v"} className="text-right font-mono">{String(v ?? "—")}</dd></>)}</dl></div>;
  return (
    <div className="space-y-4">
      <header><h1 className="font-display text-2xl font-semibold">System health & backups</h1><p className="text-sm text-muted-foreground">Queues, cron jobs, moderation and approvals at a glance. Platform admins also get a WhatsApp digest at 08:00 IST whenever something needs attention.</p></header>

      {isPlatformAdmin ? (
        h ? (
          <div className="space-y-3">
            <div className={`rounded-lg border p-3 text-sm ${h.ok ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30" : "border-destructive/50 bg-destructive/10"}`}>
              <p className="font-medium">{h.ok ? "✅ All systems normal" : "⚠️ Needs attention"} <span className="ml-2 text-xs font-normal text-muted-foreground">checked {new Date(h.checked_at).toLocaleString("en-IN")} · DB {h.db_size_mb} MB</span></p>
              {h.problems.length ? <ul className="mt-1 list-disc pl-5">{h.problems.map((p) => <li key={p}>{p}</li>)}</ul> : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Box title="Messaging queue (WhatsApp / email)" rows={Object.entries(h.comms)} />
              <Box title="Shok sandesh" rows={Object.entries(h.shok)} />
              <Box title="Kalchuri One moderation" rows={Object.entries(h.moderation)} />
              <Box title="Pending approvals" rows={Object.entries(h.approvals)} />
              <Box title="Platform" rows={Object.entries(h.counts).map(([k, v]) => [k, k === "donations_30d" ? inr(v) : v])} />
            </div>
            <div className="overflow-x-auto rounded-lg border border-border"><table className="w-full text-left text-sm"><thead className="bg-secondary/60 text-xs uppercase text-muted-foreground"><tr><th className="p-2">Cron job</th><th className="p-2">Schedule (UTC)</th><th className="p-2">Last run</th><th className="p-2">Status</th></tr></thead>
              <tbody>{h.cron.map((c) => <tr key={c.job} className="border-t border-border"><td className="p-2 font-mono text-xs">{c.job}</td><td className="p-2 font-mono text-xs">{c.schedule}</td><td className="p-2 text-xs">{c.last_run ? new Date(c.last_run).toLocaleString("en-IN") : "never"}</td><td className="p-2"><Badge variant={c.last_status === "failed" ? "destructive" : c.active ? "default" : "secondary"}>{c.last_status ?? (c.active ? "active" : "off")}</Badge></td></tr>)}</tbody></table></div>
          </div>
        ) : q.error ? <p className="text-sm text-destructive">{(q.error as Error).message}</p> : <p className="text-sm text-muted-foreground">Loading…</p>
      ) : <p className="rounded-lg border border-border bg-background p-3 text-sm text-muted-foreground">Live health is visible to platform admins only.</p>}

      <div className="rounded-lg border border-border bg-background p-4 text-sm">
        <p className="font-medium">Backups</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
          <li><b>Supabase</b> keeps daily database backups (Dashboard → Database → Backups); point-in-time recovery can be enabled on paid plans.</li>
          <li><b>GitHub Actions</b> workflow <code>backup.yml</code> runs <code>pg_dump</code> every Sunday 03:00 IST and keeps the file for 90 days (needs the <code>SUPABASE_DB_URL</code> repository secret).</li>
          <li><b>This organization's data</b> can be exported as one JSON file any time (members, donations, vouchers, posts, events, pages …). Keep it somewhere safe; it contains personal data.</li>
        </ul>
        {can("org.settings.edit") || isPlatformAdmin ? <Button className="mt-3" onClick={exportOrg} disabled={busy}>{busy ? "Preparing…" : `Download ${tenant.name} data (JSON)`}</Button> : null}
      </div>
    </div>
  );
}
