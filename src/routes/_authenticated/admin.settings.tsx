import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Field } from "@/components/site/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MODULE_KEYS, moduleOn } from "@/core/modules";
import { useTenant } from "@/core/tenant-context";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: SettingsAdmin,
});

const TEXT_FIELDS: { key: string; label: string; full?: boolean }[] = [
  { key: "organization_name", label: "Organization name (English)", full: true },
  { key: "organization_name_hi", label: "संगठन का नाम (हिंदी)", full: true },
  { key: "tagline", label: "Tagline (English)", full: true },
  { key: "tagline_hi", label: "टैगलाइन (हिंदी)", full: true },
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
  { key: "about_short", label: "Short about text (English)" },
  { key: "about_short_hi", label: "संक्षिप्त परिचय (हिंदी)" },
  { key: "donation_text", label: "Donation call-to-action text (English)" },
  { key: "donation_text_hi", label: "दान अपील (हिंदी)" },
  { key: "footer_text", label: "Footer text" },
];

function SettingsAdmin() {
  const qc = useQueryClient();
  const tenant = useTenant();

  const settings = useQuery({
    queryKey: ["admin", "organization_settings", tenant.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .eq("organization_id", tenant.organization_id)
        .maybeSingle();
      if (error) throw error;
      if (data) return data;
      const { data: created, error: cErr } = await supabase
        .from("organization_settings")
        .insert({ organization_id: tenant.organization_id, organization_name: tenant.name, organization_name_hi: tenant.name_hi } as never)
        .select("*")
        .single();
      if (cErr) throw cErr;
      return created;
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

      <ModulesCard />

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

/** Module switches: stored in core.organizations.branding.modules; nav, home sections and admin menu follow them. */
function ModulesCard() {
  const tenant = useTenant();
  const [mods, setMods] = useState<Record<string, boolean>>(() => Object.fromEntries(MODULE_KEYS.map(([k]) => [k, moduleOn(tenant.branding, k)])));
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    const { error } = await supabase.rpc("k1_set_branding", { p_org: tenant.organization_id, p_branding: { modules: mods } } as never);
    setBusy(false);
    if (error) toast.error(error.message); else toast.success("Saved — reload to see the menu change");
  }
  return (
    <div className="surface-card mt-6 p-6">
      <p className="font-display font-semibold">Modules on this site</p>
      <p className="text-xs text-muted-foreground">Switch a module off to hide it from the menu, the home page and the admin menu (data is kept).</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">{MODULE_KEYS.map(([k, label]) => <label key={k} className="flex items-center gap-2"><input type="checkbox" checked={mods[k] !== false} onChange={(e) => setMods({ ...mods, [k]: e.target.checked })} /> {label}</label>)}</div>
      <Button type="button" size="sm" className="mt-3" onClick={save} disabled={busy}>Save modules</Button>
    </div>
  );
}
