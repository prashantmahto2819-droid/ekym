import { createFileRoute } from "@tanstack/react-router";

import { OccasionsCard } from "@/components/community/Occasions";
import { StoriesStrip } from "@/components/community/Stories";
import { CommunityLayout, PeopleStrip } from "@/components/community/Wall";
import { COMMUNITY_NAME, Feed } from "@/components/site/Feed";
import { useLang } from "@/core/i18n";
import { siteName } from "@/core/seo";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/community/")({
  head: ({ matches }) => ({ meta: [{ title: `${COMMUNITY_NAME.en} — ${siteName(matches)}` }, { name: "description", content: `${COMMUNITY_NAME.en}: the community wall of ${siteName(matches)} — posts, photos, videos and discussions by members.` }] }),
  component: () => {
    const { lang } = useLang();
    const L = lang === "hi";
    const { user, orgs } = useAuth();
    const on = !!user && orgs.length > 0;
    return (
      <CommunityLayout>
        <h1 className="sr-only">{L ? COMMUNITY_NAME.hi : COMMUNITY_NAME.en}</h1>
        <div className="space-y-4">
          <StoriesStrip L={L} enabled={on} />
          <div className="md:hidden"><OccasionsCard L={L} enabled={on} compact /></div>
          <Feed inline={<PeopleStrip />} />
        </div>
      </CommunityLayout>
    );
  },
});
