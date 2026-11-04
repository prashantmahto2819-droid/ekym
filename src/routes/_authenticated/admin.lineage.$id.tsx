import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { FamilyChart, familyPalette } from "@/components/family/FamilyChart";
import { useLang } from "@/core/i18n";
import { useFamilyCtx } from "@/family/hooks";
import type { Person } from "@/family/layout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/lineage/$id")({ component: LineagePage });

/** Combined chart of all linked, approved families (lineage_tree RPC; no phones). */
function LineagePage() {
  const { id } = Route.useParams();
  const { lang } = useLang();
  const L = lang === "hi";
  const ctx = useFamilyCtx();
  const [sel, setSel] = useState<Person | null>(null);
  const q = useQuery({
    queryKey: ["lineage_tree", id],
    enabled: ctx.data?.approved === true,
    queryFn: async () => { const { data, error } = await supabase.rpc("lineage_tree", { p_family: id }); if (error) throw error; return (data ?? []) as unknown as Person[]; },
  });
  const people = q.data ?? [];
  const fams = useMemo(() => [...new Map(people.map((p) => [p.family_id!, p.family_name!])).entries()], [people]);
  const colors = useMemo(() => familyPalette(people.map((p) => p.family_id!)), [people]);

  if (q.error) return <p className="text-sm text-destructive">{(q.error as Error).message}</p>;
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground"><Link to="/admin/families/$id" params={{ id }} className="hover:underline">← {L ? "परिवार का पेज" : "Family page"}</Link></p>
        <h1 className="font-display text-2xl font-semibold">{L ? "पूरा वंश वृक्ष" : "Full lineage"}</h1>
        <p className="text-sm text-muted-foreground">{fams.length} {L ? "परिवार जुड़े हैं" : "families linked"} · {people.length} {L ? "सदस्य" : "members"}</p>
        <div className="mt-1 flex flex-wrap gap-2 text-xs">
          {fams.map(([fid, name]) => <Link key={fid} to="/admin/families/$id" params={{ id: fid }} className="rounded-full px-2 py-0.5 text-white" style={{ background: colors[fid] }}>{name}</Link>)}
        </div>
      </div>
      <FamilyChart people={people} selectedId={sel?.id ?? null} onSelect={setSel} familyColors={colors} lang={lang} height={640} />
      {sel ? <p className="text-sm"><b>{sel.name}</b> · {sel.family_name} · {sel.relation}{sel.village_name ? ` · ${sel.village_name}` : ""}{sel.native_place ? ` · ${L ? "मूल" : "from"}: ${sel.native_place}` : ""}</p> : null}
    </div>
  );
}
