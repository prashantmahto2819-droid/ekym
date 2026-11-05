import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { siteName } from "@/core/seo";

import { SevaGrid } from "@/components/home/sections";
import { ActivitiesSection } from "@/components/home/Network";
import { useTenant } from "@/core/tenant-context";
import { PageHeader } from "@/components/site/PageHeader";
import { sevaListQuery } from "@/lib/queries";

export const Route = createFileRoute("/seva/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(sevaListQuery()),
  head: ({ matches }) => ({
    meta: [
      { title: `Seva Prakalp — ${siteName(matches)}` },
      {
        name: "description",
        content:
          `Explore all seva prakalp of ${siteName(matches)} — food, blood donation, education, health, environment and community care.`,
      },
      { property: "og:title", content: `Seva Prakalp — ${siteName(matches)}` },
      {
        property: "og:description",
        content: "Every seva project we run, and how you can be part of it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
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
