// District box with type-ahead: shows the districts of the chosen state (or of all India, with the state name) as you
// type, in Hindi or English, and still accepts any name that is not in the list. Picked names are saved in English.
import { useEffect, useMemo, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { PLACE_HI } from "@/core/formText";
import { ALL_DISTRICTS, DISTRICT_HI, DISTRICTS } from "@/lib/districts";
import { canonDistrict } from "@/lib/places";

const hiName = (n: string) => PLACE_HI[n] ?? DISTRICT_HI[n] ?? n;
const norm = (s: string) => s.toLowerCase().normalize("NFC").replace(/[\s.\-()]+/g, "");

type Item = { d: string; s: string; label: string; stateLabel: string; key: string };

export function DistrictInput({ value, onChange, onPick, state, hi, placeholder, id, className, invalid }: {
  value: string; onChange: (v: string) => void; onPick?: ((district: string, state: string) => void) | undefined;
  state?: string | null | undefined; hi: boolean; placeholder?: string | undefined; id?: string | undefined; className?: string | undefined; invalid?: boolean | undefined;
}) {
  const items = useMemo<Item[]>(() => {
    const src = state && DISTRICTS[state] ? DISTRICTS[state].map((d) => ({ d, s: state })) : ALL_DISTRICTS;
    return src.map(({ d, s }) => {
      const label = hi ? hiName(d) : d, stateLabel = hi ? hiName(s) : s;
      return { d, s, label, stateLabel, key: `${norm(d)} ${norm(hiName(d))} ${norm(s)} ${norm(hiName(s))}` };
    });
  }, [state, hi]);
  const known = (v: string) => items.find((x) => x.d === v);
  const [text, setText] = useState(() => known(value)?.label ?? value);
  const [open, setOpen] = useState(false);
  const [act, setAct] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  // follow outside changes (form reset, language switch)
  useEffect(() => { const k = known(value); setText(k ? k.label : value); }, [value, hi]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close);
  }, []);

  const q = norm(text);
  const list = (q ? items.filter((x) => x.key.includes(q)).sort((a, b) => Number(!a.key.startsWith(q)) - Number(!b.key.startsWith(q))) : items).slice(0, 8);
  const pick = (x: Item) => { setText(x.label); onChange(x.d); onPick?.(x.d, x.s); setOpen(false); };

  return (
    <div ref={box} className="relative">
      <Input
        id={id} value={text} autoComplete="off" role="combobox" aria-expanded={open} aria-autocomplete="list" aria-invalid={invalid || undefined}
        placeholder={placeholder ?? (hi ? "ज़िले का नाम लिखें…" : "Type the district…")} className={className}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // typed in Hindi / other case / old name → the official English name (and its state)
          const c = canonDistrict(text, state);
          if (c.known && c.district !== value) { onChange(c.district); onPick?.(c.district, c.state); setText(hi ? hiName(c.district) : c.district); }
        }}
        onChange={(e) => { setText(e.target.value); onChange(e.target.value); setOpen(true); setAct(0); }}
        onKeyDown={(e) => {
          if (!open || !list.length) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setAct((a) => Math.min(list.length - 1, a + 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setAct((a) => Math.max(0, a - 1)); }
          else if (e.key === "Enter") { e.preventDefault(); const x = list[act]; if (x) pick(x); }
          else if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && list.length && !(list.length === 1 && list[0]!.label === text) ? (
        <ul role="listbox" className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover py-1 text-sm shadow-lg">
          {list.map((x, i) => (
            <li key={`${x.s}-${x.d}`} role="option" aria-selected={i === act}
              onMouseDown={(e) => { e.preventDefault(); pick(x); }} onMouseEnter={() => setAct(i)}
              className={`flex cursor-pointer items-baseline justify-between gap-2 px-3 py-1.5 ${i === act ? "bg-secondary" : ""}`}>
              <span>{x.label}</span>
              {state ? null : <span className="truncate text-xs text-muted-foreground">{x.stateLabel}</span>}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
