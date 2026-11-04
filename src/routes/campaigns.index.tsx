import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { siteName } from "@/core/seo";

import { CampaignCard } from "@/components/home/sections";
import { PageHeader } from "@/components/site/PageHeader";
import { campaignListQuery } from "@/lib/queries";

export const Route = createFileRoute("/campaigns/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(campaignListQuery()),
  head: ({ matches }) => ({
    meta: [
      { title: `Campaigns you can support — ${siteName(matches)}` },
      {
        name: "description",
        content:
          `Active fundraising and seva campaigns from ${siteName(matches)}. Support a cause that matters to you.`,
      },
      { property: "og:title", content: `Campaigns — ${siteName(matches)}` },
      { property: "og:description", content: "Support an active seva campaign today." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CampaignList,
});

function CampaignList() {
  const { data: campaigns } = useSuspenseQuery(campaignListQuery());
  return (
    <>
      <PageHeader
        title="Campaigns"
        description="Time-bound drives where your support makes an immediate difference."
        crumbs={[{ label: "Campaigns" }]}
      />
      <section className="section-y">
        <div className="container-page">
          {campaigns.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {campaigns.map((c: any) => (
                <CampaignCard key={c.id} campaign={c} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No active campaigns right now.</p>
          )}
        </div>
      </section>
    </>
  );
}
