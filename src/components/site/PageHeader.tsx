import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { useFt } from "@/core/formText";

type Crumb = { label: string; to?: string };

export function PageHeader({
  title,
  description,
  crumbs = [],
}: {
  title: string;
  description?: string | null | undefined;
  crumbs?: Crumb[] | undefined;
}) {
  const t = useFt();
  return (
    <header className="gradient-teal text-primary-foreground">
      <div className="container-page py-10 md:py-14">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs opacity-80">
          <Link to="/" className="hover:underline">
            {t("Home")}
          </Link>
          {crumbs.map((c) => (
            <span key={c.label} className="flex items-center gap-1">
              <ChevronRight className="size-3" />
              {c.to ? (
                <Link to={c.to} className="hover:underline">
                  {t(c.label)}
                </Link>
              ) : (
                <span>{t(c.label)}</span>
              )}
            </span>
          ))}
        </nav>
        <h1 className="mt-3 text-3xl font-semibold md:text-4xl">{t(title)}</h1>
        {description ? <p className="mt-3 max-w-2xl opacity-90">{t(description)}</p> : null}
      </div>
    </header>
  );
}
