import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Field } from "@/components/site/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: SettingsAdmin,
});

const TEXT_FIELDS: { key: string; label: string; full?: boolean }[] = [
  { key: "organization_name", label: "Organization name", full: true },
  { key: "tagline", label: "Tagline", full: true },
  { key: "logo", label: "Logo URL" },
  { key: "favicon", label: "Favicon URL" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "website", label: "Website" },
  { key: "address", label: "Address", full: true },
  { key: "state", label: "State" },
  { key: "district", label: "District" },
  { key: "city", label: "City" },
  { key: "pincode", label: "Pincode" },
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "youtube", label: "YouTube" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "x", label: "X (Twitter)" },
  { key: "telegram", label: "Telegram" },
];

const LONG_FIELDS: { key: string; label: string }[] = [
  { key: "about_short", label: "Short about text" },
  { key: "donation_text", label: "Donation call-to-action text" },
  { key: "footer_text", label: "Footer text" },
];

function SettingsAdmin() {
  const qc = useQueryClient();

  const settings = useQuery({
    queryKey: ["admin", "organization_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (values: Record<string, string | null>) => {
      if (!settings.data?.id) throw new Error("Settings row not found");
      const { error } = await supabase
        .from("organization_settings")
        .update(values as never)
        .eq("id", settings.data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["admin", "organization_settings"] });
      qc.invalidateQueries({ queryKey: ["organization"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const values: Record<string, string | null> = {};
    for (const f of [...TEXT_FIELDS, ...LONG_FIELDS]) {
      const v = (form.get(f.key) as string) ?? "";
      values[f.key] = v === "" ? null : v;
    }
    save.mutate(values);
  }

  if (settings.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const row = (settings.data ?? {}) as Record<string, string | null>;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Organization settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        These details power the header, footer and contact pages across the website.
      </p>

      <form onSubmit={onSubmit} className="surface-card mt-6 grid gap-4 p-6 sm:grid-cols-2">
        {TEXT_FIELDS.map((f) => (
          <Field key={f.key} label={f.label} className={f.full ? "sm:col-span-2" : undefined}>
            <Input name={f.key} defaultValue={row[f.key] ?? ""} />
          </Field>
        ))}
        {LONG_FIELDS.map((f) => (
          <Field key={f.key} label={f.label} className="sm:col-span-2">
            <Textarea name={f.key} rows={3} defaultValue={row[f.key] ?? ""} />
          </Field>
        ))}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
