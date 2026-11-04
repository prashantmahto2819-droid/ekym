import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronDown, HeartHandshake, Menu, Phone, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { useLang, type TKey } from "@/core/i18n";
import { useTenant } from "@/core/tenant-context";
import { telHref } from "@/lib/format";
import { organizationQuery } from "@/lib/queries";

const primaryNav: { key: TKey; to: string }[] = [
  { key: "about", to: "/about" },
  { key: "seva", to: "/seva" },
  { key: "blood", to: "/blood" },
  { key: "library", to: "/library" },
  { key: "volunteer", to: "/volunteer" },
];

const moreNav: { key: TKey; to: string }[] = [
  { key: "blogs", to: "/blogs" },
  { key: "news", to: "/news" },
  { key: "campaigns", to: "/campaigns" },
  { key: "gallery", to: "/gallery" },
  { key: "videos", to: "/videos" },
  { key: "reels", to: "/reels" },
  { key: "internship", to: "/internship" },
  { key: "contact", to: "/contact" },
];

export function Header() {
  const { data: org } = useSuspenseQuery(organizationQuery());
  const { user, isStaff } = useAuth();
  const { t, lang, setLang, loc } = useLang();
  const tenant = useTenant();
  const orgName = loc(org, "organization_name") || (lang === "hi" && tenant.name_hi) || tenant.name;
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/95 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-4">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          {org?.logo ? (
            <img src={org.logo} alt="" className="size-9 rounded-md object-cover" width={36} height={36} />
          ) : (
            <span className="gradient-teal flex size-9 shrink-0 items-center justify-center rounded-md text-primary-foreground">
              <HeartHandshake className="size-5" />
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate font-display text-sm font-semibold leading-tight sm:text-base">
              {orgName}
            </span>
            {loc(org, "tagline") ? (
              <span className="hidden truncate text-xs text-muted-foreground sm:block">{loc(org, "tagline")}</span>
            ) : null}
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {primaryNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {t(item.key)}
            </Link>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 text-sm font-medium">
                {lang === "hi" ? "और" : "More"} <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {moreNav.map((item) => (
                <DropdownMenuItem key={item.to} asChild>
                  <Link to={item.to}>{t(item.key)}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          {org?.phone ? (
            <a
              href={telHref(org.phone)}
              className="hidden items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground xl:flex"
            >
              <Phone className="size-4" />
              {org.phone}
            </a>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="font-semibold"
            onClick={() => setLang(lang === "hi" ? "en" : "hi")}
            aria-label={lang === "hi" ? "Switch to English" : "हिंदी में देखें"}
          >
            {t("switch_lang")}
          </Button>
          <Button asChild variant="default" size="sm" className="hidden sm:inline-flex">
            <Link to="/donate">{t("donate")}</Link>
          </Button>
          {user ? (
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link to={isStaff ? "/admin" : "/account"}>
                <ShieldCheck className="size-4" />
                {isStaff ? t("admin_panel") : t("my_account")}
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-sm overflow-y-auto">
              <SheetTitle className="px-4 pt-4 font-display">
                {orgName}
              </SheetTitle>
              <nav className="flex flex-col gap-1 p-4">
                <Link to="/" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm hover:bg-secondary">
                  {t("home")}
                </Link>
                {[...primaryNav, ...moreNav].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-2 text-sm hover:bg-secondary"
                    activeProps={{ className: "bg-secondary font-medium" }}
                  >
                    {t(item.key)}
                  </Link>
                ))}
                <Button asChild className="mt-3">
                  <Link to="/donate" onClick={() => setOpen(false)}>
                    {t("donate")}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="mt-2">
                  <Link to={user ? (isStaff ? "/admin" : "/account") : "/auth"} onClick={() => setOpen(false)}>
                    {user ? (isStaff ? t("admin_panel") : t("my_account")) : "Sign in"}
                  </Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
