// 24-hour stories: strip of circles (mine first, unseen ringed), full-screen viewer with auto-advance, composer (photo or text).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Avatar } from "@/components/community/ChatBits";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { call, timeAgo, useMe } from "@/community/chat";
import { useConsent } from "@/components/community/ConsentGate";
import { useTenant } from "@/core/tenant-context";
import { supabase } from "@/integrations/supabase/client";

type Story = { id: string; path: string; caption: string | null; bg: string | null; created_at: string; expires_at: string; views: number; seen: boolean; visibility: string };
type Group = { user_id: string; name: string; photo: string | null; all_seen: boolean; mine: boolean; stories: Story[] };

const storyUrl = (path: string) => path ? supabase.storage.from("stories").getPublicUrl(path).data.publicUrl : "";
const BGS: Record<string, string> = { saffron: "from-orange-500 to-amber-300", royal: "from-indigo-700 to-fuchsia-500", forest: "from-emerald-700 to-lime-300", rose: "from-rose-500 to-orange-200", night: "from-slate-900 to-sky-700", classic: "from-primary to-amber-300" };

export function useStories(enabled: boolean) {
  const tenant = useTenant();
  return useQuery({ queryKey: ["stories", tenant.organization_id], enabled, refetchInterval: 60000, queryFn: () => call<Group[]>("k1_stories", { p_org: tenant.organization_id }).catch(() => [] as Group[]) });
}

/** Strip for the community wall / chat. */
export function StoriesStrip({ L, enabled }: { L: boolean; enabled: boolean }) {
  const q = useStories(enabled);
  const { me } = useMe();
  const [open, setOpen] = useState<number | null>(null);
  const [compose, setCompose] = useState(false);
  const consent = useConsent();
  if (!enabled) return null;
  const groups = q.data ?? [];
  const mine = groups.find((g) => g.mine);
  return (
    <section className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between"><p className="font-display text-sm font-semibold">📸 {L ? "स्टोरी" : "Stories"} <span className="font-normal text-muted-foreground">· {L ? "24 घंटे में अपने आप हट जाती है" : "disappears after 24 hours"}</span></p></div>
      <div className="mt-2 flex gap-3 overflow-x-auto pb-1">
        <button type="button" onClick={() => consent.ensure(() => setCompose(true))} className="flex w-16 shrink-0 flex-col items-center gap-1 text-center">
          <span className="relative"><Avatar url={me?.photo} name={me?.name ?? "+"} size={14} /><span className="absolute -bottom-0.5 -right-0.5 grid size-5 place-items-center rounded-full border-2 border-card bg-primary text-primary-foreground"><Plus className="size-3" /></span></span>
          <span className="w-full truncate text-[11px]">{L ? "मेरी स्टोरी" : "Your story"}</span>
        </button>
        {groups.map((g, i) => (
          <button key={g.user_id} type="button" onClick={() => setOpen(i)} className="flex w-16 shrink-0 flex-col items-center gap-1 text-center">
            <span className={`rounded-full p-0.5 ${g.all_seen ? "bg-muted" : "bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600"}`}><span className="block rounded-full border-2 border-card"><Avatar url={g.photo} name={g.name} size={13} /></span></span>
            <span className="w-full truncate text-[11px]">{g.mine ? (L ? "आप" : "You") : g.name.split(" ")[0]}</span>
          </button>
        ))}
        {q.isSuccess && !groups.length ? <p className="self-center text-xs text-muted-foreground">{L ? "अभी किसी की स्टोरी नहीं — पहली आप लगाइए!" : "No stories yet — post the first one!"}</p> : null}
      </div>
      {open !== null && groups[open] ? <StoryViewer groups={groups} index={open} L={L} onClose={() => setOpen(null)} onIndex={setOpen} /> : null}
      {compose ? <StoryComposer L={L} onClose={() => setCompose(false)} onDone={() => { setCompose(false); void q.refetch(); if (mine) setOpen(0); }} /> : null}
    </section>
  );
}

function StoryViewer({ groups, index, L, onClose, onIndex }: { groups: Group[]; index: number; L: boolean; onClose: () => void; onIndex: (i: number) => void }) {
  const g = groups[index]!;
  const qc = useQueryClient();
  const [si, setSi] = useState(() => Math.max(0, g.stories.findIndex((s) => !s.seen)));
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [viewers, setViewers] = useState<{ user_id: string; name: string; photo_url: string | null; viewed_at: string }[] | null>(null);
  const s = g.stories[Math.min(si, g.stories.length - 1)]!;
  const timer = useRef<number | null>(null);
  useEffect(() => { setSi(Math.max(0, g.stories.findIndex((x) => !x.seen))); setViewers(null); }, [index]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void call("k1_story_view", { p_story: s.id }).catch(() => undefined); setProgress(0); setViewers(null); }, [s.id]);
  useEffect(() => {
    if (paused || viewers) return;
    const dur = 6000; const start = Date.now() - progress * dur;
    timer.current = window.setInterval(() => {
      const p = (Date.now() - start) / dur;
      if (p >= 1) { next(); } else setProgress(p);
    }, 50);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [s.id, paused, viewers]); // eslint-disable-line react-hooks/exhaustive-deps
  function next() { if (si < g.stories.length - 1) setSi(si + 1); else if (index < groups.length - 1) onIndex(index + 1); else { void qc.invalidateQueries({ queryKey: ["stories"] }); onClose(); } }
  function prev() { if (si > 0) setSi(si - 1); else if (index > 0) onIndex(index - 1); }
  async function del() { if (!confirm(L ? "यह स्टोरी हटाएँ?" : "Delete this story?")) return; try { await call("k1_story_delete", { p_story: s.id }); toast.success(L ? "हटा दी।" : "Deleted"); await qc.invalidateQueries({ queryKey: ["stories"] }); onClose(); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } }
  async function showViewers() { setViewers(await call<typeof viewers>("k1_story_viewers", { p_story: s.id }).catch(() => [])); }
  const bg = BGS[s.bg ?? "classic"] ?? BGS["classic"];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95" onClick={onClose}>
      <div className="relative h-full w-full max-w-[480px] select-none sm:h-[92vh] sm:rounded-2xl sm:overflow-hidden" onClick={(e) => e.stopPropagation()} onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} onPointerLeave={() => setPaused(false)}>
        <div className="absolute inset-x-0 top-0 z-10 flex gap-1 p-2">{g.stories.map((x, i) => <span key={x.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30"><span className="block h-full bg-white" style={{ width: i < si ? "100%" : i === si ? `${progress * 100}%` : "0%" }} /></span>)}</div>
        <div className="absolute inset-x-0 top-4 z-10 flex items-center gap-2 p-2 text-white">
          <Avatar url={g.photo} name={g.name} size={9} />
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold drop-shadow">{g.name}</p><p className="text-[11px] opacity-80">{timeAgo(s.created_at, L)}{s.visibility === "friends" ? ` · 🤝 ${L ? "सिर्फ़ मित्र" : "friends"}` : ""}</p></div>
          {g.mine ? <><button type="button" className="rounded-full bg-black/40 px-2 py-1 text-xs" onClick={() => void showViewers()}>👁 {s.views}</button><button type="button" className="rounded-full bg-black/40 p-1.5" onClick={() => void del()}><Trash2 className="size-4" /></button></> : null}
          <button type="button" className="rounded-full bg-black/40 p-1.5" onClick={onClose}><X className="size-5" /></button>
        </div>
        {s.path ? <img src={storyUrl(s.path)} alt="" className="h-full w-full object-contain" /> : <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${bg} p-8 text-center text-2xl font-semibold leading-relaxed text-white drop-shadow`}>{s.caption}</div>}
        {s.path && s.caption ? <p className="absolute inset-x-0 bottom-6 mx-4 rounded-xl bg-black/50 px-3 py-2 text-center text-sm text-white">{s.caption}</p> : null}
        <button type="button" className="absolute inset-y-0 left-0 w-1/3" onClick={prev} aria-label="prev" />
        <button type="button" className="absolute inset-y-0 right-0 w-1/3" onClick={next} aria-label="next" />
        {viewers ? (
          <div className="absolute inset-x-0 bottom-0 z-20 max-h-[60%] overflow-y-auto rounded-t-2xl bg-background p-3 text-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between"><p className="font-semibold">👁 {L ? "किसने देखा" : "Viewed by"} ({viewers.length})</p><button type="button" onClick={() => setViewers(null)}><X className="size-4" /></button></div>
            <ul className="mt-2 space-y-1">{viewers.map((v) => <li key={v.user_id} className="flex items-center gap-2"><Avatar url={v.photo_url} name={v.name} size={7} /><span className="flex-1 truncate">{v.name}</span><span className="text-xs text-muted-foreground">{timeAgo(v.viewed_at, L)}</span></li>)}{!viewers.length ? <li className="text-muted-foreground">{L ? "अभी किसी ने नहीं देखा।" : "No views yet."}</li> : null}</ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StoryComposer({ L, onClose, onDone }: { L: boolean; onClose: () => void; onDone: () => void }) {
  const tenant = useTenant();
  const { user } = useMe();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [bg, setBg] = useState("classic");
  const [vis, setVis] = useState<"members" | "friends">("members");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  function pick(f: File | undefined) { if (!f) return; setFile(f); setPreview(URL.createObjectURL(f)); }
  async function post() {
    if (!user) return;
    if (!file && !caption.trim()) { toast.error(L ? "फोटो चुनिए या कुछ लिखिए" : "Pick a photo or write something"); return; }
    setBusy(true);
    try {
      let path = "";
      if (file) {
        // shrink to ≤1080px JPEG (≈100–200 KB) so storage stays tiny; GIFs kept as-is up to 2 MB
        let blob: Blob = file; let ext = "jpg";
        if (file.type === "image/gif") { if (file.size > 2 * 1024 * 1024) throw new Error(L ? "GIF 2 MB से छोटी रखें" : "GIF must be under 2 MB"); ext = "gif"; }
        else {
          const bmp = await createImageBitmap(file); const sc = Math.min(1, 1080 / Math.max(bmp.width, bmp.height));
          const c = document.createElement("canvas"); c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
          c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
          blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => b ? res(b) : rej(new Error("encode")), "image/jpeg", 0.82));
        }
        path = `${user.id}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("stories").upload(path, blob, { contentType: ext === "gif" ? "image/gif" : "image/jpeg" });
        if (error) throw new Error(error.message);
      }
      await call("k1_story_add", { p_org: tenant.organization_id, p_path: path, p_caption: caption.trim() || null, p_visibility: vis, p_bg: file ? null : bg });
      toast.success(L ? "स्टोरी लग गई — 24 घंटे बाद अपने आप हट जाएगी।" : "Story posted — it disappears after 24 hours.");
      onDone();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="font-display">📸 {L ? "नई स्टोरी" : "New story"}</DialogTitle></DialogHeader>
        <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
        {preview ? <div className="relative"><img src={preview} alt="" className="max-h-72 w-full rounded-lg object-contain bg-black" /><button type="button" className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white" onClick={() => { setFile(null); setPreview(null); }}><X className="size-4" /></button></div>
          : <div className={`grid h-48 place-items-center rounded-lg bg-gradient-to-br ${BGS[bg]} p-4 text-center text-xl font-semibold text-white`}>{caption || (L ? "फोटो चुनिए या नीचे लिखिए" : "Pick a photo or write below")}</div>}
        <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => ref.current?.click()}>🖼 {L ? "फोटो चुनें" : "Choose photo"}</Button>
          {!file ? <div className="flex gap-1">{Object.keys(BGS).map((k) => <button key={k} type="button" onClick={() => setBg(k)} className={`h-7 w-7 rounded-full bg-gradient-to-br ${BGS[k]} ${bg === k ? "ring-2 ring-primary ring-offset-2" : ""}`} />)}</div> : null}</div>
        <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={2} maxLength={300} placeholder={L ? "कुछ लिखिए (वैकल्पिक)" : "Say something (optional)"} />
        <div className="flex items-center justify-between gap-2 text-sm">
          <select value={vis} onChange={(e) => setVis(e.target.value as typeof vis)} className="h-9 rounded-md border border-input bg-background px-2"><option value="members">👥 {L ? "समुदाय के सदस्य" : "Community members"}</option><option value="friends">🤝 {L ? "सिर्फ़ मित्र" : "Friends only"}</option></select>
          <Button onClick={() => void post()} disabled={busy}>{L ? "स्टोरी लगाएँ" : "Post story"}</Button>
        </div>
        <p className="text-[11px] text-muted-foreground">{L ? "स्टोरी 24 घंटे बाद अपने आप मिट जाती है (फोटो समेत)। अधिकतम 10 एक समय में।" : "Stories delete themselves after 24 hours (photo included). Max 10 at a time."}</p>
      </DialogContent>
    </Dialog>
  );
}
