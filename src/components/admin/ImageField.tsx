// URL field with an "Upload" button: resizes on the client and stores the file in the public site-media bucket.
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTenant } from "@/core/tenant-context";
import { publicUrl, uploadPhoto } from "@/lib/images";

export function ImageField({ value, onChange, label = "Image", disabled, max = 1600, folder = "pages" }: { value: string; onChange: (url: string) => void; label?: string; disabled?: boolean | undefined; max?: number; folder?: string }) {
  const tenant = useTenant();
  const [busy, setBusy] = useState(false);
  async function pick(f: File | undefined) {
    if (!f) return;
    setBusy(true);
    try {
      const path = `${tenant.organization_id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
      await uploadPhoto("site-media", path, f, max);
      onChange(publicUrl("site-media", path));
      toast.success("Uploaded");
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        {value ? <img src={value} alt="" className="h-10 w-14 shrink-0 rounded border border-border object-cover" /> : null}
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://… or upload →" disabled={disabled} />
        <Button asChild size="sm" variant="outline" disabled={disabled || busy}><label className="cursor-pointer">{busy ? "…" : "Upload"}<input type="file" accept="image/*" hidden disabled={disabled || busy} onChange={(e) => void pick(e.target.files?.[0])} /></label></Button>
      </div>
    </label>
  );
}
