import type { SupabaseClient } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

// These tables / RPCs belong to the family-tree (shok) module and are not in the generated types.
const sb = supabase as unknown as SupabaseClient;

type Profile = { member_id: string; photo: string | null; bio: string | null };
type Marriage = { daughter_id: string; daughter_name: string; daughter_family_id: string; daughter_family_name: string; father_name: string | null; husband_id: string; husband_name: string; husband_family_id: string; husband_family_name: string };
type History = { at: string; actor_name: string; action: string; summary: string };
type Extra = { gotra: string | null; kuldevi: string | null };
type Age = { member_id: string; age: number | null; at_death: boolean; can_set: boolean; approx: boolean };
type Mem = { id: string; name: string; is_deceased?: boolean | null; name_unknown?: boolean | null };

/** Square, small JPEG data URL of a picked photo (kept in the row, no file storage). */
function shrink(file: File, max = 220, maxChars = 80000): Promise<string> {
  return new Promise((ok, bad) => {
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const c = document.createElement("canvas");
      c.width = c.height = Math.min(max, side);
      c.getContext("2d")?.drawImage(img, (img.width - side) / 2, Math.max(0, (img.height - side) / 2 - side * 0.08), side, side, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      let q = 0.82;
      let out = c.toDataURL("image/jpeg", q);
      while (out.length > maxChars && q > 0.35) { q -= 0.1; out = c.toDataURL("image/jpeg", q); }
      if (out.length > maxChars) bad(new Error("too big")); else ok(out);
    };
    img.onerror = () => bad(new Error("bad image"));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Extra family-tree features shared by every organization's family page:
 * gotra / kuldevi, member photos + short bios, marriage links to other trees and the change history.
 * Nothing here sends a message.
 */
export function FamilyExtras({ familyId, members, L, canEdit, canProfile }: { familyId: string; members: Mem[]; L: boolean; canEdit: boolean; canProfile: boolean }) {
  const qc = useQueryClient();
  const [showHistory, setShowHistory] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dobFor, setDobFor] = useState("");
  const [dob, setDob] = useState("");
  const [ageIn, setAgeIn] = useState("");
  const [deathIn, setDeathIn] = useState("");

  const extra = useQuery({
    queryKey: ["family_extra", familyId],
    queryFn: async () => { const { data } = await sb.from("families").select("gotra,kuldevi").eq("id", familyId).maybeSingle(); return (data ?? { gotra: null, kuldevi: null }) as Extra; },
  });
  const profiles = useQuery({
    queryKey: ["family_profiles", familyId],
    queryFn: async () => { const { data } = await sb.rpc("shok_member_profiles", { p_family: familyId }); return (data ?? []) as Profile[]; },
  });
  const ages = useQuery({
    queryKey: ["family_ages", familyId],
    queryFn: async () => { const { data } = await sb.rpc("shok_member_ages", { p_family: familyId }); return (data ?? []) as Age[]; },
  });
  const marriages = useQuery({
    queryKey: ["family_marriages", familyId],
    queryFn: async () => { const { data } = await sb.rpc("shok_marriage_links", { p_family: familyId }); return (data ?? []) as Marriage[]; },
  });
  const history = useQuery({
    queryKey: ["family_history", familyId],
    enabled: showHistory,
    queryFn: async () => { const { data, error } = await sb.rpc("shok_family_history", { p_family: familyId, p_limit: 150 }); if (error) throw new Error(error.message); return (data ?? []) as History[]; },
  });

  const nameOf = new Map(members.map((m) => [m.id, (m.is_deceased ? (L ? "स्व. " : "Late ") : "") + m.name]));
  const withProfile = (profiles.data ?? []).filter((p) => nameOf.has(p.member_id));

  async function saveExtra() {
    const g = window.prompt(L ? "गोत्र (खाली छोड़ सकते हैं)" : "Gotra (may be left empty)", extra.data?.gotra ?? "");
    if (g === null) return;
    const k = window.prompt(L ? "कुलदेवी / कुलदेवता (खाली छोड़ सकते हैं)" : "Kuldevi / kuldevta (may be left empty)", extra.data?.kuldevi ?? "");
    if (k === null) return;
    const { error } = await sb.from("families").update({ gotra: g.trim() || null, kuldevi: k.trim() || null }).eq("id", familyId);
    if (error) { toast.error(error.message); return; }
    toast.success(L ? "सहेज लिया" : "Saved");
    void qc.invalidateQueries({ queryKey: ["family_extra", familyId] });
  }

  async function saveBirth() {
    if (!dobFor) return;
    const n = dob || ageIn.trim() === "" ? null : Number.parseInt(ageIn, 10);
    if (n !== null && !(n >= 0 && n <= 125)) { toast.error(L ? "उम्र 0 से 125 के बीच लिखिए" : "Age must be between 0 and 125"); return; }
    setBusy(true);
    const { error } = await sb.rpc("shok_member_birth_set", { p_member: dobFor, p_dob: dob || null, p_age: n });
    // निधन की तारीख (सिर्फ़ दिवंगत के लिए, भरी हो तो): पुण्यतिथि की याद इसी से आती है
    const dead = members.find((m) => m.id === dobFor)?.is_deceased;
    const e2 = !error && dead && deathIn ? (await sb.from("members").update({ death_date: deathIn }).eq("id", dobFor)).error : null;
    setBusy(false);
    if (error || e2) { toast.error((error ?? e2)!.message); return; }
    toast.success(L ? "सहेज लिया — क्रम उम्र के हिसाब से लग गया" : "Saved — siblings are now ordered by age");
    setDobFor(""); setDob(""); setAgeIn(""); setDeathIn("");
    void qc.invalidateQueries({ queryKey: ["family_ages", familyId] });
    void qc.invalidateQueries({ queryKey: ["family_members", familyId] });
  }
  const withAge = (ages.data ?? []).filter((x) => x.age !== null && nameOf.has(x.member_id));
  const settable = (ages.data ?? []).filter((x) => x.can_set && nameOf.has(x.member_id));

  function startEdit(memberId: string) {
    const p = (profiles.data ?? []).find((x) => x.member_id === memberId);
    setEditing(memberId); setBio(p?.bio ?? ""); setPhoto(null);
  }
  async function saveProfile() {
    if (!editing) return;
    setBusy(true);
    const { error } = await sb.rpc("shok_member_profile_save", { p_member: editing, p_photo: photo, p_bio: bio });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(L ? "सहेज लिया" : "Saved");
    setEditing(null);
    void qc.invalidateQueries({ queryKey: ["family_profiles", familyId] });
  }

  const current = editing ? (profiles.data ?? []).find((x) => x.member_id === editing) : undefined;
  const shown = photo === "" ? null : photo ?? current?.photo ?? null;

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-border bg-card p-4 text-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span><b>{L ? "गोत्र" : "Gotra"}:</b> {extra.data?.gotra || "—"}</span>
        <span><b>{L ? "कुलदेवी / कुलदेवता" : "Kuldevi / kuldevta"}:</b> {extra.data?.kuldevi || "—"}</span>
        {canEdit ? <Button size="sm" variant="outline" onClick={() => void saveExtra()}>{L ? "बदलें" : "Edit"}</Button> : null}
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => setShowHistory((v) => !v)}>{showHistory ? (L ? "इतिहास बंद करें" : "Hide history") : (L ? "बदलाव का इतिहास" : "Change history")}</Button>
      </div>

      {marriages.data?.length ? (
        <div>
          <p className="font-semibold">{L ? "विवाह की कड़ियाँ" : "Marriage links"}</p>
          <ul className="mt-1 space-y-0.5">
            {marriages.data.map((m) => (
              <li key={m.daughter_id}>
                {m.daughter_name}{m.father_name ? (L ? ` (पिता ${m.father_name})` : ` (father ${m.father_name})`) : ""} <span className="text-muted-foreground">— {m.daughter_family_name}</span>
                {" "}💍 {m.husband_name} <span className="text-muted-foreground">— {m.husband_family_name}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {withProfile.length || canProfile ? (
        <div>
          <p className="font-semibold">{L ? "फोटो और परिचय" : "Photos and short profiles"}</p>
          {withProfile.length ? (
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {withProfile.map((p) => (
                <li key={p.member_id} className="flex items-start gap-3">
                  {p.photo ? <img src={p.photo} alt="" className="size-12 shrink-0 rounded-full object-cover" /> : <span className="grid size-12 shrink-0 place-items-center rounded-full bg-muted">ℹ</span>}
                  <span className="min-w-0"><b>{nameOf.get(p.member_id)}</b>{p.bio ? <span className="block whitespace-pre-wrap text-muted-foreground">{p.bio}</span> : null}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-muted-foreground">{L ? "अभी किसी की फोटो या परिचय नहीं जोड़ा गया है।" : "No photo or profile added yet."}</p>}
          {canProfile ? (
            <div className="mt-3 space-y-2">
              <select className="h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 text-sm" value={editing ?? ""} onChange={(e) => (e.target.value ? startEdit(e.target.value) : setEditing(null))}>
                <option value="">{L ? "— किसकी फोटो / परिचय जोड़ना या बदलना है —" : "— Add or change a photo / profile for —"}</option>
                {members.filter((m) => !m.name_unknown).map((m) => <option key={m.id} value={m.id}>{nameOf.get(m.id)}</option>)}
              </select>
              {editing ? (
                <div className="space-y-2 rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    {shown ? <img src={shown} alt="" className="size-16 rounded-full object-cover" /> : <span className="grid size-16 place-items-center rounded-full bg-muted text-xs text-muted-foreground">{L ? "फोटो नहीं" : "No photo"}</span>}
                    <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) void shrink(f).then(setPhoto, () => toast.error(L ? "यह फोटो नहीं ली जा सकी" : "Could not use this photo")); }} />
                    {current?.photo && photo !== "" ? <Button size="sm" variant="outline" onClick={() => setPhoto("")}>{L ? "फोटो हटाएँ" : "Remove photo"}</Button> : null}
                  </div>
                  <textarea className="w-full rounded-md border border-input bg-background p-2 text-sm" rows={3} maxLength={800} value={bio} onChange={(e) => setBio(e.target.value)} placeholder={L ? "छोटा परिचय (मोबाइल नंबर या पता यहाँ न लिखें)" : "Short profile (no phone number or address here)"} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => void saveProfile()} disabled={busy}>{L ? "सहेजें" : "Save"}</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(null)}>{L ? "रद्द करें" : "Cancel"}</Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {withAge.length || settable.length ? (
        <div>
          <p className="font-semibold">{L ? "उम्र" : "Ages"}</p>
          {withAge.length ? (
            <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              {withAge.map((x) => <span key={x.member_id}>{nameOf.get(x.member_id)}: <b>{x.approx ? (L ? "लगभग " : "about ") : ""}{x.age}</b>{x.at_death ? (L ? " (निधन के समय)" : " (at death)") : ""}</span>)}
            </p>
          ) : null}
          {settable.length ? (
            <div className="mt-2 grid gap-2 sm:grid-cols-4">
              <select className="h-10 rounded-md border border-input bg-background px-3 text-sm sm:col-span-2" value={dobFor} onChange={(e) => { setDobFor(e.target.value); setDob(""); setAgeIn(""); }}>
                <option value="">{L ? "— किसकी जन्म तिथि / उम्र भरनी है —" : "— Enter date of birth / age for —"}</option>
                {settable.map((x) => <option key={x.member_id} value={x.member_id}>{nameOf.get(x.member_id)}</option>)}
              </select>
              {dobFor ? <input type="date" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={dob} onChange={(e) => setDob(e.target.value)} aria-label={L ? "जन्म तिथि" : "Date of birth"} /> : null}
              {dobFor ? <input type="number" min={0} max={125} className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={ageIn} onChange={(e) => setAgeIn(e.target.value)} placeholder={L ? "या उम्र (वर्ष)" : "or age (years)"} /> : null}
              {dobFor && members.find((m) => m.id === dobFor)?.is_deceased ? <label className="text-xs text-muted-foreground sm:col-span-2">{L ? "निधन की तारीख (पुण्यतिथि की याद के लिए)" : "Date of passing (for the anniversary reminder)"}<input type="date" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={deathIn} onChange={(e) => setDeathIn(e.target.value)} /></label> : null}
              {dobFor ? <Button size="sm" onClick={() => void saveBirth()} disabled={busy}>{L ? "सहेजें" : "Save"}</Button> : null}
            </div>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">{L ? "जन्म तिथि किसी को नहीं दिखती, सिर्फ़ उम्र दिखती है। भरते ही भाइयों / बहनों का क्रम उम्र के हिसाब से लग जाता है।" : "The date of birth is never shown, only the age. Saving puts brothers / sisters in order of age."}</p>
        </div>
      ) : null}

      {showHistory ? (
        <div>
          <p className="font-semibold">{L ? "बदलाव का इतिहास" : "Change history"}</p>
          {history.isLoading ? <p className="text-muted-foreground">…</p>
            : history.error ? <p className="text-destructive">{(history.error as Error).message}</p>
            : history.data?.length ? (
              <ul className="mt-1 max-h-80 space-y-1.5 overflow-auto">
                {history.data.map((r, i) => (
                  <li key={i} className="border-b border-border pb-1.5">
                    {r.summary}
                    <span className="block text-xs text-muted-foreground">{new Date(r.at).toLocaleString(L ? "hi-IN" : "en-IN")} · {r.actor_name}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-muted-foreground">{L ? "अभी कोई बदलाव दर्ज नहीं है (20 नवंबर 2026 से दर्ज होना शुरू हुआ)।" : "No changes recorded yet (recording started on 20 November 2026)."}</p>}
        </div>
      ) : null}
    </div>
  );
}
