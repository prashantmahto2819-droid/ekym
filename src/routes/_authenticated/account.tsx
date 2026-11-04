import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogOut, ShieldCheck } from "lucide-react";
import { siteName } from "@/core/seo";

import { PageHeader } from "@/components/site/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/account")({
  head: ({ matches }) => ({
    meta: [
      { title: `My account — ${siteName(matches)}` },
      { name: "description", content: `Your ${siteName(matches)} account and activity.` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user, currentOrg, isStaff, signOut } = useAuth();
  const roles = currentOrg?.role_keys ?? [];

  const applications = useQuery({
    queryKey: ["my-applications", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [volunteer, intern] = await Promise.all([
        supabase
          .from("volunteer_applications")
          .select("id,application_id,status,created_at")
          .eq("user_id", user!.id),
        supabase
          .from("intern_applications")
          .select("id,application_id,status,created_at")
          .eq("user_id", user!.id),
      ]);
      return { volunteer: volunteer.data ?? [], intern: intern.data ?? [] };
    },
  });

  return (
    <>
      <PageHeader title="My account" crumbs={[{ label: "Account" }]} />
      <section className="section-y">
        <div className="container-page grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <div className="surface-card h-fit p-6">
            <p className="text-sm text-muted-foreground">Signed in as</p>
            <p className="font-display text-lg font-semibold">{user?.email}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {roles.length ? (
                roles.map((r) => (
                  <Badge key={r} variant="secondary">
                    {r.replaceAll("_", " ").toLowerCase()}
                  </Badge>
                ))
              ) : (
                <Badge variant="outline">member</Badge>
              )}
            </div>
            <div className="mt-6 flex flex-col gap-2">
              {isStaff ? (
                <Button asChild>
                  <Link to="/admin">
                    <ShieldCheck className="size-4" /> Open admin
                  </Link>
                </Button>
              ) : null}
              <Button variant="outline" onClick={signOut}>
                <LogOut className="size-4" /> Sign out
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="surface-card p-6">
              <h2 className="font-display text-lg font-semibold">My applications</h2>
              {applications.isLoading ? (
                <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
              ) : (applications.data?.volunteer.length ?? 0) +
                  (applications.data?.intern.length ?? 0) ===
                0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  No applications linked to this account yet.{" "}
                  <Link to="/volunteer" className="text-primary hover:underline">
                    Apply to volunteer
                  </Link>
                  .
                </p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  {applications.data?.volunteer.map((a: any) => (
                    <li key={a.id} className="flex items-center justify-between gap-3">
                      <span>Volunteer · {a.application_id ?? "—"}</span>
                      <span className="text-muted-foreground">
                        {a.status} · {formatDate(a.created_at)}
                      </span>
                    </li>
                  ))}
                  {applications.data?.intern.map((a: any) => (
                    <li key={a.id} className="flex items-center justify-between gap-3">
                      <span>Internship · {a.application_id ?? "—"}</span>
                      <span className="text-muted-foreground">
                        {a.status} · {formatDate(a.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="surface-card p-6">
              <h2 className="font-display text-lg font-semibold">Ways to help today</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild>
                  <Link to="/donations">My donations</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/blood">Blood seva</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/donate">Donate</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/volunteer">Volunteer</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
