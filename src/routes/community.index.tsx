import { createFileRoute, Link } from "@tanstack/react-router";

import { OccasionsCard } from "@/components/community/Occasions";
import { StoriesStrip } from "@/components/community/Stories";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

import { COMMUNITY_NAME, Feed } from "@/components/site/Feed";
import { PageHeader } from "@/components/site/PageHeader";
import { SponsoredStrip } from "@/components/site/SponsoredBoard";
import { useLang } from "@/core/i18n";
import { siteName } from "@/core/seo";

export const Route = createFileRoute("/community/")({
  head: ({ matches }) => ({ meta: [{ title: `${COMMUNITY_NAME.en} — ${siteName(matches)}` }, { name: "description", content: `${COMMUNITY_NAME.en}: the community wall of ${siteName(matches)} — posts, photos, videos and discussions by members.` }] }),
  component: () => {
    const { lang } = useLang();
    const L = lang === "hi";
    const { user, orgs } = useAuth();
    return (<><PageHeader title={L ? COMMUNITY_NAME.hi : COMMUNITY_NAME.en} description={L ? "समाज का चौपाल — सदस्य पोस्ट, फोटो, वीडियो और विचार साझा करें।" : "The community wall — members share posts, photos, videos and ideas."} crumbs={[{ label: L ? COMMUNITY_NAME.hi : COMMUNITY_NAME.en }]} /><section className="section-y"><div className="container-page space-y-4"><div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm"><p>💬 <b>{L ? "समुदाय चैट" : "Community chat"}</b> — {L ? "चैनल (चर्चा, सहायता, रोज़गार…), निजी समूह, सीधे संदेश; देखिए कौन ऑनलाइन है।" : "channels, private groups, direct messages; see who is online."}</p><div className="flex gap-2"><Button asChild size="sm"><Link to="/community/chat">{L ? "चैट खोलें" : "Open chat"}</Link></Button><Button asChild size="sm" variant="outline"><Link to="/me/profile">{L ? "मेरी प्रोफ़ाइल" : "My profile"}</Link></Button></div></div><StoriesStrip L={L} enabled={!!user && orgs.length > 0} /><OccasionsCard L={L} enabled={!!user && orgs.length > 0} /><SponsoredStrip /><Feed /></div></section></>);
  },
});
