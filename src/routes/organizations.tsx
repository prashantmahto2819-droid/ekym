// All organizations on the platform (umbrella site) and their combined activity.
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { ActivitiesSection, OrgCard } from "@/components/home/Network";
import { PageHeader } from "@/components/site/PageHeader";
import { useLang } from "@/core/i18n";
import { siteName } from "@/core/seo";
import { networkQuery } from "@/lib/queries";

export const Route = createFileRoute("/organizations")({
  loader: async ({ context }) => { await context.queryClient.ensureQueryData(networkQuery()); },
  head: ({ matches }) => ({ meta: [{ title: `Our organizations — ${siteName(matches)}` }, { name: "description", content: `Samitis and sansthas of the community that run on ${siteName(matches)}.` }] }),
  component: () => {
    const { lang } = useLang();
    const hi = lang === "hi";
    const q = useQuery(networkQuery());
    const orgs = q.data?.orgs ?? [];
    return (
      <>
        <PageHeader title={hi ? "हमारी संस्थाएँ" : "Our organizations"} description={hi ? "इस मंच पर समाज की समितियाँ और संस्थाएँ — हर एक की अपनी वेबसाइट, सदस्य, आयोजन और लेखा।" : "Samitis and sansthas of the community on this platform — each with its own website, members, events and accounts."} crumbs={[{ label: hi ? "संस्थाएँ" : "Organizations" }]} />
        <section className="section-y"><div className="container-page">
          {orgs.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{orgs.map((o) => <OrgCard key={o.id} o={o} />)}</div> : <p className="text-sm text-muted-foreground">{hi ? "अभी कोई संस्था सूचीबद्ध नहीं।" : "No organizations listed yet."}</p>}
        </div></section>
        <ActivitiesSection title={hi ? "समाज की गतिविधियाँ" : "Community activities"} subtitle={hi ? "सभी संस्थाओं के आयोजन, समाचार और अभियान" : "Events, news and campaigns from every organization"} />
      </>
    );
  },
});
