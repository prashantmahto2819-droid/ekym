import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ChevronDown, ExternalLink, Languages, LogOut, Menu, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AdminBell } from "@/components/admin/AdminBell";
import { ADMIN_NAV, activeItem, type NavGroup, type NavItem } from "@/components/admin/adminNav";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useLang } from "@/core/i18n";
import { moduleOn } from "@/core/modules";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";

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

const OPEN_KEY = "k1_admin_nav_open";

function AdminLayout() {
  const { isStaff, loading, user, signOut, isPlatformAdmin } = useAuth();
  const tenant = useTenant();
  const { lang, setLang } = useLang();
  const L = lang === "hi";
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);

  // close the phone menu after every navigation
  useEffect(() => { setMenuOpen(false); }, [path]);

  const groups = useMemo<NavGroup[]>(() => ADMIN_NAV
    .map((g) => ({ ...g, items: g.items.filter((n) => (!n.mod || moduleOn(tenant.branding, n.mod)) && (!n.platform || isPlatformAdmin || (tenant.child_count ?? 0) > 0)) }))
    .filter((g) => g.items.length > 0), [tenant.branding, tenant.child_count, isPlatformAdmin]);
  const current = activeItem(path);
  const title = current ? (L ? current.item.hi : current.item.en) : (L ? "एडमिन" : "Admin");
  const orgName = (L ? tenant.name_hi || tenant.short_name || tenant.name : tenant.short_name || tenant.name) ?? "";

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">{L ? "लोड हो रहा है…" : "Loading…"}</div>;
  }

  if (!isStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="surface-card max-w-md p-8 text-center">
          <h1 className="font-display text-xl font-semibold">{L ? "सिर्फ़ एडमिन के लिए" : "Staff access only"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {L
              ? `इस खाते (${user?.email ?? ""}) को अभी एडमिन अधिकार नहीं मिला है। कृपया ${tenant.name_hi || tenant.name} के किसी एडमिन से संपर्क करें।`
              : `This account (${user?.email ?? ""}) does not have an admin role yet. Please contact an administrator of ${tenant.name}.`}
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button asChild variant="outline"><Link to="/">{L ? "वेबसाइट पर लौटें" : "Back to website"}</Link></Button>
            <Button onClick={signOut}>{L ? "लॉग आउट" : "Sign out"}</Button>
          </div>
        </div>
      </div>
    );
  }

  const langBtn = (
    <Button size="sm" variant="ghost" onClick={() => setLang(L ? "en" : "hi")} title={L ? "Switch to English" : "हिंदी में बदलें"} className="gap-1 px-2">
      <Languages className="size-4" /><span className="text-xs font-semibold">{L ? "English" : "हिंदी"}</span>
    </Button>
  );

  return (
    <div className="flex min-h-screen bg-secondary/40">
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-border bg-background lg:flex">
        <Link to="/admin" className="block border-b border-border px-4 py-4">
          <span className="block truncate font-display text-base font-semibold">{orgName}</span>
          <span className="text-xs text-muted-foreground">{L ? "एडमिन पैनल" : "Admin panel"}</span>
        </Link>
        <NavTree groups={groups} L={L} activeTo={current?.item.to ?? null} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/95 px-3 py-2 backdrop-blur sm:px-4">
          <Button size="icon" variant="ghost" className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label={L ? "मेनू खोलें" : "Open menu"}>
            <Menu className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] leading-tight text-muted-foreground">{current ? (L ? current.group.hi : current.group.en) : orgName}</p>
            <p className="truncate font-display text-base font-semibold leading-tight">{title}</p>
          </div>
          <span className="hidden max-w-48 truncate text-xs text-muted-foreground xl:inline">{user?.email}</span>
          {langBtn}
          <AdminBell />
          <Button size="sm" variant="outline" onClick={signOut} className="gap-1 px-2 sm:px-3" title={L ? "लॉग आउट" : "Sign out"}>
            <LogOut className="size-4" /><span className="hidden sm:inline">{L ? "लॉग आउट" : "Sign out"}</span>
          </Button>
        </header>

        {/* phone / tablet menu */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent side="left" className="flex w-[88vw] max-w-sm flex-col gap-0 p-0">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="min-w-0">
                <SheetTitle className="truncate font-display text-base">{orgName}</SheetTitle>
                <p className="text-xs text-muted-foreground">{L ? "एडमिन पैनल" : "Admin panel"}</p>
              </div>
            </div>
            <NavTree groups={groups} L={L} activeTo={current?.item.to ?? null} />
            <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground">
              <span className="truncate">{user?.email}</span>
              {langBtn}
            </div>
          </SheetContent>
        </Sheet>

        <main className="min-w-0 flex-1 p-3 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/** Searchable, collapsible menu: one open group at a time by default (the current page's group), remembered per browser. */
function NavTree({ groups, L, activeTo }: { groups: NavGroup[]; L: boolean; activeTo: string | null }) {
  const [q, setQ] = useState("");
  const activeGroup = groups.find((g) => g.items.some((i) => i.to === activeTo))?.id ?? "home";
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    try { const s = localStorage.getItem(OPEN_KEY); if (s) return JSON.parse(s) as Record<string, boolean>; } catch { /* no storage */ }
    return {};
  });
  useEffect(() => { setOpen((o) => (o[activeGroup] ? o : { ...o, [activeGroup]: true })); }, [activeGroup]);
  const toggle = (id: string) => setOpen((o) => {
    const n = { ...o, [id]: !o[id] };
    try { localStorage.setItem(OPEN_KEY, JSON.stringify(n)); } catch { /* ignore */ }
    return n;
  });
  const term = q.trim().toLowerCase();
  const match = (n: NavItem) => !term || `${n.hi} ${n.en} ${n.keys ?? ""}`.toLowerCase().includes(term);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-3 pt-3">
        <label className="flex items-center gap-2 rounded-md border border-input bg-background px-2">
          <Search className="size-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L ? "मेनू में खोजें…" : "Search menu…"} className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none" />
          {q ? <button type="button" onClick={() => setQ("")} aria-label={L ? "साफ़ करें" : "Clear"}><X className="size-4 text-muted-foreground" /></button> : null}
        </label>
      </div>
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {groups.map((g) => {
          const items = g.items.filter(match);
          if (!items.length) return null;
          const isOpen = term ? true : g.items.length === 1 && g.id === "home" ? true : !!open[g.id];
          const GIcon = g.icon;
          return (
            <div key={g.id}>
              <button type="button" onClick={() => toggle(g.id)} aria-expanded={isOpen}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide ${g.id === activeGroup ? "text-primary" : "text-muted-foreground"} hover:bg-secondary`}>
                <GIcon className="size-4 shrink-0" />
                <span className="flex-1">{L ? g.hi : g.en}</span>
                <span className="rounded-full bg-secondary px-1.5 text-[10px] font-medium normal-case">{items.length}</span>
                <ChevronDown className={`size-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen ? (
                <ul className="mb-2 mt-0.5 space-y-0.5 border-l border-border pl-2 ml-4">
                  {items.map((n) => {
                    const Icon = n.icon;
                    const cls = "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-secondary";
                    return (
                      <li key={n.to}>
                        {n.to.startsWith("http") ? (
                          <a href={n.to} target="_blank" rel="noreferrer" className={cls}><Icon className="size-4 shrink-0 text-muted-foreground" /><span className="flex-1">{(L ? n.hi : n.en).replace(" ↗", "")}</span><ExternalLink className="size-3.5 text-muted-foreground" /></a>
                        ) : (
                          <Link to={n.to} activeOptions={{ exact: n.to === "/admin" }} activeProps={{ className: "bg-primary/10 font-medium text-primary" }} className={cls}>
                            <Icon className="size-4 shrink-0 opacity-70" /><span className="flex-1">{L ? n.hi : n.en}</span>
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
        {groups.every((g) => !g.items.some(match)) ? <p className="px-2 py-6 text-center text-sm text-muted-foreground">{L ? "कुछ नहीं मिला" : "Nothing found"}</p> : null}
      </nav>
    </div>
  );
}
