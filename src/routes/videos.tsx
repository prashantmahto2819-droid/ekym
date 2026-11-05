import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { pageMeta } from "@/core/seo";

import { VideoCard } from "@/components/home/sections";
import { PageHeader } from "@/components/site/PageHeader";
import { videoQuery } from "@/lib/queries";

export const Route = createFileRoute("/videos")({
  loader: ({ context }) => context.queryClient.ensureQueryData(videoQuery()),
  head: ({ matches }) => pageMeta(matches, { en: "Videos", hi: "वीडियो" }, { en: "Videos from our events and programmes.", hi: "हमारे आयोजनों और कार्यक्रमों के वीडियो।" }),
  component: VideosPage,
});

function VideosPage() {
  const { data: videos } = useSuspenseQuery(videoQuery());
  return (
    <>
      <PageHeader
        title="Videos"
        description="Longer films and documentation of our work."
        crumbs={[{ label: "Videos" }]}
      />
      <section className="section-y">
        <div className="container-page">
          {videos.length ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {videos.map((v: any) => (
                <VideoCard key={v.id} video={v} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Videos will be published here soon.</p>
          )}
        </div>
      </section>
    </>
  );
}
