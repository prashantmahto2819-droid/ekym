import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { pageMeta } from "@/core/seo";

import { SevaGrid } from "@/components/home/sections";
import { ActivitiesSection } from "@/components/home/Network";
import { useTenant } from "@/core/tenant-context";
import { PageHeader } from "@/components/site/PageHeader";
import { sevaListQuery } from "@/lib/queries";

export const Route = createFileRoute("/seva/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(sevaListQuery()),
  head: ({ matches }) => pageMeta(matches, { en: "Seva projects", hi: "सेवा प्रकल्प" }, { en: "The service projects the organization runs and how to take part.", hi: "संगठन के सेवा प्रकल्प और उनमें भाग लेने के तरीके।" }),
  component: SevaList,
});

function SevaList() {
  const { data: seva } = useSuspenseQuery(sevaListQuery());
  const tenant = useTenant();
  return (
    <>
      <PageHeader
        title="Seva Prakalp"
        description="Our service projects run every day, powered by volunteers and everyday donors."
        crumbs={[{ label: "Seva" }]}
      />
      <SevaGrid seva={seva} title="All seva projects" />
      {(tenant.child_count ?? 0) > 0 ? <ActivitiesSection title="Seva across our organizations" subtitle="Seva projects, campaigns and events run by member organizations" /> : null}
    </>
  );
}
