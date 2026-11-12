import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PHOTO_BUCKET } from "@/lib/photos.functions";


function siteUrl() {
  return (process.env["PUBLIC_SITE_URL"] ?? "http://localhost:8080").replace(/\/$/, "");
}

type VolunteerRow = {
  id: string;
  application_id: string | null;
  name: string;
  designation: string | null;
  city: string | null;
  state: string | null;
  mobile: string | null;
  photo: string | null;
  status: string;
};

/** Builds a volunteer ID card or service certificate PDF, photo included. */
export const volunteerDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; kind: "id-card" | "certificate" }) =>
    z.object({ id: z.string().uuid(), kind: z.enum(["id-card", "certificate"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { renderVolunteerIdCard, renderVolunteerCertificate } = await import("@/lib/pdf.server");

    const { tenantId } = await import("@/core/tenant.server");
    const { data: allowed } = await context.supabase.rpc("k1_can", { p_org: await tenantId(), p_perm: "community.volunteer.manage" });
    if (allowed !== true) throw new Error("Not allowed");

    const { data: row, error } = await supabaseAdmin
      .from("volunteer_applications")
      .select("id,application_id,name,designation,city,state,mobile,photo,status,organization_id")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Volunteer not found");
    const v = row as unknown as VolunteerRow;
    if (v.status !== "approved") {
      throw new Error("Approve this volunteer before issuing documents");
    }

    let photo: { bytes: Uint8Array; contentType: string } | null = null;
    if (v.photo && !v.photo.startsWith("http")) {
      const { data: file } = await supabaseAdmin.storage.from(PHOTO_BUCKET).download(v.photo);
      if (file) {
        photo = {
          bytes: new Uint8Array(await file.arrayBuffer()),
          contentType: v.photo.endsWith(".png") ? "image/png" : "image/jpeg",
        };
      }
    }

    const { data: orgRow } = await supabaseAdmin
      .from("organization_settings")
      .select("organization_name,address,city,state,pincode,phone,email,website,logo")
      .eq("organization_id", (row as { organization_id: string }).organization_id)
      .maybeSingle();

    const reference = v.application_id ?? v.id.slice(0, 8).toUpperCase();
    const input = {
      name: v.name,
      referenceId: reference,
      designation: v.designation,
      city: v.city,
      state: v.state,
      mobile: v.mobile,
      issuedOn: new Date().toISOString().slice(0, 10),
      organization: (orgRow ?? {
        organization_name: "Kalchuri One",
        address: null,
        city: null,
        state: null,
        pincode: null,
        phone: null,
        email: null,
        website: null,
      }) as never,
      verificationUrl: `${siteUrl()}/verify/volunteer/${reference}`,
      photo,
    };

    const pdf =
      data.kind === "id-card"
        ? await renderVolunteerIdCard(input)
        : await renderVolunteerCertificate(input);

    return {
      fileName: `${data.kind === "id-card" ? "volunteer-id" : "volunteer-certificate"}-${reference}.pdf`,
      base64: Buffer.from(pdf).toString("base64"),
    };
  });

/** Public check that a volunteer ID/certificate reference is genuine. */
export const verifyVolunteerReference = createServerFn({ method: "GET" })
  .inputValidator((d: { ref: string }) =>
    z.object({ ref: z.string().trim().min(3).max(64) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("volunteer_applications")
      .select("application_id,name,designation,city,state,status,created_at")
      .eq("application_id", data.ref.toUpperCase())
      .maybeSingle();
    if (!row) return { valid: false as const };
    const v = row as unknown as VolunteerRow & { created_at: string };
    if (v.status !== "approved") return { valid: false as const };
    const masked = v.name
      .split(" ")
      .map((part, i) => (i === 0 ? part : part ? `${part[0]}.` : ""))
      .join(" ");
    return {
      valid: true as const,
      reference: v.application_id,
      name: masked,
      designation: v.designation ?? "Volunteer",
      place: [v.city, v.state].filter(Boolean).join(", "),
      since: v.created_at,
    };
  });

/** Data for rendering the volunteer ID card / certificate in the browser (design engine — Hindi renders correctly there). */
export const volunteerDocumentData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { tenantId } = await import("@/core/tenant.server");
    const { data: allowed } = await context.supabase.rpc("k1_can", { p_org: await tenantId(), p_perm: "community.volunteer.manage" });
    if (allowed !== true) throw new Error("Not allowed");

    const { data: row, error } = await supabaseAdmin
      .from("volunteer_applications")
      .select("id,application_id,name,designation,city,state,mobile,photo,status,organization_id")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Volunteer not found");
    const v = row as unknown as VolunteerRow & { organization_id: string };
    if (v.status !== "approved") throw new Error("पहले इस स्वयंसेवक को मंज़ूरी दें · Approve this volunteer before issuing documents");

    let photo = "";
    if (v.photo?.startsWith("http")) photo = v.photo;
    else if (v.photo) {
      const { data: su } = await supabaseAdmin.storage.from(PHOTO_BUCKET).createSignedUrl(v.photo, 60 * 30);
      photo = su?.signedUrl ?? "";
    }
    const { data: o } = await supabaseAdmin
      .from("organization_settings")
      .select("organization_name,organization_name_hi,tagline,address,city,district,state,pincode,phone,email,website,logo")
      .eq("organization_id", v.organization_id)
      .maybeSingle();
    const s = (o ?? {}) as Record<string, string | null>;
    const name = s["organization_name"] || "Kalchuri One";
    const reference = v.application_id ?? v.id.slice(0, 8).toUpperCase();
    return {
      reference,
      org: {
        name,
        name_hi: s["organization_name_hi"] || name,
        tagline: s["tagline"] ?? "",
        address: [s["address"], s["city"], s["district"], s["state"], s["pincode"]].filter(Boolean).join(", "),
        phone: s["phone"] ?? "",
        email: s["email"] ?? "",
        website: s["website"] ?? "",
        logo: s["logo"] ?? "",
      },
      volunteer: {
        name: v.name,
        ref: reference,
        designation: v.designation ?? "",
        place: [v.city, v.state].filter(Boolean).join(", "),
        mobile: v.mobile ?? "",
        blood_group: "",
        issued_on: new Date().toISOString().slice(0, 10),
        valid_until: "",
        photo,
      },
      doc: { verify_url: `${siteUrl()}/verify/volunteer/${reference}` },
    };
  });
