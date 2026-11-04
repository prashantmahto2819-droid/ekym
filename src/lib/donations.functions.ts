import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Public donation server functions. Amounts are always validated on the server. */

const mobile = z
  .string()
  .trim()
  .regex(/^[+\d][\d\s-]{7,15}$/, "Enter a valid mobile number");
const optional = z.string().trim().optional().or(z.literal(""));

export const DONATION_TYPES = [
  "general",
  "bhojan_sewa",
  "education",
  "library",
  "ambulance",
  "medical",
  "blood",
  "campaign",
  "seva_project",
  "other",
] as const;

const startSchema = z.object({
  donor_name: z.string().trim().min(2, "Please enter your name"),
  donor_email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  donor_mobile: mobile,
  donor_whatsapp: optional,
  pan: optional,
  address: optional,
  state: optional,
  district: optional,
  city: optional,
  pincode: optional,
  amount: z.preprocess(
    (v) => (v === "" || v === null || (typeof v === "number" && Number.isNaN(v)) ? undefined : v),
    z.coerce.number({ invalid_type_error: "Enter an amount" }).positive("Enter an amount"),
  ),
  donation_type: z.enum(DONATION_TYPES).default("general"),
  campaign_slug: optional,
  seva_slug: optional,
  message: optional,
  is_anonymous: z.boolean().optional(),
});
export type StartDonationInput = z.input<typeof startSchema>;

/** Turns validation failures into a single readable sentence for the form. */
const parse = <S extends z.ZodTypeAny>(schema: S, value: unknown): z.infer<S> => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Please check the details you entered");
  }
  return result.data;
};

const clean = <T extends Record<string, unknown>>(obj: T) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== "" && v !== undefined));

/** Creates the donation record + Razorpay order. Returns only public checkout data. */
export const startDonation = createServerFn({ method: "POST" })
  .inputValidator((d: StartDonationInput) => parse(startSchema, d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createRazorpayOrder, getRazorpayConfig } = await import("@/lib/razorpay.server");

    const { tenantId } = await import("@/core/tenant.server");
    const org = await tenantId();
    const { data: settingsRow } = await supabaseAdmin
      .from("payment_settings")
      .select("*")
      .eq("organization_id", org)
      .maybeSingle();
    const settings = settingsRow as {
      online_payments_enabled: boolean;
      currency: string;
      min_donation_amount: number;
      max_donation_amount: number;
    } | null;

    if (settings && !settings.online_payments_enabled) {
      throw new Error("Online donations are temporarily switched off. Please contact the office.");
    }

    const currency = settings?.currency ?? "INR";
    const min = Number(settings?.min_donation_amount ?? 10);
    const max = Number(settings?.max_donation_amount ?? 500000);
    const amount = Math.round(data.amount * 100) / 100;
    if (amount < min) throw new Error(`Minimum donation is ${min}`);
    if (amount > max) throw new Error(`For donations above ${max}, please contact the office.`);

    let campaignId: string | null = null;
    let purpose: string | null = null;
    if (data.campaign_slug) {
      const { data: c } = await supabaseAdmin
        .from("campaigns")
        .select("id,title")
        .eq("organization_id", org)
        .eq("slug", data.campaign_slug)
        .maybeSingle();
      if (!c) throw new Error("Campaign not found");
      campaignId = (c as { id: string }).id;
      purpose = `Campaign: ${(c as { title: string }).title}`;
    }

    let sevaId: string | null = null;
    if (data.seva_slug) {
      const { data: s } = await supabaseAdmin
        .from("seva_projects")
        .select("id,name")
        .eq("organization_id", org)
        .eq("slug", data.seva_slug)
        .maybeSingle();
      if (s) {
        const row = s as unknown as { id: string; name: string };
        sevaId = row.id;
        purpose = `Seva project: ${row.name}`;
      }
    }

    const { data: idData, error: idErr } = await supabaseAdmin.rpc("next_donation_id" as never);
    if (idErr) throw new Error(idErr.message);
    const donationId = idData as unknown as string;

    const { data: donation, error } = await supabaseAdmin
      .from("donations")
      .insert(
        clean({
          organization_id: org,
          donation_id: donationId,
          donor_name: data.donor_name,
          donor_email: data.donor_email,
          donor_mobile: data.donor_mobile,
          donor_whatsapp: data.donor_whatsapp,
          pan: data.pan,
          address: data.address,
          state: data.state,
          district: data.district,
          city: data.city,
          pincode: data.pincode,
          donation_type: campaignId ? "campaign" : data.donation_type,
          campaign_id: campaignId,
          seva_project_id: sevaId,
          purpose,
          message: data.message,
          is_anonymous: data.is_anonymous ?? false,
          amount,
          currency,
          status: "CREATED",
        }) as never,
      )
      .select("id,donation_id")
      .single();
    if (error) throw new Error(error.message);

    const order = await createRazorpayOrder({
      amountPaise: Math.round(amount * 100),
      currency,
      receipt: donationId,
      notes: { donation_id: donationId },
    });

    await supabaseAdmin
      .from("donations")
      .update({ razorpay_order_id: order.id, status: "PENDING" } as never)
      .eq("id", (donation as { id: string }).id);

    await supabaseAdmin.from("payment_transactions").insert({
      organization_id: org,
      donation_id: (donation as { id: string }).id,
      razorpay_order_id: order.id,
      event: "ORDER_CREATED",
      status: "PENDING",
      amount,
      currency,
    } as never);

    return {
      donationId,
      orderId: order.id,
      amount,
      amountPaise: order.amount,
      currency,
      keyId: getRazorpayConfig().keyId,
      donorName: data.donor_name,
      donorEmail: data.donor_email || undefined,
      donorMobile: data.donor_mobile,
    };
  });

const verifySchema = z.object({
  razorpay_order_id: z.string().trim().min(5),
  razorpay_payment_id: z.string().trim().min(5),
  razorpay_signature: z.string().trim().min(10),
});

/** Verifies the checkout handback server-side, then issues the receipt. */
export const verifyDonationPayment = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof verifySchema>) => verifySchema.parse(d))
  .handler(async ({ data }) => {
    const { verifyCheckoutSignature } = await import("@/lib/razorpay.server");
    const { markDonationPaid, signedReceiptUrl } = await import("@/lib/payments.server");

    const ok = verifyCheckoutSignature({
      orderId: data.razorpay_order_id,
      paymentId: data.razorpay_payment_id,
      signature: data.razorpay_signature,
    });
    if (!ok) throw new Error("Payment could not be verified. Please contact the office.");

    const result = await markDonationPaid({
      orderId: data.razorpay_order_id,
      paymentId: data.razorpay_payment_id,
      source: "CHECKOUT",
    });

    if (result.status !== "PAID") {
      return { status: "FAILED" as const, donationId: result.donation.donation_id };
    }
    const receipt = result.receipt!;
    return {
      status: "PAID" as const,
      donationId: result.donation.donation_id,
      amount: Number(result.donation.amount),
      receiptNumber: receipt.receipt_number,
      verificationCode: receipt.verification_code,
      receiptUrl: receipt.storage_path ? await signedReceiptUrl(receipt.storage_path) : null,
    };
  });

/** Payment status lookup by donation reference (known only to the donor). */
export const donationStatus = createServerFn({ method: "GET" })
  .inputValidator((d: { donationId: string }) =>
    z.object({ donationId: z.string().trim().min(5) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { signedReceiptUrl } = await import("@/lib/payments.server");

    const { data: row } = await supabaseAdmin
      .from("donations")
      .select("id,donation_id,amount,currency,status,purpose,paid_at,donor_name")
      .eq("donation_id", data.donationId)
      .maybeSingle();
    if (!row) return null;
    const d = row as {
      id: string;
      donation_id: string;
      amount: number;
      currency: string;
      status: string;
      purpose: string | null;
      paid_at: string | null;
      donor_name: string;
    };

    const { data: receipt } = await supabaseAdmin
      .from("donation_receipts")
      .select("receipt_number,verification_code,storage_path")
      .eq("donation_id", d.id)
      .maybeSingle();
    const r = receipt as {
      receipt_number: string;
      verification_code: string;
      storage_path: string | null;
    } | null;

    return {
      donationId: d.donation_id,
      donorName: d.donor_name,
      amount: Number(d.amount),
      currency: d.currency,
      status: d.status,
      purpose: d.purpose,
      paidAt: d.paid_at,
      receiptNumber: r?.receipt_number ?? null,
      verificationCode: r?.verification_code ?? null,
      receiptUrl: r?.storage_path ? await signedReceiptUrl(r.storage_path) : null,
    };
  });

/** Public QR verification — minimum information only. */
export const verifyReceiptCode = createServerFn({ method: "GET" })
  .inputValidator((d: { code: string }) =>
    z.object({ code: z.string().trim().min(6).max(64) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("donation_receipts")
      .select("receipt_number,issued_on,amount,financial_year,donations(donor_name,purpose,status)")
      .eq("verification_code", data.code.toUpperCase())
      .maybeSingle();
    if (!row) return { valid: false as const };
    const r = row as unknown as {
      receipt_number: string;
      issued_on: string;
      amount: number;
      financial_year: string | null;
      donations: { donor_name: string; purpose: string | null; status: string } | null;
    };
    const name = r.donations?.donor_name ?? "";
    const masked = name
      .split(" ")
      .map((part, i) => (i === 0 ? part : part ? `${part[0]}.` : ""))
      .join(" ");
    return {
      valid: true as const,
      receiptNumber: r.receipt_number,
      issuedOn: r.issued_on,
      amount: Number(r.amount),
      financialYear: r.financial_year,
      donorName: masked,
      purpose: r.donations?.purpose ?? null,
      paid: r.donations?.status === "PAID",
    };
  });

/** Links a donation made before/without sign-in to the signed-in donor. */
export const claimDonation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { donationId: string }) =>
    z.object({ donationId: z.string().trim().min(5) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("donations")
      .update({ donor_user_id: context.userId } as never)
      .eq("donation_id", data.donationId)
      .is("donor_user_id", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Signed receipt download for the owning donor or finance staff (RLS decides). */
export const receiptDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { receiptNumber: string }) =>
    z.object({ receiptNumber: z.string().trim().min(3) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { signedReceiptUrl, ensureDonationReceipt } = await import("@/lib/payments.server");
    const { data: row, error } = await context.supabase
      .from("donation_receipts")
      .select("donation_id,storage_path")
      .eq("receipt_number", data.receiptNumber)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Receipt not found or not available to this account");
    const r = row as { donation_id: string; storage_path: string | null };
    const path = r.storage_path ?? (await ensureDonationReceipt(r.donation_id)).storage_path;
    if (!path) throw new Error("Receipt PDF is not ready yet");
    return { url: await signedReceiptUrl(path) };
  });
