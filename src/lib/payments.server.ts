import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { renderReceiptPdf } from "@/lib/pdf.server";
import { fetchRazorpayPayment } from "@/lib/razorpay.server";

/** Server-only donation state machine. All money state changes go through here. */

const RECEIPT_BUCKET = "receipts";

export function siteUrl() {
  return (process.env["PUBLIC_SITE_URL"] ?? "https://seva-heartbeat.lovable.app").replace(/\/$/, "");
}

export function financialYear(d = new Date()) {
  const y = d.getUTCFullYear();
  const start = d.getUTCMonth() + 1 >= 4 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

const inr = (n: number) =>
  `INR ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const DONATION_LABELS: Record<string, string> = {
  general: "General donation",
  bhojan_sewa: "Bhojan Sewa (food)",
  education: "Education support",
  library: "Library",
  ambulance: "Ambulance seva",
  medical: "Medical help",
  blood: "Blood seva",
  campaign: "Campaign",
  seva_project: "Seva project",
  other: "Other",
};

export type DonationRow = {
  id: string;
  donation_id: string;
  donor_name: string;
  donor_email: string | null;
  donor_mobile: string;
  pan: string | null;
  city: string | null;
  state: string | null;
  amount: number | string;
  currency: string;
  status: string;
  donation_type: string;
  purpose: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  paid_at: string | null;
};

export async function getDonationByOrderId(orderId: string) {
  const { data, error } = await supabaseAdmin
    .from("donations")
    .select("*")
    .eq("razorpay_order_id", orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as DonationRow | null) ?? null;
}

/** Idempotent: safe to call from checkout verification and from the webhook. */
export async function markDonationPaid(input: {
  orderId: string;
  paymentId: string;
  source: "CHECKOUT" | "WEBHOOK";
  raw?: unknown;
}) {
  const donation = await getDonationByOrderId(input.orderId);
  if (!donation) throw new Error("Donation not found for this payment order");

  // Authoritative amount/status check against the gateway, never the browser.
  const payment = await fetchRazorpayPayment(input.paymentId);
  if (payment.order_id !== input.orderId) throw new Error("Payment does not belong to this order");

  const expectedPaise = Math.round(Number(donation.amount) * 100);
  if (payment.amount !== expectedPaise) {
    await supabaseAdmin
      .from("donations")
      .update({ status: "FAILED", failure_reason: "Amount mismatch" } as never)
      .eq("id", donation.id);
    throw new Error("Payment amount does not match the donation amount");
  }

  const captured = payment.status === "captured" || payment.status === "authorized";

  await supabaseAdmin.from("payment_transactions").insert({
    donation_id: donation.id,
    purpose: "DONATION",
    razorpay_order_id: input.orderId,
    razorpay_payment_id: input.paymentId,
    event: input.source,
    status: captured ? "PAID" : "FAILED",
    amount: Number(donation.amount),
    currency: donation.currency,
    method: payment.method ?? null,
    error_code: payment.error_code ?? null,
    error_description: payment.error_description ?? null,
    raw: payment as never,
  } as never);

  if (!captured) {
    await supabaseAdmin
      .from("donations")
      .update({
        status: "FAILED",
        razorpay_payment_id: input.paymentId,
        failure_reason: payment.error_description ?? payment.status,
      } as never)
      .eq("id", donation.id);
    return { status: "FAILED" as const, donation };
  }

  if (donation.status !== "PAID") {
    const { error } = await supabaseAdmin
      .from("donations")
      .update({
        status: "PAID",
        razorpay_payment_id: input.paymentId,
        payment_method: payment.method ?? null,
        paid_at: new Date().toISOString(),
      } as never)
      .eq("id", donation.id);
    if (error) throw new Error(error.message);
  }

  const receipt = await ensureDonationReceipt(donation.id);
  return { status: "PAID" as const, donation, receipt };
}

export async function ensureDonationReceipt(donationRowId: string) {
  const { data: donationData, error: dErr } = await supabaseAdmin
    .from("donations")
    .select("*")
    .eq("id", donationRowId)
    .single();
  if (dErr) throw new Error(dErr.message);
  const donation = donationData as unknown as DonationRow;
  if (donation.status !== "PAID") throw new Error("Receipt is only issued for paid donations");

  const { data: existing } = await supabaseAdmin
    .from("donation_receipts")
    .select("*")
    .eq("donation_id", donationRowId)
    .maybeSingle();

  let receipt = existing as
    | {
        id: string;
        receipt_number: string;
        verification_code: string;
        issued_on: string;
        storage_path: string | null;
      }
    | null;

  if (!receipt) {
    const { data: numberData, error: nErr } = await supabaseAdmin.rpc("next_receipt_number" as never);
    if (nErr) throw new Error(nErr.message);
    const verificationCode = crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();
    const { data: created, error: cErr } = await supabaseAdmin
      .from("donation_receipts")
      .insert({
        donation_id: donationRowId,
        receipt_number: numberData as unknown as string,
        verification_code: verificationCode,
        amount: Number(donation.amount),
        financial_year: financialYear(),
      } as never)
      .select("*")
      .single();
    if (cErr) {
      // Concurrent webhook + checkout: re-read the winner's row.
      const { data: again } = await supabaseAdmin
        .from("donation_receipts")
        .select("*")
        .eq("donation_id", donationRowId)
        .maybeSingle();
      if (!again) throw new Error(cErr.message);
      receipt = again as never;
    } else {
      receipt = created as never;
    }
  }
  if (!receipt) throw new Error("Could not create the receipt");

  if (!receipt.storage_path) {
    const { data: org } = await supabaseAdmin
      .from("organization_settings")
      .select("*")
      .limit(1)
      .maybeSingle();
    const { data: settings } = await supabaseAdmin
      .from("payment_settings")
      .select("receipt_footer_note")
      .limit(1)
      .maybeSingle();

    const verificationUrl = `${siteUrl()}/verify/receipt/${receipt.verification_code}`;
    const pdf = await renderReceiptPdf({
      title: "Donation receipt",
      documentNumber: receipt.receipt_number,
      issuedOn: new Date(receipt.issued_on).toLocaleDateString("en-IN"),
      organization: (org as never) ?? {
        organization_name: "Ekatm Kalar Yuva Manch",
        address: null,
        city: null,
        state: null,
        pincode: null,
        phone: null,
        email: null,
        website: null,
      },
      rows: [
        { label: "Donation ID", value: donation.donation_id },
        { label: "Received from", value: donation.donor_name },
        { label: "Mobile", value: donation.donor_mobile },
        { label: "PAN", value: donation.pan ?? "—" },
        {
          label: "Place",
          value: [donation.city, donation.state].filter(Boolean).join(", ") || "—",
        },
        {
          label: "Purpose",
          value: donation.purpose ?? DONATION_LABELS[donation.donation_type] ?? "Donation",
        },
        { label: "Payment reference", value: donation.razorpay_payment_id ?? "—" },
        { label: "Financial year", value: financialYear() },
      ],
      amountLabel: "Amount received",
      amountValue: inr(Number(donation.amount)),
      verificationUrl,
      footerNote:
        (settings as { receipt_footer_note?: string } | null)?.receipt_footer_note ??
        "This receipt is computer generated.",
    });

    const path = `donations/${financialYear()}/${receipt.receipt_number.replace(/[/\\]/g, "-")}.pdf`;
    const { error: upErr } = await supabaseAdmin.storage
      .from(RECEIPT_BUCKET)
      .upload(path, pdf, { contentType: "application/pdf", upsert: true });
    if (upErr) throw new Error(upErr.message);

    const { data: updated, error: uErr } = await supabaseAdmin
      .from("donation_receipts")
      .update({ storage_path: path, pdf_generated_at: new Date().toISOString() } as never)
      .eq("id", receipt.id)
      .select("*")
      .single();
    if (uErr) throw new Error(uErr.message);
    receipt = updated as never;
  }

  return receipt!;
}

export async function signedReceiptUrl(storagePath: string, seconds = 600) {
  const { data, error } = await supabaseAdmin.storage
    .from(RECEIPT_BUCKET)
    .createSignedUrl(storagePath, seconds);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
