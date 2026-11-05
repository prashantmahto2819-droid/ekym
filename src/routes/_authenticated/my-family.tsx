// "मेरा परिवार": a signed-in member sees their family tree (as a tree), uploads photos, adds a second WhatsApp number,
// and suggests new people (brother / sister / son / daughter) — suggestions are approved by a family admin.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { FamilyChart } from "@/components/family/FamilyChart";
import { PageHeader } from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLang } from "@/core/i18n";
import { rpc, validPhone } from "@/family/api";
import type { Person } from "@/family/layout";
import { supabase } from "@/integrations/supabase/client";
import { normPhone } from "@/lib/comms";
import { publicUrl, uploadPhoto } from "@/lib/images";

export const Route = createFileRoute("/_authenticated/my-family")({ component: MyFamily });

type Fam = { family: { id: string; family_name: string; status: string; village: string | null }; members: Person[]; can_edit: boolean } | null;

function MyFamily() {
  const { lang } = useLang();
  const L = lang === "hi";
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["my_family"], queryFn: () => rpc<Fam>("k1_my_family", {}) });
  const [sel, setSel] = useState<Person | null>(null);
  const [phone2, setPhone2] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["my_family"] });
  const d = q.data;

  async function photo(p: Person, f: File) {
    setBusy(true);
    try { const path = await uploadPhoto("family-photos", `${d!.family.id}/${p.id}.jpg`, f, 600); await rpc("k1_member_update_contact", { p_member: p.id, p_photo: path, p_phone2: null }); toast.success(L ? "फोटो लग गई" : "Photo saved"); refresh(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function savePhone2(p: Person) {
    if (!validPhone(phone2)) { toast.error(L ? "10 अंकों का नंबर लिखिए" : "Enter a 10-digit number"); return; }
    setBusy(true);
    try { await rpc("k1_member_update_contact", { p_member: p.id, p_photo: null, p_phone2: normPhone(phone2) }); toast.success(L ? "दूसरा नंबर जुड़ गया" : "Second number saved"); setPhone2(""); refresh(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function suggest(kind: "brother" | "sister" | "son" | "daughter", p: Person) {
    const parentId = kind === "brother" || kind === "sister" ? p.parent_id : p.id;
    if (!parentId) { toast.error(L ? "इनके ऊपर पिता दर्ज नहीं — एडमिन से पूर्वज जुड़वाएँ।" : "No father recorded above this person — ask the admin to add an ancestor."); return; }
    const name = prompt(L ? `नया नाम (${kind === "brother" ? "भाई" : kind === "sister" ? "बहन" : kind === "son" ? "पुत्र" : "पुत्री"})` : `Name of the new ${kind}`); if (!name?.trim()) return;
    const ph = prompt(L ? "मोबाइल (वैकल्पिक)" : "Mobile (optional)") ?? "";
    setBusy(true);
    try {
      await rpc("suggest_member", { p_family: d!.family.id, p_parent: parentId, p_name: name.trim(), p_relation: kind === "sister" || kind === "daughter" ? "पुत्री" : "पुत्र", p_phone: ph.trim() ? normPhone(ph) : null, p_village: null, p_note: `kind=${kind}; via Kalchuri One`, p_native: null, p_deceased: false });
      toast.success(L ? "सुझाव भेजा — एडमिन की मंज़ूरी के बाद पेड़ में दिखेगा" : "Suggestion sent — appears after the family admin approves");
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title={L ? "मेरा परिवार" : "My family"} description={L ? "आपका वंश वृक्ष — फोटो लगाएँ, दूसरा WhatsApp नंबर जोड़ें, भाई-बहन / संतान का नाम सुझाएँ।" : "Your family tree — add photos, a second WhatsApp number, and suggest siblings or children."} crumbs={[{ label: L ? "मेरा परिवार" : "My family" }]} />
      <section className="section-y"><div className="container-page space-y-3">
        {q.isSuccess && !d ? (
          <div className="surface-card p-6 text-sm">
            <p>{L ? "आपका खाता अभी किसी परिवार से जुड़ा नहीं है।" : "Your account is not linked to a family yet."}</p>
            <p className="mt-1 text-muted-foreground">{L ? "सदस्यता फ़ॉर्म में मूल गाँव और मुखिया का नाम भरें; मंज़ूरी पर एडमिन आपको परिवार से जोड़ देगा। या " : "Fill native village and family head in the membership form; the admin links you on approval. Or "}<Link to="/join" className="underline">{L ? "सदस्य बनें" : "become a member"}</Link>.</p>
          </div>
        ) : null}
        {d ? (
          <>
            <p className="text-sm text-muted-foreground"><b>{d.family.family_name}</b>{d.family.village ? ` · ${d.family.village}` : ""} · {d.members.length} {L ? "सदस्य" : "members"} · {L ? "किसी व्यक्ति पर टैप करें" : "tap a person"}{d.can_edit ? <> · <Link to="/admin/families/$id" params={{ id: d.family.id }} className="underline">{L ? "पूरा संपादन (एडमिन)" : "Full editor (admin)"}</Link></> : null}</p>
            <FamilyChart people={d.members} selectedId={sel?.id ?? null} onSelect={setSel} height={520} lang={lang} />
            {sel ? (
              <div className="surface-card space-y-3 p-4 text-sm">
                <div className="flex items-center gap-3">
                  {sel.photo_path ? <img src={publicUrl("family-photos", sel.photo_path)} alt="" className="size-14 rounded-full object-cover" /> : <span className="grid size-14 place-items-center rounded-full bg-secondary text-xs text-muted-foreground">{L ? "फोटो" : "photo"}</span>}
                  <div><p className="font-display text-lg font-semibold">{sel.is_deceased ? "स्व. " : ""}{sel.name}</p><p className="text-xs text-muted-foreground">{[sel.relation, sel.village_name, sel.native_place ? `${L ? "मूल" : "native"}: ${sel.native_place}` : null].filter(Boolean).join(" · ")}</p>{sel.phone || sel.phone2 ? <p className="text-xs text-muted-foreground">WhatsApp: {[sel.phone, sel.phone2].filter(Boolean).join(", ")}</p> : null}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer rounded-md border border-border px-3 py-1.5">📷 {L ? "फोटो लगाएँ / बदलें" : "Add / change photo"}<input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void photo(sel, f); }} /></label>
                  {!sel.is_deceased ? <span className="flex items-center gap-1"><Input className="w-40" inputMode="numeric" placeholder={L ? "दूसरा WhatsApp नंबर" : "2nd WhatsApp number"} value={phone2} onChange={(e) => setPhone2(e.target.value)} /><Button size="sm" variant="outline" onClick={() => savePhone2(sel)} disabled={busy || !phone2}>{L ? "जोड़ें" : "Add"}</Button></span> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {sel.member_kind !== "spouse" ? <>
                    <Button size="sm" variant="outline" onClick={() => suggest("brother", sel)} disabled={busy}>+ {L ? "भाई" : "Brother"}</Button>
                    <Button size="sm" variant="outline" onClick={() => suggest("sister", sel)} disabled={busy}>+ {L ? "बहन" : "Sister"}</Button>
                    {sel.member_kind !== "daughter" ? <><Button size="sm" variant="outline" onClick={() => suggest("son", sel)} disabled={busy}>+ {L ? "पुत्र" : "Son"}</Button><Button size="sm" variant="outline" onClick={() => suggest("daughter", sel)} disabled={busy}>+ {L ? "पुत्री" : "Daughter"}</Button></> : null}
                  </> : null}
                  <span className="self-center text-xs text-muted-foreground">{L ? "नए नाम एडमिन की मंज़ूरी के बाद जुड़ते हैं" : "New names appear after the family admin approves"}</span>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div></section>
    </>
  );
}
