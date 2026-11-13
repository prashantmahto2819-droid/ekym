import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { pageMeta } from "@/core/seo";

import { VideoCard } from "@/components/home/sections";
import { PageHeader } from "@/components/site/PageHeader";
import { videoQuery } from "@/lib/queries";
import { Clapperboard } from "lucide-react";
import { EmptyState } from "@/components/site/kit";
import { useLang } from "@/core/i18n";

export const Route = createFileRoute("/videos")({
  loader: ({ context }) => context.queryClient.ensureQueryData(videoQuery()),
  head: ({ matches }) => pageMeta(matches, { en: "Videos", hi: "वीडियो" }, { en: "Videos from our events and programmes.", hi: "हमारे आयोजनों और कार्यक्रमों के वीडियो।" }),
  component: VideosPage,
});

function VideosPage() {
  const { data: videos } = useSuspenseQuery(videoQuery());
  const { lang } = useLang();
  const hi = lang === "hi";
  const [first, ...rest] = videos as any[];
  return (
    <>
      <PageHeader icon={<Clapperboard />} title={hi ? "वीडियो" : "Videos"} description={hi ? "हमारे आयोजनों और सेवा कार्यों के वीडियो।" : "Films from our events and seva work."} crumbs={[{ label: hi ? "वीडियो" : "Videos" }]}
        stats={videos.length ? [{ label: hi ? "वीडियो" : "videos", value: videos.length }] : undefined}
        actions={<Link to="/reels" className="inline-flex h-10 items-center rounded-full bg-white/15 px-5 text-sm font-semibold ring-1 ring-white/30 backdrop-blur hover:bg-white/25">{hi ? "छोटे वीडियो (रील्स) ›" : "Short reels ›"}</Link>} />
      <section className="section-y pt-8 md:pt-10">
        <div className="container-page space-y-6">
          {first ? <div className="mx-auto max-w-4xl"><VideoCard video={first} /></div> : <EmptyState icon={<Clapperboard />} title={hi ? "वीडियो जल्द आएँगे" : "Videos coming soon"} />}
          {rest.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{rest.map((v) => <VideoCard key={v.id} video={v} />)}</div> : null}
        </div>
      </section>
    </>
  );
}
