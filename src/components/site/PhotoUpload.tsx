import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/**
 * Shrinks a picked image in the browser (long edge <= 800px, JPEG) so uploads stay
 * small, then hands the compressed data URL to the caller.
 */
export async function compressImage(file: File, maxEdge = 800, quality = 0.8): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process that image");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  let q = quality;
  let dataUrl = canvas.toDataURL("image/jpeg", q);
  // Keep shrinking until comfortably under the 400KB server limit.
  while (dataUrl.length * 0.75 > 380 * 1024 && q > 0.4) {
    q -= 0.1;
    dataUrl = canvas.toDataURL("image/jpeg", q);
  }
  return dataUrl;
}

export function PhotoUpload({
  value,
  previewUrl,
  onUpload,
  label = "Upload photo",
  hint = "Passport-style photo. Large pictures are reduced automatically.",
}: {
  value?: string | null;
  previewUrl?: string | null;
  onUpload: (dataUrl: string) => Promise<void>;
  label?: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const shown = localPreview ?? previewUrl ?? null;

  async function pick(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await compressImage(file);
      await onUpload(dataUrl);
      setLocalPreview(dataUrl);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not upload that photo");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="h-20 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-secondary">
        {shown ? (
          <img src={shown} alt="Selected photo" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
            No photo
          </div>
        )}
      </div>
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void pick(e.target.files?.[0])}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Uploading…" : value || shown ? "Change photo" : label}
        </Button>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}
