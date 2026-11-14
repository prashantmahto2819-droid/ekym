import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { siteName } from "@/core/seo";

import { PageHeader } from "@/components/site/PageHeader";
import { ShareButtons } from "@/components/site/ShareButtons";
import { RelatedGrid } from "@/components/site/DetailExtras";
import { useLang } from "@/core/i18n";
import { Button } from "@/components/ui/button";
import { campaignListQuery, campaignQuery } from "@/lib/queries";
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
  const { lang, loc } = useLang(); const L = lang === "hi";
  const list = useQuery(campaignListQuery());
  if (!c) return null;
  const daysLeft = c.end_date ? Math.ceil((Date.parse(c.end_date) + 86400000 - Date.now()) / 86400000) : null;
  const related = (list.data ?? []).filter((x) => x.slug !== c.slug).map((x) => {
    const t = Number(x.target_amount ?? 0), r = Number(x.raised_amount ?? 0);
    return { key: x.id, to: "/campaigns/$slug", params: { slug: x.slug }, title: loc(x, "title"), image: x.cover_image, meta: t > 0 ? `${formatCurrency(r)} / ${formatCurrency(t)} · ${Math.min(100, Math.round((r / t) * 100))}%` : null };
  });
  const target = Number(c.target_amount ?? 0);
  const raised = Number(c.raised_amount ?? 0);
  const pct = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;

  return (
    <>
      <PageHeader
        title={loc(c, "title")}
        crumbs={[{ label: L ? "अभियान" : "Campaigns", to: "/campaigns" }, { label: truncate(loc(c, "title"), 40) }]}
      />
      <section className="section-y">
        <div className="container-page grid gap-10 lg:grid-cols-[2fr_1fr]">
          <div>
            {c.cover_image ? (
              <img src={c.cover_image} alt="" className="w-full rounded-xl object-cover" />
            ) : null}
            <div className="prose-content mt-6 whitespace-pre-line">
              {loc(c, "description")}
            </div>
            <div className="mt-8">
              <ShareButtons path={`/campaigns/${c.slug}`} title={loc(c, "title")} text={target > 0 ? `${formatCurrency(raised)} / ${formatCurrency(target)} (${pct}%)` : undefined} />
            </div>
          </div>
          <aside className="surface-card h-fit p-6 lg:sticky lg:top-20">
            {target > 0 ? (
              <>
                <p className="font-display text-2xl font-semibold">{formatCurrency(raised)}</p>
                <p className="text-sm text-muted-foreground">{L ? `${formatCurrency(target)} में से जुटाए` : `raised of ${formatCurrency(target)}`} · <b>{pct}%</b></p>
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
            {daysLeft !== null ? (
              <p className={`mt-2 rounded-md px-2 py-1 text-center text-sm font-medium ${daysLeft > 0 ? "bg-amber-100 text-amber-900 dark:bg-amber-950" : "bg-secondary text-muted-foreground"}`}>
                {daysLeft > 0 ? (L ? `⏳ ${daysLeft} दिन बाकी` : `⏳ ${daysLeft} days left`) : (L ? "अभियान पूरा हुआ" : "Campaign ended")}
              </p>
            ) : null}
            <Button asChild className="mt-5 w-full">
              <Link to="/donate" search={{ campaign: c.slug }} hash="give">
                {L ? "इस अभियान में दान करें" : "Donate to this campaign"}
              </Link>
            </Button>
          </aside>
        </div>
      </section>
      <RelatedGrid title={L ? "और अभियान" : "More campaigns"} items={related} all={{ to: "/campaigns", label: L ? "सभी अभियान" : "All campaigns" }} />
    </>
  );
}
