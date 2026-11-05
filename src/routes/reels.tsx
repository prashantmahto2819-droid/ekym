import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { pageMeta } from "@/core/seo";

import { VideoCard } from "@/components/home/sections";
import { PageHeader } from "@/components/site/PageHeader";
import { reelQuery } from "@/lib/queries";

export const Route = createFileRoute("/reels")({
  loader: ({ context }) => context.queryClient.ensureQueryData(reelQuery()),
  head: ({ matches }) => pageMeta(matches, { en: "Reels", hi: "रील्स" }, { en: "Short videos from the organization.", hi: "संगठन के छोटे वीडियो।" }),
  component: ReelsPage,
});

function ReelsPage() {
  const { data: reels } = useSuspenseQuery(reelQuery());
  return (
    <>
      <PageHeader
        title="Reels"
        description="Short videos from our volunteers on the ground."
        crumbs={[{ label: "Reels" }]}
      />
      <section className="section-y">
        <div className="container-page">
          {reels.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {reels.map((r: any) => (
                <VideoCard key={r.id} video={r} vertical />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Reels will be published here soon.</p>
          )}
        </div>
      </section>
    </>
  );
}
