import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { FamilyChart } from "@/components/family/FamilyChart";
import { MatchHints, similarToHint } from "@/components/family/FamilyCompare";
import { MemberDialog, type MemberDialogProps } from "@/components/family/MemberDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLang } from "@/core/i18n";
import { ANCESTOR_RELATION, DecidedMsg, ensureVillage, loadOrigins, loadVillages, rpc, validPhone, type Origin } from "@/family/api";
import { useFamilyCtx, useFamilyMembers, useSimilarMembers } from "@/family/hooks";
import { ancestorsOf, buildUnits, descendantsOf, type Person, type Unit } from "@/family/layout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { normPhone } from "@/lib/comms";

export const Route = createFileRoute("/_authenticated/admin/families/$id")({ component: FamilyPage });

function FamilyPage() {
  const { id } = Route.useParams();
  return <FamilyView id={id} />;
}

type Family = { id: string; family_name: string; status: string; main_whatsapp: string | null; village_id: string | null; owner_id: string; villages: { name: string } | null; admin_note: string | null };
type LinkInfo = { link_id: string; direction: string; status: string; other_family_id: string; other_family_name: string; member_id: string; member_name: string; note: string | null };
type Member = Person & { village_id?: string | null };


/** एक परिवार का वंश वृक्ष (एडमिन पैनल में, और सदस्यों के लिए /shok/family/$id पर — member=true) */
export function FamilyView({ id, member = false }: { id: string; member?: boolean }) {
  const { lang } = useLang();
  const L = lang === "hi";
  const ctx = useFamilyCtx();
  const { user } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [sel, setSel] = useState<Person | null>(null);
  const [mode, setMode] = useState<"chart" | "list">("chart");
  const [dlg, setDlg] = useState<Pick<MemberDialogProps, "addUnder" | "edit" | "kind" | "asHead"> | null>(null);
  const [busy, setBusy] = useState(false);

  const villages = useQuery({ queryKey: ["villages"], queryFn: loadVillages, staleTime: 300000 });
  const origins = useQuery({ queryKey: ["origins"], queryFn: loadOrigins, staleTime: 300000 });
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
  const members = useFamilyMembers(id, ctx.data?.approved === true, villages.data);
  const links = useQuery({
    queryKey: ["family_links", id],
    enabled: fam.data?.status === "approved",
    queryFn: async () => { const { data } = await supabase.rpc("family_link_info", { p_family: id }); return (data ?? []) as unknown as LinkInfo[]; },
  });

  const similar = useSimilarMembers(id, ctx.data?.approved === true && !!fam.data && fam.data.status !== "deleted");
  const people = useMemo(() => (members.data?.people ?? []).map((p) => ({ ...p, village_name: p.village_name ?? fam.data?.villages?.name ?? null })), [members.data, fam.data]);
  const head = people.find((p) => p.is_head);
  const units = useMemo(() => buildUnits(people), [people]);
  const stats = useMemo(() => ({ total: people.length, living: people.filter((p) => !p.is_deceased).length, deceased: people.filter((p) => p.is_deceased).length, gens: units.length ? maxDepth(units) + 1 : 0 }), [people, units]);
  const hasLinks = (links.data ?? []).some((l) => l.status === "approved");

  const f = fam.data;
  const isOwner = !!f && !!user && f.owner_id === user.id;
  const isAdmin = !!ctx.data && (ctx.data.shok_admin || ctx.data.family_manage || ctx.data.platform_admin);
  const managed = !!members.data?.direct && (isAdmin || isOwner);
  const canEdit = !!f && f.status !== "deleted" && managed && (isAdmin || ["draft", "rejected"].includes(f.status));
  const hideContacts = isAdmin && !isOwner && !ctx.data?.super && !ctx.data?.platform_admin && !ctx.data?.shok_admin;

  async function reload() {
    await Promise.all([qc.invalidateQueries({ queryKey: ["family_members", id] }), qc.invalidateQueries({ queryKey: ["shok_similar", id] }), qc.invalidateQueries({ queryKey: ["family", id] }), qc.invalidateQueries({ queryKey: ["family_links", id] }), qc.invalidateQueries({ queryKey: ["k1_families"] })]);
  }
  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(true);
    try { await fn(); await reload(); if (label) toast.success(label); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  }
  const selCur = sel ? people.find((p) => p.id === sel.id) ?? null : null;

  // ----- member actions (mirror shokpatra rules) -----
  const siblingsOf = (p: Person) => people.filter((m) => m.parent_id === p.parent_id && ((m.member_kind as string) || "son") === "son").sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || (a.created_at ?? "").localeCompare(b.created_at ?? ""));
  async function reorder(p: Person, dir: -1 | 1) {
    const sibs = siblingsOf(p); const i = sibs.findIndex((x) => x.id === p.id); const j = i + dir;
    if (j < 0 || j >= sibs.length) return;
    const arr = [...sibs]; const [x] = arr.splice(i, 1); arr.splice(j, 0, x!);
    await run("", async () => { for (let k = 0; k < arr.length; k++) { const { error } = await supabase.from("members").update({ sort_order: k } as never).eq("id", arr[k]!.id); if (error) throw error; } });
  }
  async function addAncestor(p: Person) {
    const name = prompt(L ? `${p.name} के पिता / पूर्वज का नाम (खाली = नाम याद नहीं)` : `Name of ${p.name}'s father / ancestor (empty = not known)`);
    if (name === null) return;
    const deceased = confirm(L ? "क्या वे दिवंगत (स्व.) हैं? OK = हाँ" : "Deceased (late)? OK = yes");
    await run(L ? "ऊपर की पीढ़ी जुड़ गई।" : "Ancestor added", () => rpc("add_parent_above", { p_member: p.id, p_name: name.trim() || "नाम याद नहीं", p_deceased: deceased, p_unknown: !name.trim(), p_relation: ANCESTOR_RELATION }));
  }
  // महिला मुखिया: the lineage runs through the husband, so add him first (usually स्व.), then the wife as head under him
  async function addWomanHead() {
    // तलाक़ / अलग / अविवाहित: no husband row at all — she is the top of the tree, children under her
    if (!confirm(L ? "पति का नाम वृक्ष में जोड़ना है?\n\nOK = हाँ (पति स्व. हैं, वंश पति के नाम से)\nCancel = नहीं — स्वतंत्र महिला मुखिया (तलाक़ / अलग / अविवाहित; पति का नाम कहीं नहीं आएगा)" : "Add the husband's name to the tree?\n\nOK = yes (late husband; lineage through him)\nCancel = no — independent woman head (divorced / separated / unmarried)")) {
      setDlg({ addUnder: null, edit: null, kind: "woman", asHead: true });
      return;
    }
    const name = prompt(L ? "महिला मुखिया — पहले पति का नाम (खाली = नाम याद नहीं / बताना नहीं)" : "Woman head — first the husband's name (empty = not known)");
    if (name === null) return;
    const deceased = confirm(L ? "क्या पति दिवंगत (स्व.) हैं? OK = हाँ" : "Is the husband deceased? OK = yes");
    setBusy(true);
    try {
      const { data, error } = await supabase.from("members").insert({ family_id: id, parent_id: null, name: name.trim() || "नाम याद नहीं", name_unknown: !name.trim(), is_deceased: deceased, relation: "पिता", is_head: false, member_kind: "son", village_id: f?.village_id ?? null, sort_order: 0 } as never).select("*").single();
      if (error) throw new Error(error.message);
      await qc.invalidateQueries({ queryKey: ["family_members", id] });
      setDlg({ addUnder: data as unknown as Member, edit: null, kind: "spouse", asHead: true });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  }
  // several heads per family (one per branch after a partition); each head is the contact for his own branch
  async function makeHead(p: Person) {
    const others = people.filter((m) => m.is_head && m.id !== p.id).map((m) => m.name);
    const q = others.length
      ? (L ? `"${p.name}" अपनी शाखा के मुखिया बनेंगे (${others.join(", ")} भी मुखिया रहेंगे)। ठीक?` : `"${p.name}" becomes head of his branch (${others.join(", ")} stay heads too). OK?`)
      : (L ? `"${p.name}" को परिवार का मुखिया बनाएँ?` : `Make "${p.name}" the family head?`);
    if (!confirm(q)) return;
    await run(L ? "मुखिया बन गए।" : "Head set", () => rpc("set_family_head", { p_member: p.id }));
  }
  async function unmakeHead(p: Person) {
    if (!confirm(L ? `"${p.name}" अब मुखिया नहीं रहेंगे; इनकी शाखा का पत्र ऊपर के मुखिया को जाएगा। ठीक?` : `"${p.name}" will no longer be a head; his branch's letters go to the head above. OK?`)) return;
    await run(L ? "मुखिया का चिह्न हट गया।" : "Head flag removed", () => rpc("unset_family_head", { p_member: p.id }));
  }
  async function remove(p: Person) {
    const ids = descendantsOf(people, p.id); const extra = ids.length - 1;
    if (!extra) {
      if (!confirm(L ? `"${p.name}" को हटाएँ?` : `Remove "${p.name}"?`)) return;
      await run(L ? "हटा दिया।" : "Removed", async () => { const { error } = await supabase.from("members").delete().in("id", ids); if (error) throw error; });
      setSel(null); return;
    }
    const one = confirm(L ? `इनके नीचे ${extra} सदस्य हैं।\nOK = सिर्फ़ "${p.name}" को हटाएँ (नीचे वाले ऊपर जुड़ जाएँगे)\nCancel = आगे पूछें` : `${extra} members are below.\nOK = remove only "${p.name}" (those below move up)\nCancel = ask further`);
    if (one) {
      if (p.is_head) { toast.error(L ? "पहले किसी और को मुखिया बनाएँ।" : "Make someone else the head first."); return; }
      await run(L ? "हट गए; नीचे के सदस्य ऊपर जुड़ गए।" : "Removed; descendants moved up", () => rpc("remove_member_keep_children", { p_id: p.id }));
    } else if (confirm(L ? `"${p.name}" और नीचे के ${extra} सदस्य हमेशा के लिए हटाएँ?` : `Delete "${p.name}" and ${extra} members below permanently?`)) {
      await run(L ? "हटा दिया।" : "Removed", async () => { const { error } = await supabase.from("members").delete().in("id", ids); if (error) throw error; });
    }
    setSel(null);
  }
  async function move(p: Person) {
    const bad = new Set(descendantsOf(people, p.id));
    const opts = people.filter((m) => !bad.has(m.id) && (m.member_kind ?? "son") === "son");
    const pick = prompt((L ? "किसके नीचे रखना है? नंबर लिखें:\n" : "Move under whom? Type the number:\n") + opts.map((m, i) => `${i + 1}. ${m.name}${m.is_head ? " ★" : ""}`).join("\n"));
    const n = Number(pick); if (!n || !opts[n - 1]) return;
    await run(L ? "ले जाया गया।" : "Moved", () => rpc("move_member", { p_member: p.id, p_new_parent: opts[n - 1]!.id }));
  }

  // ----- family actions -----
  async function editFamily() {
    if (!f) return;
    const name = prompt(L ? "परिवार का नाम" : "Family name", f.family_name); if (!name?.trim()) return;
    const wa = hideContacts ? null : prompt(L ? "मुखिया का मुख्य व्हाट्सएप नंबर (10 अंक)" : "Head's main WhatsApp (10 digits)", (f.main_whatsapp ?? "").replace(/^91/, ""));
    if (wa !== null && wa !== undefined && !validPhone(wa)) { toast.error(L ? "सही 10 अंकों का नंबर लिखिए।" : "Enter a valid 10-digit number."); return; }
    const vil = prompt(L ? "गाँव या शहर" : "Village or city", f.villages?.name ?? ""); if (vil === null) return;
    await run(L ? "सहेज लिया।" : "Saved", async () => {
      const village_id = await ensureVillage(vil, villages.data ?? []);
      const patch: Record<string, unknown> = { family_name: name.trim(), village_id };
      if (wa) patch["main_whatsapp"] = normPhone(wa);
      const { error } = await supabase.from("families").update(patch as never).eq("id", id); if (error) throw error;
    });
  }
  async function submit() {
    if (!head) { toast.error(L ? "पहले मुखिया जोड़िए।" : "Add the family head first."); return; }
    if (!confirm(L ? "मंज़ूरी के लिए भेजें? फ़ैसले तक बदलाव नहीं हो सकेगा।" : "Submit for approval? No edits until decided.")) return;
    await run(L ? "मंज़ूरी के लिए भेज दिया।" : "Submitted", async () => { const { error } = await supabase.from("families").update({ status: "pending" } as never).eq("id", id); if (error) throw error; });
  }
  async function reopen() {
    if (!confirm(L ? "बदलाव के लिए खोलें? परिवार ड्राफ़्ट में जाएगा और दोबारा मंज़ूरी लगेगी।" : "Reopen for changes? The family goes back to draft and needs approval again.")) return;
    await run(L ? "अब बदलाव कर सकते हैं।" : "Reopened", () => rpc("reopen_family", { p_id: id }));
  }
  async function decide(status: "approved" | "rejected" | "draft") {
    if (status === "draft") { await run(L ? "ड्राफ़्ट में भेजा।" : "Back to draft", async () => { const { error } = await supabase.from("families").update({ status: "draft", admin_note: null } as never).eq("id", id); if (error) throw error; }); return; }
    let note: string | null = null;
    if (status === "rejected") { note = prompt(L ? "अस्वीकार का कारण (यूज़र को क्या सुधारना है?)" : "Reason (what should the user fix?)"); if (!note) return; }
    await run("", async () => { const r = await rpc<{ ok: boolean; by?: string; status?: string }>("decide_family", { p_id: id, p_status: status, p_note: note }); if (!r.ok) toast.error(DecidedMsg(r, L)); else toast.success(L ? "स्थिति बदल दी।" : "Decided"); });
  }
  async function trash() {
    if (!confirm(L ? "परिवार को कचरे में भेजें? (वापस लाया जा सकता है)" : "Move this family to trash? (can be restored)")) return;
    await run(L ? "कचरे में भेज दिया।" : "Trashed", () => rpc("trash_family", { p_id: id }));
    nav({ to: "/admin/families" });
  }

  if (ctx.data && !ctx.data.approved) return <p className="text-sm text-muted-foreground">{L ? "अनुमति नहीं" : "Not allowed"}</p>;
  if (fam.error) return <p className="text-sm text-destructive">{(fam.error as Error).message}</p>;
  if (!f) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const selWoman = selCur?.member_kind === "woman"; // स्वतंत्र महिला मुखिया: top of the tree, children under her
  const selSide = selCur ? !["son", "woman"].includes(selCur.member_kind ?? "son") : false;
  const selSibs = selCur && !selSide ? siblingsOf(selCur) : [];
  const selIdx = selCur ? selSibs.findIndex((x) => x.id === selCur.id) : -1;
  const hasSpouse = selCur ? people.some((m) => m.parent_id === selCur.id && m.member_kind === "spouse") : false;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{member ? <Link to="/shok" className="hover:underline">{L ? "शोक पत्र व वंश वृक्ष" : "Family trees"}</Link> : <Link to="/admin/families" className="hover:underline">{L ? "वंश वृक्ष" : "Family trees"}</Link>} · {f.villages?.name ?? "—"}</p>
          <h1 className="font-display text-2xl font-semibold">{f.family_name} <Badge variant={f.status === "approved" ? "default" : f.status === "rejected" ? "destructive" : "secondary"} className="ml-2 align-middle">{f.status}</Badge></h1>
          <p className="text-sm text-muted-foreground">
            {head ? `${L ? "मुखिया" : "Head"}: ${people.filter((p) => p.is_head).map((p) => p.name).join(", ")}` : (L ? "मुखिया दर्ज नहीं" : "No head")}{f.main_whatsapp && !hideContacts ? ` · ${f.main_whatsapp}` : ""} · {stats.total} {L ? "सदस्य" : "members"} ({stats.living} {L ? "जीवित" : "living"}, {stats.deceased} {L ? "दिवंगत" : "late"}) · {stats.gens} {L ? "पीढ़ियाँ" : "generations"}
          </p>
          {f.status === "rejected" && f.admin_note ? <p className="mt-1 rounded bg-red-50 px-2 py-1 text-xs text-red-900">{L ? "एडमिन का संदेश: " : "Admin note: "}{f.admin_note}</p> : null}
          {f.status === "pending" && !isAdmin ? <p className="mt-1 text-xs text-amber-800">{L ? "एडमिन की मंज़ूरी का इंतज़ार; तब तक बदलाव नहीं।" : "Waiting for admin approval; no edits until then."}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-md border border-border p-0.5 text-xs">
            <button type="button" className={`rounded px-2 py-1 ${mode === "chart" ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setMode("chart")}>{L ? "चार्ट" : "Chart"}</button>
            <button type="button" className={`rounded px-2 py-1 ${mode === "list" ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setMode("list")}>{L ? "सूची" : "List"}</button>
          </div>
          {canEdit ? <Button size="sm" variant="outline" onClick={editFamily} disabled={busy}>{L ? "परिवार की जानकारी" : "Family info"}</Button> : null}
          {canEdit && !head ? <Button size="sm" onClick={() => setDlg({ addUnder: null, edit: null, kind: "son", asHead: true })}>+ {L ? "मुखिया (पुरुष)" : "Add head (man)"}</Button> : null}
          {canEdit && !head ? <Button size="sm" variant="outline" onClick={() => void addWomanHead()} disabled={busy}>+ {L ? "महिला मुखिया" : "Woman head"}</Button> : null}
          {!isAdmin && isOwner && ["draft", "rejected"].includes(f.status) ? <Button size="sm" onClick={submit} disabled={busy}>{L ? "मंज़ूरी के लिए भेजें" : "Submit for approval"}</Button> : null}
          {!isAdmin && isOwner && f.status === "approved" ? <Button size="sm" variant="outline" onClick={reopen} disabled={busy}>{L ? "बदलाव के लिए खोलें" : "Reopen for changes"}</Button> : null}
          {isAdmin && managed && f.status !== "approved" ? <Button size="sm" onClick={() => decide("approved")} disabled={busy}>{L ? "मंज़ूर करें" : "Approve"}</Button> : null}
          {isAdmin && managed && f.status === "pending" ? <Button size="sm" variant="destructive" onClick={() => decide("rejected")} disabled={busy}>{L ? "अस्वीकार" : "Reject"}</Button> : null}
          {isAdmin && managed && f.status === "approved" ? <Button size="sm" variant="ghost" onClick={() => decide("draft")} disabled={busy}>{L ? "ड्राफ़्ट में भेजें" : "Back to draft"}</Button> : null}
          {isAdmin && managed ? <Button size="sm" variant="ghost" onClick={trash} disabled={busy}>{L ? "कचरे में" : "Trash"}</Button> : null}
          {hasLinks ? <Button asChild size="sm" variant="outline"><Link to="/admin/lineage/$id" params={{ id }}>{L ? "पूरा वंश" : "Full lineage"}</Link></Button> : null}
          <Button asChild size="sm" variant="ghost"><a href={`https://shokpatra.kalchuri.org/app.html#/family/${id}`} target="_blank" rel="noreferrer">{L ? "शोकपत्र में खोलें ↗" : "Open in shokpatra ↗"}</a></Button>
        </div>
      </div>

      {canEdit && selCur ? (
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-primary/30 bg-amber-50/60 p-2 text-xs">
          <span className="mr-2 font-semibold">{selCur.is_deceased ? "स्व. " : ""}{selCur.name}:</span>
          {!selSide ? <Button size="sm" variant="outline" onClick={() => setDlg({ addUnder: selCur, edit: null, kind: "son", asHead: false })}>+ {L ? "पुत्र" : "Son"}</Button> : null}
          {!selSide ? <Button size="sm" variant="outline" onClick={() => setDlg({ addUnder: selCur, edit: null, kind: "daughter", asHead: false })}>+ {L ? "पुत्री" : "Daughter"}</Button> : null}
          {!selSide && !selWoman && !hasSpouse ? <Button size="sm" variant="outline" onClick={() => setDlg({ addUnder: selCur, edit: null, kind: "spouse", asHead: false })}>+ {L ? "पत्नी" : "Wife"}</Button> : null}
          {!selSide && selCur.parent_id ? <Button size="sm" variant="outline" onClick={() => setDlg({ addUnder: people.find((x) => x.id === selCur.parent_id) ?? null, edit: null, kind: "son", asHead: false })}>+ {L ? "भाई" : "Brother"}</Button> : null}
          {!selSide && selCur.parent_id ? <Button size="sm" variant="outline" onClick={() => setDlg({ addUnder: people.find((x) => x.id === selCur.parent_id) ?? null, edit: null, kind: "daughter", asHead: false })}>+ {L ? "बहन" : "Sister"}</Button> : null}
          {!selSide && !selWoman && !selCur.parent_id ? <Button size="sm" variant="outline" onClick={() => addAncestor(selCur)} disabled={busy}>⬆ {L ? "पूर्वज जोड़ें" : "Add ancestor"}</Button> : null}
          <Button size="sm" variant="outline" onClick={() => setDlg({ addUnder: null, edit: selCur as Member, kind: "son", asHead: false })}>{L ? "बदलें" : "Edit"}</Button>
          {!selCur.is_head && !selCur.is_deceased && !selCur.name_unknown ? <Button size="sm" variant="outline" onClick={() => makeHead(selCur)} disabled={busy}>{selSide || selWoman ? (L ? "महिला मुखिया बनाएँ" : "Make her head") : (L ? "मुखिया बनाएँ" : "Make head")}</Button> : null}
          {selCur.is_head && people.filter((m) => m.is_head).length > 1 ? <Button size="sm" variant="outline" onClick={() => unmakeHead(selCur)} disabled={busy}>{L ? "मुखिया हटाएँ" : "Unset head"}</Button> : null}
          {selSibs.length > 1 ? <><Button size="sm" variant="ghost" disabled={busy || selIdx <= 0} onClick={() => reorder(selCur, -1)} title={L ? "क्रम ऊपर (बड़ा)" : "older"}>◀</Button><span>{selIdx + 1}/{selSibs.length}</span><Button size="sm" variant="ghost" disabled={busy || selIdx >= selSibs.length - 1} onClick={() => reorder(selCur, 1)} title={L ? "क्रम नीचे (छोटा)" : "younger"}>▶</Button></> : null}
          {isAdmin && !selCur.is_head && !selSide ? <Button size="sm" variant="ghost" onClick={() => move(selCur)} disabled={busy}>{L ? "ले जाएँ" : "Move"}</Button> : null}
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(selCur)} disabled={busy}>{L ? "हटाएँ" : "Remove"}</Button>
        </div>
      ) : null}

      {mode === "chart" ? (
        <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
          <FamilyChart people={people} selectedId={sel?.id ?? null} onSelect={setSel} lang={lang} height={600} />
          <PersonPanel p={selCur} people={people} L={L} onPick={setSel} withPhones={!!members.data?.direct && !hideContacts} />
        </div>
      ) : (
        <ListView people={people} L={L} units={units} showPhones={!!members.data?.direct && !hideContacts} onPick={(p) => { setSel(p); setMode("chart"); }} />
      )}
      {!people.length && canEdit ? <p className="text-sm text-muted-foreground">{L ? "पहले परिवार के मुखिया (पिता) को जोड़िए; फिर हर सदस्य को चुनकर उसके नीचे पुत्र/पुत्री/पत्नी जोड़ सकते हैं।" : "Add the family head first; then select any person to add sons, daughters or wife under them."}</p> : null}

      {(links.data ?? []).length ? (
        <section className="text-sm">
          <h2 className="font-display font-semibold">{L ? "वंश की कड़ियाँ" : "Lineage links"}</h2>
          <ul className="mt-1 space-y-1 text-muted-foreground">
            {links.data!.map((l) => (
              <li key={l.link_id}>
                {l.direction === "up" ? (L ? "ऊपर: " : "Above: ") : (L ? "नीचे: " : "Below: ")}
                <Link to={member ? "/shok/family/$id" : "/admin/families/$id"} params={{ id: l.other_family_id }} className="text-foreground hover:underline">{l.other_family_name}</Link>
                {" · "}{l.member_name} <Badge variant={l.status === "approved" ? "default" : "secondary"} className="ml-1">{l.status}</Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {similar.data?.length ? <MatchHints rows={similar.data.map((r) => similarToHint(id, f.family_name, f.status, r))} L={L} isAdmin={isAdmin} title={L ? "इस वंश वृक्ष के नाम दूसरे वंश वृक्षों में भी हैं" : "Names from this tree also appear in other trees"} onChanged={reload} /> : null}
      <p className="text-xs text-muted-foreground">{L ? "वंश जोड़ना (दूसरे परिवार से कड़ी), परिवार मिलाना और नाम सुझाव अभी शोकपत्र ऐप में हैं।" : "Linking lineages, merging families and name suggestions are still in the shokpatra app."}</p>

      {dlg ? (
        <MemberDialog open onClose={(saved, savedName) => { setDlg(null); if (saved) { void reload().then(async () => {
            if (!savedName) return;
            const { data } = await supabase.rpc("shok_similar_members", { p_family: id } as never);
            const hits = ((data ?? []) as { member_name: string; other_family_name: string }[]).filter((x) => x.member_name.trim() === savedName.trim());
            if (hits.length) toast.info(L ? `"${savedName}" नाम "${hits[0]!.other_family_name}" वंश वृक्ष में भी है — नीचे सुझाव देखिए (मिलाएँ / वंश जोड़ें / अलग व्यक्ति)।` : `"${savedName}" also appears in "${hits[0]!.other_family_name}" — see the suggestions below.`, { duration: 9000 });
          }); } }} familyId={id} familyVillage={f.villages?.name ?? null} villages={villages.data ?? []} origins={origins.data ?? []} members={people as Member[]} isAdmin={isAdmin} hideContacts={hideContacts} L={L} {...dlg} />
      ) : null}
    </div>
  );
}

function maxDepth(units: Unit[]): number { return Math.max(0, ...units.map((u) => Math.max(u.depth, maxDepth(u.children)))); }

function PersonPanel({ p, people, L, onPick, withPhones }: { p: Person | null; people: Person[]; L: boolean; onPick: (p: Person) => void; withPhones: boolean }) {
  if (!p) return <aside className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">{L ? "किसी सदस्य पर क्लिक करें: उसकी पूरी वंशावली हाइलाइट होगी और ऊपर उसके लिए बटन आएँगे।" : "Click a person: their line is highlighted and actions for them appear above."}</aside>;
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
        <p className="text-xs text-muted-foreground">{[p.relation, p.member_kind === "spouse" ? (L ? "पत्नी" : "wife") : p.member_kind === "daughter" ? (L ? "पुत्री" : "daughter") : p.member_kind === "woman" ? (L ? "स्वतंत्र महिला" : "independent woman") : null, p.is_head ? (L ? "मुखिया" : "head") : null].filter(Boolean).join(" · ")}</p>
      </div>
      <dl className="space-y-2">
        {row(L ? "पिता" : "Father", father ? <button type="button" className="hover:underline" onClick={() => onPick(father)}>{father.name}</button> : null)}
        {row(L ? "पत्नी" : "Wife", spouse ? <button type="button" className="hover:underline" onClick={() => onPick(spouse)}>{spouse.name}</button> : null)}
        {row(L ? "निवास" : "Residence", p.village_name)}
        {row(L ? "मूल ग्राम" : "Native place", p.native_place)}
        {withPhones && p.phone ? row(L ? "मोबाइल" : "Mobile", p.phone) : null}
        {row(L ? "संतान" : "Children", kids.length ? <ul className="space-y-0.5">{kids.map((k) => <li key={k.id}><button type="button" className="hover:underline" onClick={() => onPick(k)}>{k.is_deceased ? "स्व. " : ""}{k.name}</button>{k.member_kind === "daughter" ? <span className="ml-1 text-xs text-muted-foreground">({L ? "पुत्री" : "daughter"})</span> : null}</li>)}</ul> : null)}
        {row(L ? "वंशावली" : "Line", chain.length ? <p className="text-xs">{[...chain].reverse().map((a) => a.name).join(" → ")} → <b>{p.name}</b></p> : null)}
      </dl>
    </aside>
  );
}

function ListView({ people, L, units, showPhones, onPick }: { people: Person[]; L: boolean; units: Unit[]; showPhones: boolean; onPick: (p: Person) => void }) {
  const rows: { p: Person; depth: number; spouse?: Person }[] = [];
  const walk = (u: Unit) => { rows.push({ p: u.person, depth: u.depth, ...(u.spouses[0] ? { spouse: u.spouses[0] } : {}) }); u.children.forEach(walk); };
  units.forEach(walk);
  if (!people.length) return null;
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground"><tr><th className="p-2">{L ? "नाम" : "Name"}</th><th className="p-2">{L ? "पत्नी" : "Wife"}</th><th className="p-2">{L ? "निवास" : "Residence"}</th><th className="p-2">{L ? "मूल" : "Native"}</th>{showPhones ? <th className="p-2">{L ? "मोबाइल" : "Mobile"}</th> : null}</tr></thead>
        <tbody>
          {rows.map(({ p, depth, spouse }) => (
            <tr key={p.id} className="border-t border-border hover:bg-secondary/40" onClick={() => onPick(p)} style={{ cursor: "pointer" }}>
              <td className="p-2" style={{ paddingLeft: 8 + depth * 18 }}>{depth ? <span className="text-muted-foreground">└ </span> : null}{p.is_deceased ? "स्व. " : ""}<b>{p.name}</b>{p.is_head ? <Badge variant="secondary" className="ml-2">{L ? "मुखिया" : "head"}</Badge> : null}{p.member_kind === "daughter" ? <span className="ml-1 text-xs text-muted-foreground">({L ? "पुत्री" : "daughter"})</span> : null}</td>
              <td className="p-2">{spouse?.name ?? ""}</td>
              <td className="p-2">{p.village_name ?? ""}</td>
              <td className="p-2">{p.native_place ?? ""}</td>
              {showPhones ? <td className="p-2">{p.phone ?? ""}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
