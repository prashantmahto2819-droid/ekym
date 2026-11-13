// Small shared pieces for the public pages: empty state, date badge, search box, filter chips, video thumbnails.
import { Link } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import type { ReactNode } from "react";

import { Input } from "@/components/ui/input";

/** Friendly "nothing here yet" block with an icon and an optional action. */
export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string | undefined; action?: { label: string; to: string } | undefined }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-dashed border-border bg-secondary/30 px-6 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary-deep [&>svg]:size-7">{icon ?? "✦"}</span>
      <p className="mt-4 font-display text-lg font-semibold">{title}</p>
      {text ? <p className="mt-1 text-sm text-muted-foreground">{text}</p> : null}
      {action ? <Link to={action.to} className="mt-5 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90">{action.label}</Link> : null}
    </div>
  );
}

/** Calendar-style date (day number, month, weekday). */
export function DateBadge({ iso, hi, className = "" }: { iso: string; hi: boolean; className?: string }) {
  const d = new Date(iso);
  const loc = hi ? "hi-IN" : "en-IN";
  return (
    <span className={`flex w-14 shrink-0 flex-col items-center overflow-hidden rounded-xl bg-background text-center shadow-sm ring-1 ring-border ${className}`}>
      <span className="w-full bg-accent py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">{d.toLocaleDateString(loc, { month: "short" })}</span>
      <span className="pt-0.5 font-display text-xl font-bold leading-tight">{d.getDate()}</span>
      <span className="pb-1 text-[10px] text-muted-foreground">{d.toLocaleDateString(loc, { weekday: "short" })}</span>
    </span>
  );
}

/** Rounded search field with an icon and a clear button. */
export function SearchBox({ value, onChange, placeholder, className = "" }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  return (
    <label className={`relative block ${className}`}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="h-11 rounded-full bg-background pl-10 pr-9 shadow-sm" />
      {value ? <button type="button" onClick={() => onChange("")} aria-label="clear" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-secondary"><X className="size-4" /></button> : null}
    </label>
  );
}

/** Horizontal, scrollable filter chips. */
export function Chips<T extends string>({ items, value, onChange }: { items: { value: T; label: string; count?: number | undefined }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
      {items.map((it) => (
        <button key={it.value} type="button" onClick={() => onChange(it.value)} aria-pressed={value === it.value}
          className={`shrink-0 rounded-full border px-4 py-1.5 text-sm transition ${value === it.value ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-background hover:border-primary/50 hover:text-primary"}`}>
          {it.label}{it.count != null ? <span className={`ml-1.5 text-xs ${value === it.value ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{it.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

/** YouTube thumbnail for a video URL (null for other platforms). */
export function videoThumb(platform: string | null | undefined, url: string): string | null {
  if ((platform ?? "").toLowerCase() !== "youtube" && !/youtu\.?be/.test(url)) return null;
  const id = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([A-Za-z0-9_-]{6,})/)?.[1];
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

/** Initials avatar used when a listing or person has no photo. */
export function Initial({ name, className = "" }: { name: string; className?: string }) {
  const ch = [...(name || "?").trim()][0] ?? "?";
  return <span className={`grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-deep font-display font-semibold text-primary-foreground ${className}`}>{ch.toUpperCase()}</span>;
}
