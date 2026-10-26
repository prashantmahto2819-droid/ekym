import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";

import { BlogCard } from "@/components/home/sections";
import { PageHeader } from "@/components/site/PageHeader";
import { Input } from "@/components/ui/input";
import { blogListQuery } from "@/lib/queries";

export const Route = createFileRoute("/blogs/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(blogListQuery()),
  head: () => ({
    meta: [
      { title: "Daily seva blogs — Ekatm Kalar Yuva Manch" },
      {
        name: "description",
        content:
          "Daily field reports from Ekatm Kalar Yuva Manch volunteers — meals served, blood donated, books shared and lives touched.",
      },
      { property: "og:title", content: "Daily seva blogs — Ekatm Kalar Yuva Manch" },
      { property: "og:description", content: "Stories from the field, published every day." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
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
