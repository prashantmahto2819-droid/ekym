import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { pageMeta } from "@/core/seo";

import { SevaGrid } from "@/components/home/sections";
import { ActivitiesSection } from "@/components/home/Network";
import { useTenant } from "@/core/tenant-context";
import { PageHeader } from "@/components/site/PageHeader";
import { sevaListQuery } from "@/lib/queries";
import { HandHeart } from "lucide-react";
import { EmptyState } from "@/components/site/kit";
import { useLang } from "@/core/i18n";

export const Route = createFileRoute("/seva/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(sevaListQuery()),
  head: ({ matches }) => pageMeta(matches, { en: "Seva projects", hi: "सेवा प्रकल्प" }, { en: "The service projects the organization runs and how to take part.", hi: "संगठन के सेवा प्रकल्प और उनमें भाग लेने के तरीके।" }),
  component: SevaList,
});

function SevaList() {
  const { data: seva } = useSuspenseQuery(sevaListQuery());
  const tenant = useTenant();
  const { lang } = useLang();
  const hi = lang === "hi";
  return (
    <>
      <PageHeader icon={<HandHeart />} title={hi ? "सेवा प्रकल्प" : "Seva projects"} description={hi ? "हमारे सेवा प्रकल्प रोज़ चलते हैं — स्वयंसेवकों और दानदाताओं के सहयोग से।" : "Our service projects run every day, powered by volunteers and everyday donors."} crumbs={[{ label: hi ? "सेवा" : "Seva" }]}
        stats={seva.length ? [{ label: hi ? "प्रकल्प" : "projects", value: seva.length }] : undefined}
        actions={<><Link to="/volunteer" className="inline-flex h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-primary-deep shadow-lg hover:bg-white/90">{hi ? "स्वयंसेवक बनें" : "Volunteer"}</Link><Link to="/donate" className="inline-flex h-11 items-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground shadow-lg hover:opacity-95">{hi ? "दान करें" : "Donate"}</Link></>} />
      {seva.length ? <SevaGrid seva={seva} title={hi ? "सभी सेवा प्रकल्प" : "All seva projects"} /> : <section className="section-y"><div className="container-page"><EmptyState icon={<HandHeart />} title={hi ? "सेवा प्रकल्प जल्द जुड़ेंगे" : "Seva projects coming soon"} /></div></section>}
      {(tenant.child_count ?? 0) > 0 ? <ActivitiesSection title={hi ? "सभी संस्थाओं की सेवा" : "Seva across our organizations"} subtitle={hi ? "सदस्य संस्थाओं के सेवा प्रकल्प, अभियान और आयोजन" : "Seva projects, campaigns and events run by member organizations"} /> : null}
    </>
  );
}
