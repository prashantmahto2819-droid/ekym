import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

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
import { homeQuery, organizationQuery } from "@/lib/queries";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(homeQuery()),
      context.queryClient.ensureQueryData(organizationQuery()),
    ]);
  },
  head: () => ({
    meta: [
      { title: "Ekatm Kalar Yuva Manch — Seva Prakalp for people in need" },
      {
        name: "description",
        content:
          "Ekatm Kalar Yuva Manch runs seva prakalp across food, blood donation, education, health and community care. Volunteer, donate or request help.",
      },
      { property: "og:title", content: "Ekatm Kalar Yuva Manch — Seva, every single day" },
      {
        property: "og:description",
        content:
          "Daily bhojan seva, blood donation support, free library, volunteering and internships. Join the seva.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: home } = useSuspenseQuery(homeQuery());
  const { data: org } = useSuspenseQuery(organizationQuery());

  const bhojan = home.seva.find(
    (s: any) => s.slug?.includes("bhojan") || s.name?.toLowerCase().includes("bhojan"),
  );

  return (
    <>
      {home.sections.map((section: any) => {
        const key = section.section_key as string;
        const title = section.title as string;
        const subtitle = section.subtitle as string | null;

        switch (key) {
          case "hero":
            return <HeroSlider key={key} slides={home.slides} />;
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
