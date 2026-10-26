import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  eyebrow?: string | undefined;
  title: string;
  subtitle?: string | null | undefined;
  action?: { label: string; to: string } | undefined;
  center?: boolean | undefined;
  children?: ReactNode | undefined;
};

export function SectionHeading({ eyebrow, title, subtitle, action, center, children }: Props) {
  return (
    <div
      className={`mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between ${
        center ? "text-center sm:flex-col sm:items-center sm:text-center" : ""
      }`}
    >
      <div className="max-w-2xl">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">{title}</h2>
        {subtitle ? <p className="mt-2 text-muted-foreground">{subtitle}</p> : null}
        {children}
      </div>
      {action ? (
        <Link
          to={action.to}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          {action.label}
          <ArrowRight className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}
