import { useTenant } from "@/core/tenant-context";
import { useLang } from "@/core/i18n";
import { moduleOn } from "@/core/modules";
import { RichText } from "@/components/site/Blocks";
import { Committees } from "@/components/site/Committees";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { HandHeart, HeartHandshake, ShieldCheck, Users } from "lucide-react";
import { pageMeta } from "@/core/seo";

import { PageHeader } from "@/components/site/PageHeader";
import { SectionHeading } from "@/components/site/SectionHeading";
import { Button } from "@/components/ui/button";
import { organizationQuery, sevaListQuery } from "@/lib/queries";

export const Route = createFileRoute("/about")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(organizationQuery()),
      context.queryClient.ensureQueryData(sevaListQuery()),
    ]);
  },
  head: ({ matches }) => pageMeta(matches, { en: "About us", hi: "हमारे बारे में" }, { en: "Who we are, our objectives, office bearers and how the organization works.", hi: "हम कौन हैं, हमारे उद्देश्य, पदाधिकारी और संगठन की कार्यप्रणाली।" }),
  component: AboutPage,
});

const values = [
  {
    icon: HeartHandshake,
    title: "Seva first",
    text: "We serve without asking for identity, religion, caste or documents.",
  },
  {
    icon: ShieldCheck,
    title: "Transparency",
    text: "Every requirement is verified and every contribution is recorded.",
  },
  {
    icon: Users,
    title: "Volunteer-led",
    text: "Our teams are ordinary people who give a few hours every week.",
  },
  {
    icon: HandHeart,
    title: "Dignity",
    text: "People we serve are guests, never beneficiaries on a list.",
  },
];

function AboutPage() {
  const { data: org } = useSuspenseQuery(organizationQuery());
  const tenant = useTenant();
  const { data: seva } = useSuspenseQuery(sevaListQuery());
  const { lang } = useLang();
  const hi = lang === "hi";

  return (
    <>
      <PageHeader
        title={`About ${org?.organization_name ?? tenant.name}`}
        description={org?.tagline ?? undefined}
        crumbs={[{ label: "About" }]}
      />

      <section className="section-y">
        <div className="container-page grid gap-10 lg:grid-cols-[2fr_1fr]">
          <div>
            {(hi && org?.about_long_hi) || org?.about_long ? (
              <RichText text={(hi && org?.about_long_hi) || org?.about_long || ""} />
            ) : (
              <div className="prose-content">
                <p>{(hi && org?.about_short_hi) || org?.about_short || `${tenant.name} is a community organisation. Its introduction can be written from the admin panel (Organization settings → About us).`}</p>
                {seva.length ? <p>{hi ? `हमारा काम ${seva.length} सेवा प्रकल्पों में बँटा है।` : `Our work is organised into ${seva.length} seva prakalp.`}</p> : null}
              </div>
            )}
            <Committees />
          </div>
          <aside className="surface-card h-fit p-6">
            <h2 className="font-display text-lg font-semibold">Get involved</h2>
            <div className="mt-4 flex flex-col gap-2">
              <Button asChild>
                <Link to="/join">{hi ? "सदस्य बनें" : "Become a member"}</Link>
              </Button>
              {moduleOn(tenant.branding, "donate") ? <Button asChild variant="outline">
                <Link to="/donate">{hi ? "दान करें" : "Donate"}</Link>
              </Button> : null}
              <Button asChild variant="outline">
                <Link to="/contact">Contact us</Link>
              </Button>
            </div>
          </aside>
        </div>
      </section>

      <section className="bg-secondary/60 section-y">
        <div className="container-page">
          <SectionHeading eyebrow="What guides us" title="Our values" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <article key={v.title} className="surface-card p-5">
                <span className="bg-primary-soft text-primary-deep flex size-11 items-center justify-center rounded-lg">
                  <v.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-display text-base font-semibold">{v.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{v.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
