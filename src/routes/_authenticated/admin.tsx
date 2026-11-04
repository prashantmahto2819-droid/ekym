import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/core/tenant-context";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Kalchuri One" },
      { name: "description", content: "Organization administration on Kalchuri One." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

const NAV: { to: string; label: string; group: string }[] = [
  { to: "/admin", label: "Dashboard", group: "Overview" },
  { to: "/admin/members", label: "Members", group: "Organization" },
  { to: "/admin/committees", label: "Committees & office bearers", group: "Organization" },
  { to: "/admin/meetings", label: "Meetings & resolutions", group: "Organization" },
  { to: "/admin/tasks", label: "Tasks", group: "Organization" },
  { to: "/admin/announcements", label: "Announcements", group: "Organization" },
  { to: "/admin/events", label: "Events & invitations", group: "Organization" },
  { to: "/admin/documents", label: "Documents & history", group: "Organization" },
  { to: "/admin/studio", label: "Design Studio", group: "Letters & documents" },
  { to: "/admin/letters", label: "Letters & certificates", group: "Letters & documents" },
  { to: "/admin/register", label: "Inward / outward register", group: "Letters & documents" },
  { to: "/admin/messaging", label: "Messaging (WhatsApp & email)", group: "Letters & documents" },
  { to: "/admin/families", label: "Family trees", group: "Family & shok" },
  { to: "/admin/shok", label: "Shok sandesh (condolence)", group: "Family & shok" },
  { to: "/admin/pages", label: "Pages (builder)", group: "Website" },
  { to: "/admin/website", label: "Theme, menus & domains", group: "Website" },
  { to: "/admin/homepage", label: "Homepage sections", group: "Content" },
  { to: "/admin/seva", label: "Seva projects", group: "Content" },
  { to: "/admin/blogs", label: "Blogs", group: "Content" },
  { to: "/admin/news", label: "News", group: "Content" },
  { to: "/admin/publishing", label: "Publishing (comments, feed, magazine)", group: "Content" },
  { to: "/admin/campaigns", label: "Campaigns", group: "Content" },
  { to: "/admin/media", label: "Videos, reels & gallery", group: "Content" },
  { to: "/admin/community", label: "Contributors & testimonials", group: "Content" },
  { to: "/admin/vouchers", label: "Vouchers & receipts", group: "Accounts" },
  { to: "/admin/reports", label: "Books & reports", group: "Accounts" },
  { to: "/admin/accounts", label: "Chart of accounts & years", group: "Accounts" },
  { to: "/admin/donations", label: "Donations", group: "Operations" },
  { to: "/admin/blood", label: "Blood seva", group: "Operations" },
  { to: "/admin/library", label: "Library", group: "Operations" },
  { to: "/admin/volunteers", label: "Volunteer applications", group: "Operations" },
  { to: "/admin/interns", label: "Internship applications", group: "Operations" },
  { to: "/admin/messages", label: "Contact inbox", group: "Operations" },
  { to: "/admin/payments", label: "Payment settings", group: "Administration" },
  { to: "/admin/settings", label: "Organization settings", group: "Administration" },
  { to: "/admin/users", label: "Users & roles", group: "Administration" },
];

function AdminLayout() {
  const { isStaff, loading, user, signOut } = useAuth();
  const tenant = useTenant();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm">Loading…</div>;
  }

  if (!isStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="surface-card max-w-md p-8 text-center">
          <h1 className="font-display text-xl font-semibold">Staff access only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This account ({user?.email}) does not have an admin role yet. Please contact an administrator of {tenant.name}.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button asChild variant="outline">
              <Link to="/">Back to website</Link>
            </Button>
            <Button onClick={signOut}>Sign out</Button>
          </div>
        </div>
      </div>
    );
  }

  const groups = Array.from(new Set(NAV.map((n) => n.group)));

  return (
    <div className="flex min-h-screen bg-secondary/40">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-background p-4 lg:block">
        <Link to="/" className="mb-6 block font-display text-base font-semibold">
          {tenant.short_name ?? tenant.name} Admin
        </Link>
        <nav className="space-y-5">
          {groups.map((g) => (
            <div key={g}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {g}
              </p>
              <ul className="space-y-1">
                {NAV.filter((n) => n.group === g).map((n) => (
                  <li key={n.to}>
                    <Link
                      to={n.to}
                      activeOptions={{ exact: n.to === "/admin" }}
                      activeProps={{ className: "bg-primary/10 text-primary font-medium" }}
                      className="block rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                    >
                      {n.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-3">
          <div className="lg:hidden">
            <Link to="/admin" className="font-display font-semibold">
              {tenant.short_name ?? tenant.name} Admin
            </Link>
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="hidden text-muted-foreground sm:inline">{user?.email}</span>
            <Button size="sm" variant="outline" onClick={signOut}>
              <LogOut className="size-4" /> Sign out
            </Button>
          </div>
        </header>
        <div className="flex gap-2 overflow-x-auto border-b border-border bg-background px-4 py-2 lg:hidden">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/admin" }}
              activeProps={{ className: "bg-primary/10 text-primary" }}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs"
            >
              {n.label}
            </Link>
          ))}
        </div>
        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
