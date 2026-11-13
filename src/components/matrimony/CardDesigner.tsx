// Biodata card designer: template, colour, font, size, photo shape, fields, headline; live preview; JPG / PDF download,
// phone share sheet, and the share link + QR (off / members / anyone with the link).
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { signedUrls } from "@/lib/images";

import { DEFAULT_OPTS, FONTS, renderCard, SIZES, TEMPLATES, toJpg, toPdf, type CardData, type CardOpts, type FieldKey } from "./biodataCard";
import { readExtra } from "./extraFields";

type Mine = { id: string; display_name: string; gender: string; birth_year: number; height_cm: number | null; education: string | null; profession: string | null; income_range: string | null; city: string | null; district: string | null; gotra: string | null; native_place: string | null; created_for: string | null; interests: string | null; about: string | null; expectations: string | null; special_note: string | null; contact_phone: string | null; photo_path: string | null; photos: string[] | null; card: Partial<CardOpts> | null; share_token: string | null; share_mode: "off" | "members" | "link"; share_image: string | null; share_views: number; verified_at: string | null; status: string; org: string | null; extra_fields: unknown };
const rpc = async <T,>(fn: string, args: Record<string, unknown>): Promise<T> => { const { data, error } = await supabase.rpc(fn as never, args as never); if (error) throw new Error(error.message); return data as T; };

const FIELD_LABELS: [FieldKey, string, string][] = [
  ["age", "आयु", "Age"], ["height", "कद", "Height"], ["education", "शिक्षा", "Education"], ["profession", "व्यवसाय", "Profession"], ["income", "आय", "Income"],
  ["city", "निवास", "City"], ["gotra", "गोत्र", "Gotra"], ["native", "मूल ग्राम", "Native place"], ["created_for", "किसके लिए", "Profile for"],
  ["interests", "रुचियाँ", "Interests"], ["about", "परिचय", "About"], ["expectations", "अपेक्षाएँ", "Expectations"], ["special_note", "विशेष", "Note"], ["extra", "और जानकारी (बिंदुवार)", "More details"],
];
const ACCENTS = ["", "#d4a64a", "#be123c", "#c2410c", "#15803d", "#1d4ed8", "#7c3aed", "#0f766e"];

export function CardDesigner({ profileId, L, onClose }: { profileId: string; L: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const prof = useQuery({ queryKey: ["matri_mine_full", profileId], queryFn: () => rpc<Mine>("k1_matrimony_mine", { p_profile: profileId }) });
  const p = prof.data;
  const [o, setO] = useState<CardOpts>(DEFAULT_OPTS);
  const [token, setToken] = useState<string | null>(null);
  const [mode, setMode] = useState<"off" | "members" | "link">("off");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const paths = useMemo(() => p ? [p.photo_path, ...(p.photos ?? [])].filter((x, i, a): x is string => !!x && a.indexOf(x) === i) : [], [p]);
  const urls = useQuery({ queryKey: ["matri_card_urls", paths.join("|")], enabled: paths.length > 0, staleTime: 50 * 60_000, queryFn: () => signedUrls("matrimony", paths) });

  useEffect(() => {
    if (!p) return;
    setO({ ...DEFAULT_OPTS, ...(p.card ?? {}), fields: { ...DEFAULT_OPTS.fields, ...(p.card?.fields ?? {}) } });
    setMode(p.share_mode ?? "off");
    if (p.share_token) setToken(p.share_token);
    else void rpc<string>("k1_matrimony_share", { p_profile: p.id, p_mode: "off" }).then(setToken).catch(() => undefined);
  }, [p?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const shareUrl = token && typeof window !== "undefined" ? `${window.location.origin}/m/${token}` : null;
  const data: CardData | null = p ? {
    name: p.display_name, gender: p.gender, birth_year: p.birth_year, height_cm: p.height_cm, education: p.education, profession: p.profession, income_range: p.income_range,
    city: p.city, district: p.district, gotra: p.gotra, native_place: p.native_place, created_for: p.created_for, interests: p.interests, about: p.about, expectations: p.expectations,
    special_note: p.special_note, contact_phone: p.contact_phone, org: p.org, photos: paths.map((x) => urls.data?.[x] ?? "").filter(Boolean), qrUrl: shareUrl, extra: readExtra(p.extra_fields),
  } : null;

  // re-render the preview (debounced)
  useEffect(() => {
    if (!data || (paths.length && !urls.data)) return;
    const t = setTimeout(() => { void renderCard(data, o).then((c) => { canvasRef.current = c; setPreview(c.toDataURL("image/jpeg", 0.8)); }).catch((e: Error) => toast.error(e.message)); }, 250);
    return () => clearTimeout(t);
  }, [JSON.stringify(o), p?.id, urls.data, shareUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof CardOpts>(k: K, v: CardOpts[K]) => setO((x) => ({ ...x, [k]: v }));
  const fileName = `${(p?.display_name ?? "biodata").replace(/\s+/g, "-")}-biodata`;
  function dl(blob: Blob, name: string) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
  async function saveDesign() { if (!p) return; try { await rpc("k1_matrimony_card_save", { p_profile: p.id, p_card: o }); toast.success(L ? "डिज़ाइन सहेज लिया" : "Design saved"); } catch (e) { toast.error((e as Error).message); } }
  async function jpg() { if (canvasRef.current) dl(await toJpg(canvasRef.current, 0.92), `${fileName}.jpg`); }
  async function pdf() { if (canvasRef.current) dl(await toPdf(canvasRef.current, p?.display_name ?? "Biodata"), `${fileName}.pdf`); }
  async function nativeShare() {
    if (!canvasRef.current) return;
    const file = new File([await toJpg(canvasRef.current, 0.9)], `${fileName}.jpg`, { type: "image/jpeg" });
    const text = `${p?.display_name ?? ""} — ${L ? "वैवाहिक परिचय" : "Marriage biodata"}${shareUrl && mode !== "off" ? `\n${shareUrl}` : ""}`;
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text }).catch(() => undefined); }
    else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }
  async function applyShare(next: "off" | "members" | "link") {
    if (!p || !user) return;
    setBusy(true);
    try {
      let image: string | null = null;
      if (next !== "off" && canvasRef.current && token) {
        const path = `matri/${user.id}/${token}.jpg`;
        const { error } = await supabase.storage.from("community").upload(path, await toJpg(canvasRef.current, 0.85), { contentType: "image/jpeg", upsert: true });
        if (error) throw new Error(error.message);
        image = `${supabase.storage.from("community").getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
      }
      const tok = await rpc<string>("k1_matrimony_share", { p_profile: p.id, p_mode: next, p_image: image });
      setToken(tok); setMode(next);
      if (next === "off" && token) await supabase.storage.from("community").remove([`matri/${user.id}/${token}.jpg`]);
      await rpc("k1_matrimony_card_save", { p_profile: p.id, p_card: o }).catch(() => undefined);
      toast.success(next === "off" ? (L ? "शेयर बंद — QR अब कुछ नहीं दिखाएगा" : "Sharing off") : (L ? "शेयर चालू — कार्ड का QR अब काम करेगा" : "Sharing on — the QR now works"));
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  const verified = !!p?.verified_at && p?.status === "active";

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-h-[96vh] max-w-6xl overflow-y-auto p-3 sm:p-5">
        <DialogHeader><DialogTitle className="font-display">🎨 {L ? "बायोडाटा कार्ड — डिज़ाइन, डाउनलोड, शेयर" : "Biodata card — design, download, share"}</DialogTitle></DialogHeader>
        {!p ? <p className="text-sm text-muted-foreground">…</p> : (
          <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
            <div className="space-y-4 text-sm">
              <section>
                <p className="mb-1 font-semibold">{L ? "डिज़ाइन (टेम्पलेट)" : "Template"}</p>
                <div className="grid grid-cols-2 gap-2">{TEMPLATES.map((t) => <button key={t.id} type="button" onClick={() => setO((x) => ({ ...x, template: t.id, accent: undefined }))} className={`rounded-lg border p-1 text-left text-xs ${o.template === t.id ? "border-primary ring-2 ring-primary/30" : "border-border"}`}><span className="mb-1 block h-10 rounded" style={{ background: `linear-gradient(135deg, ${t.bg[0]}, ${t.bg[1]})`, borderBottom: `3px solid ${t.accent}` }} />{L ? t.name_hi : t.name}</button>)}</div>
              </section>
              <section>
                <p className="mb-1 font-semibold">{L ? "मुख्य रंग" : "Accent colour"}</p>
                <div className="flex flex-wrap items-center gap-2">{ACCENTS.map((a) => <button key={a || "default"} type="button" onClick={() => set("accent", a || undefined)} className={`h-7 w-7 rounded-full border ${(o.accent ?? "") === a ? "ring-2 ring-primary ring-offset-2" : ""}`} style={{ background: a || "conic-gradient(#d4a64a,#be123c,#1d4ed8,#d4a64a)" }} title={a || (L ? "टेम्पलेट का" : "template default")} />)}<input type="color" value={o.accent || "#d4a64a"} onChange={(e) => set("accent", e.target.value)} className="h-7 w-10" /></div>
              </section>
              <section className="grid grid-cols-2 gap-2">
                <label><span className="mb-1 block text-xs text-muted-foreground">{L ? "आकार" : "Size"}</span><select className="h-9 w-full rounded-md border border-input bg-background px-2" value={o.size} onChange={(e) => set("size", e.target.value as CardOpts["size"])}><option value="story">{L ? "मोबाइल / WhatsApp (लंबा)" : "Phone / story"} {SIZES.story.join("×")}</option><option value="portrait">{L ? "पोस्ट (4:5)" : "Post (4:5)"}</option><option value="a4">A4 {L ? "(प्रिंट)" : "(print)"}</option></select></label>
                <label><span className="mb-1 block text-xs text-muted-foreground">{L ? "भाषा" : "Language"}</span><select className="h-9 w-full rounded-md border border-input bg-background px-2" value={o.lang} onChange={(e) => set("lang", e.target.value as CardOpts["lang"])}><option value="hi">हिंदी</option><option value="en">English</option></select></label>
                <label><span className="mb-1 block text-xs text-muted-foreground">{L ? "फ़ॉन्ट" : "Font"}</span><select className="h-9 w-full rounded-md border border-input bg-background px-2" value={o.font} onChange={(e) => set("font", e.target.value as CardOpts["font"])}>{FONTS.map((f) => <option key={f.id} value={f.id}>{L ? f.label : f.en}</option>)}</select></label>
                <label><span className="mb-1 block text-xs text-muted-foreground">{L ? "फोटो का आकार" : "Photo shape"}</span><select className="h-9 w-full rounded-md border border-input bg-background px-2" value={o.photoShape} onChange={(e) => set("photoShape", e.target.value as CardOpts["photoShape"])}><option value="circle">{L ? "गोल" : "Circle"}</option><option value="arch">{L ? "मेहराब" : "Arch"}</option><option value="rounded">{L ? "आयत" : "Rounded"}</option></select></label>
              </section>
              <label className="block"><span className="mb-1 block text-xs text-muted-foreground">{L ? "शीर्षक" : "Headline"}</span><Input value={o.headline ?? ""} onChange={(e) => set("headline", e.target.value)} placeholder={o.lang === "hi" ? "शुभ विवाह हेतु परिचय" : "Marriage Biodata"} /></label>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <label className="flex items-center gap-1"><input type="checkbox" checked={o.invocation} onChange={(e) => set("invocation", e.target.checked)} /> {L ? "॥ श्री गणेशाय नमः ॥" : "Invocation line"}</label>
                <label className="flex items-center gap-1"><input type="checkbox" checked={o.extraPhotos} onChange={(e) => set("extraPhotos", e.target.checked)} /> {L ? "बाकी फोटो भी" : "More photos"}</label>
                <label className="flex items-center gap-1"><input type="checkbox" checked={o.showContact} onChange={(e) => set("showContact", e.target.checked)} /> {L ? "मोबाइल नंबर कार्ड पर" : "Mobile on card"}</label>
              </div>
              {o.showContact ? <p className="rounded bg-amber-50 px-2 py-1 text-[11px] text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{L ? "ध्यान दें: कार्ड जिसके पास भी पहुँचेगा, वह नंबर देख लेगा।" : "Anyone who gets the card will see the number."}</p> : null}
              <section>
                <p className="mb-1 font-semibold">{L ? "कार्ड पर क्या दिखे" : "Fields on the card"}</p>
                <p className="mb-1 text-[11px] text-muted-foreground">{L ? "बहुत जानकारी हो तो \"मोबाइल / WhatsApp (लंबा)\" आकार चुनें — छोटे आकार में जो न समाए वह अपने-आप छूट जाता है।" : "With many details choose the tall phone size — what does not fit a smaller size is left out automatically."}</p><div className="grid grid-cols-2 gap-1 text-xs">{FIELD_LABELS.map(([k, hi, en]) => <label key={k} className="flex items-center gap-1"><input type="checkbox" checked={!!o.fields[k]} onChange={(e) => set("fields", { ...o.fields, [k]: e.target.checked })} /> {L ? hi : en}</label>)}</div>
              </section>
              <label className="block"><span className="mb-1 block text-xs text-muted-foreground">{L ? "नीचे की पंक्ति (वैकल्पिक)" : "Footer line (optional)"}</span><Input value={o.footerNote ?? ""} onChange={(e) => set("footerNote", e.target.value)} placeholder="Kalchuri One · kalchuri.org" /></label>
              <Button variant="outline" size="sm" onClick={() => void saveDesign()}>{L ? "यह डिज़ाइन सहेजें" : "Save this design"}</Button>
            </div>
            <div className="space-y-3">
              <div className="grid place-items-center rounded-lg border border-border bg-secondary/40 p-2">{preview ? <img src={preview} alt="" className="max-h-[62vh] w-auto rounded shadow" /> : <p className="py-20 text-sm text-muted-foreground">{L ? "कार्ड बन रहा है…" : "Rendering…"}</p>}</div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void jpg()} disabled={!preview}>⬇ JPG</Button>
                <Button variant="outline" onClick={() => void pdf()} disabled={!preview}>⬇ PDF</Button>
                <Button variant="outline" onClick={() => void nativeShare()} disabled={!preview}>📤 {L ? "शेयर (WhatsApp आदि)" : "Share"}</Button>
              </div>
              <section className="rounded-lg border border-border p-3 text-sm">
                <p className="font-semibold">🔗 {L ? "QR / लिंक से कौन देख सके" : "Who can open the QR / link"}</p>
                {!verified ? <p className="mt-1 text-xs text-amber-700">{L ? "एडमिन सत्यापन के बाद ही शेयर चालू होगा। तब तक कार्ड का QR \"उपलब्ध नहीं\" दिखाएगा।" : "Sharing opens after admin verification; until then the QR shows 'unavailable'."}</p> : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  {([["off", L ? "बंद" : "Off"], ["members", L ? "सिर्फ़ समाज के सदस्य (लॉगिन)" : "Members only (sign-in)"], ["link", L ? "लिंक वाला कोई भी" : "Anyone with the link"]] as const).map(([k, l]) => <Button key={k} size="sm" variant={mode === k ? "default" : "outline"} disabled={busy || (!verified && k !== "off")} onClick={() => void applyShare(k)}>{l}</Button>)}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{L ? "\"लिंक वाला कोई भी\" में भी नंबर नहीं दिखता (जब तक आप कार्ड पर न डालें); रुचि भेजने के लिए लोगों को साइट पर लॉगिन करना होगा। बंद करते ही QR काम करना बंद कर देता है।" : "Even with link sharing the phone stays hidden (unless you put it on the card); to send interest people must sign in. Turning it off disables the QR."}</p>
                {shareUrl ? <div className="mt-2 flex items-center gap-2"><Input readOnly value={shareUrl} className="h-8 text-xs" /><Button size="sm" variant="ghost" onClick={() => { void navigator.clipboard.writeText(shareUrl); toast.success(L ? "लिंक कॉपी" : "Copied"); }}>{L ? "कॉपी" : "Copy"}</Button></div> : null}
                {p.share_views ? <p className="mt-1 text-xs text-muted-foreground">👁 {p.share_views} {L ? "बार खोला गया" : "views"}</p> : null}
              </section>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
