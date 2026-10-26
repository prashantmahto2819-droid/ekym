import { useRef, useState } from "react";
import { FileCheck2, FileUp } from "lucide-react";
import { toast } from "sonner";

import { compressImage } from "@/components/site/PhotoUpload";
import { Button } from "@/components/ui/button";

const MAX_PDF_BYTES = 1500 * 1024;

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload for a scanned document (hospital slip, ID proof). Photos are shrunk in the
 * browser before upload; PDFs are sent as-is within the size limit.
 */
export function DocumentUpload({
  value,
  onUpload,
  label = "Upload file",
  hint = "Photo or PDF. Photos are reduced automatically.",
  error,
}: {
  value?: string | null;
  onUpload: (dataUrl: string) => Promise<void>;
  label?: string;
  hint?: string;
  error?: string | undefined;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) {
      toast.error("Please choose a photo or a PDF");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = isImage ? await compressImage(file, 1400, 0.8) : await readAsDataUrl(file);
      if (isPdf && dataUrl.length * 0.75 > MAX_PDF_BYTES) {
        throw new Error("That PDF is too large. Please upload a smaller file or a photo instead.");
      }
      await onUpload(dataUrl);
      setFileName(file.name);
      setPreview(isImage ? dataUrl : null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not upload that file");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const done = Boolean(value);

  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-secondary">
          {preview ? (
            <img src={preview} alt="Selected file" className="h-full w-full object-cover" />
          ) : done ? (
            <FileCheck2 className="text-success size-6" />
          ) : (
            <FileUp className="size-5 text-muted-foreground" />
          )}
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
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
            {busy ? "Uploading…" : done ? "Change file" : label}
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">
            {done ? (fileName ?? "File uploaded") : hint}
          </p>
        </div>
      </div>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
