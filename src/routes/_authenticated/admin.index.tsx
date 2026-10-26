import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

const CARDS: { table: string; label: string; to: string; filter?: [string, string] }[] = [
  { table: "donations", label: "Paid donations", to: "/admin/donations", filter: ["status", "PAID"] },
  { table: "contact_messages", label: "New messages", to: "/admin/messages", filter: ["status", "NEW"] },
  {
    table: "blood_requirements",
    label: "Blood requests to verify",
    to: "/admin/blood",
    filter: ["verification_status", "PENDING"],
  },
  { table: "blood_donors", label: "Registered donors", to: "/admin/blood" },
  {
    table: "volunteer_applications",
    label: "Volunteer applications",
    to: "/admin/volunteers",
    filter: ["status", "SUBMITTED"],
  },
  {
    table: "intern_applications",
    label: "Internship applications",
    to: "/admin/interns",
    filter: ["status", "SUBMITTED"],
  },
  { table: "blogs", label: "Blogs", to: "/admin/blogs" },
  { table: "news", label: "News items", to: "/admin/news" },
  { table: "seva_projects", label: "Seva projects", to: "/admin/seva" },
];

function AdminDashboard() {
  const counts = useQuery({
    queryKey: ["admin", "dashboard-counts"],
    queryFn: async () => {
      const entries = await Promise.all(
        CARDS.map(async (c) => {
          let query = supabase.from(c.table as any).select("id", { count: "exact", head: true });
          if (c.filter) query = query.eq(c.filter[0], c.filter[1]);
          const { count } = await query;
          return [c.label, count ?? 0] as const;
        }),
      );
      return Object.fromEntries(entries) as Record<string, number>;
    },
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Day-to-day foundation operations at a glance.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CARDS.map((c) => (
          <Link key={c.label} to={c.to} className="surface-card p-5 transition-shadow hover:shadow-md">
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className="mt-2 font-display text-3xl font-semibold">
              {counts.isLoading ? "…" : (counts.data?.[c.label] ?? 0)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
