import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { T, txNow } from "@/components/admin/T";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/letters")({
  component: LettersIndex,
});

const KINDS = ["letter", "notice", "certificate", "appointment", "office_order", "press_release", "invitation", "receipt", "id_card", "other"];

type Row = { id: string; kind: string; title: string; ref_no: string | null; doc_date: string; status: string; recipient: { name?: string }; created_at: string };

function LettersIndex() {
  const tenant = useTenant();
  const { can } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [status, setStatus] = useState("all");
  const [limit, setLimit] = useState(200);

  const list = useQuery({
    queryKey: ["admin", "docs_documents", tenant.organization_id, status, limit],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      let q = supabase.from("docs_documents").select("id,kind,title,ref_no,doc_date,status,recipient,created_at").eq("organization_id", tenant.organization_id);
      if (status !== "all") q = q.eq("status", status);
      const { data, error } = await q.order("created_at", { ascending: false }).limit(limit);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const create = useMutation({
    mutationFn: async (kind: string) => {
      const { data: tpl } = await supabase.from("docs_templates").select("id").or(`organization_id.eq.${tenant.organization_id},organization_id.is.null`).eq("kind", kind === "notice" || kind === "appointment" || kind === "office_order" || kind === "press_release" ? "letter" : kind).eq("status", "active").order("is_default", { ascending: false }).limit(1).maybeSingle();
      const { data, error } = await supabase
        .from("docs_documents")
        .insert({ organization_id: tenant.organization_id, kind, title: `New ${kind.replace(/_/g, " ")}`, template_id: (tpl as { id: string } | null)?.id ?? null, signatories: [{ name: "", designation: "" }] } as never)
        .select("id").single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["admin", "docs_documents"] }); navigate({ to: "/admin/letters/$id", params: { id: d.id } }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const badge: Record<string, string> = { draft: "bg-secondary", pending_approval: "bg-amber-100 text-amber-900", approved: "bg-blue-100 text-blue-900", issued: "bg-emerald-100 text-emerald-900", cancelled: "bg-red-100 text-red-900" };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold"><T>Letters &amp; documents</T></h1>
          <p className="mt-1 text-sm text-muted-foreground">Create → approve → issue (number + QR) → PDF → dispatch. Issued documents are locked; cancel instead of editing.</p>
        </div>
        {can("docs.letter.create") ? (
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value="" onChange={(e) => e.target.value && create.mutate(e.target.value)}>
            <option value="">+ New document…</option>
            {KINDS.map((k) => <option key={k} value={k}>{k.replace(/_/g, " ")}</option>)}
          </select>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1 text-xs">
        {["all", "draft", "pending_approval", "approved", "issued", "cancelled"].map((s) => (
          <button key={s} type="button" onClick={() => setStatus(s)} className={`rounded-full px-3 py-1 ${status === s ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{s.replace(/_/g, " ")}</button>
        ))}
      </div>
      <div className="surface-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/70 text-left"><tr><th className="px-4 py-3"><T>Ref</T></th><th className="px-4 py-3"><T>Kind</T></th><th className="px-4 py-3"><T>Title / To</T></th><th className="px-4 py-3"><T>Date</T></th><th className="px-4 py-3"><T>Status</T></th></tr></thead>
          <tbody>
            {(list.data ?? []).map((r) => (
              <tr key={r.id} className="cursor-pointer border-t border-border hover:bg-secondary/40" onClick={() => navigate({ to: "/admin/letters/$id", params: { id: r.id } })}>
                <td className="px-4 py-3 font-mono text-xs">{r.ref_no ?? "—"}</td>
                <td className="px-4 py-3 capitalize">{r.kind.replace(/_/g, " ")}</td>
                <td className="px-4 py-3">{r.title}{r.recipient?.name ? <span className="block text-xs text-muted-foreground">To: {r.recipient.name}</span> : null}</td>
                <td className="px-4 py-3">{r.doc_date}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${badge[r.status] ?? ""}`}>{r.status.replace(/_/g, " ")}</span></td>
              </tr>
            ))}
            {list.isSuccess && list.data.length === 0 ? <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground"><T>No documents yet.</T></td></tr> : null}
          </tbody>
        </table>
        {(list.data?.length ?? 0) >= limit ? <div className="p-3 text-center"><Button variant="outline" size="sm" onClick={() => setLimit((n) => n + 200)}>और दिखाएँ · Show more</Button></div> : null}
      </div>
      <p className="text-xs text-muted-foreground">Inward/outward register: <Link to="/admin/register" className="underline">open register</Link></p>
      <Outlet />
    </div>
  );
}
