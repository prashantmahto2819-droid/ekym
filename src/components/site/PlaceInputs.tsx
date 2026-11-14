// Uncontrolled state / district inputs for plain <form> + FormData pages (admin CRUD dialogs, settings):
// the state is a dropdown of every state / UT (Hindi + English), the district a type-ahead filtered by the state
// chosen in the same form; picking a district of another state fills the state. Values are the official English names.
import { useState } from "react";

import { DistrictInput } from "@/components/site/DistrictInput";
import { canonState, STATE_OPTIONS } from "@/lib/places";

const selectCls = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function StateSelect({ name = "state", initial, hi, required }: { name?: string; initial: string | null | undefined; hi: boolean; required?: boolean | undefined }) {
  const v = String(initial ?? "");
  return (
    <select name={name} defaultValue={canonState(v) || v} required={required} className={selectCls}>
      <option value="">{hi ? "— राज्य चुनें —" : "— choose state —"}</option>
      {v && !canonState(v) ? <option value={v}>{v}</option> : null}
      {STATE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{hi ? `${o.hi} · ${o.value}` : o.value}</option>)}
    </select>
  );
}

export function DistrictField({ name = "district", stateName = "state", initial, hi }: {
  name?: string; stateName?: string; initial: string | null | undefined; hi: boolean; required?: boolean | undefined;
}) {
  const [v, setV] = useState(String(initial ?? ""));
  const [st, setSt] = useState<string | null>(null);
  const [form, setForm] = useState<HTMLFormElement | null>(null);
  const stateSel = () => (form?.elements.namedItem(stateName) as HTMLSelectElement | null) ?? null;
  const ref = (el: HTMLInputElement | null) => {
    const f = el?.form ?? null;
    if (!f || f === form) return;
    setForm(f);
    const sel = f.elements.namedItem(stateName) as HTMLSelectElement | null;
    if (sel) { setSt(canonState(sel.value) || null); sel.addEventListener("change", () => setSt(canonState(sel.value) || null)); }
  };
  return (
    <>
      <input ref={ref} type="hidden" name={name} value={v} />
      <DistrictInput value={v} state={st} hi={hi} onChange={setV}
        onPick={(_d, s) => { const sel = stateSel(); if (sel && !sel.value) { sel.value = s; setSt(s); } }} />
    </>
  );
}
