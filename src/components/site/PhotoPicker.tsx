// Photo field for forms: take a photo with the camera, pick one from the gallery / files, or reuse the member's
// community profile photo. Hands a File to the caller.
import { Camera, ImagePlus, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useMe } from "@/community/chat";

export function PhotoPicker({ value, onChange, hi, round = true }: { value: File | null; onChange: (f: File | null) => void; hi: boolean; round?: boolean }) {
  const cam = useRef<HTMLInputElement>(null);
  const gal = useRef<HTMLInputElement>(null);
  const { me } = useMe();
  const [busy, setBusy] = useState(false);
  const preview = useMemo(() => (value ? URL.createObjectURL(value) : null), [value]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  function take(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error(hi ? "कृपया फोटो चुनें" : "Please choose an image"); return; }
    if (f.size > 15 * 1024 * 1024) { toast.error(hi ? "फोटो 15 MB से छोटी चुनें" : "Choose a photo under 15 MB"); return; }
    onChange(f);
  }
  async function applyProfile() {
    if (!me?.photo) return;
    setBusy(true);
    try {
      const r = await fetch(me.photo); if (!r.ok) throw new Error(String(r.status));
      const b = await r.blob();
      onChange(new File([b], "profile.jpg", { type: b.type || "image/jpeg" }));
    } catch { toast.error(hi ? "प्रोफ़ाइल फोटो नहीं मिल पाई — गैलरी से चुनें" : "Could not load your profile photo — pick from gallery"); }
    finally { setBusy(false); }
  }
  const btn = "inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-sm font-medium transition hover:border-primary hover:text-primary disabled:opacity-50";
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative">
        {preview ? <img src={preview} alt="" className={`size-20 object-cover ring-2 ring-primary/30 ${round ? "rounded-full" : "rounded-xl"}`} />
          : <span className={`grid size-20 place-items-center bg-secondary text-muted-foreground ${round ? "rounded-full" : "rounded-xl"}`}><UserRound className="size-8" /></span>}
        {value ? <button type="button" onClick={() => onChange(null)} aria-label={hi ? "हटाएँ" : "Remove"} className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full bg-foreground text-background shadow"><X className="size-3.5" /></button> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={() => cam.current?.click()}><Camera className="size-4" />{hi ? "कैमरा से फोटो लें" : "Take a photo"}</button>
        <button type="button" className={btn} onClick={() => gal.current?.click()}><ImagePlus className="size-4" />{hi ? "गैलरी / फ़ाइल से चुनें" : "Choose from gallery"}</button>
        {me?.photo ? <button type="button" className={btn} disabled={busy} onClick={() => void applyProfile()}><UserRound className="size-4" />{busy ? "…" : hi ? "मेरी प्रोफ़ाइल फोटो लगाएँ" : "Use my profile photo"}</button> : null}
      </div>
      <input ref={cam} type="file" accept="image/*" capture="user" hidden onChange={(e) => { take(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={gal} type="file" accept="image/*" hidden onChange={(e) => { take(e.target.files?.[0]); e.target.value = ""; }} />
      <p className="basis-full text-xs text-muted-foreground">{hi ? "साफ़ चेहरे वाली हाल की फोटो लगाएँ। बड़ी फोटो अपने-आप छोटी हो जाती है।" : "Use a recent photo with a clear face. Large photos are reduced automatically."}</p>
    </div>
  );
}
