import { useTenant } from "@/core/tenant-context";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useState, type ReactNode } from "react";
import { Clock, Copy, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { MapCard } from "@/components/site/DetailExtras";
import { toast } from "sonner";
import { pageMeta } from "@/core/seo";
import { useLang } from "@/core/i18n";
import { supabase } from "@/integrations/supabase/client";

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
  head: ({ matches }) => pageMeta(matches, { en: "Contact us", hi: "संपर्क करें" }, { en: "Write to the organization — membership, family tree, shok sandesh, events or any other matter.", hi: "संगठन को लिखें — सदस्यता, वंश वृक्ष, शोक संदेश, आयोजन या कोई भी विषय।" }),
  component: ContactPage,
});

function ContactPage() {
  const tenant = useTenant();
  const { data: org } = useSuspenseQuery(organizationQuery());
  const { lang } = useLang();
  const hi = lang === "hi";
  const name = (hi && (org?.organization_name_hi || tenant.name_hi)) || org?.organization_name || tenant.name;
  const targets = useQuery({ queryKey: ["contact_targets", tenant.organization_id], queryFn: async () => { const { data } = await supabase.rpc("k1_contact_targets", { p_org: tenant.organization_id } as never); return (data ?? []) as unknown as { id: string; name: string; name_hi: string | null }[]; } });
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
      toast.success(hi ? "संदेश भेज दिया गया। हम जल्द जवाब देंगे।" : "Message sent. We'll get back to you soon.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : (hi ? "संदेश नहीं गया" : "Could not send your message");
      setFormError(msg);
      toast.error(msg);
    }
  });

  return (
    <>
      <PageHeader
        title={hi ? "संपर्क करें" : "Contact us"}
        description={hi ? "सदस्यता, वंश वृक्ष, शोक संदेश, आयोजन या कोई भी बात — हमें लिखिए।" : "Membership, family tree, events or anything else — write to us."}
        crumbs={[{ label: hi ? "संपर्क" : "Contact" }]}
      />
      <section className="section-y">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {org?.whatsapp ? <Tile href={whatsappHref(org.whatsapp, hi ? `नमस्ते ${name},` : `Hello ${name},`)} external icon={<MessageCircle className="size-5" />} title="WhatsApp" text={hi ? "सबसे जल्दी जवाब" : "Fastest reply"} tone="bg-[#25D366] text-white" /> : null}
              {org?.phone ? <Tile href={telHref(org.phone)} icon={<Phone className="size-5" />} title={hi ? "कॉल करें" : "Call"} text={org.phone} tone="bg-primary text-primary-foreground" /> : null}
              {org?.email ? <Tile href={`mailto:${org.email}`} icon={<Mail className="size-5" />} title={hi ? "ईमेल" : "E-mail"} text={org.email} tone="bg-sky-600 text-white" /> : null}
            </div>
            {org?.address ? (
              <div className="surface-card space-y-3 p-5 text-sm">
                <p className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-primary" /><span className="flex-1">{[org?.address, org?.city, org?.district, org?.state, org?.pincode].filter(Boolean).join(", ")}</span>
                  <button type="button" className="text-muted-foreground hover:text-foreground" title={hi ? "पता कॉपी करें" : "Copy address"} onClick={() => { void navigator.clipboard?.writeText([org?.address, org?.city, org?.district, org?.state, org?.pincode].filter(Boolean).join(", ")).then(() => toast.success(hi ? "पता कॉपी हुआ" : "Address copied")); }}><Copy className="size-4" /></button>
                </p>
                <p className="flex items-center gap-2 text-muted-foreground"><Clock className="size-4 shrink-0 text-primary" /> {hi ? "हम आमतौर पर दो कार्य-दिवस में जवाब देते हैं।" : "We usually reply within two working days."}</p>
              </div>
            ) : null}
            {org?.address ? <MapCard place={[org?.address, org?.city, org?.district, org?.state, org?.pincode].filter(Boolean).join(", ")} L={hi} /> : null}
          </div>

          {sent ? (
            <FormSuccess
              title={hi ? "लिखने के लिए धन्यवाद" : "Thank you for writing to us"}
              text={hi ? "हमारी टीम हर संदेश पढ़ती है। जवाब ज़रूरी हो तो आमतौर पर दो कार्य-दिवस में देते हैं।" : "Our team reads every message. If it needs a reply, we usually respond within two working days."}
            />
          ) : (
            <form onSubmit={onSubmit} className="surface-card grid gap-4 p-6 sm:grid-cols-2">
              <Field label={hi ? "आपका नाम" : "Your name"} required error={errors.name?.message}>
                <Input {...register("name", { required: hi ? "अपना नाम लिखिए" : "Please enter your name" })} />
              </Field>
              <Field label={hi ? "मोबाइल" : "Mobile"} error={errors.mobile?.message}>
                <Input type="tel" {...register("mobile")} />
              </Field>
              <Field label={hi ? "ईमेल" : "Email"} error={errors.email?.message}>
                <Input type="email" {...register("email")} />
              </Field>
              <LocationFields form={form} includeDistrict={false} />
              <Field label={hi ? "विषय" : "Topic"}>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register("topic")}>
                  {[["सदस्यता", "Membership"], ["सहयोग / दान", "Support / donation"], ["सुझाव", "Suggestion"], ["शिकायत", "Complaint"], ["संस्था को मंच पर जोड़ना", "Bring our organization onto the platform"], ["अन्य", "Other"]].map(([h, e]) => <option key={h} value={h}>{hi ? h : e}</option>)}
                </select>
              </Field>
              {targets.data && targets.data.length > 1 ? (
                <Field label={hi ? "किस संस्था के लिए" : "For which organization"}>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register("organization_id")}>
                    {targets.data.map((o) => <option key={o.id} value={o.id}>{hi && o.name_hi ? o.name_hi : o.name}</option>)}
                  </select>
                </Field>
              ) : null}
              <Field label={hi ? "शीर्षक" : "Subject"} className="sm:col-span-2" error={errors.subject?.message}>
                <Input {...register("subject")} />
              </Field>
              <Field label={hi ? "संदेश" : "Message"} required className="sm:col-span-2" error={errors.message?.message}>
                <Textarea
                  rows={5}
                  {...register("message", { required: hi ? "अपना संदेश लिखिए" : "Please write your message", minLength: { value: 10, message: hi ? "कम से कम 10 अक्षर लिखिए" : "Please write at least 10 characters" } })}
                />
              </Field>
              <div className="sm:col-span-2">
                <FormError
                  message={formError ?? (Object.keys(errors).length ? (hi ? "ऊपर लाल दिखे ज़रूरी खाने भरकर फिर भेजिए।" : "Please fill the required fields highlighted above and try again.") : null)}
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (hi ? "भेज रहे हैं…" : "Sending…") : (hi ? "संदेश भेजें" : "Send message")}
                </Button>
              </div>
            </form>
          )}
        </div>
      </section>
    </>
  );
}

function Tile({ href, icon, title, text, tone, external }: { href: string | undefined; icon: ReactNode; title: string; text: string; tone: string; external?: boolean }) {
  return (
    <a href={href} {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})} className={`flex items-center gap-3 rounded-xl p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${tone}`}>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/20">{icon}</span>
      <span className="min-w-0"><span className="block font-semibold">{title}</span><span className="block truncate text-sm opacity-90">{text}</span></span>
    </a>
  );
}
