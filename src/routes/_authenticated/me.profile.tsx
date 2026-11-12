// Edit my social profile: cover photo, display photo, display name, bio, details, interests, links, privacy (phone/email/DM).
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Camera } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Avatar } from "@/components/community/ChatBits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { call, uploadCommunityImage, useProfile, type Profile } from "@/community/chat";
import { useLang } from "@/core/i18n";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/me/profile")({
  head: () => ({ meta: [{ title: "मेरी प्रोफ़ाइल · My profile" }, { name: "robots", content: "noindex" }] }),
  component: EditProfile,
});

type Form = { display_name: string; bio: string; photo_url: string; cover_url: string; village: string; district: string; state: string; occupation: string; interests: string; links: Record<string, string>; show_phone: boolean; show_email: boolean; dm_from: string };

function EditProfile() {
  const { lang } = useLang(); const L = lang === "hi";
  const { user } = useAuth();
  const qc = useQueryClient();
  const p = useProfile(user?.id ?? null);
  const [f, setF] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null); const photoRef = useRef<HTMLInputElement>(null);
  type Occ = { birthday: string | null; anniversary: string | null; show_birthday: boolean; show_birth_year: boolean; show_anniversary: boolean };
  const occQ = useQuery({ queryKey: ["profile_occasions", user?.id], enabled: !!user, queryFn: () => call<Occ>("k1_profile_occasions", { p_user: user!.id }).catch(() => null) });
  const [occ, setOcc] = useState<Occ | null>(null);
  useEffect(() => { if (occQ.data && !occ) setOcc(occQ.data); }, [occQ.data, occ]);
  useEffect(() => {
    const d: Profile | null = p.data ?? null;
    if (d && !f) setF({ display_name: d.mine ? (d.name === "Member" ? "" : d.name) : "", bio: d.bio ?? "", photo_url: d.photo_url ?? "", cover_url: d.cover_url ?? "", village: d.village ?? "", district: d.district ?? "", state: d.state ?? "", occupation: d.occupation ?? "", interests: d.interests.join(", "), links: { facebook: d.links["facebook"] ?? "", instagram: d.links["instagram"] ?? "", youtube: d.links["youtube"] ?? "", website: d.links["website"] ?? "" }, show_phone: d.show_phone, show_email: d.show_email, dm_from: d.dm_from });
  }, [p.data, f]);
  if (!user || !f) return <section className="container-page py-10 text-sm text-muted-foreground">…</section>;
  const set = (k: keyof Form, v: unknown) => setF({ ...f, [k]: v } as Form);
  async function pick(kind: "cover" | "photo", file: File | undefined) {
    if (!file || !user) return;
    setBusy(true);
    try { const url = await uploadCommunityImage(file, `profiles/${user.id}`, kind === "cover" ? 1800 : 600); set(kind === "cover" ? "cover_url" : "photo_url", url); toast.success(L ? "फोटो लग गई — नीचे \"सहेजें\" दबाइए" : "Uploaded — press Save"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  }
  async function save() {
    if (!f) return;
    setBusy(true);
    try {
      await call("k1_profile_save", { p: { ...f, interests: f.interests.split(",").map((x) => x.trim()).filter(Boolean) } });
      if (occ) await call("k1_profile_save_occasions", { p_birthday: occ.birthday || null, p_anniversary: occ.anniversary || null, p_show_birthday: occ.show_birthday, p_show_birth_year: occ.show_birth_year, p_show_anniversary: occ.show_anniversary }).catch(() => undefined);
      await qc.invalidateQueries({ queryKey: ["profile_occasions"] }); await qc.invalidateQueries({ queryKey: ["occasions"] });
      await qc.invalidateQueries({ queryKey: ["profile"] }); await qc.invalidateQueries({ queryKey: ["feed"] });
      toast.success(L ? "प्रोफ़ाइल सहेज ली।" : "Saved");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  }
  return (
    <section className="container-page py-4 sm:py-6">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="relative h-44 bg-gradient-to-r from-primary/30 via-primary/15 to-amber-200/40 bg-cover bg-center sm:h-56" style={f.cover_url ? { backgroundImage: `url(${f.cover_url})` } : undefined}>
          <input ref={coverRef} type="file" accept="image/*" hidden onChange={(e) => void pick("cover", e.target.files?.[0])} />
          <Button size="sm" variant="secondary" className="absolute bottom-3 right-3" onClick={() => coverRef.current?.click()} disabled={busy}><Camera className="size-4" /> {L ? "कवर फोटो बदलें" : "Change cover"}</Button>
        </div>
        <div className="px-4 pb-5 sm:px-6">
          <div className="-mt-12 flex items-end gap-3">
            <div className="relative">
              <span className="block rounded-full border-4 border-card bg-card"><Avatar url={f.photo_url} name={f.display_name || p.data?.name || "?"} size={24} /></span>
              <input ref={photoRef} type="file" accept="image/*" hidden onChange={(e) => void pick("photo", e.target.files?.[0])} />
              <button type="button" onClick={() => photoRef.current?.click()} disabled={busy} className="absolute bottom-1 right-1 grid size-8 place-items-center rounded-full bg-primary text-primary-foreground shadow" title={L ? "प्रोफ़ाइल फोटो (DP) बदलें" : "Change photo"}><Camera className="size-4" /></button>
            </div>
            <div className="pb-2"><h1 className="font-display text-xl font-semibold">{L ? "मेरी प्रोफ़ाइल" : "My profile"}</h1><p className="text-xs text-muted-foreground"><Link to="/u/$id" params={{ id: user.id }} className="hover:underline">{L ? "जैसी दूसरों को दिखती है ↗" : "View as others see it ↗"}</Link></p></div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2"><span className="mb-1 block text-xs text-muted-foreground">{L ? "दिखने वाला नाम" : "Display name"}</span><Input value={f.display_name} onChange={(e) => set("display_name", e.target.value)} placeholder={p.data?.name} /></label>
            <label className="text-sm sm:col-span-2"><span className="mb-1 block text-xs text-muted-foreground">{L ? "अपने बारे में" : "About you"}</span><Textarea value={f.bio} onChange={(e) => set("bio", e.target.value)} rows={3} maxLength={1000} placeholder={L ? "परिचय, रुचियाँ, समाज के लिए क्या करते हैं…" : "Introduction, interests, what you do for the community…"} /></label>
            <label className="text-sm"><span className="mb-1 block text-xs text-muted-foreground">{L ? "कार्य / व्यवसाय" : "Work"}</span><Input value={f.occupation} onChange={(e) => set("occupation", e.target.value)} /></label>
            <label className="text-sm"><span className="mb-1 block text-xs text-muted-foreground">{L ? "गाँव / शहर" : "Village / city"}</span><Input value={f.village} onChange={(e) => set("village", e.target.value)} /></label>
            <label className="text-sm"><span className="mb-1 block text-xs text-muted-foreground">{L ? "ज़िला" : "District"}</span><Input value={f.district} onChange={(e) => set("district", e.target.value)} /></label>
            <label className="text-sm"><span className="mb-1 block text-xs text-muted-foreground">{L ? "राज्य" : "State"}</span><Input value={f.state} onChange={(e) => set("state", e.target.value)} /></label>
            <label className="text-sm sm:col-span-2"><span className="mb-1 block text-xs text-muted-foreground">{L ? "रुचियाँ (कॉमा से अलग)" : "Interests (comma separated)"}</span><Input value={f.interests} onChange={(e) => set("interests", e.target.value)} placeholder={L ? "समाज सेवा, संगीत, खेती…" : "Social work, music, farming…"} /></label>
            {(["facebook", "instagram", "youtube", "website"] as const).map((k) => <label key={k} className="text-sm"><span className="mb-1 block text-xs capitalize text-muted-foreground">{k}</span><Input value={f.links[k] ?? ""} onChange={(e) => set("links", { ...f.links, [k]: e.target.value })} placeholder="https://…" /></label>)}
          </div>
          <div className="mt-4 rounded-lg border border-amber-300/60 bg-amber-50/50 p-3 text-sm dark:bg-amber-950/20">
            <p className="mb-2 font-semibold">🎉 {L ? "जन्मदिन और विवाह वर्षगाँठ" : "Birthday & anniversary"}</p>
            <p className="mb-2 text-xs text-muted-foreground">{L ? "इस दिन समाज के लोग आपको शुभकामना दे सकेंगे, संगठन की ओर से बधाई आएगी और चौपाल पर पोस्ट बनेगी।" : "On the day, members can wish you, the organization greets you and a post appears on the wall."}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <label><span className="mb-1 block text-xs text-muted-foreground">🎂 {L ? "जन्मतिथि" : "Birthday"}</span><Input type="date" value={occ?.birthday ?? ""} onChange={(e) => setOcc({ ...(occ ?? { birthday: null, anniversary: null, show_birthday: true, show_birth_year: false, show_anniversary: true }), birthday: e.target.value || null })} /></label>
              <label><span className="mb-1 block text-xs text-muted-foreground">💐 {L ? "विवाह वर्षगाँठ" : "Anniversary"}</span><Input type="date" value={occ?.anniversary ?? ""} onChange={(e) => setOcc({ ...(occ ?? { birthday: null, anniversary: null, show_birthday: true, show_birth_year: false, show_anniversary: true }), anniversary: e.target.value || null })} /></label>
            </div>
            {occ ? <div className="mt-2 space-y-1 text-xs">
              <label className="flex items-center gap-2"><input type="checkbox" checked={occ.show_birthday} onChange={(e) => setOcc({ ...occ, show_birthday: e.target.checked })} /> {L ? "जन्मदिन सबको दिखे (दिन-महीना)" : "Show birthday (day & month)"}</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={occ.show_birth_year} onChange={(e) => setOcc({ ...occ, show_birth_year: e.target.checked })} /> {L ? "उम्र / जन्म-वर्ष भी दिखे" : "Also show birth year / age"}</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={occ.show_anniversary} onChange={(e) => setOcc({ ...occ, show_anniversary: e.target.checked })} /> {L ? "वर्षगाँठ सबको दिखे" : "Show anniversary"}</label>
            </div> : null}
          </div>
          <div className="mt-4 rounded-lg border border-border p-3 text-sm">
            <p className="mb-2 font-semibold">{L ? "गोपनीयता" : "Privacy"}</p>
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.show_phone} onChange={(e) => set("show_phone", e.target.checked)} /> {L ? "मेरा मोबाइल नंबर दूसरे सदस्यों को दिखे" : "Show my mobile number to members"}</label>
            <label className="mt-1 flex items-center gap-2"><input type="checkbox" checked={f.show_email} onChange={(e) => set("show_email", e.target.checked)} /> {L ? "मेरा ईमेल दूसरे सदस्यों को दिखे" : "Show my email to members"}</label>
            <label className="mt-2 flex items-center gap-2">{L ? "सीधे संदेश (DM):" : "Direct messages:"} <select value={f.dm_from} onChange={(e) => set("dm_from", e.target.value)} className="h-8 rounded-md border border-input bg-background px-2"><option value="members">{L ? "सभी सदस्य भेज सकें" : "Any member"}</option><option value="nobody">{L ? "कोई नहीं (सिर्फ़ चैनल)" : "Nobody (channels only)"}</option></select></label>
          </div>
          <div className="mt-4 flex justify-end gap-2"><Button asChild variant="outline"><Link to="/community/chat">{L ? "चैट पर जाएँ" : "Go to chat"}</Link></Button><Button onClick={() => void save()} disabled={busy}>{L ? "सहेजें" : "Save"}</Button></div>
        </div>
      </div>
    </section>
  );
}
