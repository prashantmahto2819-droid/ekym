import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useTenant } from "@/core/tenant-context";
import { STARTER_TEMPLATES, cleanDoc, type DesignDoc } from "@/design-engine";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
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
