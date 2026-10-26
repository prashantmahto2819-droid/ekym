import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { VideoCard } from "@/components/home/sections";
import { PageHeader } from "@/components/site/PageHeader";
import { reelQuery } from "@/lib/queries";

export const Route = createFileRoute("/reels")({
  loader: ({ context }) => context.queryClient.ensureQueryData(reelQuery()),
  head: () => ({
    meta: [
      { title: "Reels — Ekatm Kalar Yuva Manch" },
      {
        name: "description",
        content: "Short vertical videos from Ekatm Kalar Yuva Manch's daily seva activities.",
      },
      { property: "og:title", content: "Reels — Ekatm Kalar Yuva Manch" },
      { property: "og:description", content: "Quick glimpses of seva, every week." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
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
