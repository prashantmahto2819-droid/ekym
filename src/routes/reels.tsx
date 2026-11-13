import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { pageMeta } from "@/core/seo";

import { VideoCard } from "@/components/home/sections";
import { PageHeader } from "@/components/site/PageHeader";
import { reelQuery } from "@/lib/queries";
import { Film } from "lucide-react";
import { EmptyState } from "@/components/site/kit";
import { useLang } from "@/core/i18n";

export const Route = createFileRoute("/reels")({
  loader: ({ context }) => context.queryClient.ensureQueryData(reelQuery()),
  head: ({ matches }) => pageMeta(matches, { en: "Reels", hi: "रील्स" }, { en: "Short videos from the organization.", hi: "संगठन के छोटे वीडियो।" }),
  component: ReelsPage,
});

function ReelsPage() {
  const { data: reels } = useSuspenseQuery(reelQuery());
  const { lang } = useLang();
  const hi = lang === "hi";
  return (
    <>
      <PageHeader icon={<Film />} title={hi ? "रील्स" : "Reels"} description={hi ? "संगठन के छोटे वीडियो — एक मिनट में हमारी गतिविधियाँ।" : "Short videos — our work in a minute."} crumbs={[{ label: hi ? "रील्स" : "Reels" }]} />
      <section className="section-y pt-8 md:pt-10">
        <div className="container-page">
          {reels.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{(reels as any[]).map((r) => <VideoCard key={r.id} video={r} vertical />)}</div>
            : <EmptyState icon={<Film />} title={hi ? "रील्स जल्द आएँगी" : "Reels coming soon"} />}
        </div>
      </section>
    </>
  );
}
