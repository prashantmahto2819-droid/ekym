// Client-side photo helpers: shrink before upload (phones produce 5–10 MB photos), JPEG out.
import { supabase } from "@/integrations/supabase/client";

/** Resize an image file to fit `max` px on the long side, return a JPEG blob. */
export async function shrinkImage(file: File, max = 1000, quality = 0.85): Promise<Blob> {
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return file;
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * s), h = Math.round(bmp.height * s);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  c.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  return new Promise((res) => c.toBlob((b) => res(b ?? file), "image/jpeg", quality));
}

/** Resize + upload to a bucket path (overwrites). Returns the path. */
export async function uploadPhoto(bucket: string, path: string, file: File, max = 1000): Promise<string> {
  const blob = await shrinkImage(file, max);
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(error.message);
  return path;
}

/** Resize to a base64 data URL (for server functions that upload with the service role). */
export async function fileToDataUrl(file: File, max = 800): Promise<string> {
  const blob = await shrinkImage(file, max);
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(blob); });
}

/** Signed URLs for a private bucket (1 hour). */
export async function signedUrls(bucket: string, paths: string[]): Promise<Record<string, string>> {
  const clean = paths.filter(Boolean);
  if (!clean.length) return {};
  const { data } = await supabase.storage.from(bucket).createSignedUrls(clean, 3600);
  const out: Record<string, string> = {};
  for (const d of data ?? []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  return out;
}
export const publicUrl = (bucket: string, path: string) => supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
