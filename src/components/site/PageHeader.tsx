import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { useFt } from "@/core/formText";

type Crumb = { label: string; to?: string };

/**
 * Page banner: deep teal with a soft jaali pattern and warm glow, breadcrumb, title, description,
 * optional small stat chips and action buttons. Ends in a gentle curve into the page.
 */
export function PageHeader({
  title,
  description,
  crumbs = [],
  icon,
  stats,
  actions,
}: {
  title: string;
  description?: string | null | undefined;
  crumbs?: Crumb[] | undefined;
  icon?: ReactNode;
  stats?: { label: string; value: string | number }[] | undefined;
  actions?: ReactNode;
}) {
  const t = useFt();
  return (
    <header className="page-hero relative isolate overflow-hidden text-primary-foreground">
      <div aria-hidden className="page-hero-pattern absolute inset-0 -z-10" />
      <div aria-hidden className="absolute -right-24 -top-24 -z-10 size-80 rounded-full bg-accent/30 blur-3xl" />
      <div aria-hidden className="absolute -bottom-32 left-1/4 -z-10 size-72 rounded-full bg-primary/40 blur-3xl" />
      <div className="container-page pb-14 pt-8 md:pb-20 md:pt-12">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-white/75">
          <Link to="/" className="hover:text-white hover:underline">
            {t("Home")}
          </Link>
          {crumbs.map((c) => (
            <span key={c.label} className="flex items-center gap-1">
              <ChevronRight className="size-3" />
              {c.to ? (
                <Link to={c.to} className="hover:text-white hover:underline">
                  {t(c.label)}
                </Link>
              ) : (
                <span className="text-white/90">{t(c.label)}</span>
              )}
            </span>
          ))}
        </nav>
        <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-end md:gap-8">
          <div className="min-w-0 max-w-3xl flex-1">
            <div className="flex items-center gap-3">
              {icon ? <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/12 ring-1 ring-white/25 backdrop-blur [&>svg]:size-6">{icon}</span> : null}
              <h1 className="text-balance text-3xl font-semibold leading-tight md:text-5xl">{t(title)}</h1>
            </div>
            {description ? <p className="mt-3 max-w-2xl text-pretty text-base text-white/85 md:text-lg">{t(description)}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
        {stats?.length ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {stats.map((s) => (
              <span key={s.label} className="rounded-full bg-white/12 px-3 py-1.5 text-sm ring-1 ring-white/20 backdrop-blur">
                <b className="font-semibold">{s.value}</b> <span className="text-white/80">{t(s.label)}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <svg aria-hidden viewBox="0 0 1440 48" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-6 w-full text-background md:h-10">
        <path d="M0 48h1440V22C1180 46 960 0 720 6S260 46 0 18z" fill="currentColor" />
      </svg>
    </header>
  );
}
