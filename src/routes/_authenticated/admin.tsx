import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import { AdminBell } from "@/components/admin/AdminBell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { moduleOn } from "@/core/modules";
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

const ALL_NAV: { to: string; label: string; group: string; platform?: boolean }[] = [
  { to: "/admin", label: "डैशबोर्ड · Dashboard", group: "1 · संगठन" },
  { to: "/admin/settings", label: "संगठन की जानकारी, logo, modules", group: "1 · संगठन" },
  { to: "/admin/members", label: "सदस्य · Members & applications", group: "1 · संगठन" },
  { to: "/admin/committees", label: "पदाधिकारी व समितियाँ", group: "1 · संगठन" },
  { to: "/admin/users", label: "एडमिन व भूमिकाएँ · Users & roles", group: "1 · संगठन" },
  { to: "/admin/meetings", label: "बैठकें व प्रस्ताव", group: "1 · संगठन" },
  { to: "/admin/tasks", label: "कार्य · Tasks", group: "1 · संगठन" },
  { to: "/admin/announcements", label: "सूचनाएँ · Announcements", group: "1 · संगठन" },
  { to: "/admin/organizations", label: "मंच की संस्थाएँ · Organizations", group: "1 · संगठन", platform: true },

  { to: "/admin/homepage", label: "होम पेज (slides, sections)", group: "2 · वेबसाइट" },
  { to: "/admin/pages", label: "पेज बनाएँ · Pages (builder)", group: "2 · वेबसाइट" },
  { to: "/admin/website", label: "रंग-रूप, menu, domain", group: "2 · वेबसाइट" },
  { to: "/admin/media", label: "फोटो, वीडियो, reels, gallery", group: "2 · वेबसाइट" },

  { to: "/admin/news", label: "समाचार · News", group: "3 · प्रकाशन" },
  { to: "/admin/blogs", label: "लेख / ब्लॉग", group: "3 · प्रकाशन" },
  { to: "/admin/publishing", label: "पत्रिका (magazine), टिप्पणियाँ", group: "3 · प्रकाशन" },
  { to: "/admin/achievements", label: "उपलब्धियाँ व विचार", group: "3 · प्रकाशन" },
  { to: "/admin/exams", label: "परीक्षा व प्रतियोगिताएँ", group: "5 · समाज सेवाएँ" },
  { to: "/admin/campaigns", label: "अभियान · Campaigns", group: "3 · प्रकाशन" },
  { to: "/admin/seva", label: "सेवा प्रकल्प", group: "3 · प्रकाशन" },

  { to: "https://shokpatra.kalchuri.org/app.html", label: "शोकपत्र सेवा / वंश वृक्ष ↗", group: "4 · वंश वृक्ष व शोक" },
  { to: "/admin/families", label: "परिवार (देखें)", group: "4 · वंश वृक्ष व शोक" },
  { to: "/admin/shok", label: "शोक संदेश (देखें)", group: "4 · वंश वृक्ष व शोक" },

  { to: "/admin/events", label: "आयोजन व निमंत्रण · Events", group: "5 · समाज सेवाएँ" },
  { to: "/admin/community", label: "Kalchuri One feed, directory, वैवाहिक, polls", group: "5 · समाज सेवाएँ" },
  { to: "/admin/programs", label: "शोध एवं इंटर्नशिप कार्यक्रम", group: "5 · समाज सेवाएँ" },
  { to: "/admin/interns", label: "शोध / इंटर्नशिप आवेदन", group: "5 · समाज सेवाएँ" },
  { to: "/admin/blood", label: "रक्त सेवा", group: "5 · समाज सेवाएँ" },
  { to: "/admin/library", label: "पुस्तकालय", group: "5 · समाज सेवाएँ" },
  { to: "/admin/volunteers", label: "स्वयंसेवक आवेदन (पुराने)", group: "5 · समाज सेवाएँ" },
  { to: "/admin/messages", label: "संपर्क संदेश · Contact inbox", group: "5 · समाज सेवाएँ" },

  { to: "/admin/studio", label: "डिज़ाइन स्टूडियो", group: "6 · पत्राचार व संदेश" },
  { to: "/admin/letters", label: "पत्र, प्रमाणपत्र · Documents", group: "6 · पत्राचार व संदेश" },
  { to: "/admin/register", label: "आवक / जावक रजिस्टर", group: "6 · पत्राचार व संदेश" },
  { to: "/admin/documents", label: "दस्तावेज़ व इतिहास", group: "6 · पत्राचार व संदेश" },
  { to: "/admin/messaging", label: "WhatsApp / ईमेल (channels, campaigns)", group: "6 · पत्राचार व संदेश" },

  { to: "/admin/vouchers", label: "रसीद / भुगतान वाउचर", group: "7 · लेखा" },
  { to: "/admin/reports", label: "बही-खाते व रिपोर्ट", group: "7 · लेखा" },
  { to: "/admin/accounts", label: "खाता सूची व वित्त वर्ष", group: "7 · लेखा" },
  { to: "/admin/donations", label: "दान · Donations", group: "7 · लेखा" },
  { to: "/admin/payments", label: "भुगतान सेटिंग (Razorpay)", group: "7 · लेखा" },

  { to: "/admin/ads", label: "विज्ञापन व आय", group: "8 · व्यवस्था" },
  { to: "/admin/health", label: "System health & backups", group: "8 · व्यवस्था", platform: true },
  { to: "/admin/guide", label: "उपयोग गाइड", group: "8 · व्यवस्था" },
];


function AdminLayout() {
  const { isStaff, loading, user, signOut, isPlatformAdmin } = useAuth();
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

  const NAV_MOD: Record<string, string> = { "/admin/library": "library", "/admin/blood": "blood", "/admin/interns": "internship", "/admin/programs": "internship", "/admin/donations": "donate", "/admin/payments": "donate", "/admin/shok": "shok", "/admin/families": "shok", "https://shokpatra.kalchuri.org/app.html": "shok", "/admin/volunteers": "volunteer", "/admin/seva": "seva", "/admin/campaigns": "campaigns", "/admin/events": "events", "/admin/community": "community", "/admin/exams": "exam" };
  const NAV = ALL_NAV.filter((n) => (!NAV_MOD[n.to] || moduleOn(tenant.branding, NAV_MOD[n.to]!)) && (!n.platform || isPlatformAdmin || (tenant.child_count ?? 0) > 0));
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
                {g.replace(/^\d+ · /, "")}
              </p>
              <ul className="space-y-1">
                {NAV.filter((n) => n.group === g).map((n) => (
                  <li key={n.to}>
                    {n.to.startsWith("http") ? <a href={n.to} target="_blank" rel="noreferrer" className="block rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary">{n.label}</a> : <Link
                      to={n.to}
                      activeOptions={{ exact: n.to === "/admin" }}
                      activeProps={{ className: "bg-primary/10 text-primary font-medium" }}
                      className="block rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                    >
                      {n.label}
                    </Link>}
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
            <AdminBell />
            <Button size="sm" variant="outline" onClick={signOut}>
              <LogOut className="size-4" /> Sign out
            </Button>
          </div>
        </header>
        <div className="flex gap-2 overflow-x-auto border-b border-border bg-background px-4 py-2 lg:hidden">
          {NAV.map((n) => n.to.startsWith("http") ? (
            <a key={n.to} href={n.to} target="_blank" rel="noreferrer" className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs">{n.label}</a>
          ) : (
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
