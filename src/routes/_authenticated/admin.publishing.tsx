// Categories, comment moderation, central-feed approvals (parent organizations), magazine issues.
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { CrudPage } from "@/components/admin/CrudPage";
import { IssueComposer } from "@/components/admin/IssueComposer";
import type { IssueLike } from "@/components/magazine/MagazineReader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/publishing")({ component: PublishingPage });

type Comment = { id: string; post_kind: string; post_id: string; name: string; email: string | null; body: string; status: string; created_at: string };
type Feed = { kind: string; id: string; organization_id: string; org_name: string; org_slug: string; title: string; slug: string; excerpt: string | null; image: string | null; published_at: string | null; central_status: string };

function PublishingPage() {
  const tenant = useTenant();
  const org = tenant.organization_id;
  const { can } = useAuth();
  const qc = useQueryClient();
  const canMod = can("cms.post.publish") || can("cms.post.review");
  const [tab, setTab] = useState<"comments" | "central" | "categories" | "magazine">("comments");

  const comments = useQuery({ queryKey: ["cms_comments", org], enabled: canMod, queryFn: async () => { const { data } = await supabase.from("cms_comments").select("*").eq("organization_id", org).order("created_at", { ascending: false }).limit(300); return (data ?? []) as unknown as Comment[]; } });
  const nominated = useQuery({ queryKey: ["central_nominated", org], enabled: tenant.child_count > 0 && can("cms.post.publish"), queryFn: async () => { const { data } = await supabase.rpc("k1_central_feed", { p_org: org, p_limit: 100, p_status: "nominated" } as never); return (data ?? []) as unknown as Feed[]; } });

  async function moderate(c: Comment, status: "approved" | "spam" | "delete") {
    try {
      if (status === "delete") { const { error } = await supabase.from("cms_comments").delete().eq("id", c.id); if (error) throw error; }
      else { const { error } = await supabase.from("cms_comments").update({ status } as never).eq("id", c.id); if (error) throw error; }
      qc.invalidateQueries({ queryKey: ["cms_comments", org] });
    } catch (e) { toast.error((e as Error).message); }
  }
  async function decide(f: Feed, approve: boolean) {
    try { const { error } = await supabase.rpc("k1_central_decide", { p_kind: f.kind, p_id: f.id, p_approve: approve } as never); if (error) throw error; toast.success(approve ? "Added to the central feed" : "Declined"); qc.invalidateQueries({ queryKey: ["central_nominated", org] }); } catch (e) { toast.error((e as Error).message); }
  }

  const pendingC = (comments.data ?? []).filter((c) => c.status === "pending").length;
  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl font-semibold">Publishing</h1>
        <p className="text-sm text-muted-foreground">Comments, categories, the central feed and the magazine. Posts themselves live under Blogs and News.</p>
      </header>
      <div className="flex rounded-md border border-border p-0.5 text-xs w-fit">
        {([["comments", `Comments${pendingC ? ` (${pendingC})` : ""}`], ["categories", "Categories"], ...(tenant.child_count > 0 ? [["central", `Central feed${nominated.data?.length ? ` (${nominated.data.length})` : ""}`]] : []), ["magazine", "Magazine"]] as [typeof tab, string][]).map(([k, l]) => <button key={k} type="button" className={`rounded px-3 py-1 ${tab === k ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setTab(k)}>{l}</button>)}
      </div>

      {tab === "comments" ? (
        <div className="space-y-2">
          {(comments.data ?? []).map((c) => (
            <div key={c.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border bg-background p-3 text-sm">
              <div className="min-w-0 flex-1">
                <p><b>{c.name}</b> {c.email ? <span className="text-xs text-muted-foreground">{c.email}</span> : null} · <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString("en-IN")}</span> · <Badge variant={c.status === "approved" ? "default" : c.status === "spam" ? "destructive" : "secondary"}>{c.status}</Badge> <span className="text-xs text-muted-foreground">on {c.post_kind}</span></p>
                <p className="mt-1 whitespace-pre-wrap">{c.body}</p>
              </div>
              <div className="flex gap-1">
                {c.status !== "approved" ? <Button size="sm" onClick={() => moderate(c, "approved")}>Approve</Button> : null}
                {c.status !== "spam" ? <Button size="sm" variant="outline" onClick={() => moderate(c, "spam")}>Spam</Button> : null}
                <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this comment?")) moderate(c, "delete"); }}>Delete</Button>
              </div>
            </div>
          ))}
          {comments.isSuccess && !comments.data.length ? <p className="text-sm text-muted-foreground">No comments yet.</p> : null}
        </div>
      ) : null}

      {tab === "categories" ? (
        <CrudPage table="cms_categories" title="Categories" description="Shown as filters on the blog and news pages." orderBy="sort_order" ascending
          columns={[{ key: "name", label: "Name" }, { key: "name_hi", label: "हिंदी" }, { key: "kind", label: "For" }, { key: "slug", label: "Slug" }]}
          fields={[{ key: "name", label: "Name", required: true }, { key: "name_hi", label: "नाम (हिंदी)" }, { key: "slug", label: "Slug", hint: "auto from name" }, { key: "kind", label: "For", type: "select", options: ["both", "blog", "news"] }, { key: "sort_order", label: "Order", type: "number" }]}
          slugFrom="name" />
      ) : null}

      {tab === "central" ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Posts nominated by your sub-organizations. Approved posts appear on your central feed (/feed) and homepage.</p>
          {(nominated.data ?? []).map((f) => (
            <div key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background p-3 text-sm">
              <div><Badge variant="outline">{f.org_name}</Badge> <b className="ml-1">{f.title}</b> <span className="text-xs text-muted-foreground">· {f.kind} · {f.published_at ? new Date(f.published_at).toLocaleDateString("en-IN") : ""}</span>{f.excerpt ? <p className="text-xs text-muted-foreground line-clamp-2">{f.excerpt}</p> : null}</div>
              <div className="flex gap-1"><Button size="sm" onClick={() => decide(f, true)}>Approve</Button><Button size="sm" variant="outline" onClick={() => decide(f, false)}>Decline</Button></div>
            </div>
          ))}
          {nominated.isSuccess && !nominated.data.length ? <p className="text-sm text-muted-foreground">Nothing nominated right now.</p> : null}
        </div>
      ) : null}

      {tab === "magazine" ? <MagazineAdmin org={org} /> : null}
    </div>
  );
}

type Issue = { id: string; title: string; title_hi: string | null; slug: string; issue_no: string | null; issue_date: string; description: string | null; cover_path: string | null; pdf_path: string | null; pages: string[]; access: string; status: string; views: number };

function MagazineAdmin({ org }: { org: string }) {
  const qc = useQueryClient();
  const [composing, setComposing] = useState<Issue | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  async function upload(issue: Issue, kind: "cover" | "pdf" | "pages", files: FileList | null) {
    if (!files?.length) return;
    setUploading(issue.id);
    try {
      if (kind === "pages") {
        const paths: string[] = [...issue.pages];
        const list = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        for (let i = 0; i < list.length; i++) {
          const f = list[i]!; const path = `${org}/${issue.id}/page-${String(paths.length + 1).padStart(3, "0")}.${f.name.split(".").pop()}`;
          const { error } = await supabase.storage.from("publications").upload(path, f, { upsert: true, contentType: f.type }); if (error) throw error;
          paths.push(path);
        }
        const { error } = await supabase.from("pub_issues").update({ pages: paths } as never).eq("id", issue.id); if (error) throw error;
      } else {
        const f = files[0]!; const path = `${org}/${issue.id}/${kind === "pdf" ? "issue.pdf" : "cover." + (f.name.split(".").pop() ?? "jpg")}`;
        const { error } = await supabase.storage.from("publications").upload(path, f, { upsert: true, contentType: f.type }); if (error) throw error;
        const { error: e2 } = await supabase.from("pub_issues").update({ [kind === "pdf" ? "pdf_path" : "cover_path"]: path } as never).eq("id", issue.id); if (e2) throw e2;
      }
      toast.success("Uploaded"); qc.invalidateQueries({ queryKey: ["admin", "pub_issues"] });
    } catch (e) { toast.error((e as Error).message); } finally { setUploading(null); }
  }
  async function clearPages(issue: Issue) {
    if (!confirm("Remove all page images?")) return;
    await supabase.storage.from("publications").remove(issue.pages);
    await supabase.from("pub_issues").update({ pages: [] } as never).eq("id", issue.id);
    qc.invalidateQueries({ queryKey: ["admin", "pub_issues"] });
  }
  return (
    <>
    <CrudPage table="pub_issues" title="Magazine issues" description="अंक बनाएँ → 'पत्रिका बनाएँ' से ब्लॉग/समाचार/उपलब्धियाँ/सूचनाएँ चुनकर, रूप-रंग तय करके वेब-पत्रिका बनाएँ (पाठक प्रिंट/PDF कर सकते हैं)। या तैयार PDF / पृष्ठ-चित्र अपलोड करें।" orderBy="issue_date"
      createdBy
      columns={[{ key: "title", label: "Issue", render: (r) => <span>{r.title}{r.issue_no ? <span className="text-xs text-muted-foreground"> · {r.issue_no}</span> : null}</span> }, { key: "issue_date", label: "Date" }, { key: "status", label: "Status" }, { key: "access", label: "Access" }, { key: "views", label: "Views" }, { key: "files", label: "Files", render: (r: Issue) => <span className="text-xs text-muted-foreground">{r.cover_path ? "cover " : ""}{r.pdf_path ? "pdf " : ""}{r.pages?.length ? `${r.pages.length} pages` : ""}</span> }]}
      fields={[{ key: "title", label: "Title", required: true, full: true }, { key: "title_hi", label: "शीर्षक (हिंदी)", full: true }, { key: "slug", label: "Slug", hint: "auto" }, { key: "issue_no", label: "Issue no. (e.g. Vol 2 · No 3)" }, { key: "issue_date", label: "Date", type: "date", required: true }, { key: "access", label: "Access", type: "select", options: ["public", "members"] }, { key: "status", label: "Status", type: "select", options: ["draft", "published", "archived"] }, { key: "description", label: "Description", type: "textarea", full: true }]}
      slugFrom="title"
      extraActions={(r: Issue) => (
        <span className="inline-flex flex-wrap items-center gap-1 text-xs">
          <label className="cursor-pointer rounded border border-border px-2 py-1">Cover<input type="file" accept="image/*" hidden onChange={(e) => upload(r, "cover", e.target.files)} /></label>
          <label className="cursor-pointer rounded border border-border px-2 py-1">PDF<input type="file" accept="application/pdf" hidden onChange={(e) => upload(r, "pdf", e.target.files)} /></label>
          <label className="cursor-pointer rounded border border-border px-2 py-1">+ Pages<input type="file" accept="image/*" multiple hidden onChange={(e) => upload(r, "pages", e.target.files)} /></label>
          {r.pages?.length ? <Button size="sm" variant="ghost" onClick={() => clearPages(r)}>clear pages</Button> : null}
          {uploading === r.id ? <span>uploading…</span> : null}
          <Button size="sm" onClick={() => setComposing(r)}>✍️ पत्रिका बनाएँ{Array.isArray((r as unknown as { articles?: unknown[] }).articles) && (r as unknown as { articles: unknown[] }).articles.length ? ` (${(r as unknown as { articles: unknown[] }).articles.length})` : ""}</Button>
          {r.status === "published" ? <a className="underline" href={`/magazine/${r.slug}`} target="_blank" rel="noreferrer">view</a> : null}
        </span>
      )}
    />
    {composing ? <IssueComposer issue={{ ...(composing as unknown as IssueLike), organization_id: org }} open onClose={() => setComposing(null)} onSaved={() => qc.invalidateQueries({ queryKey: ["admin", "pub_issues"] })} /> : null}
    </>
  );
}
