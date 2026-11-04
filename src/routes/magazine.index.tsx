import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

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
      <PageHeader title={L ? "पत्रिका" : "Magazine"} description={L ? "हमारी पत्रिका के अंक ऑनलाइन पढ़ें या PDF डाउनलोड करें।" : "Read our magazine issues online or download the PDF."} crumbs={[{ label: L ? "पत्रिका" : "Magazine" }]} />
      <section className="section-y">
        <div className="container-page grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {data.map((i) => (
            <Link key={i.id} to="/magazine/$slug" params={{ slug: i.slug }} className="surface-card overflow-hidden transition hover:shadow-md">
              {i.cover_path ? <img src={pubUrl(i.cover_path)} alt="" className="aspect-[3/4] w-full object-cover" loading="lazy" /> : <div className="grid aspect-[3/4] place-items-center bg-secondary text-muted-foreground">{L ? "अंक" : "Issue"}</div>}
              <div className="p-3">
                <h3 className="font-display font-semibold">{loc(i, "title")}</h3>
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
