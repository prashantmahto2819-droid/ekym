import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Clock, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";

import { Chips, DateBadge, EmptyState, SearchBox } from "@/components/site/kit";
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
  const [tab, setTab] = useState<"up" | "past">("up");
  const [q, setQ] = useState("");
  const now = Date.now();
  const all = [...data].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  const upcoming = all.filter((e) => new Date(e.starts_at).getTime() >= now - 6 * 3600e3);
  const past = all.filter((e) => new Date(e.starts_at).getTime() < now - 6 * 3600e3).reverse();
  const match = (e: (typeof data)[number]) => !q || `${loc(e, "title")} ${loc(e, "venue")}`.toLowerCase().includes(q.toLowerCase());
  const next = tab === "up" && !q ? upcoming[0] : undefined;
  const list = (tab === "up" ? upcoming : past).filter(match).filter((e) => e !== next);
  const when = (iso: string) => new Date(iso).toLocaleString(L ? "hi-IN" : "en-IN", { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" });
  return (
    <>
      <PageHeader icon={<CalendarDays />} title={L ? "आयोजन" : "Events"} description={L ? "आगामी कार्यक्रम, सम्मेलन और सेवा शिविर — पंजीकरण भी यहीं से।" : "Upcoming programmes, gatherings and seva camps — register right here."} crumbs={[{ label: L ? "आयोजन" : "Events" }]}
        stats={[{ label: L ? "आगामी" : "upcoming", value: upcoming.length }, { label: L ? "पिछले" : "past", value: past.length }]} />
      <section className="section-y pt-8 md:pt-10">
        <div className="container-page space-y-8">
          {next ? (
            <Link to="/events/$slug" params={{ slug: next.slug }} className="group relative grid overflow-hidden rounded-3xl bg-card shadow-lg ring-1 ring-border md:grid-cols-5">
              <div className="zoom-media relative aspect-[16/9] md:col-span-3 md:aspect-auto md:min-h-80">
                {next.cover_image ? <img src={next.cover_image} alt="" className="size-full object-cover" /> : <div className="page-hero size-full" />}
                <span className="absolute left-4 top-4 rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent-foreground shadow">{L ? "अगला आयोजन" : "Next up"}</span>
              </div>
              <div className="flex flex-col gap-4 p-6 md:col-span-2 md:p-8">
                <div className="flex items-start gap-4"><DateBadge iso={next.starts_at} hi={L} /><div><h2 className="font-display text-2xl font-semibold leading-tight group-hover:text-primary">{loc(next, "title")}</h2><p className="mt-1 text-sm text-muted-foreground">{when(next.starts_at)}</p></div></div>
                {next.venue ? <p className="flex items-center gap-2 text-sm"><MapPin className="size-4 text-primary" />{loc(next, "venue")}</p> : null}
                <Countdown iso={next.starts_at} hi={L} />
                <span className="mt-auto inline-flex h-11 w-fit items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground">{next.registration_open ? (L ? "पंजीकरण करें" : "Register") : (L ? "विवरण देखें" : "View details")} <ArrowRight className="size-4 transition group-hover:translate-x-1" /></span>
              </div>
            </Link>
          ) : null}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Chips items={[{ value: "up", label: L ? "आगामी" : "Upcoming", count: upcoming.length }, { value: "past", label: L ? "पिछले" : "Past", count: past.length }]} value={tab} onChange={setTab} />
            {data.length > 4 ? <SearchBox value={q} onChange={setQ} placeholder={L ? "आयोजन या स्थान खोजें…" : "Search events or places…"} className="md:w-80" /> : null}
          </div>
          {list.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((e) => (
                <Link key={e.id} to="/events/$slug" params={{ slug: e.slug }} className={`group surface-card lift-on-hover flex flex-col overflow-hidden ${tab === "past" ? "opacity-90" : ""}`}>
                  <div className="zoom-media relative aspect-[16/9]">
                    {e.cover_image ? <img src={e.cover_image} alt="" className="size-full object-cover" loading="lazy" /> : <div className="gradient-teal size-full" />}
                    <DateBadge iso={e.starts_at} hi={L} className="absolute left-3 top-3" />
                    {e.registration_open && tab === "up" ? <span className="absolute right-3 top-3 rounded-full bg-success px-2.5 py-1 text-xs font-semibold text-success-foreground shadow">{L ? "पंजीकरण खुला" : "Registration open"}</span> : null}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-display text-lg font-semibold group-hover:text-primary">{loc(e, "title")}</h3>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"><Clock className="size-4" />{new Date(e.starts_at).toLocaleString(L ? "hi-IN" : "en-IN", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short", ...(tab === "past" ? { year: "numeric" as const } : {}) })}</p>
                    {e.venue ? <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="size-4" /><span className="line-clamp-1">{loc(e, "venue")}</span></p> : null}
                  </div>
                </Link>
              ))}
            </div>
          ) : !next ? (
            <EmptyState icon={<CalendarDays />} title={q ? (L ? "इस खोज से कोई आयोजन नहीं मिला" : "No event matches this search") : tab === "up" ? (L ? "अभी कोई आगामी आयोजन नहीं" : "No upcoming events") : (L ? "पिछले आयोजन नहीं मिले" : "No past events")} text={tab === "up" && !q ? (L ? "नए कार्यक्रम घोषित होते ही यहाँ दिखेंगे।" : "New programmes will appear here when announced.") : undefined} />
          ) : null}
        </div>
      </section>
    </>
  );
}

/** Days / hours / minutes until the event. */
function Countdown({ iso, hi }: { iso: string; hi: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return <p className="w-fit rounded-full bg-success/15 px-3 py-1 text-sm font-semibold text-success">{hi ? "आज / अभी चल रहा है" : "Happening now"}</p>;
  const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4);
  const cell = (v: number, l: string) => <div className="min-w-16 rounded-2xl bg-secondary px-3 py-2 text-center"><p className="font-display text-2xl font-bold tabular-nums">{v}</p><p className="text-[11px] text-muted-foreground">{l}</p></div>;
  return <div className="flex gap-2">{cell(d, hi ? "दिन" : "days")}{cell(h, hi ? "घंटे" : "hours")}{cell(m, hi ? "मिनट" : "min")}</div>;
}
