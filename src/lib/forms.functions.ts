import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";
import { tenantId } from "@/core/tenant.server";

/** Publishable client: public INSERT policies apply. */
function sb() {
  return createClient<Database>(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

const req = z.string().trim().min(2, "Required");
const mobile = z
  .string()
  .trim()
  .regex(/^[+\d][\d\s-]{7,15}$/, "Enter a valid mobile number");
const optional = z.string().trim().optional().or(z.literal(""));
const email = z.string().trim().email("Enter a valid email").optional().or(z.literal(""));

const clean = <T extends Record<string, unknown>>(obj: T) =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== "" && v !== undefined && v !== null),
  );

/** Blank number inputs arrive as "" — treat them as "not provided", not as 0. */
const emptyToUndefined = (v: unknown) =>
  v === "" || v === null || (typeof v === "number" && Number.isNaN(v)) ? undefined : v;

const intOpt = (max: number, msg: string) =>
  z.preprocess(
    emptyToUndefined,
    z.coerce.number({ invalid_type_error: msg }).int(msg).positive(msg).max(max, msg).optional(),
  );

const numOpt = (max: number, msg: string) =>
  z.preprocess(
    emptyToUndefined,
    z.coerce.number({ invalid_type_error: msg }).positive(msg).max(max, msg).optional(),
  );

/** Turns validation failures into a single readable sentence for the form. */
const parse = <S extends z.ZodTypeAny>(schema: S, value: unknown): z.infer<S> => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Please check the details you entered");
  }
  return result.data;
};

/* ----------------------------- CONTACT ----------------------------- */

const contactSchema = z.object({
  name: req,
  mobile: optional,
  email,
  subject: optional,
  message: z.string().trim().min(10, "Please write at least 10 characters"),
  city: optional,
  state: optional,
});
export type ContactInput = z.input<typeof contactSchema>;

export const submitContact = createServerFn({ method: "POST" })
  .inputValidator((d: ContactInput) => parse(contactSchema, d))
  .handler(async ({ data }) => {
    const { error } = await sb().from("contact_messages").insert({ ...clean(data), organization_id: await tenantId() } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------------------------- BLOOD DONOR --------------------------- */

const donorSchema = z.object({
  full_name: req,
  gender: optional,
  date_of_birth: optional,
  mobile,
  whatsapp: optional,
  email,
  blood_group: z.string().trim().min(2, "Select your blood group"),
  state: optional,
  district: optional,
  city: optional,
  area: optional,
  pincode: optional,
  last_donation_date: optional,
  emergency_available: z.boolean().optional(),
  consent: z.literal(true, { errorMap: () => ({ message: "Consent is required" }) }),
});
export type DonorInput = z.input<typeof donorSchema>;

export const submitDonor = createServerFn({ method: "POST" })
  .inputValidator((d: DonorInput) => parse(donorSchema, d))
  .handler(async ({ data }) => {
    const { error } = await sb().from("blood_donors").insert({ ...clean(data), organization_id: await tenantId() } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------ BLOOD REQUIREMENT ------------------------ */

const requirementSchema = z.object({
  patient_name: req,
  patient_age: intOpt(120, "Enter a valid patient age"),
  hospital: req,
  hospital_contact: optional,
  blood_group: z.string().trim().min(2, "Select the blood group"),
  component: optional,
  units_required: intOpt(20, "Enter the number of units needed").default(1),
  state: optional,
  district: optional,
  city: optional,
  required_date: optional,
  urgency: optional,
  requester_name: req,
  requester_mobile: mobile,
  requester_whatsapp: optional,
  notes: optional,
  requisition_slip: z
    .string()
    .trim()
    .min(3, "Please upload the hospital requisition slip"),
});
export type RequirementInput = z.input<typeof requirementSchema>;

export const submitRequirement = createServerFn({ method: "POST" })
  .inputValidator((d: RequirementInput) => parse(requirementSchema, d))
  .handler(async ({ data }) => {
    const { error } = await sb().from("blood_requirements").insert({ ...clean(data), organization_id: await tenantId() } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------------------- VOLUNTEER ---------------------------- */

const volunteerSchema = z.object({
  name: req,
  photo: optional,
  dob: optional,
  gender: optional,
  mobile,
  whatsapp: optional,
  email,
  state: optional,
  district: optional,
  city: optional,
  address: optional,
  pincode: optional,
  education: optional,
  occupation: optional,
  skills: optional,
  availability: optional,
  areas_of_interest: z.array(z.string()).optional(),
  consent: z.literal(true, { errorMap: () => ({ message: "Consent is required" }) }),
});
export type VolunteerInput = z.input<typeof volunteerSchema>;

export const submitVolunteer = createServerFn({ method: "POST" })
  .inputValidator((d: VolunteerInput) => parse(volunteerSchema, d))
  .handler(async ({ data }) => {
    const { error } = await sb().from("volunteer_applications").insert({ ...clean(data), organization_id: await tenantId() } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------------------- INTERNSHIP ---------------------------- */

const internSchema = z.object({
  program_id: optional,
  name: req,
  dob: optional,
  gender: optional,
  mobile,
  whatsapp: optional,
  email,
  state: optional,
  district: optional,
  city: optional,
  college: optional,
  course: optional,
  year: optional,
  skills: optional,
  preferred_department: optional,
  duration: optional,
});
export type InternInput = z.input<typeof internSchema>;

export const submitIntern = createServerFn({ method: "POST" })
  .inputValidator((d: InternInput) => parse(internSchema, d))
  .handler(async ({ data }) => {
    const { error } = await sb().from("intern_applications").insert({ ...clean(data), organization_id: await tenantId() } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------- BOOK DONATION ------------------------- */

const bookDonationSchema = z.object({
  donor_name: req,
  mobile,
  whatsapp: optional,
  email,
  state: optional,
  district: optional,
  city: optional,
  address: optional,
  pincode: optional,
  book_count: intOpt(100000, "Enter a valid number of books"),
  condition: optional,
  description: optional,
  pickup_required: z.boolean().optional(),
  preferred_date: optional,
});
export type BookDonationInput = z.input<typeof bookDonationSchema>;

export const submitBookDonation = createServerFn({ method: "POST" })
  .inputValidator((d: BookDonationInput) => parse(bookDonationSchema, d))
  .handler(async ({ data }) => {
    const { error } = await sb().from("book_donation_requests").insert({ ...clean(data), organization_id: await tenantId() } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------ MATERIAL DONATION ------------------------ */

const materialDonationSchema = z.object({
  donor_name: req,
  mobile,
  whatsapp: optional,
  email,
  state: optional,
  district: optional,
  city: optional,
  address: optional,
  pincode: optional,
  material: req,
  category: optional,
  quantity: numOpt(1000000, "Enter a valid quantity"),
  unit: optional,
  pickup_required: z.boolean().optional(),
  preferred_date: optional,
  notes: optional,
});
export type MaterialDonationInput = z.input<typeof materialDonationSchema>;

export const submitMaterialDonation = createServerFn({ method: "POST" })
  .inputValidator((d: MaterialDonationInput) => parse(materialDonationSchema, d))
  .handler(async ({ data }) => {
    const { error } = await sb().from("material_donation_requests").insert({ ...clean(data), organization_id: await tenantId() } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------------------------- MEMBERSHIP --------------------------- */
const membershipSchema = z.object({
  full_name: req,
  full_name_hi: optional,
  father_name: optional,
  mobile,
  email,
  gender: optional,
  dob: optional,
  village: optional,
  city: optional,
  district: optional,
  state: optional,
  pincode: optional,
  address: optional,
  occupation: optional,
  education: optional,
  blood_group: optional,
  category: z.enum(["general", "life", "patron"]).default("general"),
  consent: z.literal(true, { errorMap: () => ({ message: "Please accept the declaration" }) }),
});
export type MembershipInput = z.input<typeof membershipSchema>;

export const submitMembership = createServerFn({ method: "POST" })
  .inputValidator((d: MembershipInput) => parse(membershipSchema, d))
  .handler(async ({ data }) => {
    const { error } = await sb()
      .from("org_memberships")
      .insert({ ...clean(data), organization_id: await tenantId(), status: "applied" } as any);
    if (error) {
      if (error.message.toLowerCase().includes("duplicate")) {
        throw new Error("An application or membership with this mobile number already exists.");
      }
      throw new Error(error.message);
    }
    return { ok: true };
  });
