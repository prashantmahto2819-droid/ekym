import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { BookOpen } from "lucide-react";

import { PageHeader } from "@/components/site/PageHeader";
import { useLang } from "@/core/i18n";
import { siteName } from "@/core/seo";
import { supabase } from "@/integrations/supabase/client";
import { issuesQuery } from "@/lib/queries";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/magazine/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(issuesQuery()),
  head: ({ matches }) => ({ meta: [{ title: `Magazine — ${siteName(matches)}` }, { name: "description", content: `Issues of the ${siteName(matches)} magazine.` }] }),
  component: MagazineList,
});

export const pubUrl = (path: string | null) => (path ? supabase.storage.from("publications").getPublicUrl(path).data.publicUrl : "");

function MagazineList() {
  const { data } = useSuspenseQuery(issuesQuery());
  const { lang, loc } = useLang();
  const L = lang === "hi";
  return (
    <>
      <PageHeader icon={<BookOpen />} title={L ? "पत्रिका" : "Magazine"} stats={data.length ? [{ label: L ? "अंक" : "issues", value: data.length }] : undefined} description={L ? "हमारी पत्रिका के अंक ऑनलाइन पढ़ें या PDF डाउनलोड करें।" : "Read our magazine issues online or download the PDF."} crumbs={[{ label: L ? "पत्रिका" : "Magazine" }]} />
      <section className="section-y">
        <div className="container-page grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {data.map((i) => (
            <Link key={i.id} to="/magazine/$slug" params={{ slug: i.slug }} className="group block">
              <div className="zoom-media relative aspect-[3/4] rounded-r-xl rounded-l-sm shadow-[6px_8px_20px_-8px_rgba(0,0,0,.35)] ring-1 ring-black/5 transition group-hover:-translate-y-1">{i.cover_path ? <img src={pubUrl(i.cover_path)} alt="" className="size-full object-cover" loading="lazy" /> : <div className="page-hero grid size-full place-items-center p-4 text-center font-display text-lg font-semibold text-white">{loc(i, "title")}</div>}<span aria-hidden className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/25 to-transparent" /></div>
              <div className="px-1 pt-3">
                <h3 className="line-clamp-2 font-display font-semibold group-hover:text-primary">{loc(i, "title")}</h3>
                <p className="text-xs text-muted-foreground">{i.issue_no ? `${i.issue_no} · ` : ""}{formatDate(i.issue_date)}{i.access === "members" ? ` · ${L ? "सदस्यों के लिए" : "members"}` : ""}</p>
              </div>
            </Link>
          ))}
          {!data.length ? <p className="text-muted-foreground">{L ? "अभी कोई अंक नहीं।" : "No issues yet."}</p> : null}
        </div>
      </section>
    </>
  );
}
