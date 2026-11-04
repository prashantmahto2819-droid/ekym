import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/site/PageHeader";
import { useLang } from "@/core/i18n";
import { siteName } from "@/core/seo";
import { centralFeedQuery } from "@/lib/queries";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/feed")({
  loader: ({ context }) => context.queryClient.ensureQueryData(centralFeedQuery()),
  head: ({ matches }) => ({ meta: [{ title: `Feed — ${siteName(matches)}` }, { name: "description", content: `Latest stories and news from ${siteName(matches)} and its member organizations.` }] }),
  component: FeedPage,
});

function FeedPage() {
  const { data } = useSuspenseQuery(centralFeedQuery());
  const { lang } = useLang();
  const L = lang === "hi";
  return (
    <>
      <PageHeader title={L ? "समाचार फ़ीड" : "Feed"} description={L ? "हमारी और हमसे जुड़े संगठनों की ताज़ा खबरें व लेख।" : "Latest stories and news from us and our member organizations."} crumbs={[{ label: L ? "फ़ीड" : "Feed" }]} />
      <section className="section-y">
        <div className="container-page grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => (
            <Link key={`${p.kind}-${p.id}`} to={p.kind === "blog" ? "/blogs/$slug" : "/news/$slug"} params={{ slug: p.slug }} className="surface-card overflow-hidden transition hover:shadow-md">
              {p.image ? <img src={p.image} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" /> : null}
              <div className="p-4">
                <p className="text-xs text-muted-foreground">{p.org_name} · {p.kind} · {formatDate(p.published_at)}</p>
                <h3 className="mt-1 font-display text-lg font-semibold">{p.title}</h3>
                {p.excerpt ? <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{p.excerpt}</p> : null}
              </div>
            </Link>
          ))}
          {!data.length ? <p className="text-muted-foreground">{L ? "अभी कुछ नहीं।" : "Nothing here yet."}</p> : null}
        </div>
      </section>
    </>
  );
}
