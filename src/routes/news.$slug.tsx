import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { siteName } from "@/core/seo";

import { PageHeader } from "@/components/site/PageHeader";
import { AdSlot } from "@/components/site/Ads";
import { RichText } from "@/components/site/Blocks";
import { Comments } from "@/components/site/Comments";
import { ShareButtons } from "@/components/site/ShareButtons";
import { ReadingProgress, ReadTime, RelatedGrid } from "@/components/site/DetailExtras";
import { useLang } from "@/core/i18n";
import { Button } from "@/components/ui/button";
import { newsListQuery, newsQuery } from "@/lib/queries";
import { formatDate, truncate } from "@/lib/format";

export const Route = createFileRoute("/news/$slug")({
  loader: async ({ context, params }) => {
    const item = await context.queryClient.ensureQueryData(newsQuery(params.slug));
    if (!item) throw notFound();
    return item;
  },
  head: ({ loaderData, matches }) => {
    if (!loaderData) {
      return { meta: [{ title: "News not found" }, { name: "robots", content: "noindex" }] };
    }
    const desc = truncate(loaderData.description, 155);
    return {
      meta: [
        { title: `${loaderData.title} — ${siteName(matches)}` },
        { name: "description", content: desc },
        { property: "og:title", content: loaderData.title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: NewsDetail,
});

function NewsDetail() {
  const { slug } = Route.useParams();
  const { data: item } = useSuspenseQuery(newsQuery(slug));
  const { lang } = useLang(); const L = lang === "hi";
  const list = useQuery(newsListQuery());
  if (!item) return null;
  const related = (list.data ?? []).filter((x) => x.slug !== item.slug)
    .map((x) => ({ x, score: (x.category_id && x.category_id === item.category_id ? 2 : 0) + (x.tags ?? []).filter((t: string) => (item.tags ?? []).includes(t)).length }))
    .sort((a, b) => b.score - a.score || Date.parse(b.x.published_at ?? "") - Date.parse(a.x.published_at ?? ""))
    .map(({ x }) => ({ key: x.id, to: "/news/$slug", params: { slug: x.slug }, title: x.title, image: x.thumbnail, meta: formatDate(x.published_at) }));

  return (
    <>
      <ReadingProgress />
      <PageHeader
        title={item.title}
        crumbs={[{ label: L ? "समाचार" : "News", to: "/news" }, { label: truncate(item.title, 40) }]}
      />
      <article className="section-y">
        <div className="container-page max-w-3xl">
          <p className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>{item.source_name ? `${item.source_name} · ` : ""}{formatDate(item.published_at)}</span>
            <ReadTime text={item.content || item.description} L={L} />
          </p>
          {item.thumbnail ? (
            <img src={item.thumbnail} alt="" className="mt-6 w-full rounded-xl object-cover" />
          ) : null}
          <RichText className="mt-6" text={item.content || item.description || ""} />
          {item.external_url ? (
            <Button asChild variant="outline" className="mt-6">
              <a href={item.external_url} target="_blank" rel="noreferrer noopener">
                {L ? "मूल समाचार पढ़ें" : "Read original coverage"} <ExternalLink className="size-4" />
              </a>
            </Button>
          ) : null}
          <div className="mt-8">
            <ShareButtons path={`/news/${item.slug}`} title={item.title} />
          </div>
          <AdSlot slot="post_bottom" className="mt-8" />
          <Comments kind="news" postId={item.id} />
        </div>
      </article>
      <RelatedGrid title={L ? "और समाचार" : "More news"} items={related} all={{ to: "/news", label: L ? "सभी समाचार" : "All news" }} />
    </>
  );
}
