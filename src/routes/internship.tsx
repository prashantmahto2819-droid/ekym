import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { CalendarClock, GraduationCap, Users } from "lucide-react";
import { toast } from "sonner";

import { Field, FormSuccess, FormError } from "@/components/site/Field";
import { LocationFields } from "@/components/site/LocationFields";
import { PageHeader } from "@/components/site/PageHeader";
import { SectionHeading } from "@/components/site/SectionHeading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitIntern, type InternInput } from "@/lib/forms.functions";
import { internshipQuery } from "@/lib/queries";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/internship")({
  loader: ({ context }) => context.queryClient.ensureQueryData(internshipQuery()),
  head: () => ({
    meta: [
      { title: "Internships — Ekatm Kalar Yuva Manch" },
      {
        name: "description",
        content:
          "Apply for a social work, communications or field operations internship with Ekatm Kalar Yuva Manch and get real NGO experience.",
      },
      { property: "og:title", content: "Internships at Ekatm Kalar Yuva Manch" },
      { property: "og:description", content: "Learn social work by doing it, with our field teams." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InternshipPage,
});

function InternshipPage() {
  const { data: programs } = useSuspenseQuery(internshipQuery());
  const [sent, setSent] = useState(false);
  const [programId, setProgramId] = useState<string>("");
  const form = useForm<InternInput>();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await submitIntern({ data: { ...values, program_id: programId || undefined } });
      setSent(true);
      toast.success("Application received.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not submit your application";
      setFormError(msg);
      toast.error(msg);
    }
  });

  return (
    <>
      <PageHeader
        title="Internships"
        description="Structured, mentored internships with real field responsibility."
        crumbs={[{ label: "Internship" }]}
      />

      <section className="section-y">
        <div className="container-page">
          <SectionHeading eyebrow="Open programmes" title="Choose a programme" />
          <div className="grid gap-4 md:grid-cols-2">
            {programs.map((p: any) => (
              <article
                key={p.id}
                className={`surface-card p-6 ${programId === p.id ? "ring-2 ring-primary" : ""}`}
              >
                <span className="bg-primary-soft text-primary-deep flex size-11 items-center justify-center rounded-lg">
                  <GraduationCap className="size-5" />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold">{p.name}</h3>
                {p.department ? (
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{p.department}</p>
                ) : null}
                <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
                <dl className="mt-4 space-y-1.5 text-sm">
                  {p.duration ? (
                    <div className="flex items-center gap-2">
                      <CalendarClock className="size-4 text-primary" />
                      <span>{p.duration}</span>
                    </div>
                  ) : null}
                  {p.seats ? (
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-primary" />
                      <span>{p.seats} seats</span>
                    </div>
                  ) : null}
                  <div>
                    Fee: {Number(p.fee) > 0 ? formatCurrency(p.fee) : "No fee"}
                  </div>
                </dl>
                {p.eligibility ? (
                  <p className="mt-3 text-xs text-muted-foreground">Eligibility: {p.eligibility}</p>
                ) : null}
                <Button
                  type="button"
                  variant={programId === p.id ? "default" : "outline"}
                  className="mt-4"
                  onClick={() => {
                    setProgramId(p.id);
                    document.getElementById("apply")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  {programId === p.id ? "Selected" : "Apply to this programme"}
                </Button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="apply" className="bg-secondary/60 section-y">
        <div className="container-page max-w-3xl">
          <SectionHeading eyebrow="Application" title="Apply for an internship" />
          {sent ? (
            <FormSuccess
              title="Application submitted"
              text="Our internship coordinator will review your application and contact you about the interview."
            />
          ) : (
            <form onSubmit={onSubmit} className="surface-card grid gap-4 p-6 sm:grid-cols-2">
              <Field label="Full name" required error={errors.name?.message}>
                <Input {...register("name", { required: "Please enter your name" })} />
              </Field>
              <Field label="Mobile" required error={errors.mobile?.message}>
                <Input type="tel" {...register("mobile", { required: "Mobile number is required" })} />
              </Field>
              <Field label="Email" error={errors.email?.message}>
                <Input type="email" {...register("email")} />
              </Field>
              <Field label="WhatsApp" error={errors.whatsapp?.message}>
                <Input type="tel" {...register("whatsapp")} />
              </Field>
              <Field label="Date of birth" error={errors.dob?.message}>
                <Input type="date" {...register("dob")} />
              </Field>
              <Field label="Gender" error={errors.gender?.message}>
                <Input {...register("gender")} />
              </Field>
              <Field label="College / University" error={errors.college?.message}>
                <Input {...register("college")} />
              </Field>
              <Field label="Course" error={errors.course?.message}>
                <Input {...register("course")} />
              </Field>
              <Field label="Year of study" error={errors.year?.message}>
                <Input {...register("year")} />
              </Field>
              <LocationFields form={form} />
              <Field label="Preferred department" error={errors.preferred_department?.message}>
                <Input {...register("preferred_department")} />
              </Field>
              <Field label="Preferred duration" error={errors.duration?.message}>
                <Input {...register("duration")} />
              </Field>
              <Field label="Skills and interests" className="sm:col-span-2" error={errors.skills?.message}>
                <Textarea rows={3} {...register("skills")} />
              </Field>
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
