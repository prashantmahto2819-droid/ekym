import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Field, FormError, FormSuccess } from "@/components/site/Field";
import { LocationFields } from "@/components/site/LocationFields";
import { PageHeader } from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLang } from "@/core/i18n";
import { siteName } from "@/core/seo";
import { useTenant } from "@/core/tenant-context";
import { submitMembership, type MembershipInput } from "@/lib/forms.functions";

export const Route = createFileRoute("/join")({
  head: ({ matches }) => ({
    meta: [
      { title: `Become a member — ${siteName(matches)}` },
      { name: "description", content: `Apply for membership of ${siteName(matches)}. Applications are reviewed by the organization before a member number is issued.` },
      { property: "og:title", content: `Become a member — ${siteName(matches)}` },
    ],
  }),
  component: JoinPage,
});

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

function JoinPage() {
  const tenant = useTenant();
  const { lang } = useLang();
  const hi = lang === "hi";
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const form = useForm<MembershipInput>({ defaultValues: { category: "general" } });
  const { register, handleSubmit, formState: { errors, isSubmitting } } = form;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    if (!consent) {
      setFormError(hi ? "कृपया घोषणा स्वीकार करें" : "Please accept the declaration");
      return;
    }
    try {
      await submitMembership({ data: { ...values, consent: true } });
      setDone(true);
      toast.success(hi ? "आवेदन भेज दिया गया" : "Application submitted");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not submit";
      setFormError(msg);
      toast.error(msg);
    }
  });

  const orgName = hi && tenant.name_hi ? tenant.name_hi : tenant.name;

  return (
    <>
      <PageHeader
        title={hi ? "सदस्य बनें" : "Become a member"}
        description={hi ? `${orgName} की सदस्यता के लिए आवेदन करें।` : `Apply for membership of ${orgName}.`}
        crumbs={[{ label: hi ? "सदस्यता" : "Membership" }]}
      />
      <section className="section-y">
        <div className="container-page max-w-3xl">
          {done ? (
            <FormSuccess
              title={hi ? "धन्यवाद! आवेदन मिल गया" : "Thank you! Application received"}
              text={hi ? "संगठन की समिति आपके आवेदन की समीक्षा करेगी। स्वीकृति के बाद आपको सदस्य संख्या दी जाएगी।" : "The organization's committee will review your application. A member number is issued once it is approved."}
            />
          ) : (
            <form onSubmit={onSubmit} className="surface-card grid gap-4 p-6 sm:grid-cols-2">
              <Field label={hi ? "पूरा नाम (English)" : "Full name (English)"} required error={errors.full_name?.message}>
                <Input {...register("full_name", { required: "Required" })} />
              </Field>
              <Field label="पूरा नाम (हिंदी)">
                <Input {...register("full_name_hi")} lang="hi" />
              </Field>
              <Field label={hi ? "पिता का नाम" : "Father's name"}>
                <Input {...register("father_name")} />
              </Field>
              <Field label={hi ? "मोबाइल (WhatsApp)" : "Mobile (WhatsApp)"} required error={errors.mobile?.message}>
                <Input inputMode="tel" {...register("mobile", { required: "Required" })} />
              </Field>
              <Field label="Email" error={errors.email?.message}>
                <Input type="email" {...register("email")} />
              </Field>
              <Field label={hi ? "लिंग" : "Gender"}>
                <select className={selectClass} {...register("gender")}>
                  <option value="">—</option>
                  <option value="male">{hi ? "पुरुष" : "Male"}</option>
                  <option value="female">{hi ? "महिला" : "Female"}</option>
                  <option value="other">{hi ? "अन्य" : "Other"}</option>
                </select>
              </Field>
              <Field label={hi ? "जन्म तिथि" : "Date of birth"}>
                <Input type="date" {...register("dob")} />
              </Field>
              <Field label={hi ? "रक्त समूह" : "Blood group"}>
                <select className={selectClass} {...register("blood_group")}>
                  <option value="">—</option>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => <option key={g}>{g}</option>)}
                </select>
              </Field>
              <Field label={hi ? "गाँव" : "Village"}>
                <Input {...register("village")} />
              </Field>
              <LocationFields form={form} />
              <Field label={hi ? "पिनकोड" : "Pincode"}>
                <Input inputMode="numeric" {...register("pincode")} />
              </Field>
              <Field label={hi ? "व्यवसाय" : "Occupation"}>
                <Input {...register("occupation")} />
              </Field>
              <Field label={hi ? "शिक्षा" : "Education"}>
                <Input {...register("education")} />
              </Field>
              <Field label={hi ? "सदस्यता प्रकार" : "Membership type"}>
                <select className={selectClass} {...register("category")}>
                  <option value="general">{hi ? "साधारण" : "General"}</option>
                  <option value="life">{hi ? "आजीवन" : "Life"}</option>
                  <option value="patron">{hi ? "संरक्षक" : "Patron"}</option>
                </select>
              </Field>
              <Field label={hi ? "पता" : "Address"} className="sm:col-span-2">
                <Textarea rows={3} {...register("address")} />
              </Field>
              <label className="flex items-start gap-3 text-sm sm:col-span-2">
                <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} />
                <span className="text-muted-foreground">
                  {hi
                    ? `मैं घोषणा करता/करती हूँ कि ऊपर दी गई जानकारी सही है और मैं ${orgName} के नियमों का पालन करूँगा/करूँगी। संगठन मेरी जानकारी सदस्यता के लिए सुरक्षित रख सकता है।`
                    : `I declare that the details above are correct and that I will follow the rules of ${orgName}. The organization may keep my details for membership purposes.`}
                </span>
              </label>
              <div className="sm:col-span-2">
                <FormError message={formError} />
                <Button type="submit" disabled={isSubmitting} className="mt-2">
                  {isSubmitting ? "…" : hi ? "आवेदन भेजें" : "Submit application"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
