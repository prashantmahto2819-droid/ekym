// Office bearers (first committee) shown on the About page; full list on /team.
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { useLang } from "@/core/i18n";
import { getTeam } from "@/lib/public.functions";

export function Committees() {
  const { lang, loc } = useLang();
  const hi = lang === "hi";
  const q = useQuery({ queryKey: ["team"], queryFn: () => getTeam() });
  const d = q.data;
  if (!d?.committees.length) return null;
  const c = d.committees[0]!;
  const people = d.positions.filter((p) => p.committee_id === c.id).slice(0, 8);
  return (
    <div className="mt-10">
      <h2 className="font-display text-xl font-semibold">{hi ? "पदाधिकारी" : "Office bearers"} <span className="text-sm font-normal text-muted-foreground">· {loc(c, "name")}</span></h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {people.map((p) => (
          <div key={p.id} className="surface-card flex items-center gap-3 p-3">
            {p.photo_path ? <img src={p.photo_path} alt="" className="size-12 rounded-full object-cover" /> : <div className="gradient-teal grid size-12 shrink-0 place-items-center rounded-full font-semibold text-primary-foreground">{p.person_name.slice(0, 1)}</div>}
            <div className="min-w-0"><p className="truncate font-semibold">{loc(p, "person_name")}</p><p className="text-sm text-primary">{loc(p, "designation")}</p></div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm"><Link to="/team" className="underline">{hi ? "सभी समितियाँ और पदाधिकारी →" : "All committees & office bearers →"}</Link></p>
    </div>
  );
}
