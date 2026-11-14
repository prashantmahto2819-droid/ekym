import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin } from "lucide-react";
import { siteName } from "@/core/seo";

import { BlogCard } from "@/components/home/sections";
import { PageHeader } from "@/components/site/PageHeader";
import { SectionHeading } from "@/components/site/SectionHeading";
import { AdSlot } from "@/components/site/Ads";
import { RichText } from "@/components/site/Blocks";
import { Comments } from "@/components/site/Comments";
import { ShareButtons } from "@/components/site/ShareButtons";
import { ReadingProgress, ReadTime } from "@/components/site/DetailExtras";
import { useLang } from "@/core/i18n";
import { blogQuery } from "@/lib/queries";
import { formatDate, truncate } from "@/lib/format";

export const Route = createFileRoute("/blogs/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(blogQuery(params.slug));
    if (!data?.blog) throw notFound();
    return data;
  },
  head: ({ loaderData, matches }) => {
    if (!loaderData) {
      return { meta: [{ title: "Blog not found" }, { name: "robots", content: "noindex" }] };
    }
    const b = loaderData.blog;
    const desc = truncate(b.excerpt ?? b.content, 155);
    return {
      meta: [
        { title: `${b.title} — ${siteName(matches)}` },
        { name: "description", content: desc },
        { property: "og:title", content: b.title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: BlogDetail,
});

function BlogDetail() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(blogQuery(slug));
  const { lang } = useLang(); const L = lang === "hi";
  if (!data?.blog) return null;
  const { blog, related } = data;

  return (
    <>
      <ReadingProgress />
      <PageHeader
        title={blog.title}
        crumbs={[{ label: L ? "ब्लॉग" : "Blogs", to: "/blogs" }, { label: truncate(blog.title, 40) }]}
      />
      <article className="section-y">
        <div className="container-page max-w-3xl">
          <p className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="size-4" />
              {formatDate(blog.published_at)}
            </span>
            {blog.city || blog.state ? (
              <span className="flex items-center gap-1">
                <MapPin className="size-4" />
                {[blog.city, blog.state].filter(Boolean).join(", ")}
              </span>
            ) : null}
            <ReadTime text={blog.content} L={L} />
          </p>
          {blog.featured_image ? (
            <img src={blog.featured_image} alt="" className="mt-6 w-full rounded-xl object-cover" />
          ) : null}
          <RichText className="mt-6" text={blog.content ?? ""} />
          <div className="mt-8">
            <ShareButtons path={`/blogs/${blog.slug}`} title={blog.title} />
          </div>
          <AdSlot slot="post_bottom" className="mt-8" />
          <Comments kind="blog" postId={blog.id} />
        </div>
      </article>

      {related.length ? (
        <section className="bg-secondary/60 section-y">
          <div className="container-page">
            <SectionHeading eyebrow={L ? "आगे पढ़ें" : "Keep reading"} title={L ? "और ब्लॉग" : "More from the field"} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((b: any) => (
                <BlogCard key={b.id} blog={b} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
