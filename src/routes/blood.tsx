import { useTenant } from "@/core/tenant-context";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useMemo, useState } from "react";
import { useLang } from "@/core/i18n";
import { supabase } from "@/integrations/supabase/client";
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
import { useFt } from "@/core/formText";

const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const Route = createFileRoute("/blood")({
  loader: ({ context }) => context.queryClient.ensureQueryData(bloodRequirementQuery()),
  head: ({ matches }) => pageMeta(matches, { en: "Blood donors & requirements", hi: "रक्तदाता व रक्त आवश्यकता" }, { en: "Register as a blood donor or raise a requirement for a patient.", hi: "रक्तदाता के रूप में पंजीयन करें या किसी मरीज़ के लिए रक्त की आवश्यकता दर्ज करें।" }),
  component: BloodPage,
});

function BloodPage() {
  const t = useFt();
  const hi = useLang().lang === "hi";
  const { data: requirements } = useSuspenseQuery(bloodRequirementQuery());

  return (
    <>
      <PageHeader
        title={t("Blood seva")}
        description={t("A verified network of donors that responds within hours, not days.")}
        crumbs={[{ label: t("Blood seva") }]}
      />

      <section className="section-y">
        <div className="container-page">
          <SectionHeading
            eyebrow={hi ? "अभी" : "Live"}
            title={t("Current requirements")}
            subtitle={hi ? "रक्त सेवा टीम द्वारा जाँची गई ज़रूरतें। मदद कर सकें तो सीधे संपर्क करें।" : "Verified by our blood seva team. Contact the requester directly if you can help."}
          />
          <BloodBoard requirements={requirements as Req[]} />
        </div>
      </section>

      <section className="bg-secondary/60 section-y">
        <div className="container-page max-w-3xl">
          <Tabs defaultValue="donor">
            <TabsList className="mb-6">
              <TabsTrigger value="donor">{t("Register as donor")}</TabsTrigger>
              <TabsTrigger value="need">{t("Raise a requirement")}</TabsTrigger>
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

type Req = { id: string; blood_group: string; urgency: string; city: string | null; district: string | null; state: string | null; required_date: string | null; created_at: string; [k: string]: unknown };
/** Who can give to whom (red cells / whole blood). */
const CAN_GIVE: Record<string, string[]> = {
  "O-": GROUPS, "O+": ["O+", "A+", "B+", "AB+"], "A-": ["A-", "A+", "AB-", "AB+"], "A+": ["A+", "AB+"],
  "B-": ["B-", "B+", "AB-", "AB+"], "B+": ["B+", "AB+"], "AB-": ["AB-", "AB+"], "AB+": ["AB+"],
};
const URG_ORDER: Record<string, number> = { critical: 0, urgent: 1, normal: 2 };

/** Open requirements with filters: group, "my group can give", place, urgency; and donor counts per group. */
function BloodBoard({ requirements }: { requirements: Req[] }) {
  const tenant = useTenant();
  const hi = useLang().lang === "hi";
  const t = useFt();
  const [group, setGroup] = useState("");
  const [mine, setMine] = useState("");
  const [place, setPlace] = useState("");
  const [urg, setUrg] = useState("");
  const donors = useQuery({ queryKey: ["blood_donor_counts", tenant.organization_id], queryFn: async () => { const { data } = await supabase.rpc("k1_blood_donor_counts" as never, { p_org: tenant.organization_id } as never); return (data ?? []) as unknown as { g: string; n: number; ready: number }[]; } });
  const places = useMemo(() => Array.from(new Set(requirements.map((r) => r.district || r.city).filter((x): x is string => !!x))).sort(), [requirements]);
  const rows = requirements
    .filter((r) => !group || r.blood_group === group)
    .filter((r) => !mine || (CAN_GIVE[mine] ?? []).includes(r.blood_group))
    .filter((r) => !place || r.district === place || r.city === place)
    .filter((r) => !urg || r.urgency === urg)
    .sort((a, b) => (URG_ORDER[a.urgency] ?? 3) - (URG_ORDER[b.urgency] ?? 3) || Date.parse(a.required_date ?? a.created_at) - Date.parse(b.required_date ?? b.created_at));
  const count = (g: string) => requirements.filter((r) => r.blood_group === g).length;
  const dc = donors.data ?? [];
  const sel = "h-9 rounded-md border border-input bg-background px-2 text-sm";
  const any = group || mine || place || urg;
  return (
    <div className="space-y-4">
      {dc.length ? (
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">{hi ? "पंजीकृत रक्तदाता (हरा = आज रक्त दे सकते हैं)" : "Registered donors (green = can give today)"}</p>
          <div className="flex flex-wrap gap-2">{GROUPS.map((g) => { const d = dc.find((x) => x.g === g); return <span key={g} className="flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1 text-sm"><b className="text-blood">{g}</b> {d?.n ?? 0}{d?.ready ? <span className="rounded-full bg-emerald-100 px-1.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{d.ready}</span> : null}</span>; })}</div>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => setGroup("")} className={`rounded-full border px-3 py-1 text-sm ${!group ? "border-blood bg-blood text-blood-foreground" : "border-border bg-card hover:bg-secondary"}`}>{hi ? "सभी" : "All"} {requirements.length}</button>
        {GROUPS.map((g) => <button key={g} type="button" onClick={() => setGroup(group === g ? "" : g)} disabled={!count(g)} className={`rounded-full border px-3 py-1 text-sm font-semibold disabled:opacity-40 ${group === g ? "border-blood bg-blood text-blood-foreground" : "border-border bg-card hover:bg-secondary"}`}>{g} <span className="font-normal opacity-70">{count(g)}</span></button>)}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 rounded-md bg-blood-soft px-2 py-1 text-sm text-blood">🩸 {hi ? "मेरा ग्रुप" : "My group"}
          <select className={sel} value={mine} onChange={(e) => setMine(e.target.value)}><option value="">{hi ? "चुनें" : "Pick"}</option>{GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}</select>
        </label>
        <select className={sel} value={place} onChange={(e) => setPlace(e.target.value)}><option value="">{hi ? "सभी ज़िले / शहर" : "All districts / cities"}</option>{places.map((x) => <option key={x} value={x}>{x}</option>)}</select>
        <select className={sel} value={urg} onChange={(e) => setUrg(e.target.value)}><option value="">{hi ? "हर स्थिति" : "Any urgency"}</option><option value="critical">{hi ? "गंभीर" : "Critical"}</option><option value="urgent">{hi ? "जल्दी" : "Urgent"}</option><option value="normal">{hi ? "सामान्य" : "Normal"}</option></select>
        {any ? <Button size="sm" variant="ghost" onClick={() => { setGroup(""); setMine(""); setPlace(""); setUrg(""); }}>{hi ? "फ़िल्टर हटाएँ" : "Clear"}</Button> : null}
      </div>
      {mine ? <p className="text-sm text-muted-foreground">{hi ? `${mine} वाले इन ग्रुप को रक्त दे सकते हैं: ` : `${mine} can give to: `}<b>{(CAN_GIVE[mine] ?? []).join(", ")}</b></p> : null}
      {rows.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{rows.map((r) => <BloodRequirementCard key={r.id} requirement={r} />)}</div>
      ) : (
        <p className="text-muted-foreground">{any ? (hi ? "इन फ़िल्टर से कोई ज़रूरत नहीं मिली।" : "No requirement matches these filters.") : "No verified requirement is open right now. Registering as a donor means we can reach you the moment one appears."}</p>
      )}
    </div>
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
  const t = useFt();
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
      toast.error(t("Please select your blood group"));
      return;
    }
    if (!consent) {
      setFormError("Please accept the donor consent");
      toast.error(t("Please accept the donor consent"));
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
      toast.success(t("You are registered as a donor. Thank you."));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not register you";
      setFormError(msg);
      toast.error(msg);
    }
  });

  if (sent) {
    return (
      <FormSuccess
        title={t("You are on the donor list")}
        text={t("We will contact you only when a patient near you needs your blood group. You can say no any time.")}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className="surface-card grid gap-4 p-6 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <span className="mb-1.5 block text-sm font-medium">
          {t("Blood group")}<span className="text-destructive"> *</span>
        </span>
        <GroupSelect value={group} onChange={setGroup} />
      </div>
      <Field label={t("Full name")} required error={errors.full_name?.message}>
        <Input {...register("full_name", { required: "Please enter your name" })} />
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
      <Field label={t("Date of birth")} error={errors.date_of_birth?.message}>
        <Input type="date" {...register("date_of_birth")} />
      </Field>
      <Field label={t("Gender")} error={errors.gender?.message}>
        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register("gender")}>
          <option value="">{t("— choose —")}</option>
          <option value="male">{t("Male")}</option>
          <option value="female">{t("Female")}</option>
          <option value="other">{t("Other")}</option>
        </select>
      </Field>
      <LocationFields form={form} />
      <Field label={t("Area / locality")} error={errors.area?.message}>
        <Input {...register("area")} />
      </Field>
      <Field label={t("Pincode")} error={errors.pincode?.message}>
        <Input inputMode="numeric" maxLength={6} {...register("pincode")} />
      </Field>
      <Field
        label={t("Last donation date")}
        hint={t("Leave blank if you have never donated")}
        error={errors.last_donation_date?.message}
      >
        <Input type="date" {...register("last_donation_date")} />
      </Field>
      <label className="flex items-center gap-3 text-sm sm:col-span-2">
        <Checkbox checked={emergency} onCheckedChange={(v) => setEmergency(v === true)} />
        <span className="text-muted-foreground">{t("I am willing to be called for emergencies")}</span>
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
          {isSubmitting ? t("Registering…") : t("Register as donor")}
        </Button>
      </div>
    </form>
  );
}

function RequirementForm() {
  const t = useFt();
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
      toast.error(t("Please select the blood group needed"));
      return;
    }
    if (!slip) {
      setSlipError("Please upload the hospital requisition slip");
      setFormError("The hospital requisition slip is required");
      toast.error(t("The hospital requisition slip is required"));
      return;
    }
    try {
      await submitRequirement({
        data: { ...values, blood_group: group, requisition_slip: slip },
      });
      setSent(true);
      toast.success(t("Requirement submitted for verification."));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not submit the requirement";
      setFormError(msg);
      toast.error(msg);
    }
  });

  if (sent) {
    return (
      <FormSuccess
        title={t("Requirement submitted")}
        text={t("Our blood seva team will verify the details and start contacting matching donors. We will call you shortly.")}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className="surface-card grid gap-4 p-6 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <span className="mb-1.5 block text-sm font-medium">
          {t("Blood group needed")}<span className="text-destructive"> *</span>
        </span>
        <GroupSelect value={group} onChange={setGroup} />
      </div>
      <Field label={t("Patient name")} required error={errors.patient_name?.message}>
        <Input {...register("patient_name", { required: "Patient name is required" })} />
      </Field>
      <Field label={t("Patient age")} error={errors.patient_age?.message}>
        <Input type="number" {...register("patient_age")} />
      </Field>
      <Field label={t("Hospital")} required error={errors.hospital?.message}>
        <Input {...register("hospital", { required: "Hospital name is required" })} />
      </Field>
      <Field label={t("Hospital contact")} error={errors.hospital_contact?.message}>
        <Input type="tel" {...register("hospital_contact")} />
      </Field>
      <Field label={t("Component")} error={errors.component?.message}>
        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue="Whole Blood" {...register("component")}>
          {([["Whole Blood", "Whole Blood"], ["RDP", "RDP (random donor platelets)"], ["SDP", "SDP (single donor platelets)"], ["Plasma", "Plasma"], ["Other", "Other"]] as const).map(([v, l]) => <option key={v} value={v}>{t(l)}</option>)}
        </select>
      </Field>
      <Field label={t("Units required")} error={errors.units_required?.message}>
        <Input type="number" min={1} defaultValue={1} {...register("units_required")} />
      </Field>
      <Field label={t("Needed by")} error={errors.required_date?.message}>
        <Input type="date" {...register("required_date")} />
      </Field>
      <Field label={t("Urgency")} error={errors.urgency?.message}>
        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue="normal" {...register("urgency")}>
          {(["normal", "urgent", "critical"] as const).map((v) => <option key={v} value={v}>{t(v)}</option>)}
        </select>
      </Field>
      <LocationFields form={form} />
      <Field label={t("Your name")} required error={errors.requester_name?.message}>
        <Input {...register("requester_name", { required: "Please enter your name" })} />
      </Field>
      <Field label={t("Your mobile")} required error={errors.requester_mobile?.message}>
        <Input type="tel" {...register("requester_mobile", { required: "Mobile number is required" })} />
      </Field>
      <Field label={t("Your WhatsApp")} error={errors.requester_whatsapp?.message}>
        <Input type="tel" {...register("requester_whatsapp")} />
      </Field>
      <Field label={t("Notes")} className="sm:col-span-2" error={errors.notes?.message}>
        <Textarea rows={3} {...register("notes")} />
      </Field>
      <div className="sm:col-span-2">
        <span className="mb-1.5 block text-sm font-medium">
          {t("Hospital requisition slip")}<span className="text-destructive"> *</span>
        </span>
        <DocumentUpload
          value={slip}
          error={slipError}
          label={t("Upload requisition slip")}
          hint={t("Photo or PDF of the doctor's blood requisition slip. Large photos are reduced automatically. Only our blood team can see it.")}
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
          {isSubmitting ? t("Submitting…") : t("Submit requirement")}
        </Button>
      </div>
    </form>
  );
}
