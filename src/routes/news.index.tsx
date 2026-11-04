import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { siteName } from "@/core/seo";

import { NewsCard } from "@/components/home/sections";
import { PageHeader } from "@/components/site/PageHeader";
import { newsListQuery } from "@/lib/queries";

export const Route = createFileRoute("/news/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(newsListQuery()),
  head: ({ matches }) => ({
    meta: [
      { title: `News & press coverage — ${siteName(matches)}` },
      {
        name: "description",
        content:
          `Press coverage, announcements and media mentions of ${siteName(matches)}'s seva work.`,
      },
      { property: "og:title", content: `News & press coverage — ${siteName(matches)}` },
      { property: "og:description", content: "Announcements and media coverage of our work." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewsList,
});

function NewsList() {
  const { data: news } = useSuspenseQuery(newsListQuery());
  return (
    <>
      <PageHeader
        title="News & press"
        description="Announcements, media coverage and recognition of our seva."
        crumbs={[{ label: "News" }]}
      />
      <section className="section-y">
        <div className="container-page">
          {news.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {news.map((n: any) => (
                <NewsCard key={n.id} item={n} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No news published yet.</p>
          )}
        </div>
      </section>
    </>
  );
}
