import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { siteName } from "@/core/seo";

import { PageHeader } from "@/components/site/PageHeader";
import { AdSlot } from "@/components/site/Ads";
import { Comments } from "@/components/site/Comments";
import { ShareButtons } from "@/components/site/ShareButtons";
import { Button } from "@/components/ui/button";
import { newsQuery } from "@/lib/queries";
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
  if (!item) return null;

  return (
    <>
      <PageHeader
        title={item.title}
        crumbs={[{ label: "News", to: "/news" }, { label: truncate(item.title, 40) }]}
      />
      <article className="section-y">
        <div className="container-page max-w-3xl">
          <p className="text-sm text-muted-foreground">
            {item.source_name ? `${item.source_name} · ` : ""}
            {formatDate(item.published_at)}
          </p>
          {item.thumbnail ? (
            <img src={item.thumbnail} alt="" className="mt-6 w-full rounded-xl object-cover" />
          ) : null}
          <div className="prose-content mt-6 whitespace-pre-line">
            {item.content || item.description}
          </div>
          {item.external_url ? (
            <Button asChild variant="outline" className="mt-6">
              <a href={item.external_url} target="_blank" rel="noreferrer noopener">
                Read original coverage <ExternalLink className="size-4" />
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
    </>
  );
}
