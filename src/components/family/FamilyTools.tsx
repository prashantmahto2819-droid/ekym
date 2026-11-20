import type { SupabaseClient } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { TreeShareLinks } from "@/components/family/TreeShare";
import { treeSvg } from "@/components/family/treeSvg";
import { Button } from "@/components/ui/button";
import type { Person } from "@/family/layout";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as unknown as SupabaseClient;
const selectClass = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function printTree(people: Person[], title: string, subtitle: string, L: boolean) {
  const { svg, W, H } = treeSvg(people, title, subtitle, L);
  const w = window.open("", "_blank");
  if (!w) { toast.error(L ? "नई खिड़की नहीं खुल सकी — पॉप-अप की अनुमति दीजिए" : "Could not open a new window — please allow pop-ups"); return; }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>@page{size:A4 ${W >= H ? "landscape" : "portrait"};margin:8mm}body{margin:0}svg{width:100%;height:auto;max-height:190mm}</style></head><body>${svg}<script>setTimeout(function(){window.print()},400)</script></body></html>`);
  w.document.close();
}

/** Relation of b to a through the father line of one tree (a wife is counted through her husband). */
function relation(a0: Person, b0: Person, byId: Map<string, Person>, L: boolean): string {
  const late = (p: Person) => (p.is_deceased ? (L ? "स्व. " : "Late ") : "") + p.name;
  const via = (p: Person) => (p.member_kind === "spouse" && p.parent_id ? byId.get(p.parent_id) ?? p : p);
  const up = (p: Person) => { const out = [p]; const seen = new Set([p.id]); let c = p; while (c.parent_id && byId.has(c.parent_id) && !seen.has(c.parent_id)) { c = byId.get(c.parent_id)!; seen.add(c.id); out.push(c); } return out; };
  const a = via(a0), b = via(b0);
  if (a.id === b.id) return a0.id === b0.id ? (L ? "एक ही व्यक्ति चुना गया।" : "The same person was chosen.") : (L ? `${late(a0)} और ${late(b0)} पति-पत्नी हैं।` : `${late(a0)} and ${late(b0)} are husband and wife.`);
  const ua = up(a), ub = up(b);
  const ib = new Map(ub.map((p, i) => [p.id, i] as const));
  const da = ua.findIndex((p) => ib.has(p.id));
  if (da < 0) return L ? "इस वंश वृक्ष में इन दोनों के बीच कोई साझा पूर्वज दर्ज नहीं है।" : "No common ancestor is recorded for these two in this tree.";
  const lca = ua[da]!;
  const db = ib.get(lca.id) ?? 0;
  const girl = b.member_kind === "daughter";
  const pair = (): [string, string] => {
    if (da === 0) return db === 1 ? [girl ? "पुत्री" : "पुत्र", girl ? "daughter" : "son"] : db === 2 ? [girl ? "पौत्री" : "पौत्र", girl ? "granddaughter" : "grandson"] : [`${db} पीढ़ी नीचे के वंशज`, `descendant, ${db} generations down`];
    if (db === 0) return da === 1 ? ["पिता", "father"] : da === 2 ? ["दादा", "grandfather"] : da === 3 ? ["परदादा", "great-grandfather"] : [`${da} पीढ़ी ऊपर के पूर्वज`, `ancestor, ${da} generations up`];
    if (da === 1 && db === 1) return [girl ? "बहन" : "भाई", girl ? "sister" : "brother"];
    if (da === 2 && db === 1) return [girl ? "बुआ" : "चाचा / ताऊ", girl ? "father's sister" : "father's brother"];
    if (da === 1 && db === 2) return [girl ? "भतीजी" : "भतीजा", girl ? "brother's daughter" : "brother's son"];
    if (da === 2 && db === 2) return [girl ? "चचेरी बहन" : "चचेरे भाई", "first cousin"];
    return ["कुटुंबी (एक ही वंश के)", "relative of the same lineage"];
  };
  const [hi, en] = pair();
  const chain = [...ua.slice(0, da + 1).map(late), ...ub.slice(0, db).reverse().map(late)].join(" → ");
  return L
    ? `${late(b)}, ${late(a)} के ${hi} हैं।${da > 0 && db > 0 ? ` साझा पूर्वज: ${late(lca)}।` : ""} कड़ी: ${chain}`
    : `${late(b)} is the ${en} of ${late(a)}.${da > 0 && db > 0 ? ` Common ancestor: ${late(lca)}.` : ""} Chain: ${chain}`;
}

type Fam = { id: string; family_name: string; head_name: string | null; village_name: string | null };
type Marriage = { daughter_id: string };

/** Tools shared by every organization's family page: print the tree, find a relation, link a daughter's marriage (admins). */
export function FamilyTools({ familyId, familyName, subtitle, people, L, isAdmin }: { familyId: string; familyName: string; subtitle: string; people: Person[]; L: boolean; isAdmin: boolean }) {
  const qc = useQueryClient();
  const byId = useMemo(() => new Map(people.map((p) => [p.id, p] as const)), [people]);
  const named = useMemo(() => people.filter((p) => !p.name_unknown), [people]);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [daughter, setDaughter] = useState("");
  const [otherFam, setOtherFam] = useState("");
  const [husband, setHusband] = useState("");
  const [busy, setBusy] = useState(false);
  const label = (p: Person) => (p.is_deceased ? (L ? "स्व. " : "Late ") : "") + p.name;

  const daughters = named.filter((p) => p.member_kind === "daughter");
  const linked = useQuery({
    queryKey: ["family_marriages", familyId],
    queryFn: async () => { const { data } = await sb.rpc("shok_marriage_links", { p_family: familyId }); return (data ?? []) as Marriage[]; },
  });
  const fams = useQuery({
    queryKey: ["directory_families_all"], enabled: isAdmin && !!daughter, staleTime: 300000,
    queryFn: async () => { const { data } = await sb.rpc("directory_families", { p_village: null }); return ((data ?? []) as Fam[]).filter((f) => f.id !== familyId); },
  });
  const men = useQuery({
    queryKey: ["family_tree_men", otherFam], enabled: !!otherFam,
    queryFn: async () => { const { data } = await sb.rpc("family_tree", { p_family: otherFam }); return ((data ?? []) as Person[]).filter((p) => (p.member_kind ?? "son") === "son" && !p.name_unknown); },
  });
  const isLinked = (id: string) => (linked.data ?? []).some((m) => m.daughter_id === id);

  async function link() {
    if (!daughter || !husband) return;
    setBusy(true);
    const { error } = await sb.rpc("shok_marriage_link", { p_daughter: daughter, p_husband: husband });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(L ? "विवाह की कड़ी जुड़ गई" : "Marriage link added");
    setDaughter(""); setOtherFam(""); setHusband("");
    void qc.invalidateQueries({ queryKey: ["family_marriages", familyId] });
  }
  async function unlink(id: string) {
    if (!window.confirm(L ? "विवाह की कड़ी हटाएँ? दोनों वंश वृक्षों में और कुछ नहीं बदलेगा।" : "Remove the marriage link? Nothing else changes in either tree.")) return;
    const { error } = await sb.rpc("shok_marriage_unlink", { p_daughter: id });
    if (error) { toast.error(error.message); return; }
    toast.success(L ? "कड़ी हटा दी" : "Link removed");
    void qc.invalidateQueries({ queryKey: ["family_marriages", familyId] });
  }

  const pa = a ? byId.get(a) : undefined, pb = b ? byId.get(b) : undefined;
  if (people.length < 2) return null;
  return (
    <div className="mt-4 space-y-4 rounded-xl border border-border bg-card p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => printTree(people, `${familyName} — ${L ? "वंश वृक्ष" : "Family tree"}`, subtitle, L)}>🖨 {L ? "वंश वृक्ष छापें / PDF" : "Print tree / PDF"}</Button>
        <span className="text-xs text-muted-foreground">{L ? "पूरा चार्ट एक पन्ने में आता है; इसमें मोबाइल नंबर नहीं छपते।" : "The whole chart fits one page; phone numbers are never printed."}</span>
      </div>

      <div>
        <p className="font-semibold">{L ? "रिश्ता खोजें" : "Find a relation"}</p>
        <div className="mt-1 grid gap-2 sm:grid-cols-2">
          <select className={selectClass} value={a} onChange={(e) => setA(e.target.value)}>
            <option value="">{L ? "— पहला व्यक्ति —" : "— First person —"}</option>
            {named.map((p) => <option key={p.id} value={p.id}>{label(p)}</option>)}
          </select>
          <select className={selectClass} value={b} onChange={(e) => setB(e.target.value)}>
            <option value="">{L ? "— दूसरा व्यक्ति —" : "— Second person —"}</option>
            {named.map((p) => <option key={p.id} value={p.id}>{label(p)}</option>)}
          </select>
        </div>
        {pa && pb ? <p className="mt-2 rounded-md bg-secondary p-2">{relation(pa, pb, byId, L)}</p> : null}
      </div>

      <TreeShareLinks familyId={familyId} L={L} />

      {isAdmin && daughters.length ? (
        <div>
          <p className="font-semibold">💍 {L ? "विवाह की कड़ी (पुत्री का ससुराल)" : "Marriage link (a daughter's married family)"}</p>
          <p className="text-xs text-muted-foreground">{L ? "पुत्री चुनिए, फिर ससुराल का वंश वृक्ष और पति। दोनों वृक्ष अलग ही रहते हैं; विवाहित पुत्री की संतान पति के वृक्ष में जुड़ती है।" : "Choose the daughter, then her married family's tree and her husband. Both trees stay separate; a married daughter's children belong in the husband's tree."}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <select className={selectClass} value={daughter} onChange={(e) => { setDaughter(e.target.value); setOtherFam(""); setHusband(""); }}>
              <option value="">{L ? "— पुत्री —" : "— Daughter —"}</option>
              {daughters.map((p) => <option key={p.id} value={p.id}>{label(p)}{isLinked(p.id) ? (L ? " (कड़ी जुड़ी है)" : " (linked)") : ""}</option>)}
            </select>
            {daughter && !isLinked(daughter) ? (
              <select className={selectClass} value={otherFam} onChange={(e) => { setOtherFam(e.target.value); setHusband(""); }}>
                <option value="">{L ? "— ससुराल का परिवार —" : "— Married family —"}</option>
                {(fams.data ?? []).map((f) => <option key={f.id} value={f.id}>{[f.family_name, f.head_name, f.village_name].filter(Boolean).join(" · ")}</option>)}
              </select>
            ) : null}
            {otherFam ? (
              <select className={selectClass} value={husband} onChange={(e) => setHusband(e.target.value)}>
                <option value="">{L ? "— पति —" : "— Husband —"}</option>
                {(men.data ?? []).map((p) => <option key={p.id} value={p.id}>{label(p)}</option>)}
              </select>
            ) : null}
          </div>
          <div className="mt-2 flex gap-2">
            {daughter && isLinked(daughter) ? <Button size="sm" variant="outline" onClick={() => void unlink(daughter)}>{L ? "यह कड़ी हटाएँ" : "Remove this link"}</Button> : null}
            {husband ? <Button size="sm" onClick={() => void link()} disabled={busy}>{L ? "कड़ी जोड़ें" : "Add link"}</Button> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
