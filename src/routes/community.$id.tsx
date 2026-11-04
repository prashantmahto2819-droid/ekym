import { createFileRoute, Link } from "@tanstack/react-router";

import { COMMUNITY_NAME, Feed } from "@/components/site/Feed";
import { PageHeader } from "@/components/site/PageHeader";
import { useLang } from "@/core/i18n";
import { siteName } from "@/core/seo";
import { getPostMeta } from "@/lib/public.functions";
import { truncate } from "@/lib/format";

export const Route = createFileRoute("/community/$id")({
  loader: async ({ params }) => { try { return await getPostMeta({ data: { id: params.id } }); } catch { return null; } },
  head: ({ matches, loaderData }) => {
    const p = loaderData;
    const title = p ? `${p.author} — ${COMMUNITY_NAME.en} · ${siteName(matches)}` : `Post — ${COMMUNITY_NAME.en} · ${siteName(matches)}`;
    const desc = p?.body ? truncate(p.body, 155) : `A post on ${COMMUNITY_NAME.en}, the community wall of ${siteName(matches)}.`;
    return { meta: [{ title }, { name: "description", content: desc }, { property: "og:title", content: title }, { property: "og:description", content: desc }, { property: "og:type", content: "article" }, ...(p?.image ? [{ property: "og:image", content: p.image }, { name: "twitter:card", content: "summary_large_image" }] : [{ name: "twitter:card", content: "summary" }])] };
  },
  component: () => {
    const { id } = Route.useParams();
    const { lang } = useLang();
    const L = lang === "hi";
    return (<><PageHeader title={L ? COMMUNITY_NAME.hi : COMMUNITY_NAME.en} crumbs={[{ label: L ? COMMUNITY_NAME.hi : COMMUNITY_NAME.en, to: "/community" }, { label: L ? "पोस्ट" : "Post" }]} /><section className="section-y"><div className="container-page"><Feed postId={id} /><p className="mt-6 text-center text-sm"><Link to="/community" className="underline">{L ? "← पूरा फ़ीड" : "← Back to the feed"}</Link></p></div></section></>);
  },
});
