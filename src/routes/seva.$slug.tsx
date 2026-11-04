import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { siteName } from "@/core/seo";

import { BlogCard, VideoCard } from "@/components/home/sections";
import { PageHeader } from "@/components/site/PageHeader";
import { SectionHeading } from "@/components/site/SectionHeading";
import { ShareButtons } from "@/components/site/ShareButtons";
import { SevaIcon } from "@/components/site/SevaIcon";
import { Button } from "@/components/ui/button";
import { sevaQuery } from "@/lib/queries";
import { truncate } from "@/lib/format";

export const Route = createFileRoute("/seva/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(sevaQuery(params.slug));
    if (!data?.project) throw notFound();
    return data;
  },
  head: ({ loaderData, matches }) => {
    if (!loaderData) {
      return { meta: [{ title: "Seva not found" }, { name: "robots", content: "noindex" }] };
    }
    const p = loaderData.project;
    const desc = truncate(p.short_description ?? p.description, 155);
    return {
      meta: [
        { title: `${p.name} — ${siteName(matches)}` },
        { name: "description", content: desc },
        { property: "og:title", content: `${p.name} — ${siteName(matches)}` },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: SevaDetail,
});

function SevaDetail() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(sevaQuery(slug));
  if (!data?.project) return null;
  const { project, blogs, videos, contributors } = data;

  return (
    <>
      <PageHeader
        title={project.name}
        description={project.short_description ?? undefined}
        crumbs={[{ label: "Seva", to: "/seva" }, { label: project.name }]}
      />

      <section className="section-y">
        <div className="container-page grid gap-10 lg:grid-cols-[2fr_1fr]">
          <div>
            <span className="bg-primary-soft text-primary-deep flex size-12 items-center justify-center rounded-lg">
              <SevaIcon name={project.icon} className="size-6" />
            </span>
            {project.featured_image ? (
              <img
                src={project.featured_image}
                alt=""
                className="mt-6 w-full rounded-xl object-cover"
              />
            ) : null}
            <div className="prose-content mt-6 whitespace-pre-line">
              {project.description ?? project.short_description}
            </div>
            <div className="mt-8">
              <ShareButtons path={`/seva/${project.slug}`} title={project.name} />
            </div>
          </div>

          <aside className="space-y-4">
            <div className="surface-card p-6">
              <h2 className="font-display text-lg font-semibold">Support this seva</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Contribute funds, material or your time. Every bit keeps this project running.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Button asChild>
                  <Link to="/donate">Donate</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/volunteer">Volunteer</Link>
                </Button>
              </div>
            </div>
            {contributors.length ? (
              <div className="surface-card p-6">
                <h2 className="font-display text-lg font-semibold">Recent contributors</h2>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {contributors.map((c: any) => (
                    <li key={c.id}>
                      {c.name}
                      {c.contribution_type ? ` · ${c.contribution_type}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>
        </div>
      </section>

      {blogs.length ? (
        <section className="bg-secondary/60 section-y">
          <div className="container-page">
            <SectionHeading eyebrow="Field reports" title="Updates from this seva" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {blogs.map((b: any) => (
                <BlogCard key={b.id} blog={b} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {videos.length ? (
        <section className="section-y">
          <div className="container-page">
            <SectionHeading eyebrow="Watch" title="Videos" />
            <div className="grid gap-4 md:grid-cols-3">
              {videos.map((v: any) => (
                <VideoCard key={v.id} video={v} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
