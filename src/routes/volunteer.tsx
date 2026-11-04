import { useTenant } from "@/core/tenant-context";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { toast } from "sonner";
import { siteName } from "@/core/seo";

import { Field, FormSuccess, FormError } from "@/components/site/Field";
import { PhotoUpload } from "@/components/site/PhotoUpload";
import { uploadApplicantPhoto } from "@/lib/photos.functions";
import { LocationFields } from "@/components/site/LocationFields";
import { PageHeader } from "@/components/site/PageHeader";
import { SectionHeading } from "@/components/site/SectionHeading";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitVolunteer, type VolunteerInput } from "@/lib/forms.functions";
import { sevaListQuery } from "@/lib/queries";

export const Route = createFileRoute("/volunteer")({
  loader: ({ context }) => context.queryClient.ensureQueryData(sevaListQuery()),
  head: ({ matches }) => ({
    meta: [
      { title: `Volunteer with us — ${siteName(matches)}` },
      {
        name: "description",
        content:
          `Join ${siteName(matches)} as a volunteer. Help with meals, blood donation drives, the library, teaching, health camps and more.`,
      },
      { property: "og:title", content: `Volunteer with ${siteName(matches)}` },
      { property: "og:description", content: "Give a few hours a week and change someone's day." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VolunteerPage,
});

function VolunteerPage() {
  const tenant = useTenant();
  const { data: seva } = useSuspenseQuery(sevaListQuery());
  const [sent, setSent] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const form = useForm<VolunteerInput>();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  const toggle = (name: string) =>
    setInterests((prev) => (prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]));

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    if (!consent) {
      setFormError("Please accept the consent to continue");
      toast.error("Please accept the consent to continue");
      return;
    }
    try {
      await submitVolunteer({
        data: {
          ...values,
          photo: photo ?? "",
          areas_of_interest: interests,
          consent: true,
        },
      });
      setSent(true);
      toast.success("Application received. Our team will call you.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not submit your application";
      setFormError(msg);
      toast.error(msg);
    }
  });

  return (
    <>
      <PageHeader
        title="Volunteer with us"
        description="Cook, serve, teach, drive, donate blood, manage the library — there is a place for everyone."
        crumbs={[{ label: "Volunteer" }]}
      />
      <section className="section-y">
        <div className="container-page max-w-3xl">
          <SectionHeading
            eyebrow="Volunteer registration"
            title="Tell us about yourself"
            subtitle="We will contact you on WhatsApp with the next orientation date."
          />
          {sent ? (
            <FormSuccess
              title="Welcome to the team"
              text="Your volunteer application is with our coordinator. Expect a call or WhatsApp message within a few days."
            />
          ) : (
            <form onSubmit={onSubmit} className="surface-card grid gap-4 p-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <span className="mb-1.5 block text-sm font-medium">Your photo</span>
                <PhotoUpload
                  value={photo}
                  onUpload={async (dataUrl) => {
                    const { path } = await uploadApplicantPhoto({ data: { dataUrl } });
                    setPhoto(path);
                  }}
                  hint="Passport-style photo used on your volunteer ID card and certificate. Large pictures are reduced automatically."
                />
              </div>
              <Field label="Full name" required error={errors.name?.message}>
                <Input {...register("name", { required: "Please enter your name" })} />
              </Field>
              <Field label="Mobile" required error={errors.mobile?.message}>
                <Input type="tel" {...register("mobile", { required: "Mobile number is required" })} />
              </Field>
              <Field label="WhatsApp" error={errors.whatsapp?.message}>
                <Input type="tel" {...register("whatsapp")} />
              </Field>
              <Field label="Email" error={errors.email?.message}>
                <Input type="email" {...register("email")} />
              </Field>
              <Field label="Date of birth" error={errors.dob?.message}>
                <Input type="date" {...register("dob")} />
              </Field>
              <Field label="Gender" error={errors.gender?.message}>
                <Input placeholder="Female / Male / Other" {...register("gender")} />
              </Field>
              <LocationFields form={form} />
              <Field label="Pincode" error={errors.pincode?.message}>
                <Input {...register("pincode")} />
              </Field>
              <Field label="Education" error={errors.education?.message}>
                <Input {...register("education")} />
              </Field>
              <Field label="Occupation" error={errors.occupation?.message}>
                <Input {...register("occupation")} />
              </Field>
              <Field label="Availability" className="sm:col-span-2" error={errors.availability?.message}>
                <Input placeholder="e.g. weekends, weekday mornings" {...register("availability")} />
              </Field>
              <Field label="Skills you can offer" className="sm:col-span-2" error={errors.skills?.message}>
                <Textarea rows={3} {...register("skills")} />
              </Field>

              <fieldset className="sm:col-span-2">
                <legend className="mb-2 text-sm font-medium">Areas of interest</legend>
                <div className="flex flex-wrap gap-2">
                  {seva.map((s: any) => {
                    const on = interests.includes(s.name);
                    return (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => toggle(s.name)}
                        aria-pressed={on}
                        className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:bg-secondary"
                        }`}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <label className="flex items-start gap-3 text-sm sm:col-span-2">
                <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} />
                <span className="text-muted-foreground">
                  I agree to be contacted by {tenant.name} and to follow the organisation's
                  code of conduct while volunteering.
                </span>
              </label>

              <div className="sm:col-span-2">
                <FormError
                  message={formError ?? (Object.keys(errors).length ? "Please fill the required fields highlighted above and try again." : null)}
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting…" : "Submit application"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
