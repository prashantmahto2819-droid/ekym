// Read-only views: point-wise text and the owner's grouped details.
import { EXTRA_GROUPS, points, type ExtraField } from "./extraFields";

/** Free text shown as a bullet list when written point-wise, otherwise as a paragraph. */
export function Points({ text, className = "" }: { text: string | null | undefined; className?: string }) {
  if (!text) return null;
  const pts = points(text);
  if (!pts) return <p className={`whitespace-pre-wrap ${className}`}>{text}</p>;
  return <ul className={`list-disc space-y-0.5 pl-5 ${className}`}>{pts.map((p, i) => <li key={i}>{p}</li>)}</ul>;
}

/** Owner's point-wise details grouped under headings. */
export function ExtraList({ rows, L }: { rows: ExtraField[]; L: boolean }) {
  if (!rows.length) return null;
  return (
    <div className="mt-2 space-y-2">
      {EXTRA_GROUPS.map((g) => {
        const r = rows.filter((x) => x.g === g.id);
        if (!r.length) return null;
        return (
          <div key={g.id}>
            <p className="text-xs font-semibold text-primary">{g.icon} {L ? g.hi : g.en}</p>
            <dl className="mt-0.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">{r.map((x, i) => <div key={i} className="contents"><dt className="text-muted-foreground">{x.k}</dt><dd>{x.v}</dd></div>)}</dl>
          </div>
        );
      })}
    </div>
  );
}
