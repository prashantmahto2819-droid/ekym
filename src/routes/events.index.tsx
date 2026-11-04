import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/site/PageHeader";
import { useLang } from "@/core/i18n";
import { siteName } from "@/core/seo";
import { eventsQuery } from "@/lib/queries";

export const Route = createFileRoute("/events/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(eventsQuery()),
  head: ({ matches }) => ({ meta: [{ title: `Events — ${siteName(matches)}` }, { name: "description", content: `Upcoming and past events of ${siteName(matches)}.` }] }),
  component: EventsList,
});

function EventsList() {
  const { data } = useSuspenseQuery(eventsQuery());
  const { lang, loc } = useLang();
  const L = lang === "hi";
  const now = Date.now();
  const upcoming = data.filter((e) => new Date(e.starts_at).getTime() >= now - 6 * 3600e3), past = data.filter((e) => new Date(e.starts_at).getTime() < now - 6 * 3600e3);
  const Card = ({ e }: { e: (typeof data)[number] }) => (
    <Link to="/events/$slug" params={{ slug: e.slug }} className="surface-card overflow-hidden transition hover:shadow-md">
      {e.cover_image ? <img src={e.cover_image} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" /> : null}
      <div className="p-4"><p className="text-xs text-muted-foreground">{new Date(e.starts_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}{e.venue ? ` · ${loc(e, "venue")}` : ""}</p><h3 className="mt-1 font-display text-lg font-semibold">{loc(e, "title")}</h3>{e.registration_open ? <span className="mt-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{L ? "पंजीकरण खुला" : "Registration open"}</span> : null}</div>
    </Link>
  );
  return (
    <>
      <PageHeader title={L ? "आयोजन" : "Events"} description={L ? "आगामी और पिछले कार्यक्रम।" : "Upcoming and past programmes."} crumbs={[{ label: L ? "आयोजन" : "Events" }]} />
      <section className="section-y"><div className="container-page space-y-8">
        <div><h2 className="mb-4 font-display text-xl font-semibold">{L ? "आगामी" : "Upcoming"}</h2>{upcoming.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{upcoming.map((e) => <Card key={e.id} e={e} />)}</div> : <p className="text-muted-foreground">{L ? "अभी कोई आगामी आयोजन नहीं।" : "No upcoming events."}</p>}</div>
        {past.length ? <div><h2 className="mb-4 font-display text-xl font-semibold">{L ? "पिछले" : "Past"}</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{past.map((e) => <Card key={e.id} e={e} />)}</div></div> : null}
      </div></section>
    </>
  );
}
