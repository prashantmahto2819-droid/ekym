import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Download, ShieldCheck } from "lucide-react";

import { Field, FormError } from "@/components/site/Field";
import { LocationFields } from "@/components/site/LocationFields";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  startDonation,
  verifyDonationPayment,
  type StartDonationInput,
} from "@/lib/donations.functions";
import { formatCurrency } from "@/lib/format";

const TYPES: { value: string; label: string }[] = [
  { value: "general", label: "General donation" },
  { value: "bhojan_sewa", label: "Bhojan Sewa (food)" },
  { value: "education", label: "Education" },
  { value: "library", label: "Library" },
  { value: "ambulance", label: "Ambulance seva" },
  { value: "medical", label: "Medical help" },
  { value: "blood", label: "Blood seva" },
  { value: "seva_project", label: "Seva project" },
  { value: "other", label: "Other" },
];

type FormValues = {
  donor_name: string;
  donor_mobile: string;
  donor_email?: string;
  donor_whatsapp?: string;
  pan?: string;
  city?: string;
  state?: string;
  pincode?: string;
  address?: string;
  message?: string;
  amount: number;
  donation_type: string;
};

type Paid = {
  donationId: string;
  amount: number;
  receiptNumber: string;
  receiptUrl: string | null;
  verificationCode: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadCheckout(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser only"));
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load the payment window"));
    document.body.appendChild(s);
  });
}

export function DonateForm({
  campaignSlug,
  sevaSlug,
  defaultType = "general",
  suggested = [365, 501, 1100, 2100, 5100],
  orgName = "the organization",
  compact = false,
}: {
  campaignSlug?: string | undefined;
  sevaSlug?: string | undefined;
  defaultType?: string;
  suggested?: number[];
  orgName?: string;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [paid, setPaid] = useState<Paid | null>(null);
  const [anonymous, setAnonymous] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    defaultValues: { amount: suggested[0] ?? 365, donation_type: defaultType },
  });
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form;
  const amount = Number(watch("amount") ?? 0);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setBusy(true);
    try {
      await loadCheckout();
      const payload: StartDonationInput = {
        ...values,
        amount: Number(values.amount),
        donation_type: (campaignSlug ? "campaign" : values.donation_type) as never,
        is_anonymous: anonymous,
        ...(campaignSlug ? { campaign_slug: campaignSlug } : {}),
        ...(sevaSlug ? { seva_slug: sevaSlug } : {}),
      };
      const order = await startDonation({ data: payload });

      const rz = new window.Razorpay!({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amountPaise,
        currency: order.currency,
        name: orgName,
        description: `Donation ${order.donationId}`,
        prefill: {
          name: order.donorName,
          email: order.donorEmail ?? "",
          contact: order.donorMobile,
        },
        notes: { donation_id: order.donationId },
        theme: { color: "#0F766E" },
        modal: {
          ondismiss: () => {
            setBusy(false);
            toast.info("Payment window closed. Your donation was not completed.");
          },
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const result = await verifyDonationPayment({ data: response });
            if (result.status !== "PAID") {
              toast.error("Payment was not successful. Please try again.");
              setBusy(false);
              return;
            }
            setPaid({
              donationId: result.donationId,
              amount: result.amount,
              receiptNumber: result.receiptNumber,
              receiptUrl: result.receiptUrl,
              verificationCode: result.verificationCode,
            });
            toast.success("Thank you. Your receipt is ready.");
          } catch (e) {
            toast.error(
              e instanceof Error
                ? e.message
                : "Payment received but verification failed. Please contact the office.",
            );
          } finally {
            setBusy(false);
          }
        },
      });
      rz.open();
    } catch (e) {
      setBusy(false);
      const msg = e instanceof Error ? e.message : "Could not start the payment";
      setFormError(msg);
      toast.error(msg);
    }
  });

  if (paid) {
    return (
      <div className="surface-card border-success/40 bg-success/10 p-6">
        <h3 className="font-display text-lg font-semibold">
          Thank you for {formatCurrency(paid.amount)}
        </h3>
        <dl className="mt-3 space-y-1 text-sm text-muted-foreground">
          <div>
            Donation ID: <span className="font-medium text-foreground">{paid.donationId}</span>
          </div>
          <div>
            Receipt No: <span className="font-medium text-foreground">{paid.receiptNumber}</span>
          </div>
        </dl>
        <div className="mt-5 flex flex-wrap gap-2">
          {paid.receiptUrl ? (
            <Button asChild>
              <a href={paid.receiptUrl} target="_blank" rel="noreferrer">
                <Download className="size-4" /> Download receipt (PDF)
              </a>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link to="/verify/receipt/$code" params={{ code: paid.verificationCode }}>
              Verify receipt
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="surface-card grid gap-4 p-6 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <p className="mb-2 text-sm font-medium">Choose an amount</p>
        <div className="flex flex-wrap gap-2">
          {suggested.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setValue("amount", a, { shouldValidate: true })}
              className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                amount === a
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border hover:bg-secondary"
              }`}
            >
              {formatCurrency(a)}
            </button>
          ))}
        </div>
      </div>

      <Field label="Amount (INR)" required error={errors.amount?.message}>
        <Input
          type="number"
          min={1}
          step="1"
          {...register("amount", { required: "Enter an amount", valueAsNumber: true })}
        />
      </Field>

      {campaignSlug ? null : (
        <Field label="Donation for" error={errors.donation_type?.message}>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            {...register("donation_type")}
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Your name" required error={errors.donor_name?.message}>
        <Input {...register("donor_name", { required: "Please enter your name" })} />
      </Field>
      <Field label="Mobile" required error={errors.donor_mobile?.message}>
        <Input type="tel" {...register("donor_mobile", { required: "Mobile number is required" })} />
      </Field>
      <Field label="Email" hint="Receipt is also shown on screen" error={errors.donor_email?.message}>
        <Input type="email" {...register("donor_email")} />
      </Field>
      <Field label="WhatsApp" error={errors.donor_whatsapp?.message}>
        <Input type="tel" {...register("donor_whatsapp")} />
      </Field>
      <Field label="PAN" hint="Needed for tax exemption receipts" error={errors.pan?.message}>
        <Input {...register("pan")} />
      </Field>

      {compact ? null : (
        <>
          <LocationFields form={form} includeDistrict={false} />
          <Field label="Pincode" error={errors.pincode?.message}>
            <Input {...register("pincode")} />
          </Field>
          <Field label="Address" className="sm:col-span-2" error={errors.address?.message}>
            <Textarea rows={2} {...register("address")} />
          </Field>
          <Field label="Message (optional)" className="sm:col-span-2">
            <Textarea rows={2} {...register("message")} />
          </Field>
        </>
      )}

      <label className="flex items-center gap-3 text-sm sm:col-span-2">
        <Checkbox checked={anonymous} onCheckedChange={(v) => setAnonymous(v === true)} />
        <span className="text-muted-foreground">Do not show my name publicly</span>
      </label>

      <div className="sm:col-span-2">
        <FormError
          message={formError ?? (Object.keys(errors).length ? "Please fill the required fields highlighted above and try again." : null)}
        />
      </div>
      <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? "Opening payment…" : `Donate ${formatCurrency(amount)}`}
        </Button>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-4" /> Payment is confirmed on our server before a receipt is
          issued.
        </span>
      </div>
    </form>
  );
}
