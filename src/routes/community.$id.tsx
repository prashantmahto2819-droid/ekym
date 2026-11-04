import { createFileRoute, Link } from "@tanstack/react-router";

import { COMMUNITY_NAME, Feed } from "@/components/site/Feed";
import { PageHeader } from "@/components/site/PageHeader";
import { useLang } from "@/core/i18n";
import { siteName } from "@/core/seo";

export const Route = createFileRoute("/community/$id")({
  head: ({ matches }) => ({ meta: [{ title: `Post — ${COMMUNITY_NAME.en} · ${siteName(matches)}` }] }),
  component: () => {
    const { id } = Route.useParams();
    const { lang } = useLang();
    const L = lang === "hi";
    return (<><PageHeader title={L ? COMMUNITY_NAME.hi : COMMUNITY_NAME.en} crumbs={[{ label: L ? COMMUNITY_NAME.hi : COMMUNITY_NAME.en, to: "/community" }, { label: L ? "पोस्ट" : "Post" }]} /><section className="section-y"><div className="container-page"><Feed postId={id} /><p className="mt-6 text-center text-sm"><Link to="/community" className="underline">{L ? "← पूरा फ़ीड" : "← Back to the feed"}</Link></p></div></section></>);
  },
});
