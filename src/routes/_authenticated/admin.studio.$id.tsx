import { createFileRoute, Link } from "@tanstack/react-router";
import { T, txNow } from "@/components/admin/T";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { StudioEditor } from "@/components/studio/StudioEditor";
import { orgMergeData, sampleFor } from "@/components/studio/merge-data";
import { Button } from "@/components/ui/button";
import { useTenant } from "@/core/tenant-context";
import { renderAll, type DesignDoc } from "@/design-engine";
import { supabase } from "@/integrations/supabase/client";
import { organizationQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin/studio/$id")({
  component: TemplateEditor,
});

function TemplateEditor() {
  const { id } = Route.useParams();
  const tenant = useTenant();
  const qc = useQueryClient();
  const { data: org } = useSuspenseQuery(organizationQuery());

  const tpl = useQuery({
    queryKey: ["admin", "docs_templates", tenant.organization_id, id],
    queryFn: async () => {
      const { data, error } = await supabase.from("docs_templates").select("*").eq("id", id).single();
      if (error) throw error;
      return data as unknown as { id: string; name: string; name_hi: string | null; kind: string; design: DesignDoc };
    },
  });

  const save = useMutation({
    mutationFn: async (design: DesignDoc) => {
      const [c] = await renderAll(design, { ...orgMergeData(tenant, org), ...sampleFor(design) }, 0.5);
      const thumbnail = c?.toDataURL("image/jpeg", 0.6) ?? null;
      const { error } = await supabase.from("docs_templates").update({ design: design as never, thumbnail } as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(txNow("Template saved")); qc.invalidateQueries({ queryKey: ["admin", "docs_templates"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const rename = useMutation({
    mutationFn: async (name: string) => { const { error } = await supabase.from("docs_templates").update({ name } as never).eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "docs_templates"] }),
  });

  if (tpl.isLoading) return <p className="text-sm text-muted-foreground"><T>Loading template…</T></p>;
  if (!tpl.data) return <p className="text-sm text-destructive"><T>Template not found.</T></p>;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{tpl.data.kind} template</p>
          <input className="bg-transparent font-display text-xl font-semibold outline-none" defaultValue={tpl.data.name} onBlur={(e) => e.target.value !== tpl.data!.name && rename.mutate(e.target.value)} />
        </div>
        <Button asChild variant="ghost" size="sm"><Link to="/admin/studio"><T>Close</T></Link></Button>
      </div>
      <StudioEditor key={tpl.data.id} initial={tpl.data.design} data={{ ...orgMergeData(tenant, org), ...sampleFor(tpl.data.design) }} onSave={(d) => save.mutate(d)} saving={save.isPending} />
    </div>
  );
}
