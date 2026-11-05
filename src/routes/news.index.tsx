import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { pageMeta } from "@/core/seo";

import { NewsCard } from "@/components/home/sections";
import { PageHeader } from "@/components/site/PageHeader";
import { newsListQuery } from "@/lib/queries";

export const Route = createFileRoute("/news/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(newsListQuery()),
  head: ({ matches }) => pageMeta(matches, { en: "News", hi: "समाचार" }, { en: "Announcements, notices and media coverage.", hi: "घोषणाएँ, सूचनाएँ और मीडिया कवरेज।" }),
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
