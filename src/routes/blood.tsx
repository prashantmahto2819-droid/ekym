import { useTenant } from "@/core/tenant-context";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { toast } from "sonner";
import { pageMeta } from "@/core/seo";

import { BloodRequirementCard } from "@/components/home/sections";
import { DocumentUpload } from "@/components/site/DocumentUpload";
import { Field, FormSuccess, FormError } from "@/components/site/Field";
import { LocationFields } from "@/components/site/LocationFields";
import { PageHeader } from "@/components/site/PageHeader";
import { SectionHeading } from "@/components/site/SectionHeading";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  submitDonor,
  submitRequirement,
  type DonorInput,
  type RequirementInput,
} from "@/lib/forms.functions";
import { uploadRequisitionSlip } from "@/lib/photos.functions";
import { bloodRequirementQuery } from "@/lib/queries";

const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const Route = createFileRoute("/blood")({
  loader: ({ context }) => context.queryClient.ensureQueryData(bloodRequirementQuery()),
  head: ({ matches }) => pageMeta(matches, { en: "Blood donors & requirements", hi: "रक्तदाता व रक्त आवश्यकता" }, { en: "Register as a blood donor or raise a requirement for a patient.", hi: "रक्तदाता के रूप में पंजीयन करें या किसी मरीज़ के लिए रक्त की आवश्यकता दर्ज करें।" }),
  component: BloodPage,
});

function BloodPage() {
  const { data: requirements } = useSuspenseQuery(bloodRequirementQuery());

  return (
    <>
      <PageHeader
        title="Blood seva"
        description="A verified network of donors that responds within hours, not days."
        crumbs={[{ label: "Blood" }]}
      />

      <section className="section-y">
        <div className="container-page">
          <SectionHeading
            eyebrow="Live"
            title="Current requirements"
            subtitle="Verified by our blood seva team. Contact the requester directly if you can help."
          />
          {requirements.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {requirements.map((r: any) => (
                <BloodRequirementCard key={r.id} requirement={r} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              No verified requirement is open right now. Registering as a donor means we can reach
              you the moment one appears.
            </p>
          )}
        </div>
      </section>

      <section className="bg-secondary/60 section-y">
        <div className="container-page max-w-3xl">
          <Tabs defaultValue="donor">
            <TabsList className="mb-6">
              <TabsTrigger value="donor">Register as donor</TabsTrigger>
              <TabsTrigger value="need">Raise a requirement</TabsTrigger>
            </TabsList>
            <TabsContent value="donor">
              <DonorForm />
            </TabsContent>
            <TabsContent value="need">
              <RequirementForm />
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </>
  );
}

function GroupSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {GROUPS.map((g) => (
        <button
          key={g}
          type="button"
          aria-pressed={value === g}
          onClick={() => onChange(g)}
          className={`rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
            value === g
              ? "border-blood bg-blood text-blood-foreground"
              : "border-border hover:bg-secondary"
          }`}
        >
          {g}
        </button>
      ))}
    </div>
  );
}

function DonorForm() {
  const tenant = useTenant();
  const [sent, setSent] = useState(false);
  const [group, setGroup] = useState("");
  const [consent, setConsent] = useState(false);
  const [emergency, setEmergency] = useState(true);
  const form = useForm<DonorInput>();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    if (!group) {
      setFormError("Please select your blood group");
      toast.error("Please select your blood group");
      return;
    }
    if (!consent) {
      setFormError("Please accept the donor consent");
      toast.error("Please accept the donor consent");
      return;
    }
    try {
      await submitDonor({
        data: {
          ...values,
          blood_group: group,
          emergency_available: emergency,
          consent: true,
        },
      });
      setSent(true);
      toast.success("You are registered as a donor. Thank you.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not register you";
      setFormError(msg);
      toast.error(msg);
    }
  });

  if (sent) {
    return (
      <FormSuccess
        title="You are on the donor list"
        text="We will contact you only when a patient near you needs your blood group. You can say no any time."
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className="surface-card grid gap-4 p-6 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <span className="mb-1.5 block text-sm font-medium">
          Blood group<span className="text-destructive"> *</span>
        </span>
        <GroupSelect value={group} onChange={setGroup} />
      </div>
      <Field label="Full name" required error={errors.full_name?.message}>
        <Input {...register("full_name", { required: "Please enter your name" })} />
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
      <Field label="Date of birth" error={errors.date_of_birth?.message}>
        <Input type="date" {...register("date_of_birth")} />
      </Field>
      <Field label="Gender" error={errors.gender?.message}>
        <Input {...register("gender")} />
      </Field>
      <LocationFields form={form} />
      <Field label="Area / locality" error={errors.area?.message}>
        <Input {...register("area")} />
      </Field>
      <Field label="Pincode" error={errors.pincode?.message}>
        <Input {...register("pincode")} />
      </Field>
      <Field
        label="Last donation date"
        hint="Leave blank if you have never donated"
        error={errors.last_donation_date?.message}
      >
        <Input type="date" {...register("last_donation_date")} />
      </Field>
      <label className="flex items-center gap-3 text-sm sm:col-span-2">
        <Checkbox checked={emergency} onCheckedChange={(v) => setEmergency(v === true)} />
        <span className="text-muted-foreground">I am willing to be called for emergencies</span>
      </label>
      <label className="flex items-start gap-3 text-sm sm:col-span-2">
        <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} />
        <span className="text-muted-foreground">
          I consent to {tenant.name} storing my details and contacting me about blood
          requirements. My contact details are never shown publicly.
        </span>
      </label>
      <div className="sm:col-span-2">
        <FormError
          message={formError ?? (Object.keys(errors).length ? "Please fill the required fields highlighted above and try again." : null)}
        />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Registering…" : "Register as donor"}
        </Button>
      </div>
    </form>
  );
}

function RequirementForm() {
  const [sent, setSent] = useState(false);
  const [group, setGroup] = useState("");
  const [slip, setSlip] = useState<string | null>(null);
  const [slipError, setSlipError] = useState<string | undefined>(undefined);
  const form = useForm<RequirementInput>();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    if (!group) {
      setFormError("Please select the blood group needed");
      toast.error("Please select the blood group needed");
      return;
    }
    if (!slip) {
      setSlipError("Please upload the hospital requisition slip");
      setFormError("The hospital requisition slip is required");
      toast.error("The hospital requisition slip is required");
      return;
    }
    try {
      await submitRequirement({
        data: { ...values, blood_group: group, requisition_slip: slip },
      });
      setSent(true);
      toast.success("Requirement submitted for verification.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not submit the requirement";
      setFormError(msg);
      toast.error(msg);
    }
  });

  if (sent) {
    return (
      <FormSuccess
        title="Requirement submitted"
        text="Our blood seva team will verify the details and start contacting matching donors. We will call you shortly."
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className="surface-card grid gap-4 p-6 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <span className="mb-1.5 block text-sm font-medium">
          Blood group needed<span className="text-destructive"> *</span>
        </span>
        <GroupSelect value={group} onChange={setGroup} />
      </div>
      <Field label="Patient name" required error={errors.patient_name?.message}>
        <Input {...register("patient_name", { required: "Patient name is required" })} />
      </Field>
      <Field label="Patient age" error={errors.patient_age?.message}>
        <Input type="number" {...register("patient_age")} />
      </Field>
      <Field label="Hospital" required error={errors.hospital?.message}>
        <Input {...register("hospital", { required: "Hospital name is required" })} />
      </Field>
      <Field label="Hospital contact" error={errors.hospital_contact?.message}>
        <Input type="tel" {...register("hospital_contact")} />
      </Field>
      <Field label="Component" hint="Whole blood, platelets, plasma…" error={errors.component?.message}>
        <Input {...register("component")} />
      </Field>
      <Field label="Units required" error={errors.units_required?.message}>
        <Input type="number" min={1} defaultValue={1} {...register("units_required")} />
      </Field>
      <Field label="Needed by" error={errors.required_date?.message}>
        <Input type="date" {...register("required_date")} />
      </Field>
      <Field label="Urgency" hint="normal, urgent or critical" error={errors.urgency?.message}>
        <Input placeholder="urgent" {...register("urgency")} />
      </Field>
      <LocationFields form={form} />
      <Field label="Your name" required error={errors.requester_name?.message}>
        <Input {...register("requester_name", { required: "Please enter your name" })} />
      </Field>
      <Field label="Your mobile" required error={errors.requester_mobile?.message}>
        <Input type="tel" {...register("requester_mobile", { required: "Mobile number is required" })} />
      </Field>
      <Field label="Your WhatsApp" error={errors.requester_whatsapp?.message}>
        <Input type="tel" {...register("requester_whatsapp")} />
      </Field>
      <Field label="Notes" className="sm:col-span-2" error={errors.notes?.message}>
        <Textarea rows={3} {...register("notes")} />
      </Field>
      <div className="sm:col-span-2">
        <span className="mb-1.5 block text-sm font-medium">
          Hospital requisition slip<span className="text-destructive"> *</span>
        </span>
        <DocumentUpload
          value={slip}
          error={slipError}
          label="Upload requisition slip"
          hint="Photo or PDF of the doctor's blood requisition slip. Large photos are reduced automatically. Only our blood team can see it."
          onUpload={async (dataUrl) => {
            const { path } = await uploadRequisitionSlip({ data: { dataUrl } });
            setSlip(path);
            setSlipError(undefined);
          }}
        />
      </div>
      <div className="sm:col-span-2">
        <FormError
          message={formError ?? (Object.keys(errors).length ? "Please fill the required fields highlighted above and try again." : null)}
        />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Submitting…" : "Submit requirement"}
        </Button>
      </div>
    </form>
  );
}
