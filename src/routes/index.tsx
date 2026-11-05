import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { homeMeta } from "@/core/seo";

import {
  BhojanSeva,
  BlogGrid,
  BloodRequirementSection,
  CampaignSection,
  ContactCta,
  Contributors,
  DonateCta,
  FestivalSlider,
  HeroSlider,
  NewsSlider,
  ReelSection,
  SevaGrid,
  Testimonials,
  TodayActivities,
  VideoSection,
  VolunteerCta,
} from "@/components/home/sections";
import { Blocks, type Block } from "@/components/site/Blocks";
import { ActivitiesSection, NetworkSection } from "@/components/home/Network";
import { moduleOn, NAV_MODULE } from "@/core/modules";
import { useLang } from "@/core/i18n";
import { useTenant } from "@/core/tenant-context";
import { homePageQuery, homeQuery, organizationQuery } from "@/lib/queries";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(homeQuery()),
      context.queryClient.ensureQueryData(organizationQuery()),
      context.queryClient.ensureQueryData(homePageQuery()),
    ]);
  },
  head: ({ matches }) => homeMeta(matches),
  component: Home,
});

function Home() {
  const tenant = useTenant();
  const { lang } = useLang();
  const { data: home } = useSuspenseQuery(homeQuery());
  const { data: org } = useSuspenseQuery(organizationQuery());
  const { data: custom } = useSuspenseQuery(homePageQuery());
  // A published page marked "use as home" (website builder) replaces the default home sections.
  if (custom) return <Blocks blocks={(custom.blocks as unknown as Block[]) ?? []} />;

  const bhojan = home.seva.find(
    (s: any) => s.slug?.includes("bhojan") || s.name?.toLowerCase().includes("bhojan"),
  );

  return (
    <>
      {home.sections.filter((section: any) => !NAV_MODULE[section.section_key as string] || moduleOn(tenant.branding, NAV_MODULE[section.section_key as string]!)).map((section: any) => {
        const key = section.section_key as string;
        const title = (lang === "hi" && section.title_hi ? section.title_hi : section.title) as string;
        const subtitle = (lang === "hi" && section.subtitle_hi ? section.subtitle_hi : section.subtitle) as string | null;

        switch (key) {
          case "hero":
            return <HeroSlider key={key} slides={home.slides} />;
          case "network":
            return <NetworkSection key={key} title={title} subtitle={subtitle} />;
          case "activities":
            return <ActivitiesSection key={key} title={title} subtitle={subtitle} />;
          case "festival":
            return <FestivalSlider key={key} festivals={home.festivals} />;
          case "seva":
            return <SevaGrid key={key} seva={home.seva} title={title} subtitle={subtitle} limit={6} />;
          case "today_activities":
            return (
              <TodayActivities
                key={key}
                blogs={home.blogs}
                contributors={home.contributors}
                title={title}
                subtitle={subtitle}
              />
            );
          case "blood":
            return (
              <BloodRequirementSection
                key={key}
                requirements={home.requirements}
                title={title}
                subtitle={subtitle}
              />
            );
          case "bhojan":
            return <BhojanSeva key={key} project={bhojan} title={title} subtitle={subtitle} />;
          case "contributors":
            return (
              <Contributors
                key={key}
                contributors={home.contributors}
                title={title}
                subtitle={subtitle}
              />
            );
          case "blogs":
            return <BlogGrid key={key} blogs={home.blogs} title={title} subtitle={subtitle} />;
          case "news":
            return <NewsSlider key={key} news={home.news} title={title} />;
          case "videos":
            return <VideoSection key={key} videos={home.videos} title={title} />;
          case "reels":
            return <ReelSection key={key} reels={home.reels} title={title} />;
          case "campaigns":
            return (
              <CampaignSection
                key={key}
                campaigns={home.campaigns}
                title={title}
                subtitle={subtitle}
              />
            );
          case "testimonials":
            return (
              <Testimonials
                key={key}
                testimonials={home.testimonials}
                title={title}
                subtitle={subtitle}
              />
            );
          case "donate":
            return (
              <DonateCta key={key} title={title} subtitle={subtitle} text={org?.donation_text} />
            );
          case "volunteer":
            return <VolunteerCta key={key} title={title} subtitle={subtitle} />;
          case "contact":
            return <ContactCta key={key} org={org} title={title} subtitle={subtitle} />;
          default:
            return null;
        }
      })}
    </>
  );
}
