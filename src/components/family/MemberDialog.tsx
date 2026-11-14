// Add / edit a family member (son, daughter, wife, head). Mirrors shokpatra's memberForm rules.
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ensureVillage, phoneCheck, RELATIONS, rpc, validPhone, type Origin, type Village } from "@/family/api";
import { publicUrl, uploadPhoto } from "@/lib/images";
import type { Person } from "@/family/layout";
import { supabase } from "@/integrations/supabase/client";
import { normPhone } from "@/lib/comms";

export type MemberDialogProps = {
  open: boolean;
  /** savedName is set after a successful save (used to warn about the same name in other trees) */
  onClose: (saved: boolean, savedName?: string) => void;
  familyId: string;
  familyVillage: string | null;
  villages: Village[];
  origins: Origin[];
  members: (Person & { village_id?: string | null })[];
  /** parent to add under (null = root/head) */
  addUnder: Person | null;
  edit: (Person & { village_id?: string | null }) | null;
  kind: "son" | "daughter" | "spouse";
  asHead: boolean;
  isAdmin: boolean;
  hideContacts: boolean;
  L: boolean;
};

export function MemberDialog(p: MemberDialogProps) {
  const { L } = p;
  const [name, setName] = useState("");
  const [unknown, setUnknown] = useState(false);
  const [deceased, setDeceased] = useState(false);
  const [relation, setRelation] = useState(RELATIONS[1]!);
  const [phone, setPhone] = useState("");
  const [phone2, setPhone2] = useState("");
  const [noWa, setNoWa] = useState(false); // "इस नंबर पर WhatsApp नहीं चलता" → letters go to eldest son / branch head in his name
  const [photo, setPhoto] = useState<File | null>(null);
  const [native, setNative] = useState("");
  const [village, setVillage] = useState("");
  const [busy, setBusy] = useState(false);
  const isHead = p.edit ? !!p.edit.is_head : p.asHead;
  const kind = p.edit ? ((p.edit.member_kind as "son" | "daughter" | "spouse") || "son") : p.kind;
  const vName = (id: string | null | undefined) => p.villages.find((v) => v.id === id)?.name ?? "";

  useEffect(() => {
    if (!p.open) return;
    const e = p.edit;
    setName(e && !e.name_unknown ? e.name : "");
    setUnknown(!!e?.name_unknown);
    setDeceased(!!e?.is_deceased);
    setRelation(e?.relation ?? (isHead ? RELATIONS[0]! : RELATIONS[1]!));
    setPhone(p.hideContacts ? "" : (e?.phone ?? "").replace(/^91/, ""));
    setPhone2(p.hideContacts ? "" : (e?.phone2 ?? "").replace(/^91/, ""));
    setNoWa((e as { whatsapp_ok?: boolean | null } | null)?.whatsapp_ok === false);
    setPhoto(null);
    setNative(e?.native_place ?? p.addUnder?.native_place ?? "");
    setVillage(vName(e?.village_id) || vName((p.addUnder as { village_id?: string | null } | null)?.village_id) || p.familyVillage || "");
  }, [p.open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    const nm = name.trim();
    if (!nm && !unknown) { toast.error(L ? "नाम लिखिए, या \"नाम याद नहीं\" चुनिए।" : "Enter a name or tick \"name not known\"."); return; }
    if (kind !== "son" && !nm) { toast.error(L ? "पत्नी / पुत्री का नाम लिखिए।" : "Enter the name."); return; }
    if (deceased && isHead) { toast.error(L ? "मुखिया जीवित सदस्य होना चाहिए।" : "The head must be a living member."); return; }
    const ph = deceased ? "" : phone.trim();
    if (ph && !validPhone(ph)) { toast.error(L ? "मोबाइल नंबर सही नहीं है (10 अंक)।" : "Invalid mobile number (10 digits)."); return; }
    setBusy(true);
    try {
      const inList = p.origins.find((o) => o.name.trim().toLowerCase() === native.trim().toLowerCase());
      const village_id = await ensureVillage(village, p.villages);
      const row: Record<string, unknown> = {
        name: nm || "नाम याद नहीं", name_unknown: !nm, is_deceased: deceased, native_place: (inList?.name ?? native.trim()) || null,
        relation: kind === "spouse" ? "पत्नी" : kind === "daughter" ? "पुत्री" : relation, village_id,
      };
      const keepPhone = p.hideContacts && p.edit && !ph && !deceased;
      if (!keepPhone) row["phone"] = ph ? normPhone(ph) : null;
      // hand-marked "no WhatsApp" stays; a changed number starts unknown again (the gateway re-checks on first send)
      const prevOk = (p.edit as { whatsapp_ok?: boolean | null } | null)?.whatsapp_ok ?? null;
      row["whatsapp_ok"] = noWa ? false : (p.edit && (keepPhone || row["phone"] === p.edit.phone) ? prevOk : null);
      const ph2 = deceased ? "" : phone2.trim();
      if (ph2 && !validPhone(ph2)) { toast.error(L ? "दूसरा मोबाइल नंबर सही नहीं है।" : "Second mobile number is invalid."); setBusy(false); return; }
      if (!(p.hideContacts && p.edit && !ph2)) row["phone2"] = ph2 ? normPhone(ph2) : null;
      if (photo) row["photo_path"] = await uploadPhoto("family-photos", `${p.familyId}/${p.edit?.id ?? crypto.randomUUID()}.jpg`, photo, 600);
      if (row["phone"] && (!p.edit || row["phone"] !== p.edit.phone)) {
        const hits = await phoneCheck(ph, p.familyId, p.edit?.id ?? null);
        if (hits.length) {
          const m = hits[0]!;
          const who = [m.name, m.family_name && `${L ? "परिवार" : "family"}: ${m.family_name}`, m.village_name].filter(Boolean).join(" · ");
          if (p.isAdmin) {
            if (confirm(L ? `यह नंबर पहले से "${who}" के पास है। एडमिन के नाते फिर भी रखें? (रद्द = बिना नंबर सहेजें)` : `This number already belongs to "${who}". Keep it anyway as admin? (Cancel = save without the number)`)) row["phone_dup_ok"] = true;
            else row["phone"] = null;
          } else if (confirm(L ? `यह नंबर पहले से "${who}" के पास है। बिना नंबर के सहेजें?` : `This number already belongs to "${who}". Save without a number?`)) row["phone"] = null;
          else { setBusy(false); return; }
        }
      }
      if (p.edit) {
        const { error } = await supabase.from("members").update(row as never).eq("id", p.edit.id);
        if (error) throw error;
      } else {
        const siblings = p.members.filter((m) => m.parent_id === (p.addUnder ? p.addUnder.id : null) && ((m.member_kind as string) || "son") === kind);
        const { error } = await supabase.from("members").insert({ ...row, family_id: p.familyId, parent_id: p.addUnder ? p.addUnder.id : null, is_head: isHead, member_kind: kind, sort_order: siblings.length } as never);
        if (error) throw error;
      }
      if (native.trim() && !inList) {
        // not in the origin list → ask the super admin to add it (max 20 pending per user)
        try { await rpc("request_origin_village", { p_name: native.trim(), p_region: null }); } catch { /* optional */ }
      }
      toast.success(L ? "सहेज लिया।" : "Saved");
      p.onClose(true, nm || undefined);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  }

  const title = p.edit ? (L ? "सदस्य की जानकारी बदलें" : "Edit member")
    : isHead && kind === "spouse" ? (L ? `परिवार की मुखिया (${p.addUnder?.name} की पत्नी)` : `Family head (wife of ${p.addUnder?.name})`)
    : isHead ? (L ? "परिवार के मुखिया (पिता)" : "Family head")
    : kind === "spouse" ? `${p.addUnder?.name} ${L ? "की पत्नी" : "— wife"}`
    : kind === "daughter" ? `${p.addUnder?.name} ${L ? "की पुत्री" : "— daughter"}`
    : `${p.addUnder?.name} ${L ? "के पुत्र / अगली पीढ़ी" : "— son / next generation"}`;

  return (
    <Dialog open={p.open} onOpenChange={(o) => { if (!o) p.onClose(false); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="grid gap-3 text-sm">
          <L1 label={L ? "पूरा नाम" : "Full name"} hint={L ? "नाम याद न हो तो खाली छोड़कर नीचे टिक कीजिए" : "leave empty and tick below if not known"}><Input value={name} onChange={(e) => setName(e.target.value)} disabled={unknown} autoFocus /></L1>
          <div className="flex flex-wrap gap-4">
            {kind === "son" ? <label className="flex items-center gap-2"><Checkbox checked={unknown} onCheckedChange={(v) => setUnknown(v === true)} /> {L ? "नाम याद नहीं (बाद में भरेंगे)" : "Name not known yet"}</label> : null}
            {!isHead ? <label className="flex items-center gap-2"><Checkbox checked={deceased} onCheckedChange={(v) => setDeceased(v === true)} /> {L ? "दिवंगत (स्व.)" : "Deceased (late)"}</label> : null}
          </div>
          {kind === "son" ? (
            <L1 label={L ? "रिश्ता" : "Relation"}><select className="h-9 w-full rounded-md border border-input bg-background px-2" value={relation} onChange={(e) => setRelation(e.target.value)}>{RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}</select></L1>
          ) : null}
          <L1 label={L ? "फोटो (ज़रूरी नहीं)" : "Photo (optional)"}><div className="flex items-center gap-2">{photo ? <img src={URL.createObjectURL(photo)} alt="" className="size-10 rounded-full object-cover" /> : p.edit?.photo_path ? <img src={publicUrl("family-photos", p.edit.photo_path)} alt="" className="size-10 rounded-full object-cover" /> : null}<input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} /></div></L1>
          {!deceased ? <L1 label={L ? "दूसरा WhatsApp नंबर (ज़रूरी नहीं)" : "Second WhatsApp number (optional)"}><Input inputMode="numeric" maxLength={12} value={phone2} onChange={(e) => setPhone2(e.target.value)} /></L1> : null}
          {!deceased ? <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={noWa} onChange={(e) => setNoWa(e.target.checked)} className="mt-1" /><span>{L ? "इस नंबर पर WhatsApp नहीं चलता (शोकपत्र इनके नाम से बड़े पुत्र / शाखा के मुखिया के WhatsApp पर जाएगा)" : "No WhatsApp on this number (letters go in his name to the eldest son / branch head)"}</span></label> : null}
          {!deceased ? <L1 label={L ? "मोबाइल नंबर (ज़रूरी नहीं)" : "Mobile (optional)"} hint={p.hideContacts && p.edit ? (L ? "नंबर आपके लिए छिपा है; खाली छोड़ेंगे तो वही रहेगा" : "hidden for you; leave empty to keep") : undefined}><Input inputMode="numeric" maxLength={12} value={phone} onChange={(e) => setPhone(e.target.value)} /></L1> : null}
          <L1 label={L ? "मूल ग्राम" : "Native village (origin)"} hint={L ? "सूची से चुनिए; न हो तो लिख दीजिए (एडमिन जोड़ देगा)" : "pick from the list or type (admin will add it)"}>
            <Input list="k1-origins" value={native} onChange={(e) => setNative(e.target.value)} />
            <datalist id="k1-origins">{p.origins.map((o) => <option key={o.id} value={o.name}>{o.region_name}</option>)}</datalist>
          </L1>
          <L1 label={L ? "वर्तमान निवास (गाँव / शहर)" : "Current residence (village / city)"} hint={L ? "खाली छोड़ेंगे तो परिवार का गाँव" : "empty = family's village"}>
            <Input list="k1-villages" value={village} onChange={(e) => setVillage(e.target.value)} />
            <datalist id="k1-villages">{p.villages.map((v) => <option key={v.id} value={v.name} />)}</datalist>
          </L1>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => p.onClose(false)}>{L ? "रद्द" : "Cancel"}</Button>
          <Button onClick={save} disabled={busy}>{busy ? "…" : (L ? "सहेजें" : "Save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function L1({ label, hint, children }: { label: string; hint?: string | undefined; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">{label}{hint ? <span className="font-normal"> · {hint}</span> : null}</span>{children}</label>;
}
