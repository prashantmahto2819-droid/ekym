import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { FamilyChart } from "@/components/family/FamilyChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLang } from "@/core/i18n";
import { useFamilyCtx } from "@/family/hooks";
import { ancestorsOf, buildUnits, type Person, type Unit } from "@/family/layout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/families/$id")({ component: FamilyPage });

type Family = { id: string; family_name: string; status: string; main_whatsapp: string | null; village_id: string | null; owner_id: string; villages: { name: string } | null; admin_note: string | null };
type LinkInfo = { link_id: string; direction: string; status: string; other_family_id: string; other_family_name: string; member_id: string; member_name: string; note: string | null };

/** Members of a family: own/managed families read the table (phones included), others go through family_tree() (no phones). */
export function useFamilyMembers(id: string, canRead: boolean) {
  return useQuery({
    queryKey: ["family_members", id],
    enabled: canRead,
    queryFn: async (): Promise<{ people: Person[]; withPhones: boolean }> => {
      const { data: rows } = await supabase.from("members").select("*").eq("family_id", id).limit(2000);
      if (rows && rows.length) {
        const { data: v } = await supabase.from("villages").select("id,name");
        const vn = new Map((v ?? []).map((x) => [x.id, x.name] as const));
        return { withPhones: true, people: (rows as unknown as (Person & { village_id: string | null })[]).map((m) => ({ ...m, village_name: m.village_id ? vn.get(m.village_id) ?? null : null })) };
      }
      const { data, error } = await supabase.rpc("family_tree", { p_family: id });
      if (error) throw error;
      return { withPhones: false, people: (data ?? []) as unknown as Person[] };
    },
  });
}

function FamilyPage() {
  const { id } = Route.useParams();
  const { lang } = useLang();
  const L = lang === "hi";
  const ctx = useFamilyCtx();
  const [sel, setSel] = useState<Person | null>(null);
  const [mode, setMode] = useState<"chart" | "list">("chart");

  const fam = useQuery({
    queryKey: ["family", id],
    enabled: ctx.data?.approved === true,
    queryFn: async () => {
      const { data } = await supabase.from("families").select("id,family_name,status,main_whatsapp,village_id,owner_id,admin_note,villages(name)").eq("id", id).maybeSingle();
      if (data) return data as unknown as Family;
      const { data: d } = await supabase.rpc("directory_families", { p_village: null as never });
      const hit = ((d ?? []) as { id: string; family_name: string; village_name: string | null }[]).find((x) => x.id === id);
      if (!hit) throw new Error(L ? "परिवार नहीं मिला" : "Family not found");
      return { id, family_name: hit.family_name, status: "approved", main_whatsapp: null, village_id: null, owner_id: "", villages: hit.village_name ? { name: hit.village_name } : null, admin_note: null } as Family;
    },
  });
  const members = useFamilyMembers(id, ctx.data?.approved === true);
  const links = useQuery({
    queryKey: ["family_links", id],
    enabled: fam.data?.status === "approved",
    queryFn: async () => { const { data } = await supabase.rpc("family_link_info", { p_family: id }); return (data ?? []) as unknown as LinkInfo[]; },
  });

  const people = useMemo(() => (members.data?.people ?? []).map((p) => ({ ...p, village_name: p.village_name ?? fam.data?.villages?.name ?? null })), [members.data, fam.data]);
  const head = people.find((p) => p.is_head);
  const stats = useMemo(() => ({ total: people.length, living: people.filter((p) => !p.is_deceased).length, deceased: people.filter((p) => p.is_deceased).length, gens: buildUnits(people).length ? maxDepth(buildUnits(people)) + 1 : 0 }), [people]);
  const hasLinks = (links.data ?? []).some((l) => l.status === "approved");

  if (ctx.data && !ctx.data.approved) return <p className="text-sm text-muted-foreground">{L ? "अनुमति नहीं" : "Not allowed"}</p>;
  if (fam.error) return <p className="text-sm text-destructive">{(fam.error as Error).message}</p>;
  if (!fam.data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const f = fam.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground"><Link to="/admin/families" className="hover:underline">{L ? "वंश वृक्ष" : "Family trees"}</Link> · {f.villages?.name ?? "—"}</p>
          <h1 className="font-display text-2xl font-semibold">{f.family_name} <Badge variant={f.status === "approved" ? "default" : "secondary"} className="ml-2 align-middle">{f.status}</Badge></h1>
          <p className="text-sm text-muted-foreground">
            {head ? `${L ? "मुखिया" : "Head"}: ${head.name}` : (L ? "मुखिया दर्ज नहीं" : "No head")}{f.main_whatsapp ? ` · ${f.main_whatsapp}` : ""} · {stats.total} {L ? "सदस्य" : "members"} ({stats.living} {L ? "जीवित" : "living"}, {stats.deceased} {L ? "दिवंगत" : "late"}) · {stats.gens} {L ? "पीढ़ियाँ" : "generations"}
          </p>
          {f.admin_note ? <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-900">{f.admin_note}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-md border border-border p-0.5 text-xs">
            <button type="button" className={`rounded px-2 py-1 ${mode === "chart" ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setMode("chart")}>{L ? "चार्ट" : "Chart"}</button>
            <button type="button" className={`rounded px-2 py-1 ${mode === "list" ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setMode("list")}>{L ? "सूची" : "List"}</button>
          </div>
          {hasLinks ? <Button asChild size="sm" variant="outline"><Link to="/admin/lineage/$id" params={{ id }}>{L ? "पूरा वंश (जुड़े परिवार)" : "Full lineage (linked families)"}</Link></Button> : null}
          <Button asChild size="sm" variant="ghost"><a href={`https://shokpatra.vividbrandify.com/app.html#/family/${id}`} target="_blank" rel="noreferrer">{L ? "शोकपत्र में संपादित करें ↗" : "Edit in shokpatra ↗"}</a></Button>
        </div>
      </div>

      {mode === "chart" ? (
        <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
          <FamilyChart people={people} selectedId={sel?.id ?? null} onSelect={setSel} lang={lang} height={600} />
          <PersonPanel p={sel} people={people} L={L} onPick={setSel} withPhones={members.data?.withPhones ?? false} />
        </div>
      ) : (
        <ListView people={people} L={L} />
      )}

      {(links.data ?? []).length ? (
        <section className="text-sm">
          <h2 className="font-display font-semibold">{L ? "वंश की कड़ियाँ" : "Lineage links"}</h2>
          <ul className="mt-1 space-y-1 text-muted-foreground">
            {links.data!.map((l) => (
              <li key={l.link_id}>
                {l.direction === "up" ? (L ? "ऊपर: " : "Above: ") : (L ? "नीचे: " : "Below: ")}
                <Link to="/admin/families/$id" params={{ id: l.other_family_id }} className="text-foreground hover:underline">{l.other_family_name}</Link>
                {" · "}{l.member_name} <Badge variant={l.status === "approved" ? "default" : "secondary"} className="ml-1">{l.status}</Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function maxDepth(units: Unit[]): number { return Math.max(0, ...units.map((u) => Math.max(u.depth, maxDepth(u.children)))); }

function PersonPanel({ p, people, L, onPick, withPhones }: { p: Person | null; people: Person[]; L: boolean; onPick: (p: Person) => void; withPhones: boolean }) {
  if (!p) return <aside className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">{L ? "किसी सदस्य पर क्लिक करें: उसकी पूरी वंशावली ऊपर-नीचे हाइलाइट होगी।" : "Click a person: their ancestors and descendants are highlighted."}</aside>;
  const byId = new Map(people.map((x) => [x.id, x]));
  const father = p.parent_id ? byId.get(p.parent_id) : null;
  const kids = people.filter((x) => x.parent_id === p.id && x.member_kind !== "spouse");
  const spouse = people.find((x) => x.parent_id === p.id && x.member_kind === "spouse");
  const chain = ancestorsOf(people, p.id).map((id) => byId.get(id)!).filter(Boolean);
  const row = (label: string, v: React.ReactNode) => v ? <div><dt className="text-xs text-muted-foreground">{label}</dt><dd>{v}</dd></div> : null;
  return (
    <aside className="space-y-3 rounded-lg border border-border bg-background p-4 text-sm">
      <div>
        <p className="font-display text-lg font-semibold">{p.is_deceased ? "स्व. " : ""}{p.name}</p>
        <p className="text-xs text-muted-foreground">{[p.relation, p.member_kind === "spouse" ? (L ? "पत्नी" : "wife") : p.member_kind === "daughter" ? (L ? "पुत्री" : "daughter") : null, p.is_head ? (L ? "मुखिया" : "head") : null].filter(Boolean).join(" · ")}</p>
      </div>
      <dl className="space-y-2">
        {row(L ? "पिता" : "Father", father ? <button type="button" className="hover:underline" onClick={() => onPick(father)}>{father.name}</button> : null)}
        {row(L ? "पत्नी" : "Wife", spouse ? spouse.name : null)}
        {row(L ? "निवास" : "Residence", p.village_name)}
        {row(L ? "मूल ग्राम" : "Native place", p.native_place)}
        {withPhones && p.phone ? row(L ? "मोबाइल" : "Mobile", p.phone) : null}
        {row(L ? "संतान" : "Children", kids.length ? <ul className="space-y-0.5">{kids.map((k) => <li key={k.id}><button type="button" className="hover:underline" onClick={() => onPick(k)}>{k.is_deceased ? "स्व. " : ""}{k.name}</button>{k.member_kind === "daughter" ? <span className="ml-1 text-xs text-muted-foreground">({L ? "पुत्री" : "daughter"})</span> : null}</li>)}</ul> : null)}
        {row(L ? "वंशावली" : "Line", chain.length ? <p className="text-xs">{[...chain].reverse().map((a) => a.name).join(" → ")} → <b>{p.name}</b></p> : null)}
      </dl>
    </aside>
  );
}

function ListView({ people, L }: { people: Person[]; L: boolean }) {
  const units = buildUnits(people);
  const rows: { p: Person; depth: number; spouse?: Person }[] = [];
  const walk = (u: Unit) => { rows.push({ p: u.person, depth: u.depth, ...(u.spouses[0] ? { spouse: u.spouses[0] } : {}) }); u.children.forEach(walk); };
  units.forEach(walk);
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground"><tr><th className="p-2">{L ? "नाम" : "Name"}</th><th className="p-2">{L ? "पत्नी" : "Wife"}</th><th className="p-2">{L ? "निवास" : "Residence"}</th><th className="p-2">{L ? "मूल" : "Native"}</th><th className="p-2">{L ? "मोबाइल" : "Mobile"}</th></tr></thead>
        <tbody>
          {rows.map(({ p, depth, spouse }) => (
            <tr key={p.id} className="border-t border-border">
              <td className="p-2" style={{ paddingLeft: 8 + depth * 18 }}>{depth ? <span className="text-muted-foreground">└ </span> : null}{p.is_deceased ? "स्व. " : ""}<b>{p.name}</b>{p.is_head ? <Badge variant="secondary" className="ml-2">{L ? "मुखिया" : "head"}</Badge> : null}{p.member_kind === "daughter" ? <span className="ml-1 text-xs text-muted-foreground">({L ? "पुत्री" : "daughter"})</span> : null}</td>
              <td className="p-2">{spouse?.name ?? ""}</td>
              <td className="p-2">{p.village_name ?? ""}</td>
              <td className="p-2">{p.native_place ?? ""}</td>
              <td className="p-2">{p.phone ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
