// Family-tree quick view (popup), side-by-side compare of 2–3 trees, and "same name in another tree" recommendations
// with the merge / link / dismiss actions. Shared by the families list and the family page.
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { FamilyChart } from "@/components/family/FamilyChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { loadVillages, rpc } from "@/family/api";
import { useFamilyMembers, type SimilarRow } from "@/family/hooks";
import type { Person } from "@/family/layout";
import { supabase } from "@/integrations/supabase/client";

type FamHead = { id: string; family_name: string; village_name: string | null; status: string };

function useFamilyHead(id: string) {
  return useQuery({
    queryKey: ["family_head", id],
    enabled: !!id,
    queryFn: async (): Promise<FamHead> => {
      const { data } = await supabase.from("families").select("id,family_name,status,villages(name)").eq("id", id).maybeSingle();
      if (data) { const d = data as unknown as { id: string; family_name: string; status: string; villages: { name: string } | null }; return { id: d.id, family_name: d.family_name, status: d.status, village_name: d.villages?.name ?? null }; }
      const { data: dir } = await supabase.rpc("directory_families", { p_village: null as never });
      const hit = ((dir ?? []) as { id: string; family_name: string; village_name: string | null }[]).find((x) => x.id === id);
      return { id, family_name: hit?.family_name ?? "…", village_name: hit?.village_name ?? null, status: "approved" };
    },
  });
}

/** One tree, read-only, with its name on top. `highlight` selects a person (e.g. the matched name). */
export function FamilyPreview({ id, L, height = 420, highlight, onPick }: { id: string; L: boolean; height?: number; highlight?: string | null; onPick?: (p: Person | null) => void }) {
  const villages = useQuery({ queryKey: ["villages"], queryFn: loadVillages, staleTime: 300000 });
  const head = useFamilyHead(id);
  const members = useFamilyMembers(id, true, villages.data);
  const [sel, setSel] = useState<string | null>(highlight ?? null);
  const people = (members.data?.people ?? []).map((p) => ({ ...p, village_name: p.village_name ?? head.data?.village_name ?? null }));
  return (
    <div className="min-w-0 flex-1 rounded-lg border border-border bg-background">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="min-w-0">
          <p className="truncate font-display font-semibold">{head.data?.family_name ?? "…"} {head.data ? <Badge variant="secondary" className="ml-1 align-middle">{head.data.status}</Badge> : null}</p>
          <p className="text-xs text-muted-foreground">{head.data?.village_name ?? ""}{people.length ? ` · ${people.length} ${L ? "सदस्य" : "members"}` : ""}</p>
        </div>
        <Button asChild size="sm" variant="outline"><Link to="/admin/families/$id" params={{ id }}>{L ? "पूरा पेज खोलें" : "Open page"} ↗</Link></Button>
      </div>
      {members.isLoading ? <p className="p-4 text-sm text-muted-foreground">{L ? "लोड हो रहा है…" : "Loading…"}</p>
        : !people.length ? <p className="p-4 text-sm text-muted-foreground">{L ? "इस वंश वृक्ष में अभी कोई सदस्य नहीं है।" : "No members in this tree yet."}</p>
        : <FamilyChart people={people} selectedId={sel} onSelect={(p) => { setSel(p?.id ?? null); onPick?.(p); }} lang={L ? "hi" : "en"} height={height} />}
    </div>
  );
}

/** Popup with one tree. */
export function FamilyPreviewDialog({ id, L, onClose, highlight }: { id: string | null; L: boolean; onClose: () => void; highlight?: string | null }) {
  return (
    <Dialog open={!!id} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-5xl p-3 sm:p-4">
        <DialogHeader><DialogTitle className="font-display">{L ? "वंश वृक्ष" : "Family tree"}</DialogTitle></DialogHeader>
        {id ? <FamilyPreview id={id} L={L} height={Math.min(620, typeof window !== "undefined" ? window.innerHeight - 220 : 520)} highlight={highlight ?? null} /> : null}
      </DialogContent>
    </Dialog>
  );
}

/** 2–3 trees side by side (stacked on phones). */
export function CompareDialog({ ids, L, onClose, onRemove, highlights }: { ids: string[]; L: boolean; onClose: () => void; onRemove?: (id: string) => void; highlights?: Record<string, string> }) {
  return (
    <Dialog open={ids.length > 0} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[96vw] p-3 sm:p-4">
        <DialogHeader><DialogTitle className="font-display">{L ? `वंश वृक्ष तुलना (${ids.length})` : `Compare trees (${ids.length})`}</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">{L ? "एक ही व्यक्ति दोनों में दिखे तो उसके परिवार पेज पर \"पुत्रों के परिवार जोड़ें\" (मिलाना) या \"वंश जोड़ें\" (कड़ी) कीजिए; नीचे के सुझाव-पैनल से भी सीधे हो जाता है।" : "If the same person appears in both, merge (sons' families) or link (lineage) from the suggestions panel or the family page."}</p>
        <div className={`grid gap-3 ${ids.length >= 3 ? "xl:grid-cols-3" : ids.length === 2 ? "lg:grid-cols-2" : ""}`}>
          {ids.map((id) => (
            <div key={id} className="relative flex min-w-0">
              <FamilyPreview id={id} L={L} height={ids.length >= 3 ? 420 : 500} highlight={highlights?.[id] ?? null} />
              {onRemove ? <button type="button" className="absolute right-2 top-2 rounded-md border border-border bg-background px-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => onRemove(id)} title={L ? "तुलना से हटाएँ" : "Remove"}>✕</button> : null}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type HintRow = { member_id: string; member_name: string; family_id: string; family_name: string; family_status: string; other_member_id: string; other_name: string; other_family_id: string; other_family_name: string; other_family_status: string; link_parent_id: string | null; score: number; reason: string | null };

export function similarToHint(familyId: string, familyName: string, familyStatus: string, r: SimilarRow): HintRow {
  return { member_id: r.member_id, member_name: r.member_name, family_id: familyId, family_name: familyName, family_status: familyStatus, other_member_id: r.other_member_id, other_name: r.other_name, other_family_id: r.other_family_id, other_family_name: r.other_family_name, other_family_status: r.other_family_status, link_parent_id: r.link_parent_id, score: r.score, reason: r.reason };
}

/**
 * Recommendations list. Actions:
 *  - compare (both trees side by side, matched people highlighted)
 *  - merge A→B / B→A: `merge_families_same_father` — descendants of the person in the source tree move under the same person in
 *    the target tree, the source family goes to the trash (admin only, both families manageable)
 *  - link: `request_family_link` — the whole family hangs under the other tree's father of that person (when this person is a root)
 *  - dismiss: "different people" → pair hidden for everyone
 */
export function MatchHints({ rows, L, isAdmin, title, onChanged }: { rows: HintRow[]; L: boolean; isAdmin: boolean; title?: string; onChanged?: () => void }) {
  const qc = useQueryClient();
  const [cmp, setCmp] = useState<{ ids: string[]; hl: Record<string, string> } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  if (!rows.length) return null;
  async function act(key: string, label: string, fn: () => Promise<unknown>) {
    setBusy(key);
    try { await fn(); toast.success(label); await qc.invalidateQueries({ queryKey: ["shok_hints"] }); await qc.invalidateQueries({ queryKey: ["shok_similar"] }); await qc.invalidateQueries({ queryKey: ["k1_families"] }); await qc.invalidateQueries({ queryKey: ["family_members"] }); onChanged?.(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(null); }
  }
  const merge = (r: HintRow, dir: "ab" | "ba") => {
    const from = dir === "ab" ? r : { family_id: r.other_family_id, family_name: r.other_family_name, member_id: r.other_member_id };
    const to = dir === "ab" ? { family_id: r.other_family_id, family_name: r.other_family_name, member_id: r.other_member_id } : r;
    const q = L ? `"${from.family_name}" में ${r.member_name} के नीचे के सभी सदस्य "${to.family_name}" में उसी नाम के व्यक्ति के नीचे चले जाएँगे; "${from.family_name}" कचरे में जाएगा (वापस लाया जा सकता है)। ठीक?`
      : `Everyone below ${r.member_name} in "${from.family_name}" moves under the same person in "${to.family_name}"; "${from.family_name}" goes to the trash (restorable). OK?`;
    if (!confirm(q)) return;
    void act(r.member_id + dir, L ? "परिवार मिला दिए।" : "Merged", () => rpc("merge_families_same_father", { p_from: from.family_id, p_to: to.family_id, p_from_node: from.member_id, p_to_node: to.member_id }));
  };
  const link = (r: HintRow) => {
    if (!r.link_parent_id) return;
    if (!confirm(L ? `"${r.family_name}" को "${r.other_family_name}" के वंश में ${r.member_name} के पिता के नीचे जोड़ें (कड़ी; डेटा नहीं हिलता)?` : `Link "${r.family_name}" under ${r.member_name}'s father in "${r.other_family_name}"? (no data moves)`)) return;
    void act(r.member_id + "link", L ? "वंश की कड़ी बन गई / अनुरोध गया।" : "Linked / requested", async () => {
      const res = await rpc<{ ok: boolean; status?: string; reason?: string }>("request_family_link", { p_child: r.family_id, p_parent_member: r.link_parent_id, p_note: "सुझाव: एक ही नाम दोनों वंश वृक्ष में" });
      if (!res.ok) throw new Error(res.reason === "exists" ? (L ? "इस परिवार की कड़ी पहले से है।" : "A link already exists.") : "Failed");
    });
  };
  const dismiss = (r: HintRow) => void act(r.member_id + "x", L ? "अनदेखा किया।" : "Dismissed", () => rpc("shok_dismiss_match", { p_a: r.member_id, p_b: r.other_member_id }));
  return (
    <section className="rounded-lg border border-amber-300/60 bg-amber-50/60 p-3 text-sm dark:border-amber-700/40 dark:bg-amber-950/20">
      <h2 className="font-display font-semibold">{title ?? (L ? "मिलाने के सुझाव — एक जैसे नाम दूसरे वंश वृक्ष में" : "Suggestions — same names in other trees")} <span className="font-normal text-muted-foreground">({rows.length})</span></h2>
      <p className="mt-1 text-xs text-muted-foreground">{L ? "एक ही व्यक्ति दो परिवारों में अलग-अलग बना हो सकता है। दोनों को साथ देखिए; एक ही हों तो मिलाइए या वंश जोड़िए, अलग हों तो \"अलग व्यक्ति\" दबाइए।" : "The same person may have been entered in two families. Compare; merge or link if they are one person, otherwise dismiss."}</p>
      <ul className="mt-2 divide-y divide-border/60">
        {rows.map((r) => (
          <li key={r.member_id + r.other_member_id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div className="min-w-0">
              <p><b>{r.member_name}</b> — <Link to="/admin/families/$id" params={{ id: r.family_id }} className="hover:underline">{r.family_name}</Link> <Badge variant="outline" className="align-middle text-[10px]">{r.family_status}</Badge>
                <span className="mx-1 text-muted-foreground">↔</span>
                <b>{r.other_name}</b> — <Link to="/admin/families/$id" params={{ id: r.other_family_id }} className="hover:underline">{r.other_family_name}</Link> <Badge variant="outline" className="align-middle text-[10px]">{r.other_family_status}</Badge></p>
              <p className="text-xs text-muted-foreground">{r.reason || (L ? "नाम मिलता है" : "same name")} · {L ? "मेल" : "match"} {r.score}</p>
            </div>
            <div className="flex flex-wrap gap-1">
              <Button size="sm" variant="outline" onClick={() => setCmp({ ids: [r.family_id, r.other_family_id], hl: { [r.family_id]: r.member_id, [r.other_family_id]: r.other_member_id } })}>{L ? "दोनों देखें" : "Compare"}</Button>
              {isAdmin ? <Button size="sm" variant="outline" disabled={!!busy} onClick={() => merge(r, "ab")} title={L ? `${r.family_name} के इस व्यक्ति के नीचे वाले ${r.other_family_name} में जाएँ` : "merge into the other tree"}>{L ? `→ ${r.other_family_name} में मिलाएँ` : `Merge → ${r.other_family_name}`}</Button> : null}
              {isAdmin ? <Button size="sm" variant="outline" disabled={!!busy} onClick={() => merge(r, "ba")}>{L ? `→ ${r.family_name} में मिलाएँ` : `Merge → ${r.family_name}`}</Button> : null}
              {r.link_parent_id ? <Button size="sm" variant="outline" disabled={!!busy} onClick={() => link(r)}>{L ? "वंश जोड़ें (कड़ी)" : "Link lineage"}</Button> : null}
              <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => dismiss(r)}>{L ? "अलग व्यक्ति" : "Different people"}</Button>
            </div>
          </li>
        ))}
      </ul>
      {cmp ? <CompareDialog ids={cmp.ids} L={L} onClose={() => setCmp(null)} highlights={cmp.hl} /> : null}
    </section>
  );
}

export type EmptyFam = { id: string; family_name: string; village_name: string | null; status: string; members: number; created_at: string; owner_id: string; owner_name: string | null; owner_phone: string | null; main_whatsapp: string | null; mine: boolean };

/** Families that still have no members (or only the head). */
export function EmptyTrees({ rows, L }: { rows: EmptyFam[]; L: boolean }) {
  if (!rows.length) return null;
  return (
    <section className="rounded-lg border border-border bg-background p-3 text-sm">
      <h2 className="font-display font-semibold">{L ? "खाली वंश वृक्ष" : "Empty trees"} <span className="font-normal text-muted-foreground">({rows.length})</span></h2>
      <p className="mt-1 text-xs text-muted-foreground">{L ? "ये परिवार बने एक दिन से ज़्यादा हो गया पर सदस्य नहीं जुड़े (या सिर्फ़ मुखिया)। मालिक को याद दिलाइए या खुद भरिए।" : "Created more than a day ago but still without members (or only the head). Remind the owner or fill them in."}</p>
      <ul className="mt-2 divide-y divide-border/60">
        {rows.map((f) => (
          <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
            <div><Link to="/admin/families/$id" params={{ id: f.id }} className="font-medium hover:underline">{f.family_name}</Link> <Badge variant="outline" className="align-middle text-[10px]">{f.status}</Badge>
              <span className="text-xs text-muted-foreground"> · {f.village_name ?? "—"} · {f.members} {L ? "सदस्य" : "members"} · {new Date(f.created_at).toLocaleDateString("hi-IN")}{f.owner_name ? ` · ${L ? "बनाया" : "by"}: ${f.owner_name}` : ""}</span></div>
            <div className="flex gap-1">
              {f.owner_phone || f.main_whatsapp ? <Button asChild size="sm" variant="outline"><a href={`https://wa.me/${(f.owner_phone || f.main_whatsapp || "").replace(/\D/g, "")}?text=${encodeURIComponent(`नमस्ते, शोकपत्र सेवा में आपका परिवार "${f.family_name}" अभी खाली है। कृपया वंश वृक्ष में सदस्य जोड़ दीजिए: https://kalchuri.org/admin/families/${f.id}`)}`} target="_blank" rel="noreferrer">{L ? "WhatsApp याद दिलाएँ" : "WhatsApp reminder"}</a></Button> : null}
              <Button asChild size="sm" variant="ghost"><Link to="/admin/families/$id" params={{ id: f.id }}>{L ? "भरें" : "Fill"}</Link></Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
