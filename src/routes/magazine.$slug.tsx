import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/site/PageHeader";
import { ShareButtons } from "@/components/site/ShareButtons";
import { Button } from "@/components/ui/button";
import { useLang } from "@/core/i18n";
import { siteName } from "@/core/seo";
import { supabase } from "@/integrations/supabase/client";
import { issueQuery } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { MagazineReader, PrintButton, useIssueArticles, type IssueLike } from "@/components/magazine/MagazineReader";
import { useTenant } from "@/core/tenant-context";

export const Route = createFileRoute("/magazine/$slug")({
  loader: async ({ context, params }) => { const i = await context.queryClient.ensureQueryData(issueQuery(params.slug)); if (!i) throw notFound(); return i; },
  head: ({ loaderData, matches }) => ({ meta: loaderData ? [{ title: `${loaderData.title} — ${siteName(matches)}` }, { name: "description", content: loaderData.description ?? loaderData.title }] : [{ title: "Not found" }] }),
  component: IssuePage,
});

const pubUrl = (path: string | null) => (path ? supabase.storage.from("publications").getPublicUrl(path).data.publicUrl : "");

function IssuePage() {
  const { slug } = Route.useParams();
  const { data: issue } = useSuspenseQuery(issueQuery(slug));
  const { lang, loc } = useLang();
  const L = lang === "hi";
  const [page, setPage] = useState(0);
  useEffect(() => { if (issue) supabase.rpc("k1_issue_view", { p_id: issue.id } as never).then(() => undefined, () => undefined); }, [issue?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const pages = ((issue?.pages as string[] | undefined) ?? []);
  const tenant = useTenant();
  const composed = Array.isArray((issue as { articles?: unknown } | null)?.articles) && ((issue as { articles: unknown[] }).articles.length > 0);
  const arts = useIssueArticles(issue?.id, composed);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "ArrowRight") setPage((p) => Math.min(pages.length - 1, p + 1)); if (e.key === "ArrowLeft") setPage((p) => Math.max(0, p - 1)); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [pages.length]);
  if (!issue) return null;

  return (
    <>
      <PageHeader title={loc(issue, "title")} description={[issue.issue_no, formatDate(issue.issue_date)].filter(Boolean).join(" · ")} crumbs={[{ label: L ? "पत्रिका" : "Magazine", to: "/magazine" }, { label: issue.issue_no ?? issue.title }]} />
      <section className="section-y">
        <div className="container-page space-y-4">
          {issue.description ? <p className="max-w-3xl text-muted-foreground">{issue.description}</p> : null}
          <div className="flex flex-wrap gap-2">
            {issue.pdf_path ? <Button asChild><a href={pubUrl(issue.pdf_path)} target="_blank" rel="noreferrer">{L ? "PDF डाउनलोड" : "Download PDF"}</a></Button> : null}
            <ShareButtons path={`/magazine/${issue.slug}`} title={issue.title} />
          </div>
          {composed ? (
            <>
              <div className="flex gap-2"><PrintButton label={L ? "🖨️ प्रिंट / PDF सहेजें" : "🖨️ Print / save as PDF"} /></div>
              {arts.data ? <MagazineReader issue={issue as unknown as IssueLike} orgName={(L && tenant.name_hi) || tenant.name} articles={arts.data} /> : <p className="text-sm text-muted-foreground">…</p>}
            </>
          ) : pages.length ? (
            <div className="rounded-xl border border-border bg-secondary/40 p-3">
              <div className="flex items-center justify-between text-sm">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>‹ {L ? "पिछला" : "Prev"}</Button>
                <span>{L ? "पृष्ठ" : "Page"} {page + 1} / {pages.length}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pages.length - 1, p + 1))} disabled={page >= pages.length - 1}>{L ? "अगला" : "Next"} ›</Button>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <img src={pubUrl(pages[page]!)} alt={`Page ${page + 1}`} className="mx-auto max-h-[80vh] rounded-md shadow" />
                {pages[page + 1] ? <img src={pubUrl(pages[page + 1]!)} alt={`Page ${page + 2}`} className="mx-auto hidden max-h-[80vh] rounded-md shadow md:block" /> : null}
              </div>
              <div className="mt-3 flex gap-1 overflow-x-auto">{pages.map((p, i) => <button key={p} type="button" onClick={() => setPage(i)} className={`shrink-0 rounded border ${i === page ? "border-primary" : "border-transparent"}`}><img src={pubUrl(p)} alt="" className="h-16 w-12 object-cover" loading="lazy" /></button>)}</div>
            </div>
          ) : issue.pdf_path ? (
            <iframe src={pubUrl(issue.pdf_path)} title={issue.title} className="h-[80vh] w-full rounded-xl border border-border" />
          ) : null}
        </div>
      </section>
    </>
  );
}
