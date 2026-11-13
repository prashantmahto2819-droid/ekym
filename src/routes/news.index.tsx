import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { pageMeta } from "@/core/seo";

import { NewsCard } from "@/components/home/sections";
import { PageHeader } from "@/components/site/PageHeader";
import { newsListQuery } from "@/lib/queries";
import { useState } from "react";
import { Newspaper } from "lucide-react";
import { EmptyState, SearchBox } from "@/components/site/kit";
import { useLang } from "@/core/i18n";

export const Route = createFileRoute("/news/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(newsListQuery()),
  head: ({ matches }) => pageMeta(matches, { en: "News", hi: "समाचार" }, { en: "Announcements, notices and media coverage.", hi: "घोषणाएँ, सूचनाएँ और मीडिया कवरेज।" }),
  component: NewsList,
});

function NewsList() {
  const { data: news } = useSuspenseQuery(newsListQuery());
  const { lang, loc } = useLang();
  const hi = lang === "hi";
  const [q, setQ] = useState("");
  const rows = (news as any[]).filter((n) => !q || `${loc(n, "title")} ${loc(n, "description")} ${n.source_name ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  const lead = !q ? rows.find((n) => n.featured || n.breaking) ?? rows[0] : null;
  const rest = rows.filter((n) => n !== lead);
  return (
    <>
      <PageHeader icon={<Newspaper />} title={hi ? "समाचार" : "News"} description={hi ? "घोषणाएँ, सूचनाएँ और मीडिया में हमारी चर्चा।" : "Announcements, notices and media coverage."} crumbs={[{ label: hi ? "समाचार" : "News" }]}
        stats={news.length ? [{ label: hi ? "समाचार" : "stories", value: news.length }] : undefined} />
      <section className="section-y pt-8 md:pt-10">
        <div className="container-page space-y-8">
          {news.length > 3 ? <SearchBox value={q} onChange={setQ} placeholder={hi ? "समाचार खोजें…" : "Search news…"} className="max-w-md" /> : null}
          {lead ? <NewsCard item={lead} featured /> : null}
          {rest.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((n) => <NewsCard key={n.id} item={n} />)}
            </div>
          ) : null}
          {!rows.length ? <EmptyState icon={<Newspaper />} title={q ? (hi ? "इस खोज से कुछ नहीं मिला" : "Nothing matches this search") : (hi ? "अभी कोई समाचार नहीं" : "No news yet")} text={q ? undefined : (hi ? "नई घोषणाएँ और समाचार यहाँ दिखेंगे।" : "Announcements and stories will appear here.")} /> : null}
        </div>
      </section>
    </>
  );
}
