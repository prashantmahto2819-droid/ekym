import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { Blocks, type Block } from "@/components/site/Blocks";
import { useLang } from "@/core/i18n";
import { siteName } from "@/core/seo";
import { pageQuery } from "@/lib/queries";

export const Route = createFileRoute("/p/$slug")({
  loader: async ({ context, params }) => { const p = await context.queryClient.ensureQueryData(pageQuery(params.slug)); if (!p) throw notFound(); return p; },
  head: ({ loaderData, matches }) => {
    if (!loaderData) return { meta: [{ title: "Page not found" }, { name: "robots", content: "noindex" }] };
    const seo = (loaderData.seo ?? {}) as { title?: string; description?: string; image?: string };
    return { meta: [{ title: `${seo.title || loaderData.title} — ${siteName(matches)}` }, { name: "description", content: seo.description ?? "" }, { property: "og:title", content: seo.title || loaderData.title }, ...(seo.image ? [{ property: "og:image", content: seo.image }] : [])] };
  },
  component: Page,
});

function Page() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(pageQuery(slug));
  useLang();
  if (!data) return null;
  return <Blocks blocks={(data.blocks as unknown as Block[]) ?? []} />;
}
