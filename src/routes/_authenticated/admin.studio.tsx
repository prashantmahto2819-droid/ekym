import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useTenant } from "@/core/tenant-context";
import { fromUploadedBackground, STARTER_TEMPLATES, cleanDoc, type DesignDoc } from "@/design-engine";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { publicUrl, uploadPhoto } from "@/lib/images";
import { organizationQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin/studio")({
  component: StudioIndex,
});

type TemplateRow = { id: string; organization_id: string | null; kind: string; name: string; name_hi: string | null; is_default: boolean; status: string; updated_at: string; thumbnail: string | null };

function StudioIndex() {
  const tenant = useTenant();
  const { can } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: org } = useSuspenseQuery(organizationQuery());

  const list = useQuery({
    queryKey: ["admin", "docs_templates", tenant.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("docs_templates")
        .select("id,organization_id,kind,name,name_hi,is_default,status,updated_at,thumbnail")
        .or(`organization_id.eq.${tenant.organization_id},organization_id.is.null`)
        .eq("status", "active")
        .order("kind")
        .order("name");
      if (error) throw error;
      return (data ?? []) as TemplateRow[];
    },
  });

  const create = useMutation({
    mutationFn: async (starter: (typeof STARTER_TEMPLATES)[number]) => {
      const design = starter.make({
        name: org?.organization_name ?? tenant.name,
        name_hi: org?.organization_name_hi ?? tenant.name_hi,
        tagline: org?.tagline, address: [org?.address, org?.city].filter(Boolean).join(", "),
        phone: org?.phone, email: org?.email, website: org?.website, logo: org?.logo,
      });
      const { data, error } = await supabase
        .from("docs_templates")
        .insert({ organization_id: tenant.organization_id, kind: starter.kind, name: starter.name, name_hi: starter.name_hi, design: cleanDoc(design) as never } as never)
        .select("id")
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["admin", "docs_templates"] }); navigate({ to: "/admin/studio/$id", params: { id: d.id } }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const [upKind, setUpKind] = useState<"letter" | "certificate" | "id_card" | "receipt">("letter");
  const [uploading, setUploading] = useState(false);
  async function fromUpload(f: File | undefined) {
    if (!f) return;
    setUploading(true);
    try {
      const path = `${tenant.organization_id}/templates/${Date.now()}.jpg`;
      await uploadPhoto("site-media", path, f, 2400);
      const design = fromUploadedBackground(upKind, publicUrl("site-media", path), { name: org?.organization_name ?? tenant.name, name_hi: org?.organization_name_hi ?? tenant.name_hi, logo: org?.logo });
      const names: Record<string, [string, string]> = { letter: ["My letterhead", "मेरा लेटरहेड"], certificate: ["My certificate", "मेरा प्रमाणपत्र"], id_card: ["My ID card", "मेरा पहचान-पत्र"], receipt: ["My receipt", "मेरी रसीद"] };
      const { data, error } = await supabase.from("docs_templates").insert({ organization_id: tenant.organization_id, kind: upKind === "letter" ? "letterhead" : upKind, name: names[upKind]![0], name_hi: names[upKind]![1], design: cleanDoc(design) as never } as never).select("id").single();
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["admin", "docs_templates"] });
      toast.success("Template created — drag the fields into place and Save");
      navigate({ to: "/admin/studio/$id", params: { id: (data as { id: string }).id } });
    } catch (e) { toast.error((e as Error).message); } finally { setUploading(false); }
  }

  const duplicate = useMutation({
    mutationFn: async (t: TemplateRow) => {
      const { data: full, error: e1 } = await supabase.from("docs_templates").select("design").eq("id", t.id).single();
      if (e1) throw e1;
      const { data, error } = await supabase
        .from("docs_templates")
        .insert({ organization_id: tenant.organization_id, kind: t.kind, name: `${t.name} (copy)`, name_hi: t.name_hi, design: (full as { design: DesignDoc }).design as never } as never)
        .select("id").single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["admin", "docs_templates"] }); navigate({ to: "/admin/studio/$id", params: { id: d.id } }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const setDefault = useMutation({
    mutationFn: async (t: TemplateRow) => {
      await supabase.from("docs_templates").update({ is_default: false } as never).eq("organization_id", tenant.organization_id).eq("kind", t.kind);
      const { error } = await supabase.from("docs_templates").update({ is_default: true } as never).eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "docs_templates"] }),
  });
  /** Replace a saved template's design with the latest built-in design of the same kind (old one kept as an archived copy). */
  const refresh = useMutation({
    mutationFn: async (t: TemplateRow) => {
      const starter = STARTER_TEMPLATES.find((s) => s.kind === t.kind);
      if (!starter) throw new Error("इस प्रकार का नया डिज़ाइन उपलब्ध नहीं है");
      const { data: full, error: e1 } = await supabase.from("docs_templates").select("design").eq("id", t.id).single();
      if (e1) throw e1;
      await supabase.from("docs_templates").insert({ organization_id: tenant.organization_id, kind: t.kind, name: `${t.name} (पुराना)`, name_hi: t.name_hi, status: "archived", design: (full as { design: DesignDoc }).design as never } as never);
      const old = (full as { design: DesignDoc }).design;
      const accent = (old.master.find((l) => l.type === "rect" && "fill" in l && l.fill) as { fill?: string } | undefined)?.fill;
      const design = starter.make({ name: org?.organization_name ?? tenant.name, name_hi: org?.organization_name_hi ?? tenant.name_hi, logo: org?.logo, ...(accent && /^#[0-9a-f]{6}$/i.test(accent) ? { color: accent } : {}) });
      const { error } = await supabase.from("docs_templates").update({ design: cleanDoc(design) as never, thumbnail: null } as never).eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "docs_templates"] }); toast.success("नया डिज़ाइन लग गया — पुराना 'पुराना' नाम से संग्रह में रखा है"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const archive = useMutation({
    mutationFn: async (t: TemplateRow) => { const { error } = await supabase.from("docs_templates").update({ status: "archived" } as never).eq("id", t.id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "docs_templates"] }),
  });

  const canEdit = can("docs.template.edit");
  const byKind = new Map<string, TemplateRow[]>();
  for (const t of list.data ?? []) byKind.set(t.kind, [...(byKind.get(t.kind) ?? []), t]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Design Studio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One design engine for letterheads, letters, certificates, receipts and membership cards. Start from a built-in template, then edit it with your logo, colours and fonts.
        </p>
      </div>
      {canEdit ? (
        <div className="surface-card flex flex-wrap items-center gap-2 p-3 text-sm">
          <span className="text-muted-foreground">Create from starter:</span>
          {STARTER_TEMPLATES.map((s) => (
            <Button key={s.kind} size="sm" variant="outline" disabled={create.isPending} onClick={() => create.mutate(s)}>
              {s.name} · {s.name_hi}
            </Button>
          ))}
        </div>
      ) : null}
      {canEdit ? (
        <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-3 text-sm">
          <p className="font-medium">अपना छपा हुआ letterhead / कार्ड डिज़ाइन इस्तेमाल करें · Use your own printed letterhead / card artwork</p>
          <p className="text-xs text-muted-foreground">Upload a photo/scan (JPG/PNG, full page). It becomes the background; the Ref no, Date, Body / member fields sit on top — open the template and drag them to the right place.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={upKind} onChange={(e) => setUpKind(e.target.value as typeof upKind)}>
              <option value="letter">Letterhead → letters / notices</option><option value="certificate">Certificate artwork</option><option value="id_card">ID card artwork (85.6×54 mm)</option><option value="receipt">Receipt artwork</option>
            </select>
            <label className="cursor-pointer rounded-md border border-border bg-background px-3 py-1.5">{uploading ? "…" : "📷 Upload & create template"}<input type="file" accept="image/*" hidden disabled={uploading} onChange={(e) => void fromUpload(e.target.files?.[0])} /></label>
          </div>
        </div>
      ) : null}
      {[...byKind.entries()].map(([kind, rows]) => (
        <section key={kind}>
          <h2 className="mb-2 font-display text-lg font-semibold capitalize">{kind.replace(/_/g, " ")}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((t) => (
              <div key={t.id} className="surface-card flex flex-col gap-2 p-3">
                {t.thumbnail ? <img src={t.thumbnail} alt="" className="aspect-[1.4] w-full rounded object-contain bg-secondary" /> : <div className="aspect-[1.4] w-full rounded bg-secondary" />}
                <div>
                  <p className="font-medium">{t.name}{t.is_default ? <span className="ml-2 rounded bg-primary/10 px-1.5 text-[10px] text-primary">default</span> : null}</p>
                  <p className="text-xs text-muted-foreground">{t.name_hi}{t.organization_id ? "" : " · shared"} · {new Date(t.updated_at).toLocaleDateString("en-IN")}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {t.organization_id && canEdit ? <Button asChild size="sm"><Link to="/admin/studio/$id" params={{ id: t.id }}>Edit</Link></Button> : null}
                  <Button size="sm" variant="outline" onClick={() => duplicate.mutate(t)} disabled={!canEdit}>Duplicate</Button>
                  {t.organization_id && canEdit && STARTER_TEMPLATES.some((s) => s.kind === t.kind) ? <Button size="sm" variant="secondary" disabled={refresh.isPending} onClick={() => { if (confirm("इस टेम्पलेट पर नया डिज़ाइन लगाएँ? आपके किए बदलाव हट जाएँगे (पुराना डिज़ाइन संग्रह में रहेगा)।")) refresh.mutate(t); }}>✨ नया डिज़ाइन लगाएँ</Button> : null}
                  {t.organization_id && canEdit ? <Button size="sm" variant="ghost" onClick={() => setDefault.mutate(t)} disabled={t.is_default}>Set default</Button> : null}
                  {t.organization_id && canEdit ? <Button size="sm" variant="ghost" onClick={() => { if (confirm("Archive this template?")) archive.mutate(t); }}>Archive</Button> : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
      {list.isSuccess && byKind.size === 0 ? <p className="text-sm text-muted-foreground">No templates yet. Create one from a starter above.</p> : null}
      <Outlet />
    </div>
  );
}
