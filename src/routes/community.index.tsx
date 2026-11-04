import { createFileRoute } from "@tanstack/react-router";

import { COMMUNITY_NAME, Feed } from "@/components/site/Feed";
import { PageHeader } from "@/components/site/PageHeader";
import { useLang } from "@/core/i18n";
import { siteName } from "@/core/seo";

export const Route = createFileRoute("/community/")({
  head: ({ matches }) => ({ meta: [{ title: `${COMMUNITY_NAME.en} — ${siteName(matches)}` }, { name: "description", content: `${COMMUNITY_NAME.en}: the community wall of ${siteName(matches)} — posts, photos, videos and discussions by members.` }] }),
  component: () => {
    const { lang } = useLang();
    const L = lang === "hi";
    return (<><PageHeader title={L ? COMMUNITY_NAME.hi : COMMUNITY_NAME.en} description={L ? "समाज का चौपाल — सदस्य पोस्ट, फोटो, वीडियो और विचार साझा करें।" : "The community wall — members share posts, photos, videos and ideas."} crumbs={[{ label: L ? COMMUNITY_NAME.hi : COMMUNITY_NAME.en }]} /><section className="section-y"><div className="container-page"><Feed /></div></section></>);
  },
});
