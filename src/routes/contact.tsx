import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";

import { Field, FormSuccess, FormError } from "@/components/site/Field";
import { LocationFields } from "@/components/site/LocationFields";
import { PageHeader } from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitContact, type ContactInput } from "@/lib/forms.functions";
import { organizationQuery } from "@/lib/queries";
import { telHref, whatsappHref } from "@/lib/format";

export const Route = createFileRoute("/contact")({
  loader: ({ context }) => context.queryClient.ensureQueryData(organizationQuery()),
  head: () => ({
    meta: [
      { title: "Contact us — Ekatm Kalar Yuva Manch" },
      {
        name: "description",
        content:
          "Reach Ekatm Kalar Yuva Manch by phone, WhatsApp or email, or send us a message about seva, donations and volunteering.",
      },
      { property: "og:title", content: "Contact Ekatm Kalar Yuva Manch" },
      { property: "og:description", content: "Call, message or write to our seva team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { data: org } = useSuspenseQuery(organizationQuery());
  const [sent, setSent] = useState(false);
  const form = useForm<ContactInput>();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await submitContact({ data: values });
      setSent(true);
      toast.success("Message sent. We'll get back to you soon.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not send your message";
      setFormError(msg);
      toast.error(msg);
    }
  });

  return (
    <>
      <PageHeader
        title="Contact us"
        description="Questions, requirements, partnerships or press — write to us."
        crumbs={[{ label: "Contact" }]}
      />
      <section className="section-y">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-4">
            <div className="surface-card space-y-3 p-6 text-sm">
              {org?.phone ? (
                <p className="flex items-center gap-2">
                  <Phone className="size-4 text-primary" />
                  <a href={telHref(org.phone)} className="hover:underline">
                    {org.phone}
                  </a>
                </p>
              ) : null}
              {org?.whatsapp ? (
                <p className="flex items-center gap-2">
                  <MessageCircle className="size-4 text-primary" />
                  <a
                    href={whatsappHref(org.whatsapp, "Hello Ekatm Kalar Yuva Manch,")}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="hover:underline"
                  >
                    WhatsApp us
                  </a>
                </p>
              ) : null}
              {org?.email ? (
                <p className="flex items-center gap-2">
                  <Mail className="size-4 text-primary" />
                  <a href={`mailto:${org.email}`} className="hover:underline">
                    {org.email}
                  </a>
                </p>
              ) : null}
              {org?.address ? (
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 text-primary" />
                  <span>{[org.address, org.city, org.district, org.state, org.pincode].filter(Boolean).join(", ")}</span>
                </p>
              ) : null}
            </div>
          </div>

          {sent ? (
            <FormSuccess
              title="Thank you for writing to us"
              text="Our team reads every message. If it needs a reply, we usually respond within two working days."
            />
          ) : (
            <form onSubmit={onSubmit} className="surface-card grid gap-4 p-6 sm:grid-cols-2">
              <Field label="Your name" required error={errors.name?.message}>
                <Input {...register("name", { required: "Please enter your name" })} />
              </Field>
              <Field label="Mobile" error={errors.mobile?.message}>
                <Input type="tel" {...register("mobile")} />
              </Field>
              <Field label="Email" error={errors.email?.message}>
                <Input type="email" {...register("email")} />
              </Field>
              <LocationFields form={form} includeDistrict={false} />
              <Field label="Subject" className="sm:col-span-2" error={errors.subject?.message}>
                <Input {...register("subject")} />
              </Field>
              <Field label="Message" required className="sm:col-span-2" error={errors.message?.message}>
                <Textarea
                  rows={5}
                  {...register("message", { required: "Please write your message", minLength: { value: 10, message: "Please write at least 10 characters" } })}
                />
              </Field>
              <div className="sm:col-span-2">
                <FormError
                  message={formError ?? (Object.keys(errors).length ? "Please fill the required fields highlighted above and try again." : null)}
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Sending…" : "Send message"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
