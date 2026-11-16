// अपनी पोस्ट बदलें: पाठ, लिंक, फोटो हटाना / बदलना / संपादित करना (काटना, स्टिकर, लिखावट) / नई जोड़ना। RPC k1_post_edit.
import { ImagePlus, Pencil, RefreshCw, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ImageEditor } from "@/components/community/ImageEditor";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTenant } from "@/core/tenant-context";
import { supabase } from "@/integrations/supabase/client";

type Item = { key: string; path?: string; file?: File };
type PostLike = { id: string; body: string | null; media: { type: string; path: string }[]; link_url: string | null };

const pubUrl = (path: string) => supabase.storage.from("community").getPublicUrl(path).data.publicUrl;
const kindOf = (url: string) => (/youtu\.?be/.test(url) ? "youtube" : /instagram\.com/.test(url) ? "instagram" : /facebook\.com|fb\.watch/.test(url) ? "facebook" : "other");
let seq = 0;

export function EditPost({ p, L, onClose, onSaved }: { p: PostLike; L: boolean; onClose: () => void; onSaved: () => void }) {
  const tenant = useTenant();
  const [body, setBody] = useState(p.body ?? "");
  const [link, setLink] = useState(p.link_url ?? "");
  const [items, setItems] = useState<Item[]>(() => (p.media ?? []).filter((m) => m.type === "image").map((m) => ({ key: `o${seq++}`, path: m.path })));
  const [editing, setEditing] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);
  const urls = useMemo(() => new Map(items.filter((i) => i.file).map((i) => [i.key, URL.createObjectURL(i.file!)])), [items]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);
  const src = (i: Item) => (i.file ? urls.get(i.key)! : pubUrl(i.path!));

  const replace = (key: string, file: File) => setItems((xs) => xs.map((x) => (x.key === key ? { key: `n${seq++}`, file } : x)));
  const pickFor = (key: string | null) => {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.multiple = key === null;
    inp.onchange = () => {
      const fs = [...(inp.files ?? [])];
      if (key) { if (fs[0]) replace(key, fs[0]); }
      else setItems((xs) => [...xs, ...fs.map((f) => ({ key: `n${seq++}`, file: f }))].slice(0, 6));
    };
    inp.click();
  };

  async function save() {
    if (!body.trim() && !link.trim() && !items.length) { toast.error(L ? "पोस्ट खाली नहीं हो सकती" : "Post can't be empty"); return; }
    setBusy(true);
    try {
      const uid = (await supabase.auth.getUser()).data.user!.id;
      const media: { type: string; path: string }[] = [];
      for (const it of items) {
        if (it.path) { media.push({ type: "image", path: it.path }); continue; }
        const f = it.file!;
        if (f.size > 5 * 1024 * 1024) throw new Error(L ? "फोटो 5 MB से छोटी रखें" : "Images must be under 5 MB");
        const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${tenant.organization_id}/posts/${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const { error } = await supabase.storage.from("community").upload(path, f, { contentType: f.type || "image/jpeg" });
        if (error) throw error;
        media.push({ type: "image", path });
      }
      const { error } = await supabase.rpc("k1_post_edit" as never, { p_post: p.id, p_body: body.trim() || null, p_media: media, p_link: link.trim() || null, p_link_kind: link.trim() ? kindOf(link.trim()) : null } as never);
      if (error) throw new Error(error.message);
      // हटाई / बदली गई पुरानी फोटो storage से भी हटाएँ (न हो सके तो कोई बात नहीं)
      const gone = (p.media ?? []).map((m) => m.path).filter((x) => !media.some((m) => m.path === x));
      if (gone.length) void supabase.storage.from("community").remove(gone).then(() => undefined, () => undefined);
      toast.success(L ? "पोस्ट बदल दी" : "Post updated");
      onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  }

  return (
    <>
      <Dialog open onOpenChange={(o) => { if (!o && !busy) onClose(); }}>
        <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">✏️ {L ? "पोस्ट बदलें" : "Edit post"}</DialogTitle></DialogHeader>
          <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} placeholder={L ? "पोस्ट का पाठ" : "Post text"} />
          <div className="space-y-1.5">
            <p className="text-sm font-medium">{L ? "फोटो" : "Photos"} <span className="text-xs font-normal text-muted-foreground">({items.length}/6)</span></p>
            {items.length ? (
              <div className="grid grid-cols-3 gap-1.5">
                {items.map((it) => (
                  <div key={it.key} className="group relative aspect-square overflow-hidden rounded-lg bg-secondary">
                    <img src={src(it)} alt="" className="size-full object-cover" />
                    <button type="button" aria-label={L ? "हटाएँ" : "Remove"} onClick={() => setItems((xs) => xs.filter((x) => x.key !== it.key))} className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-black/65 text-white"><X className="size-4" /></button>
                    <div className="absolute inset-x-1 bottom-1 flex gap-1">
                      <button type="button" onClick={() => setEditing(it)} className="flex flex-1 items-center justify-center gap-1 rounded-md bg-black/65 py-1 text-[11px] text-white"><Pencil className="size-3" />{L ? "संपादित" : "Edit"}</button>
                      <button type="button" onClick={() => pickFor(it.key)} className="flex flex-1 items-center justify-center gap-1 rounded-md bg-black/65 py-1 text-[11px] text-white"><RefreshCw className="size-3" />{L ? "बदलें" : "Replace"}</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {items.length < 6 ? <Button type="button" size="sm" variant="outline" onClick={() => pickFor(null)}><ImagePlus className="size-4" /> {L ? "फोटो जोड़ें" : "Add photos"}</Button> : null}
          </div>
          <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder={L ? "लिंक (वैकल्पिक)" : "Link (optional)"} />
          <p className="text-[11px] text-muted-foreground">{L ? "बदली हुई पोस्ट फिर से जाँची जाती है।" : "Edited posts are checked again."}</p>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose} disabled={busy}>{L ? "रद्द" : "Cancel"}</Button><Button onClick={() => void save()} disabled={busy}>{busy ? "…" : L ? "सहेजें" : "Save"}</Button></div>
          {editing ? <ImageEditor src={editing.file ?? pubUrl(editing.path!)} L={L} onClose={() => setEditing(null)} onDone={(f) => { replace(editing.key, f); setEditing(null); }} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
