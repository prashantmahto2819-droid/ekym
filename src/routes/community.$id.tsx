import { createFileRoute, Link } from "@tanstack/react-router";

import { COMMUNITY_NAME, Feed } from "@/components/site/Feed";
import { CommunityLayout } from "@/components/community/Wall";
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
    return (
      <CommunityLayout>
        <Link to="/community" className="mb-3 inline-flex items-center gap-1 rounded-full bg-card px-3 py-1.5 text-sm font-medium shadow-sm ring-1 ring-border/70 hover:text-primary">← {L ? "पूरा फ़ीड" : "Back to the feed"}</Link>
        <h1 className="sr-only">{L ? "पोस्ट" : "Post"} — {L ? COMMUNITY_NAME.hi : COMMUNITY_NAME.en}</h1>
        <Feed postId={id} />
      </CommunityLayout>
    );
  },
});
