import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Field } from "@/components/site/Field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTenant } from "@/core/tenant-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/payments")({
  component: PaymentSettings,
});

type Settings = {
  id: string;
  online_payments_enabled: boolean;
  currency: string;
  min_donation_amount: number;
  max_donation_amount: number;
  suggested_amounts: number[] | null;
  volunteer_fee: number;
  internship_fee: number;
  receipt_prefix: string | null;
  receipt_footer_note: string | null;
};

function PaymentSettings() {
  const qc = useQueryClient();
  const tenant = useTenant();
  const [form, setForm] = useState<Settings | null>(null);

  const q = useQuery({
    queryKey: ["admin", "payment-settings", tenant.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("payment_settings").select("*").eq("organization_id", tenant.organization_id).maybeSingle();
      if (error) throw error;
      if (data) return data as unknown as Settings;
      // first visit for a new organization: create its settings row with defaults
      const { data: created, error: cErr } = await supabase
        .from("payment_settings")
        .insert({ organization_id: tenant.organization_id, receipt_prefix: "KC" } as never)
        .select("*")
        .single();
      if (cErr) throw cErr;
      return created as unknown as Settings;
    },
  });

  useEffect(() => {
    if (q.data) setForm(q.data);
  }, [q.data]);

  const save = useMutation({
    mutationFn: async (values: Settings) => {
      const { error } = await supabase
        .from("payment_settings")
        .update({
          online_payments_enabled: values.online_payments_enabled,
          min_donation_amount: Number(values.min_donation_amount),
          max_donation_amount: Number(values.max_donation_amount),
          suggested_amounts: values.suggested_amounts,
          volunteer_fee: Number(values.volunteer_fee),
          internship_fee: Number(values.internship_fee),
          receipt_prefix: values.receipt_prefix,
          receipt_footer_note: values.receipt_footer_note,
        } as never)
        .eq("id", values.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment settings saved");
      qc.invalidateQueries({ queryKey: ["admin", "payment-settings"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  if (q.isLoading || !form) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setForm({ ...form, [key]: value });

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-semibold">Payment settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Amounts and fees used by the donation checkout. Gateway keys are stored as secrets and never
        shown here.
      </p>

      <form
        className="surface-card mt-6 grid gap-4 p-6 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(form);
        }}
      >
        <label className="flex items-center gap-3 text-sm sm:col-span-2">
          <Checkbox
            checked={form.online_payments_enabled}
            onCheckedChange={(v) => set("online_payments_enabled", v === true)}
          />
          <span>Accept online donations</span>
        </label>

        <Field label="Minimum donation">
          <Input
            type="number"
            value={form.min_donation_amount}
            onChange={(e) => set("min_donation_amount", Number(e.target.value))}
          />
        </Field>
        <Field label="Maximum donation">
          <Input
            type="number"
            value={form.max_donation_amount}
            onChange={(e) => set("max_donation_amount", Number(e.target.value))}
          />
        </Field>
        <Field label="Suggested amounts" hint="Comma separated" className="sm:col-span-2">
          <Input
            value={(form.suggested_amounts ?? []).join(", ")}
            onChange={(e) =>
              set(
                "suggested_amounts",
                e.target.value
                  .split(",")
                  .map((v) => Number(v.trim()))
                  .filter((v) => Number.isFinite(v) && v > 0),
              )
            }
          />
        </Field>
        <Field label="Volunteer registration fee" hint="0 means free">
          <Input
            type="number"
            value={form.volunteer_fee}
            onChange={(e) => set("volunteer_fee", Number(e.target.value))}
          />
        </Field>
        <Field label="Internship fee" hint="0 means free">
          <Input
            type="number"
            value={form.internship_fee}
            onChange={(e) => set("internship_fee", Number(e.target.value))}
          />
        </Field>
        <Field label="Receipt number prefix">
          <Input
            value={form.receipt_prefix ?? ""}
            onChange={(e) => set("receipt_prefix", e.target.value)}
          />
        </Field>
        <Field label="Receipt footer note" className="sm:col-span-2">
          <Textarea
            rows={3}
            value={form.receipt_footer_note ?? ""}
            onChange={(e) => set("receipt_footer_note", e.target.value)}
          />
        </Field>

        <div className="sm:col-span-2">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
