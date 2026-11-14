// Admin dashboard: what needs a decision today (new members across the platform for platform admins, own
// organization for org admins), latest notifications, and quick counts.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { ago, useAdminNotifications } from "@/components/admin/AdminBell";
import { AdminCharts } from "@/components/admin/AdminCharts";
import { Button } from "@/components/ui/button";
import { useLang } from "@/core/i18n";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

type Pending = { id: string; organization_id: string; org_name: string; org_slug: string; priority: boolean; full_name: string; full_name_hi: string | null; mobile: string | null; village: string | null; district: string | null; category: string | null; photo_path: string | null; applied_at: string };

const CARDS: { table: string; label: string; en: string; to: string; filter?: [string, string] }[] = [
  { table: "contact_messages", label: "नए संपर्क संदेश", en: "New contact messages", to: "/admin/messages", filter: ["status", "NEW"] },
  { table: "blood_requirements", label: "रक्त अनुरोध (जाँच बाकी)", en: "Blood requests to verify", to: "/admin/blood", filter: ["verification_status", "PENDING"] },
  { table: "intern_applications", label: "इंटर्नशिप आवेदन", en: "Internship applications", to: "/admin/interns", filter: ["status", "SUBMITTED"] },
  { table: "donations", label: "दान (भुगतान हुए)", en: "Donations received", to: "/admin/donations", filter: ["status", "PAID"] },
  { table: "news", label: "समाचार", en: "News", to: "/admin/news" },
  { table: "seva_projects", label: "सेवा प्रकल्प", en: "Seva projects", to: "/admin/seva" },
];

function AdminDashboard() {
  const tenant = useTenant();
  const { lang } = useLang();
  const L = lang === "hi";
  const { isPlatformAdmin, can } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const pending = useQuery({
    queryKey: ["k1_pending_memberships"],
    queryFn: async () => { const { data, error } = await supabase.rpc("k1_pending_memberships", { p_limit: 100 } as never); if (error) throw new Error(error.message); return (data ?? []) as unknown as Pending[]; },
    refetchInterval: 60_000,
  });
  const notifs = useAdminNotifications();
  const counts = useQuery({
    queryKey: ["admin", "dashboard-counts", tenant.organization_id],
    queryFn: async () => {
      const entries = await Promise.all(CARDS.map(async (c) => {
        let query = supabase.from(c.table as never).select("id", { count: "exact", head: true }).eq("organization_id", tenant.organization_id);
        if (c.filter) query = query.eq(c.filter[0], c.filter[1]);
        const { count } = await query;
        return [c.label, count ?? 0] as const;
      }));
      return Object.fromEntries(entries) as Record<string, number>;
    },
  });

  async function decide(m: Pending, approve: boolean) {
    const note = approve ? null : prompt(L ? "अस्वीकार करने का कारण (सदस्य को दिखेगा)" : "Reason for rejection (shown to the member)");
    if (!approve && !note) return;
    setBusy(m.id);
    try {
      const { error } = await supabase.rpc("k1_decide_membership", { p_id: m.id, p_approve: approve, p_category: m.category, p_note: note } as never);
      if (error) throw new Error(error.message);
      toast.success(approve ? (L ? "सदस्यता मंज़ूर" : "Membership approved") : (L ? "अस्वीकार किया" : "Rejected"));
      qc.invalidateQueries({ queryKey: ["k1_pending_memberships"] });
      qc.invalidateQueries({ queryKey: ["k1_admin_notifications"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(null); }
  }

  const list = pending.data ?? [];
  const mine = list.filter((m) => m.organization_id === tenant.organization_id);
  const others = list.filter((m) => m.organization_id !== tenant.organization_id);
  const canApprove = isPlatformAdmin || can("org.member.approve");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">{L ? "डैशबोर्ड" : "Dashboard"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{L ? `${tenant.name_hi ?? tenant.name} — आज के बाकी काम` : `${tenant.name} — what needs your decision today`}</p>
      </div>

      {canApprove ? (
        <section className="surface-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">🙏 {L ? "नए सदस्य — मंज़ूरी बाकी" : "New members awaiting approval"} <span className="text-sm font-normal text-muted-foreground">({list.length})</span></h2>
            <Button asChild size="sm" variant="outline"><Link to="/admin/members">{L ? "सदस्य सूची" : "Member list"}</Link></Button>
          </div>
          {pending.isLoading ? <p className="mt-3 text-sm text-muted-foreground">…</p> : null}
          {pending.isSuccess && !list.length ? <p className="mt-3 text-sm text-muted-foreground">{L ? "अभी कोई नया आवेदन नहीं। नया सदस्य आते ही यहाँ, घंटी में और व्हाट्सऐप पर सूचना आएगी।" : "No new applications. You will be alerted here, in the bell and on WhatsApp when someone applies."}</p> : null}
          {[[L ? "इस संगठन के" : "This organisation", mine], [isPlatformAdmin ? (L ? "अन्य संगठनों के (⭐ = प्राथमिकता)" : "Other organisations (⭐ = priority)") : "", others]].map(([label, rows]) => (rows as Pending[]).length ? (
            <div key={label as string} className="mt-3">
              {label ? <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label as string}</p> : null}
              <ul className="divide-y divide-border rounded-md border border-border text-sm">
                {(rows as Pending[]).map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                    <Photo path={m.photo_path} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{m.priority ? "⭐ " : ""}{m.full_name_hi || m.full_name}</p>
                      <p className="text-xs text-muted-foreground">{[m.org_name, m.village, m.district, m.mobile, m.category].filter(Boolean).join(" · ")} · {ago(m.applied_at, L)}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" disabled={busy === m.id} onClick={() => decide(m, true)}>{L ? "मंज़ूर" : "Approve"}</Button>
                      <Button size="sm" variant="outline" disabled={busy === m.id} onClick={() => decide(m, false)}>{L ? "अस्वीकार" : "Reject"}</Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null)}
        </section>
      ) : null}

      <AdminCharts />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">{L ? "एक नज़र में" : "At a glance"}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {CARDS.map((c) => (
              <Link key={c.label} to={c.to as "/admin"} className="surface-card p-4 transition-shadow hover:shadow-md">
                <p className="text-sm text-muted-foreground">{L ? c.label : c.en}</p>
                <p className="mt-1 font-display text-3xl font-semibold">{counts.isLoading ? "…" : (counts.data?.[c.label] ?? 0)}</p>
              </Link>
            ))}
          </div>
        </section>
        <section className="surface-card p-4">
          <h2 className="font-display text-lg font-semibold">{L ? "हाल की सूचनाएँ" : "Recent alerts"}</h2>
          <ul className="mt-2 divide-y divide-border text-sm">
            {(notifs.data ?? []).slice(0, 8).map((n) => (
              <li key={n.id} className={`py-2 ${n.read_at ? "opacity-70" : ""}`}>
                <Link to={(n.link ?? "/admin") as "/admin"} className="block hover:underline">
                  <p className="leading-tight">{n.priority >= 2 ? "⭐ " : ""}{n.title}</p>
                  <p className="text-[11px] text-muted-foreground">{n.org_name ? `${n.org_name} · ` : ""}{ago(n.created_at, L)}</p>
                </Link>
              </li>
            ))}
            {notifs.isSuccess && !notifs.data?.length ? <li className="py-4 text-center text-muted-foreground">{L ? "अभी कोई सूचना नहीं" : "No alerts yet"}</li> : null}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Photo({ path }: { path: string | null }) {
  const q = useQuery({ queryKey: ["member-photo", path], enabled: !!path, staleTime: 10 * 60_000, queryFn: async () => { const { data } = await supabase.storage.from("documents").createSignedUrl(path!, 3600); return data?.signedUrl ?? null; } });
  return q.data ? <img src={q.data} alt="" className="size-10 rounded-full object-cover" /> : <span className="grid size-10 place-items-center rounded-full bg-secondary text-xs text-muted-foreground">📷</span>;
}
