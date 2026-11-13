import { useTenant } from "@/core/tenant-context";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { BookOpen, Droplet, HandCoins, Package, Phone } from "lucide-react";
import { toast } from "sonner";
import { pageMeta } from "@/core/seo";

import { DonateForm } from "@/components/donate/DonateForm";
import { Field, FormSuccess, FormError } from "@/components/site/Field";
import { LocationFields } from "@/components/site/LocationFields";
import { PageHeader } from "@/components/site/PageHeader";
import { SectionHeading } from "@/components/site/SectionHeading";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitMaterialDonation, type MaterialDonationInput } from "@/lib/forms.functions";
import { organizationQuery } from "@/lib/queries";
import { telHref } from "@/lib/format";
import { useFt } from "@/core/formText";

type DonateSearch = { campaign?: string; seva?: string; type?: string };

export const Route = createFileRoute("/donate")({
  validateSearch: (search: Record<string, unknown>): DonateSearch => {
    const out: DonateSearch = {};
    if (typeof search["campaign"] === "string") out.campaign = search["campaign"];
    if (typeof search["seva"] === "string") out.seva = search["seva"];
    if (typeof search["type"] === "string") out.type = search["type"];
    return out;
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(organizationQuery()),
  head: ({ matches }) => pageMeta(matches, { en: "Donate", hi: "दान करें" }, { en: "Support the organization's work with a donation; receipts are issued online.", hi: "संगठन के कार्य में दान से सहयोग करें; रसीद ऑनलाइन मिलती है।" }),
  component: DonatePage,
});

const ways = [
  {
    icon: HandCoins,
    title: "Money",
    text: "Sponsor a meal round, a medical camp or a month of library running costs.",
  },
  {
    icon: Package,
    title: "Material",
    text: "Grain, vegetables, groceries, clothes, blankets, stationery and medicines.",
  },
  { icon: BookOpen, title: "Books", text: "Donate books to our free community library." },
  { icon: Droplet, title: "Blood", text: "Register as a blood donor and respond when we call." },
];

function DonatePage() {
  const t = useFt();
  const { data: org } = useSuspenseQuery(organizationQuery());
  const tenant = useTenant();
  const search = Route.useSearch();
  const [sent, setSent] = useState(false);
  const [pickup, setPickup] = useState(false);
  const form = useForm<MaterialDonationInput>();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await submitMaterialDonation({ data: { ...values, pickup_required: pickup } });
      setSent(true);
      toast.success(t("Thank you. Our team will contact you about collection."));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not submit your offer";
      setFormError(msg);
      toast.error(msg);
    }
  });

  return (
    <>
      <PageHeader
        title="Donate"
        description={org?.donation_text ?? "Your support keeps the seva running, every single day."}
        crumbs={[{ label: "Donate" }]}
      />

      <section className="section-y">
        <div className="container-page">
          <SectionHeading eyebrow="Ways to give" title={t("Choose how you want to help")} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ways.map((w) => (
              <article key={w.title} className="surface-card p-5">
                <span className="bg-accent-soft text-accent flex size-11 items-center justify-center rounded-lg">
                  <w.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-display text-base font-semibold">{t(w.title)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t(w.text)}</p>
              </article>
            ))}
          </div>

          <div id="give" className="mt-10">
            <SectionHeading
              eyebrow="Donate online"
              title={t("Give securely by UPI, card or net banking")}
              subtitle="Your receipt is generated the moment the payment is confirmed on our server."
            />
            <DonateForm
              orgName={org?.organization_name ?? tenant.name}
              defaultType={(search.type as string) ?? "general"}
              campaignSlug={search.campaign}
              sevaSlug={search.seva}
            />
            <p className="mt-4 text-sm text-muted-foreground">
              Already donated?{" "}
              <Link to="/donation-status" className="text-primary underline">
                {t("Check your donation status or download a receipt")}
              </Link>
              .
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {org?.phone ? (
                <Button asChild variant="outline">
                  <a href={telHref(org.phone)}>
                    <Phone className="size-4" /> {org.phone}
                  </a>
                </Button>
              ) : null}
              <Button asChild variant="outline">
                <Link to="/contact">{t("Message us")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-secondary/60 section-y">
        <div className="container-page max-w-3xl">
          <SectionHeading
            eyebrow="Material donation"
            title={t("Offer food, clothes, medicines or supplies")}
            subtitle="Tell us what you have. We will arrange collection or share a drop-off point."
          />
          {sent ? (
            <FormSuccess
              title={t("Offer received")}
              text={t("Our collection team will contact you to confirm the items and pickup details.")}
            />
          ) : (
            <form onSubmit={onSubmit} className="surface-card grid gap-4 p-6 sm:grid-cols-2">
              <Field label={t("Your name")} required error={errors.donor_name?.message}>
                <Input {...register("donor_name", { required: "Please enter your name" })} />
              </Field>
              <Field label={t("Mobile")} required error={errors.mobile?.message}>
                <Input type="tel" {...register("mobile", { required: "Mobile number is required" })} />
              </Field>
              <Field label={t("WhatsApp")} error={errors.whatsapp?.message}>
                <Input type="tel" {...register("whatsapp")} />
              </Field>
              <Field label={t("Email")} error={errors.email?.message}>
                <Input type="email" {...register("email")} />
              </Field>
              <Field label={t("What are you donating?")} required className="sm:col-span-2" error={errors.material?.message}>
                <Input placeholder={t("e.g. 50 kg wheat, winter blankets")} {...register("material", { required: "Please describe the material" })} />
              </Field>
              <Field label={t("Quantity")} error={errors.quantity?.message}>
                <Input type="number" step="any" {...register("quantity")} />
              </Field>
              <Field label={t("Unit")} error={errors.unit?.message}>
                <Input placeholder={t("kg / pieces / boxes")} {...register("unit")} />
              </Field>
              <LocationFields form={form} />
              <Field label={t("Pincode")} error={errors.pincode?.message}>
                <Input inputMode="numeric" maxLength={6} {...register("pincode")} />
              </Field>
              <Field label={t("Pickup address")} className="sm:col-span-2" error={errors.address?.message}>
                <Textarea rows={2} {...register("address")} />
              </Field>
              <Field label={t("Preferred date")} error={errors.preferred_date?.message}>
                <Input type="date" {...register("preferred_date")} />
              </Field>
              <label className="flex items-center gap-3 self-end text-sm">
                <Checkbox checked={pickup} onCheckedChange={(v) => setPickup(v === true)} />
                <span className="text-muted-foreground">{t("I need pickup from my address")}</span>
              </label>
              <Field label={t("Notes")} className="sm:col-span-2" error={errors.notes?.message}>
                <Textarea rows={3} {...register("notes")} />
              </Field>
              <div className="sm:col-span-2">
                <FormError
                  message={formError ?? (Object.keys(errors).length ? "Please fill the required fields highlighted above and try again." : null)}
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t("Submitting…") : t("Submit donation offer")}
                </Button>
              </div>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
