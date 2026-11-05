import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { CalendarClock, GraduationCap, Users } from "lucide-react";
import { toast } from "sonner";
import { pageMeta } from "@/core/seo";

import { Field, FormSuccess, FormError } from "@/components/site/Field";
import { LocationFields } from "@/components/site/LocationFields";
import { PageHeader } from "@/components/site/PageHeader";
import { useLang } from "@/core/i18n";
import { SectionHeading } from "@/components/site/SectionHeading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitIntern, type InternInput } from "@/lib/forms.functions";
import { internshipQuery } from "@/lib/queries";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/internship")({
  loader: ({ context }) => context.queryClient.ensureQueryData(internshipQuery()),
  head: ({ matches }) => pageMeta(matches, { en: "Research & internship", hi: "शोध एवं इंटर्नशिप" }, { en: "Research and internship on Kalchuri history, genealogy, villages and culture.", hi: "कलचुरी इतिहास, वंशावली, गाँव और संस्कृति पर शोध एवं इंटर्नशिप।" }),
  component: InternshipPage,
});

function InternshipPage() {
  const { data: programs } = useSuspenseQuery(internshipQuery());
  const { lang } = useLang();
  const hi = lang === "hi";
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
        title={hi ? "शोध एवं इंटर्नशिप — कलचुरी इतिहास" : "Research & internships — Kalchuri history"}
        description={hi ? "कलचुरी समाज के इतिहास, वंशावली, गाँवों और संस्कृति पर शोध कार्यक्रम, और संस्थाओं में मार्गदर्शित इंटर्नशिप। स्वीकृत शोध कार्य पत्रिका और वेबसाइट पर प्रकाशित होता है।" : "Research programmes on the history, genealogy, villages and culture of the Kalchuri community, plus mentored internships with member organizations. Accepted research is published in the magazine and on the website."}
        crumbs={[{ label: hi ? "शोध एवं इंटर्नशिप" : "Research & internship" }]}
      />
      <section className="section-y pb-0"><div className="container-page grid gap-4 md:grid-cols-4">
        {[["इतिहास", "History", "राजवंश, शिलालेख, स्थानीय इतिहास के स्रोत"], ["वंशावली", "Genealogy", "परिवारों का वंश वृक्ष, मूल गाँव, प्रवास"], ["गाँव-दस्तावेज़ीकरण", "Village documentation", "गाँव, कुलदेवी, मंदिर, परंपराएँ, मौखिक इतिहास"], ["संस्कृति", "Culture", "रीति-रिवाज, लोकगीत, पर्व, व्यंजन"]].map(([h, e, d]) => <div key={e} className="surface-card p-4"><p className="font-display font-semibold">{hi ? h : e}</p><p className="mt-1 text-xs text-muted-foreground">{d}</p></div>)}
      </div></section>

      <section className="section-y">
        <div className="container-page">
          <SectionHeading eyebrow={hi ? "खुले कार्यक्रम" : "Open programmes"} title={hi ? "कार्यक्रम चुनें" : "Choose a programme"} />
          <div className="grid gap-4 md:grid-cols-2">
            {programs.map((p: any) => (
              <article
                key={p.id}
                className={`surface-card p-6 ${programId === p.id ? "ring-2 ring-primary" : ""}`}
              >
                <span className="bg-primary-soft text-primary-deep flex size-11 items-center justify-center rounded-lg">
                  <GraduationCap className="size-5" />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold">{hi && p.name_hi ? p.name_hi : p.name}</h3>
                <p className="text-xs uppercase tracking-wide text-primary">{p.kind === "research" ? (hi ? "शोध" : "Research") : (hi ? "इंटर्नशिप" : "Internship")}{p.theme ? ` · ${p.theme}` : ""}</p>
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
          <SectionHeading eyebrow={hi ? "आवेदन" : "Application"} title={hi ? "शोध / इंटर्नशिप के लिए आवेदन" : "Apply for research / internship"} />
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
              <Field label={hi ? "शोध विषय (शोध कार्यक्रम के लिए)" : "Research topic (for research programmes)"} className="sm:col-span-2" error={errors.research_topic?.message}>
                <Input {...register("research_topic")} placeholder={hi ? "जैसे: हमारे गाँव के कलचुरी परिवारों का प्रवास-इतिहास" : "e.g. Migration history of Kalchuri families of our village"} />
              </Field>
              <Field label={hi ? "संक्षिप्त प्रस्ताव — क्या, कैसे, किन स्रोतों से" : "Short proposal — what, how, which sources"} className="sm:col-span-2" error={errors.proposal?.message}>
                <Textarea rows={4} {...register("proposal")} />
              </Field>
              <Field label={hi ? "अपेक्षित परिणाम" : "Expected output"} error={errors.expected_output?.message}>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register("expected_output")}><option value="">—</option><option value="article">{hi ? "लेख (पत्रिका/वेबसाइट)" : "Article (magazine / website)"}</option><option value="family_tree">{hi ? "वंश वृक्ष दर्ज करना" : "Family trees recorded"}</option><option value="village_profile">{hi ? "गाँव का दस्तावेज़" : "Village profile"}</option><option value="archive">{hi ? "फोटो/दस्तावेज़ संग्रह" : "Photo / document archive"}</option><option value="report">{hi ? "शोध रिपोर्ट" : "Research report"}</option></select>
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
