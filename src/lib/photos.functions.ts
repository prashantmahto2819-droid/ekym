import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const PHOTO_BUCKET = "volunteer-photos";

/** Roles allowed to see and replace an applicant's photo. */
const MANAGER_ROLES = ["SUPER_ADMIN", "ADMIN", "VOLUNTEER_MANAGER", "STAFF"];

const MAX_BYTES = 400 * 1024; // photos are compressed in the browser before upload

const photoSchema = z.object({
  dataUrl: z
    .string()
    .trim()
    .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, "Please choose a valid image"),
});
export type PhotoUploadInput = z.infer<typeof photoSchema>;

function decode(dataUrl: string) {
  const [header, b64] = dataUrl.split(",");
  const contentType = header!.slice(5, header!.indexOf(";"));
  const bytes = Buffer.from(b64!, "base64");
  if (bytes.byteLength > MAX_BYTES) {
    throw new Error("That photo is too large. Please choose a smaller image.");
  }
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  return { bytes, contentType, ext };
}

/** Public upload used by the volunteer registration form (before an account exists). */
export const uploadApplicantPhoto = createServerFn({ method: "POST" })
  .inputValidator((d: PhotoUploadInput) => {
    const r = photoSchema.safeParse(d);
    if (!r.success) throw new Error(r.error.issues[0]?.message ?? "Please choose a valid image");
    return r.data;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { bytes, contentType, ext } = decode(data.dataUrl);
    const path = `applicants/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from(PHOTO_BUCKET)
      .upload(path, bytes, { contentType, upsert: false });
    if (error) throw new Error(error.message);
    return { path };
  });

async function isManager(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).some((r: { role: string }) => MANAGER_ROLES.includes(r.role));
}

/** Short-lived signed URL for a stored applicant photo. */
export const applicantPhotoUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { path: string }) => z.object({ path: z.string().trim().min(3) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!(await isManager(context.supabase, context.userId))) {
      // Applicants may only see their own photo.
      const { data: own } = await supabaseAdmin
        .from("volunteer_applications")
        .select("id")
        .eq("user_id", context.userId)
        .eq("photo", data.path)
        .maybeSingle();
      if (!own) throw new Error("Not allowed");
    }
    const { data: signed, error } = await supabaseAdmin.storage
      .from(PHOTO_BUCKET)
      .createSignedUrl(data.path, 600);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

/** Staff replace an applicant's photo (bad scan, wrong person, low quality). */
export const replaceApplicantPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; dataUrl: string }) =>
    z.object({ id: z.string().uuid(), dataUrl: photoSchema.shape.dataUrl }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!(await isManager(context.supabase, context.userId))) throw new Error("Not allowed");

    const { bytes, contentType, ext } = decode(data.dataUrl);
    const path = `applicants/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from(PHOTO_BUCKET)
      .upload(path, bytes, { contentType, upsert: false });
    if (error) throw new Error(error.message);

    const { data: row } = await supabaseAdmin
      .from("volunteer_applications")
      .select("photo")
      .eq("id", data.id)
      .maybeSingle();
    const previous = (row as { photo: string | null } | null)?.photo ?? null;

    const { error: upErr } = await supabaseAdmin
      .from("volunteer_applications")
      .update({ photo: path, updated_by: context.userId } as never)
      .eq("id", data.id);
    if (upErr) throw new Error(upErr.message);

    if (previous && previous !== path && !previous.startsWith("http")) {
      await supabaseAdmin.storage.from(PHOTO_BUCKET).remove([previous]);
    }
    return { path };
  });

/* ------------------- BLOOD REQUISITION SLIPS ------------------- */

export const SLIP_BUCKET = "blood-requisitions";

const SLIP_MAX_BYTES = 1500 * 1024;

/** Roles allowed to open an uploaded hospital requisition slip. */
const BLOOD_ROLES = ["SUPER_ADMIN", "ADMIN", "BLOOD_MANAGER", "STAFF"];

const slipSchema = z.object({
  dataUrl: z
    .string()
    .trim()
    .regex(
      /^data:(image\/(jpeg|png|webp)|application\/pdf);base64,[A-Za-z0-9+/=]+$/,
      "Please choose a photo or PDF of the requisition slip",
    ),
});
export type SlipUploadInput = z.infer<typeof slipSchema>;

function decodeSlip(dataUrl: string) {
  const [header, b64] = dataUrl.split(",");
  const contentType = header!.slice(5, header!.indexOf(";"));
  const bytes = Buffer.from(b64!, "base64");
  if (bytes.byteLength > SLIP_MAX_BYTES) {
    throw new Error("That file is too large. Please upload a smaller photo or PDF.");
  }
  const ext =
    contentType === "application/pdf"
      ? "pdf"
      : contentType === "image/png"
        ? "png"
        : contentType === "image/webp"
          ? "webp"
          : "jpg";
  return { bytes, contentType, ext };
}

/** Public upload used by the blood requirement form (requester has no account). */
export const uploadRequisitionSlip = createServerFn({ method: "POST" })
  .inputValidator((d: SlipUploadInput) => {
    const r = slipSchema.safeParse(d);
    if (!r.success) throw new Error(r.error.issues[0]?.message ?? "Please choose a valid file");
    return r.data;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { bytes, contentType, ext } = decodeSlip(data.dataUrl);
    const path = `requisitions/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from(SLIP_BUCKET)
      .upload(path, bytes, { contentType, upsert: false });
    if (error) throw new Error(error.message);
    return { path };
  });

/** Short-lived signed URL so the blood team can check a slip. Never public. */
export const requisitionSlipUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { path: string }) => z.object({ path: z.string().trim().min(3) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const allowed = (roles ?? []).some((r: { role: string }) => BLOOD_ROLES.includes(r.role));
    if (!allowed) throw new Error("Not allowed");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from(SLIP_BUCKET)
      .createSignedUrl(data.path, 600);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });
