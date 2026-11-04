import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { slugify } from "@/components/admin/CrudPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/pages/")({ component: PagesList });

type Page = { id: string; slug: string; title: string; status: string; is_home: boolean; show_in_menu: boolean; updated_at: string; publish_at: string | null };

function PagesList() {
  const tenant = useTenant();
  const { can } = useAuth();
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const pages = useQuery({ queryKey: ["cms_pages", tenant.organization_id], queryFn: async () => { const { data, error } = await supabase.from("cms_pages").select("id,slug,title,status,is_home,show_in_menu,updated_at,publish_at").eq("organization_id", tenant.organization_id).order("updated_at", { ascending: false }); if (error) throw error; return (data ?? []) as Page[]; } });
  async function create() {
    if (!title.trim()) return;
    const { data, error } = await supabase.from("cms_pages").insert({ organization_id: tenant.organization_id, title: title.trim(), slug: slugify(title) || `page-${Date.now()}`, blocks: [], created_by: (await supabase.auth.getUser()).data.user?.id } as never).select("id").single();
    if (error) { toast.error(error.message); return; }
    nav({ to: "/admin/pages/$id", params: { id: (data as { id: string }).id } });
  }
  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-2xl font-semibold">Pages</h1><p className="text-sm text-muted-foreground">Build pages from blocks (banner, text, cards, gallery, video…). A page marked "use as home" replaces the default home page.</p></div>
        {can("cms.page.edit") ? <div className="flex gap-2"><Input placeholder="New page title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-56" onKeyDown={(e) => { if (e.key === "Enter") create(); }} /><Button onClick={create}>+ Page</Button></div> : null}
      </header>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground"><tr><th className="p-2">Title</th><th className="p-2">URL</th><th className="p-2">Status</th><th className="p-2">Updated</th></tr></thead>
          <tbody>
            {(pages.data ?? []).map((p) => (
              <tr key={p.id} className="cursor-pointer border-t border-border hover:bg-secondary/40" onClick={() => nav({ to: "/admin/pages/$id", params: { id: p.id } })}>
                <td className="p-2"><b>{p.title}</b>{p.is_home ? <Badge className="ml-2">home</Badge> : null}{p.show_in_menu ? <Badge variant="outline" className="ml-1">menu</Badge> : null}</td>
                <td className="p-2 font-mono text-xs">{p.is_home ? "/" : `/p/${p.slug}`}</td>
                <td className="p-2"><Badge variant={p.status === "published" ? "default" : "secondary"}>{p.status}</Badge>{p.publish_at && new Date(p.publish_at) > new Date() ? <span className="ml-1 text-xs text-muted-foreground">scheduled {new Date(p.publish_at).toLocaleString("en-IN")}</span> : null}</td>
                <td className="p-2 text-xs text-muted-foreground">{new Date(p.updated_at).toLocaleString("en-IN")}</td>
              </tr>
            ))}
            {pages.isSuccess && !pages.data.length ? <tr><td className="p-3 text-muted-foreground" colSpan={4}>No pages yet. Type a title above to start.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
