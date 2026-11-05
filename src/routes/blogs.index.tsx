import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { pageMeta } from "@/core/seo";

import { BlogCard } from "@/components/home/sections";
import { PageHeader } from "@/components/site/PageHeader";
import { Input } from "@/components/ui/input";
import { blogListQuery } from "@/lib/queries";

export const Route = createFileRoute("/blogs/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(blogListQuery()),
  head: ({ matches }) => pageMeta(matches, { en: "Blogs", hi: "ब्लॉग" }, { en: "Articles and stories from the organization and its members.", hi: "संगठन और सदस्यों के लेख व कहानियाँ।" }),
  component: BlogList,
});

function BlogList() {
  const { data: blogs } = useSuspenseQuery(blogListQuery());
  const [q, setQ] = useState("");
  const filtered = blogs.filter((b: any) =>
    `${b.title} ${b.excerpt ?? ""} ${b.city ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <>
      <PageHeader
        title="Daily blogs"
        description="What our teams did today, in their own words."
        crumbs={[{ label: "Blogs" }]}
      />
      <section className="section-y">
        <div className="container-page">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search blogs by title, city or keyword"
            className="mb-8 max-w-md"
            aria-label="Search blogs"
          />
          {filtered.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((b: any) => (
                <BlogCard key={b.id} blog={b} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No blogs match your search yet.</p>
          )}
        </div>
      </section>
    </>
  );
}
