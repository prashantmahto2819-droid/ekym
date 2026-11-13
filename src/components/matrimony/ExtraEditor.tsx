// Point-wise detail editor for the matrimony form: grouped rows (label + value), quick-add suggestions, reorder, delete.
import { ArrowDown, ArrowUp, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { EXTRA_GROUPS, type ExtraField, type ExtraGroup } from "./extraFields";

export function ExtraEditor({ rows, onChange, L }: { rows: ExtraField[]; onChange: (r: ExtraField[]) => void; L: boolean }) {
  const add = (g: ExtraGroup, k = "") => { if (rows.length >= 40) return; onChange([...rows, { g, k, v: "" }]); };
  const upd = (i: number, p: Partial<ExtraField>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const del = (i: number) => onChange(rows.filter((_, j) => j !== i));
  const move = (i: number, d: -1 | 1) => {
    const g = rows[i]!.g; let j = i + d;
    while (j >= 0 && j < rows.length && rows[j]!.g !== g) j += d;
    if (j < 0 || j >= rows.length) return;
    const n = [...rows]; [n[i], n[j]] = [n[j]!, n[i]!]; onChange(n);
  };
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{L ? "अपनी जानकारी बिंदुवार जोड़ें — बाएँ शीर्षक (जैसे \"पिता का नाम\"), दाएँ जानकारी। ये बायोडाटा कार्ड और प्रोफ़ाइल पर इसी क्रम में दिखेंगी।" : "Add your details point by point — a label on the left (e.g. \"Father's name\") and the detail on the right. They show on the card and profile in this order."}</p>
      {EXTRA_GROUPS.map((g) => {
        const idx = rows.map((r, i) => [r, i] as const).filter(([r]) => r.g === g.id);
        const used = new Set(idx.map(([r]) => r.k));
        return (
          <div key={g.id} className="rounded-lg border border-border p-3">
            <p className="text-sm font-semibold">{g.icon} {L ? g.hi : g.en}</p>
            {idx.length ? (
              <ul className="mt-2 space-y-2">
                {idx.map(([r, i]) => (
                  <li key={i} className="grid grid-cols-[1fr_auto] gap-1 sm:grid-cols-[minmax(0,11rem)_1fr_auto]">
                    <Input value={r.k} maxLength={60} onChange={(e) => upd(i, { k: e.target.value })} placeholder={L ? "शीर्षक" : "Label"} list={`mx-${g.id}`} className="h-9" />
                    <Input value={r.v} maxLength={300} onChange={(e) => upd(i, { v: e.target.value })} placeholder={L ? "जानकारी" : "Detail"} className="order-3 col-span-2 h-9 sm:order-none sm:col-span-1" />
                    <span className="flex">
                      <Button type="button" size="icon" variant="ghost" className="size-9" onClick={() => move(i, -1)} aria-label={L ? "ऊपर" : "Up"}><ArrowUp className="size-4" /></Button>
                      <Button type="button" size="icon" variant="ghost" className="size-9" onClick={() => move(i, 1)} aria-label={L ? "नीचे" : "Down"}><ArrowDown className="size-4" /></Button>
                      <Button type="button" size="icon" variant="ghost" className="size-9" onClick={() => del(i)} aria-label={L ? "हटाएँ" : "Remove"}><X className="size-4" /></Button>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            <datalist id={`mx-${g.id}`}>{g.suggest.map(([hi, en]) => <option key={hi} value={L ? hi : en} />)}</datalist>
            <div className="mt-2 flex flex-wrap gap-1">
              {g.suggest.filter(([hi, en]) => !used.has(hi) && !used.has(en)).slice(0, 8).map(([hi, en]) => (
                <button key={hi} type="button" onClick={() => add(g.id, L ? hi : en)} className="rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary">+ {L ? hi : en}</button>
              ))}
              <button type="button" onClick={() => add(g.id)} className="rounded-full border border-primary/40 px-2 py-0.5 text-xs text-primary">+ {L ? "अपनी पंक्ति" : "Own row"}</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
