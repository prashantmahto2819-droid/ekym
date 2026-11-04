// Public "Sponsored" board: all paid campaigns, equal cards, fair rotation; plus how to advertise.
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/site/PageHeader";
import { SponsoredBoard } from "@/components/site/SponsoredBoard";
import { useLang } from "@/core/i18n";
import { siteName } from "@/core/seo";
import { useTenant } from "@/core/tenant-context";
import { whatsappHref } from "@/lib/format";
import { organizationQuery } from "@/lib/queries";

export const Route = createFileRoute("/sponsored")({
  head: ({ matches }) => ({ meta: [{ title: `Sponsored — ${siteName(matches)}` }, { name: "description", content: `Sponsors and advertisers supporting ${siteName(matches)}.` }, { name: "robots", content: "noindex" }] }),
  component: () => {
    const { lang } = useLang();
    const L = lang === "hi";
    const tenant = useTenant();
    const { data: org } = useQuery(organizationQuery());
    return (
      <>
        <PageHeader title={L ? "प्रायोजित" : "Sponsored"} description={L ? "हमारे प्रायोजकों और विज्ञापनदाताओं का सहयोग इस मंच को चलाता है। हर प्रायोजक को बराबर जगह और बारी मिलती है।" : "Our sponsors and advertisers keep this platform running. Every sponsor gets an equal card and a fair turn."} crumbs={[{ label: L ? "प्रायोजित" : "Sponsored" }]} />
        <section className="section-y"><div className="container-page space-y-6">
          <SponsoredBoard />
          <div className="rounded-lg border border-border bg-secondary/30 p-4 text-sm">
            <p className="font-medium">{L ? "विज्ञापन देना चाहते हैं?" : "Want to advertise?"}</p>
            <p className="mt-1 text-muted-foreground">{L ? `${tenant.name} के साथ अपना व्यवसाय समाज तक पहुँचाएँ — banner यहाँ और साइट के विज्ञापन स्थानों पर दिखेगा; रसीद संस्था के खाते से मिलेगी।` : `Reach the community with ${tenant.name}: your banner appears here and in the site's ad slots, with a receipt from the organization's accounts.`}</p>
            {org?.whatsapp ? <a className="mt-2 inline-block underline" href={whatsappHref(org.whatsapp, L ? `नमस्ते ${tenant.name}, मैं विज्ञापन/प्रायोजन के बारे में जानना चाहता हूँ।` : `Hello ${tenant.name}, I'd like to know about sponsorship / advertising.`)} target="_blank" rel="noreferrer">{L ? "WhatsApp पर संपर्क करें" : "Contact on WhatsApp"}</a> : null}
          </div>
        </div></section>
      </>
    );
  },
});
