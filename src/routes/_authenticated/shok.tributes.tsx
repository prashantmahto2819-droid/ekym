// श्रद्धांजलि पेज बनाना / बदलना / साझा करना / संदेश मंज़ूर करना — हर संस्था के सदस्यों के लिए (अपनी संस्था के पेज)।
import type { SupabaseClient } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLang } from "@/core/i18n";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as unknown as SupabaseClient;

export const Route = createFileRoute("/_authenticated/shok/tributes")({ component: TributesPage });

type Row = { id: string; slug: string; name: string; death_date: string | null; place: string | null; status: string; mine: boolean; by: string | null; messages: number; pending: number };
type Msg = { id: number; name: string; place: string | null; message: string; status: string; at: string };
type Full = { id: string; slug: string; name: string; photo: string | null; birth_date: string | null; death_date: string | null; place: string | null; about: string | null; ceremony: string | null; family_line: string | null; status: string; messages: Msg[] };
type Form = { name: string; birth_date: string; death_date: string; place: string; family_line: string; about: string; ceremony: string };
const EMPTY: Form = { name: "", birth_date: "", death_date: "", place: "", family_line: "", about: "", ceremony: "" };

function shrink(file: File): Promise<string> {
  return new Promise((ok, bad) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 640 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      let q = 0.82;
      let out = c.toDataURL("image/jpeg", q);
      while (out.length > 380000 && q > 0.4) { q -= 0.1; out = c.toDataURL("image/jpeg", q); }
      if (out.length > 380000) bad(new Error("too big")); else ok(out);
    };
    img.onerror = () => bad(new Error("bad image"));
    img.src = URL.createObjectURL(file);
  });
}

function TributesPage() {
  const L = useLang().lang === "hi";
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const list = useQuery({ queryKey: ["tributes"], queryFn: async () => { const { data, error } = await sb.rpc("shok_tributes_list"); if (error) throw new Error(error.message); return (data ?? []) as Row[]; } });
  const full = useQuery({ queryKey: ["tribute", openId], enabled: !!openId, queryFn: async () => { const { data } = await sb.rpc("shok_tribute_admin_get", { p_id: openId }); return (data ?? null) as Full | null; } });
  const url = (slug: string) => `${window.location.origin}/shradhanjali/${slug}`;
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function startNew() { setEditing("new"); setForm(EMPTY); setPhoto(null); }
  function startEdit(t: Full) {
    setEditing(t.id); setPhoto(null);
    setForm({ name: t.name, birth_date: t.birth_date ?? "", death_date: t.death_date ?? "", place: t.place ?? "", family_line: t.family_line ?? "", about: t.about ?? "", ceremony: t.ceremony ?? "" });
  }
  async function save(extra: Record<string, string> = {}, base: Form = form, id: string | null = editing === "new" ? null : editing) {
    if (!base.name.trim()) { toast.error(L ? "नाम लिखिए" : "Please enter the name"); return; }
    setBusy(true);
    const p: Record<string, string> = { ...base, ...extra };
    if (photo !== null) p["photo"] = photo;
    const { data, error } = await sb.rpc("shok_tribute_save", { p_id: id, p });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(L ? "सहेज लिया" : "Saved");
    setEditing(null);
    const saved = data as { id: string } | null;
    if (saved?.id) setOpenId(saved.id);
    void list.refetch(); void full.refetch();
  }
  async function setMsg(m: Msg, status: string) {
    const { error } = await sb.rpc("shok_tribute_message_set", { p_msg: m.id, p_status: status });
    if (error) { toast.error(error.message); return; }
    void full.refetch(); void list.refetch();
  }
  async function remove(t: Full) {
    if (!window.confirm(L ? "यह पेज और इसके सारे संदेश हमेशा के लिए मिट जाएँगे। हटाएँ?" : "This page and all its messages will be deleted for good. Remove?")) return;
    const { error } = await sb.rpc("shok_tribute_remove", { p_id: t.id });
    if (error) { toast.error(error.message); return; }
    setOpenId(null); void list.refetch();
  }
  const share = (slug: string, name: string) => (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" asChild><a href={url(slug)} target="_blank" rel="noopener noreferrer">{L ? "पेज खोलें" : "Open page"}</a></Button>
      <Button size="sm" variant="outline" onClick={() => void navigator.clipboard.writeText(url(slug)).then(() => toast.success(L ? "लिंक कॉपी हो गया" : "Link copied"))}>{L ? "लिंक कॉपी करें" : "Copy link"}</Button>
      <Button size="sm" variant="outline" asChild><a target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`${name} ${L ? "को श्रद्धांजलि 🙏\nयहाँ अपने शब्द लिखिए:" : "— tribute 🙏\nWrite your words here:"}\n${url(slug)}`)}`}>{L ? "WhatsApp पर साझा करें" : "Share on WhatsApp"}</a></Button>
    </div>
  );
  const card = "rounded-xl border border-border bg-card p-4";
  const t = full.data;

  return (
    <section className="container-page max-w-3xl space-y-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link to="/shok" className="text-xs text-muted-foreground hover:underline">← {L ? "शोक पत्र व वंश वृक्ष" : "Shok & family tree"}</Link>
          <h1 className="font-display text-2xl font-semibold">{L ? "श्रद्धांजलि पेज" : "Tribute pages"}</h1>
          <p className="text-sm text-muted-foreground">{L ? "दिवंगत की स्मृति में एक पेज। लिंक आप खुद साझा करते हैं — यहाँ से किसी को अपने आप संदेश नहीं जाता।" : "A page in memory of the departed. You share the link yourself — nothing is sent automatically."}</p>
        </div>
        <Button onClick={startNew}>+ {L ? "नया पेज" : "New page"}</Button>
      </div>

      {editing ? (
        <div className={`${card} space-y-2`}>
          <h2 className="font-semibold">{editing === "new" ? (L ? "नया श्रद्धांजलि पेज" : "New tribute page") : (L ? "पेज बदलें" : "Edit page")}</h2>
          <Input value={form.name} maxLength={120} onChange={set("name")} placeholder={L ? "दिवंगत का नाम" : "Name of the departed"} />
          <label className="block text-sm">{L ? "फोटो" : "Photo"} <input type="file" accept="image/*" className="ml-2" onChange={(e) => { const f = e.target.files?.[0]; if (f) void shrink(f).then(setPhoto, () => toast.error(L ? "यह फोटो नहीं ली जा सकी" : "Could not use this photo")); }} /></label>
          {photo ? <img src={photo} alt="" className="h-24 w-20 rounded-lg object-cover" /> : null}
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-sm">{L ? "जन्म तिथि" : "Date of birth"}<Input type="date" value={form.birth_date} onChange={set("birth_date")} /></label>
            <label className="text-sm">{L ? "निधन तिथि" : "Date of passing"}<Input type="date" value={form.death_date} onChange={set("death_date")} /></label>
          </div>
          <Input value={form.place} maxLength={120} onChange={set("place")} placeholder={L ? "गाँव / शहर" : "Village / city"} />
          <Textarea value={form.family_line} rows={2} maxLength={500} onChange={set("family_line")} placeholder={L ? "परिवार (पत्नी, पुत्र …)" : "Family (wife, sons …)"} />
          <Textarea value={form.about} rows={5} maxLength={4000} onChange={set("about")} placeholder={L ? "जीवन परिचय" : "About their life"} />
          <Textarea value={form.ceremony} rows={3} maxLength={1000} onChange={set("ceremony")} placeholder={L ? "कार्यक्रम की जानकारी (यह सबको दिखेगा)" : "Ceremony details (visible to everyone)"} />
          <div className="flex gap-2">
            <Button onClick={() => void save()} disabled={busy}>{L ? "सहेजें" : "Save"}</Button>
            <Button variant="outline" onClick={() => setEditing(null)}>{L ? "रद्द करें" : "Cancel"}</Button>
          </div>
        </div>
      ) : null}

      {openId && t && !editing ? (
        <div className={`${card} space-y-3`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">{t.name}{t.status === "hidden" ? <span className="ml-2 rounded bg-secondary px-2 py-0.5 text-xs">{L ? "छिपा हुआ" : "Hidden"}</span> : null}</h2>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => startEdit(t)}>{L ? "बदलें" : "Edit"}</Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => void save({ status: t.status === "hidden" ? "published" : "hidden" }, { name: t.name, birth_date: t.birth_date ?? "", death_date: t.death_date ?? "", place: t.place ?? "", family_line: t.family_line ?? "", about: t.about ?? "", ceremony: t.ceremony ?? "" }, t.id)}>{t.status === "hidden" ? (L ? "फिर से दिखाएँ" : "Show again") : (L ? "पेज छिपाएँ" : "Hide page")}</Button>
              <Button size="sm" variant="outline" onClick={() => void remove(t)}>{L ? "हटाएँ" : "Remove"}</Button>
              <Button size="sm" variant="outline" onClick={() => setOpenId(null)}>{L ? "बंद करें" : "Close"}</Button>
            </div>
          </div>
          {share(t.slug, t.name)}
          <ul className="divide-y divide-border">
            {t.messages.length ? t.messages.map((m) => (
              <li key={m.id} className="py-2">
                <b>{m.name}</b>{m.place ? <span className="text-muted-foreground"> · {m.place}</span> : null}
                {m.status !== "visible" ? <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">{m.status === "pending" ? (L ? "मंज़ूरी बाकी" : "Awaiting approval") : (L ? "छिपा हुआ" : "Hidden")}</span> : null}
                <p className="whitespace-pre-wrap text-sm">{m.message}</p>
                <div className="mt-1 flex gap-2">
                  {m.status !== "visible" ? <Button size="sm" onClick={() => void setMsg(m, "visible")}>{m.status === "pending" ? (L ? "मंज़ूर करें" : "Approve") : (L ? "फिर दिखाएँ" : "Show")}</Button> : null}
                  {m.status !== "hidden" ? <Button size="sm" variant="outline" onClick={() => void setMsg(m, "hidden")}>{L ? "छिपाएँ" : "Hide"}</Button> : null}
                </div>
              </li>
            )) : <li className="py-2 text-muted-foreground">{L ? "अभी कोई संदेश नहीं आया।" : "No messages yet."}</li>}
          </ul>
        </div>
      ) : null}

      {list.isLoading ? <p className="text-muted-foreground">…</p> : list.error ? <p className="text-destructive">{(list.error as Error).message}</p> : (list.data ?? []).length ? (
        <ul className="space-y-2">
          {(list.data ?? []).map((r) => (
            <li key={r.id} className={card}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <b>{r.name}</b>{r.status === "hidden" ? <span className="ml-2 rounded bg-secondary px-2 py-0.5 text-xs">{L ? "छिपा हुआ" : "Hidden"}</span> : null}
                  <p className="text-xs text-muted-foreground">{[r.place, !r.mine && r.by ? `${L ? "बनाने वाले" : "By"}: ${r.by}` : null].filter(Boolean).join(" · ")}</p>
                  <p className="text-sm">{r.messages} {L ? "संदेश" : "messages"}{r.pending ? <b className="text-red-700"> · {r.pending} {L ? "मंज़ूरी बाकी" : "awaiting approval"}</b> : null}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => { setEditing(null); setOpenId(r.id); }}>{r.pending ? (L ? "संदेश देखें / मंज़ूर करें" : "Review messages") : (L ? "खोलें / बदलें" : "Open / edit")}</Button>
              </div>
              <div className="mt-2">{share(r.slug, r.name)}</div>
            </li>
          ))}
        </ul>
      ) : <p className={`${card} text-muted-foreground`}>{L ? "अभी कोई श्रद्धांजलि पेज नहीं है। \"+ नया पेज\" से बनाइए।" : "No tribute pages yet. Create one with \"+ New page\"."}</p>}
    </section>
  );
}
