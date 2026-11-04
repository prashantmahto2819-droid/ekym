import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { siteName } from "@/core/seo";

import { PageHeader } from "@/components/site/PageHeader";
import { ShareButtons } from "@/components/site/ShareButtons";
import { Button } from "@/components/ui/button";
import { campaignQuery } from "@/lib/queries";
import { formatCurrency, formatDate, truncate } from "@/lib/format";

export const Route = createFileRoute("/campaigns/$slug")({
  loader: async ({ context, params }) => {
    const item = await context.queryClient.ensureQueryData(campaignQuery(params.slug));
    if (!item) throw notFound();
    return item;
  },
  head: ({ loaderData, matches }) => {
    if (!loaderData) {
      return { meta: [{ title: "Campaign not found" }, { name: "robots", content: "noindex" }] };
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
  component: CampaignDetail,
});

function CampaignDetail() {
  const { slug } = Route.useParams();
  const { data: c } = useSuspenseQuery(campaignQuery(slug));
  if (!c) return null;
  const target = Number(c.target_amount ?? 0);
  const raised = Number(c.raised_amount ?? 0);
  const pct = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;

  return (
    <>
      <PageHeader
        title={c.title}
        crumbs={[{ label: "Campaigns", to: "/campaigns" }, { label: truncate(c.title, 40) }]}
      />
      <section className="section-y">
        <div className="container-page grid gap-10 lg:grid-cols-[2fr_1fr]">
          <div>
            {c.cover_image ? (
              <img src={c.cover_image} alt="" className="w-full rounded-xl object-cover" />
            ) : null}
            <div className="prose-content mt-6 whitespace-pre-line">
              {c.description}
            </div>
            <div className="mt-8">
              <ShareButtons path={`/campaigns/${c.slug}`} title={c.title} />
            </div>
          </div>
          <aside className="surface-card h-fit p-6">
            {target > 0 ? (
              <>
                <p className="font-display text-2xl font-semibold">{formatCurrency(raised)}</p>
                <p className="text-sm text-muted-foreground">raised of {formatCurrency(target)}</p>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="gradient-warm h-full" style={{ width: `${pct}%` }} />
                </div>
              </>
            ) : null}
            {c.start_date || c.end_date ? (
              <p className="mt-4 text-xs text-muted-foreground">
                {formatDate(c.start_date)} {c.end_date ? `– ${formatDate(c.end_date)}` : ""}
              </p>
            ) : null}
            <Button asChild className="mt-5 w-full">
              <Link to="/donate" search={{ campaign: c.slug }} hash="give">
                Donate to this campaign
              </Link>
            </Button>
          </aside>
        </div>
      </section>
    </>
  );
}
