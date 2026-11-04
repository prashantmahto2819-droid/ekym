import { useTenant } from "@/core/tenant-context";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { HandHeart, HeartHandshake, ShieldCheck, Users } from "lucide-react";
import { siteName } from "@/core/seo";

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
  head: ({ matches }) => ({
    meta: [
      { title: `About us — ${siteName(matches)}` },
      {
        name: "description",
        content:
          `${siteName(matches)} is a youth-led community organisation running seva prakalp across food, blood donation, education, health and community care.`,
      },
      { property: "og:title", content: `About ${siteName(matches)}` },
      {
        property: "og:description",
        content: "Who we are, what we believe, and how our seva is organised.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
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

  return (
    <>
      <PageHeader
        title={`About ${org?.organization_name ?? tenant.name}`}
        description={org?.tagline ?? undefined}
        crumbs={[{ label: "About" }]}
      />

      <section className="section-y">
        <div className="container-page grid gap-10 lg:grid-cols-[2fr_1fr]">
          <div className="prose-content">
            <p>
              {org?.about_short ?? `${tenant.name} is a community organisation. Its introduction can be written from the admin panel (Organization settings → Short about text).`}
            </p>
            <p>
              Our work is organised into {seva.length || 21} seva prakalp. Each has a small team, a
              simple plan and a public record of what happened. This keeps our promises small and
              our delivery consistent.
            </p>
            <p>
              We are building this platform so anyone can see what we did today, raise a need, offer
              help, or join a team — without a phone call or a form to print.
            </p>
          </div>
          <aside className="surface-card h-fit p-6">
            <h2 className="font-display text-lg font-semibold">Get involved</h2>
            <div className="mt-4 flex flex-col gap-2">
              <Button asChild>
                <Link to="/volunteer">Volunteer with us</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/donate">Donate</Link>
              </Button>
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
