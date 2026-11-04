// Editorial workflow for blogs and news: author → review → publish, central-feed nomination, comments.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { CrudPage, type AdminField } from "@/components/admin/CrudPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";

type Kind = "blog" | "news";

export function PostsPage({ kind }: { kind: Kind }) {
  const tenant = useTenant();
  const { can, user } = useAuth();
  const qc = useQueryClient();
  const table = kind === "blog" ? "blogs" : "news";
  const canPublish = can("cms.post.publish");
  const canReview = canPublish || can("cms.post.review");
  const canNominate = canPublish || can("cms.post.nominate_central");
  const hasParent = !!tenant.parent_id;

  const pending = useQuery({ queryKey: ["cms_pending", table, tenant.organization_id], queryFn: async () => { const { count } = await supabase.from(table as "blogs").select("id", { count: "exact", head: true }).eq("organization_id", tenant.organization_id).eq("status", "review"); return count ?? 0; } });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin", table] }); qc.invalidateQueries({ queryKey: ["cms_pending", table] }); };
  async function act(label: string, fn: () => Promise<unknown>) { try { await fn(); toast.success(label); refresh(); } catch (e) { toast.error((e as Error).message); } }
  const rpc = async (fn: string, args: Record<string, unknown>) => { const { error } = await supabase.rpc(fn as never, args as never); if (error) throw new Error(error.message); };

  const fields: AdminField[] = kind === "blog" ? [
    { key: "title", label: "Title", required: true, full: true },
    { key: "slug", label: "Slug", hint: "Auto-generated if empty" },
    { key: "category_id", label: "Category", fk: { table: "cms_categories", label: "name" } },
    { key: "excerpt", label: "Excerpt (English)", type: "textarea", full: true },
    { key: "excerpt_hi", label: "सार (हिंदी)", type: "textarea", full: true },
    { key: "content", label: "Content (English)", type: "textarea", full: true },
    { key: "content_hi", label: "लेख (हिंदी)", type: "textarea", full: true },
    { key: "featured_image", label: "Featured image URL", type: "url", full: true },
    { key: "author_name", label: "Author (byline)" },
    { key: "city", label: "City" },
    { key: "published_at", label: "Publish date", type: "date", hint: "future date = scheduled" },
    { key: "featured", label: "Featured", type: "checkbox" },
    { key: "seo_title", label: "SEO title", full: true },
    { key: "seo_description", label: "SEO description", type: "textarea", full: true },
  ] : [
    { key: "title", label: "Headline", required: true, full: true },
    { key: "slug", label: "Slug", hint: "Auto-generated if empty" },
    { key: "category_id", label: "Category", fk: { table: "cms_categories", label: "name" } },
    { key: "description", label: "Summary (English)", type: "textarea", required: true, full: true },
    { key: "description_hi", label: "सार (हिंदी)", type: "textarea", full: true },
    { key: "content", label: "Full story (English)", type: "textarea", full: true },
    { key: "content_hi", label: "पूरी खबर (हिंदी)", type: "textarea", full: true },
    { key: "thumbnail", label: "Image URL", type: "url", full: true },
    { key: "source_name", label: "Source (if external)" },
    { key: "external_url", label: "External link", type: "url" },
    { key: "author_name", label: "Author (byline)" },
    { key: "published_at", label: "Publish date", type: "date" },
    { key: "display_homepage", label: "Show on homepage", type: "checkbox" },
    { key: "featured", label: "Featured", type: "checkbox" },
    { key: "breaking", label: "Breaking", type: "checkbox" },
    { key: "seo_title", label: "SEO title", full: true },
    { key: "seo_description", label: "SEO description", type: "textarea", full: true },
  ];
  if (canPublish) fields.splice(2, 0, { key: "status", label: "Status", type: "select", options: ["draft", "review", "published", "archived"] });

  return (
    <CrudPage
      table={table}
      title={kind === "blog" ? "Blogs & articles" : "News"}
      description={kind === "blog" ? "Writers save drafts and submit for review; editors request changes or publish. Published posts can be nominated to the central (parent) feed." : "Short news items with an optional full story. Same review → publish flow as blogs."}
      orderBy="created_at"
      slugFrom="title"
      defaults={{ status: "draft" }}
      createdBy
      toolbar={pending.data ? <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">{pending.data} post(s) waiting for review.</p> : null}
      rowClass={(r) => (r.status === "review" ? "bg-amber-50/60" : "")}
      columns={[
        { key: "title", label: "Title", render: (r) => <span>{r.title}{r.review_note && r.status === "draft" ? <span className="block text-xs text-destructive">Changes requested: {r.review_note}</span> : null}</span> },
        { key: "status", label: "Status", render: (r) => <><Badge variant={r.status === "published" ? "default" : r.status === "review" ? "secondary" : "outline"}>{r.status}</Badge>{r.central_status !== "none" ? <Badge variant="outline" className="ml-1">central: {r.central_status}</Badge> : null}</> },
        { key: "author_name", label: "Author", render: (r) => r.author_name ?? (r.created_by === user?.id ? "me" : "") },
        { key: "published_at", label: "Date", render: (r) => formatDate(r.published_at) },
        { key: "views", label: "Views" },
      ]}
      fields={fields}
      extraActions={(r) => (
        <span className="inline-flex flex-wrap gap-1">
          {(r.status === "draft" || r.status === "review") && (r.created_by === user?.id || canPublish) && r.status !== "review" ? <Button size="sm" variant="outline" onClick={() => act("Submitted for review", () => rpc("k1_post_submit", { p_kind: kind, p_id: r.id }))}>Submit</Button> : null}
          {r.status === "review" && canReview ? <Button size="sm" variant="outline" onClick={() => { const n = prompt("What should the author change?"); if (n) act("Sent back", () => rpc("k1_post_decide", { p_kind: kind, p_id: r.id, p_decision: "changes", p_note: n })); }}>Changes</Button> : null}
          {r.status !== "published" && canPublish ? <Button size="sm" onClick={() => act("Published", () => rpc("k1_post_decide", { p_kind: kind, p_id: r.id, p_decision: "publish", p_note: null }))}>Publish</Button> : null}
          {r.status === "published" && canPublish ? <Button size="sm" variant="ghost" onClick={() => act("Unpublished", () => rpc("k1_post_decide", { p_kind: kind, p_id: r.id, p_decision: "unpublish", p_note: null }))}>Unpublish</Button> : null}
          {r.status === "published" && hasParent && canNominate && r.central_status === "none" ? <Button size="sm" variant="ghost" onClick={() => act("Nominated to the central feed", () => rpc("k1_post_nominate", { p_kind: kind, p_id: r.id, p_nominate: true }))}>Nominate ↑</Button> : null}
          {r.central_status === "nominated" && canNominate ? <Button size="sm" variant="ghost" onClick={() => act("Nomination withdrawn", () => rpc("k1_post_nominate", { p_kind: kind, p_id: r.id, p_nominate: false }))}>Withdraw</Button> : null}
        </span>
      )}
    />
  );
}
