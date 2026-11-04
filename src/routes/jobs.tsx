import { createFileRoute } from "@tanstack/react-router";

import { ListingsPage } from "@/components/site/ListingsPage";
import { siteName } from "@/core/seo";
import { KIND_LABEL } from "@/lib/community";
import { listingsQuery } from "@/lib/queries";

const KINDS = ["job"] as const;

export const Route = createFileRoute("/jobs")({
  loader: ({ context }) => context.queryClient.ensureQueryData(listingsQuery([...KINDS])),
  head: ({ matches }) => ({ meta: [{ title: `${KIND_LABEL[KINDS[0]].en} — ${siteName(matches)}` }, { name: "description", content: KIND_LABEL[KINDS[0]].blurb_en }] }),
  component: () => <ListingsPage kinds={[...KINDS]} />,
});
