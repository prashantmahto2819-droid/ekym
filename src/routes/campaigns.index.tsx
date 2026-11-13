import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { pageMeta } from "@/core/seo";

import { CampaignCard } from "@/components/home/sections";
import { PageHeader } from "@/components/site/PageHeader";
import { campaignListQuery } from "@/lib/queries";
import { Megaphone } from "lucide-react";
import { EmptyState } from "@/components/site/kit";
import { useLang } from "@/core/i18n";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/campaigns/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(campaignListQuery()),
  head: ({ matches }) => pageMeta(matches, { en: "Campaigns", hi: "अभियान" }, { en: "Active campaigns of the organization and how to support them.", hi: "संगठन के चल रहे अभियान और सहयोग के तरीके।" }),
  component: CampaignList,
});

function CampaignList() {
  const { data: campaigns } = useSuspenseQuery(campaignListQuery());
  const { lang } = useLang();
  const hi = lang === "hi";
  const list = campaigns as any[];
  const live = list.filter((c) => !c.end_date || new Date(c.end_date).getTime() >= Date.now() - 864e5);
  const done = list.filter((c) => !live.includes(c));
  const raised = list.reduce((s, c) => s + Number(c.raised_amount ?? 0), 0);
  return (
    <>
      <PageHeader icon={<Megaphone />} title={hi ? "अभियान" : "Campaigns"} description={hi ? "समय-सीमा वाले अभियान, जहाँ आपका सहयोग तुरंत असर दिखाता है।" : "Time-bound drives where your support makes an immediate difference."} crumbs={[{ label: hi ? "अभियान" : "Campaigns" }]}
        stats={list.length ? [{ label: hi ? "चल रहे" : "running", value: live.length }, ...(raised > 0 ? [{ label: hi ? "जुटे" : "raised", value: formatCurrency(raised) }] : [])] : undefined}
        actions={<Link to="/donate" className="inline-flex h-11 items-center rounded-full bg-accent px-6 text-sm font-semibold text-accent-foreground shadow-lg hover:opacity-95">{hi ? "अभी सहयोग करें" : "Support now"}</Link>} />
      <section className="section-y pt-8 md:pt-10">
        <div className="container-page space-y-10">
          {live.length ? <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{live.map((c) => <CampaignCard key={c.id} campaign={c} />)}</div>
            : <EmptyState icon={<Megaphone />} title={hi ? "अभी कोई अभियान नहीं चल रहा" : "No active campaigns right now"} text={hi ? "नए अभियान शुरू होते ही यहाँ दिखेंगे।" : "New drives will appear here as they start."} action={{ label: hi ? "दान करें" : "Donate", to: "/donate" }} />}
          {done.length ? (
            <div>
              <h2 className="mb-4 font-display text-xl font-semibold">{hi ? "पूरे हुए अभियान" : "Completed campaigns"}</h2>
              <div className="grid gap-5 opacity-90 md:grid-cols-2 lg:grid-cols-3">{done.map((c) => <CampaignCard key={c.id} campaign={c} />)}</div>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
