import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { pageMeta } from "@/core/seo";

import { BlogCard } from "@/components/home/sections";
import { PageHeader } from "@/components/site/PageHeader";
import { Input } from "@/components/ui/input";
import { blogListQuery } from "@/lib/queries";
import { PenLine } from "lucide-react";
import { Chips, EmptyState, SearchBox } from "@/components/site/kit";
import { useLang } from "@/core/i18n";

export const Route = createFileRoute("/blogs/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(blogListQuery()),
  head: ({ matches }) => pageMeta(matches, { en: "Blogs", hi: "ब्लॉग" }, { en: "Articles and stories from the organization and its members.", hi: "संगठन और सदस्यों के लेख व कहानियाँ।" }),
  component: BlogList,
});

function BlogList() {
  const { data: blogs } = useSuspenseQuery(blogListQuery());
  const { lang, loc } = useLang();
  const hi = lang === "hi";
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const list = blogs as any[];
  const cities = [...new Set(list.map((b) => b.city).filter(Boolean))].slice(0, 12) as string[];
  const filtered = list.filter((b) => (!city || b.city === city) && `${loc(b, "title")} ${loc(b, "excerpt")} ${b.city ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeader icon={<PenLine />} title={hi ? "ब्लॉग व लेख" : "Blogs & stories"} description={hi ? "हमारी टीमों और सदस्यों के अनुभव, उन्हीं के शब्दों में।" : "What our teams and members did, in their own words."} crumbs={[{ label: hi ? "ब्लॉग" : "Blogs" }]}
        stats={list.length ? [{ label: hi ? "लेख" : "stories", value: list.length }] : undefined} />
      <section className="section-y pt-8 md:pt-10">
        <div className="container-page space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <SearchBox value={q} onChange={setQ} placeholder={hi ? "शीर्षक, शहर या शब्द से खोजें" : "Search by title, city or keyword"} className="md:w-96" />
            {cities.length > 1 ? <Chips items={[{ value: "", label: hi ? "सभी शहर" : "All cities" }, ...cities.map((c) => ({ value: c, label: c }))]} value={city} onChange={setCity} /> : null}
          </div>
          {filtered.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((b) => <BlogCard key={b.id} blog={b} />)}</div>
          ) : (
            <EmptyState icon={<PenLine />} title={hi ? "कोई लेख नहीं मिला" : "No stories found"} text={q || city ? (hi ? "खोज बदलकर देखें।" : "Try a different search.") : (hi ? "पहला लेख जल्द आएगा।" : "The first story is on its way.")} />
          )}
        </div>
      </section>
    </>
  );
}
