// Editorial workflow for blogs and news: author → review → publish, central-feed nomination, comments.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { CrudPage, type AdminField } from "@/components/admin/CrudPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { tx } from "@/components/admin/adminText";
import { useLang } from "@/core/i18n";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";

type Kind = "blog" | "news";

export function PostsPage({ kind }: { kind: Kind }) {
  const tenant = useTenant();
  const { can, user } = useAuth();
  const qc = useQueryClient();
  const { lang } = useLang();
  const L = lang === "hi";
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
    { key: "slug", label: "Slug", hint: L ? "खाली छोड़ें तो अपने-आप बनेगा" : "Auto-generated if empty" },
    { key: "category_id", label: "Category", fk: { table: "cms_categories", label: "name" } },
    { key: "excerpt", label: "Excerpt (English)", type: "textarea", full: true },
    { key: "excerpt_hi", label: "सार (हिंदी)", type: "textarea", full: true },
    { key: "content", label: "Content (English)", type: "markup", full: true },
    { key: "content_hi", label: "लेख (हिंदी)", type: "markup", full: true },
    { key: "featured_image", label: "Featured image URL", type: "image", full: true },
    { key: "author_name", label: "Author (byline)" },
    { key: "city", label: "City" },
    { key: "published_at", label: "Publish date", type: "date", hint: L ? "आगे की तारीख = तय समय पर प्रकाशन" : "future date = scheduled" },
    { key: "featured", label: "Featured", type: "checkbox" },
    { key: "seo_title", label: "SEO title", full: true },
    { key: "seo_description", label: "SEO description", type: "textarea", full: true },
  ] : [
    { key: "title", label: "Headline", required: true, full: true },
    { key: "slug", label: "Slug", hint: L ? "खाली छोड़ें तो अपने-आप बनेगा" : "Auto-generated if empty" },
    { key: "category_id", label: "Category", fk: { table: "cms_categories", label: "name" } },
    { key: "description", label: "Summary (English)", type: "textarea", required: true, full: true },
    { key: "description_hi", label: "सार (हिंदी)", type: "textarea", full: true },
    { key: "content", label: "Full story (English)", type: "markup", full: true },
    { key: "content_hi", label: "पूरी खबर (हिंदी)", type: "textarea", full: true },
    { key: "thumbnail", label: "Image URL", type: "image", full: true },
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
      title={kind === "blog" ? (L ? "लेख" : "Articles") : (L ? "समाचार" : "News")}
      description={kind === "blog" ? (L ? "लेखक मसौदा सहेजकर समीक्षा के लिए भेजते हैं; संपादक बदलाव माँगते हैं या प्रकाशित करते हैं। प्रकाशित लेख मुख्य (ऊपरी) संगठन की फ़ीड के लिए भी भेजे जा सकते हैं।" : "Writers save drafts and submit for review; editors request changes or publish. Published posts can be nominated to the central (parent) feed.") : (L ? "छोटे समाचार, चाहें तो पूरी खबर के साथ। समीक्षा और प्रकाशन लेखों की तरह।" : "Short news items with an optional full story. Same review → publish flow as articles.")}
      orderBy="created_at"
      slugFrom="title"
      defaults={{ status: "draft" }}
      createdBy
      toolbar={pending.data ? <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">{L ? `${pending.data} लेख/समाचार समीक्षा के लिए बाकी हैं।` : `${pending.data} post(s) waiting for review.`}</p> : null}
      rowClass={(r) => (r.status === "review" ? "bg-amber-50/60" : "")}
      columns={[
        { key: "title", label: "Title", render: (r) => <span>{r.title}{r.review_note && r.status === "draft" ? <span className="block text-xs text-destructive">{L ? "बदलाव माँगे गए:" : "Changes requested:"} {r.review_note}</span> : null}</span> },
        { key: "status", label: "Status", render: (r) => <><Badge variant={r.status === "published" ? "default" : r.status === "review" ? "secondary" : "outline"}>{tx(r.status, L)}</Badge>{r.central_status !== "none" ? <Badge variant="outline" className="ml-1">{L ? "मुख्य फ़ीड" : "central"}: {tx(r.central_status, L)}</Badge> : null}</> },
        { key: "author_name", label: "Author", render: (r) => r.author_name ?? (r.created_by === user?.id ? (L ? "मैं" : "me") : "") },
        { key: "published_at", label: "Date", render: (r) => formatDate(r.published_at) },
        { key: "views", label: "Views" },
      ]}
      fields={fields}
      extraActions={(r) => (
        <span className="inline-flex flex-wrap gap-1">
          {(r.status === "draft" || r.status === "review") && (r.created_by === user?.id || canPublish) && r.status !== "review" ? <Button size="sm" variant="outline" onClick={() => act(L ? "समीक्षा के लिए भेजा" : "Submitted for review", () => rpc("k1_post_submit", { p_kind: kind, p_id: r.id }))}>{L ? "समीक्षा हेतु भेजें" : "Submit"}</Button> : null}
          {r.status === "review" && canReview ? <Button size="sm" variant="outline" onClick={() => { const n = prompt(L ? "लेखक क्या बदले?" : "What should the author change?"); if (n) act(L ? "वापस भेजा" : "Sent back", () => rpc("k1_post_decide", { p_kind: kind, p_id: r.id, p_decision: "changes", p_note: n })); }}>{L ? "बदलाव माँगें" : "Changes"}</Button> : null}
          {r.status !== "published" && canPublish ? <Button size="sm" onClick={() => act(L ? "प्रकाशित" : "Published", () => rpc("k1_post_decide", { p_kind: kind, p_id: r.id, p_decision: "publish", p_note: null }))}>{L ? "प्रकाशित करें" : "Publish"}</Button> : null}
          {r.status === "published" && canPublish ? <Button size="sm" variant="ghost" onClick={() => act(L ? "प्रकाशन हटाया" : "Unpublished", () => rpc("k1_post_decide", { p_kind: kind, p_id: r.id, p_decision: "unpublish", p_note: null }))}>{L ? "प्रकाशन हटाएँ" : "Unpublish"}</Button> : null}
          {r.status === "published" && hasParent && canNominate && r.central_status === "none" ? <Button size="sm" variant="ghost" onClick={() => act(L ? "मुख्य फ़ीड के लिए भेजा" : "Nominated to the central feed", () => rpc("k1_post_nominate", { p_kind: kind, p_id: r.id, p_nominate: true }))}>{L ? "मुख्य फ़ीड हेतु ↑" : "Nominate ↑"}</Button> : null}
          {r.central_status === "nominated" && canNominate ? <Button size="sm" variant="ghost" onClick={() => act(L ? "नामांकन वापस लिया" : "Nomination withdrawn", () => rpc("k1_post_nominate", { p_kind: kind, p_id: r.id, p_nominate: false }))}>{L ? "वापस लें" : "Withdraw"}</Button> : null}
        </span>
      )}
    />
  );
}
