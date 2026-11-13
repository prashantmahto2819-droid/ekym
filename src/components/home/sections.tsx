import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  Droplet,
  Heart,
  MapPin,
  MessageCircle,
  Phone,
  Quote,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";

import { useEffect, useState } from "react";

import { SectionHeading } from "@/components/site/SectionHeading";
import { useLang } from "@/core/i18n";
import { moduleOn } from "@/core/modules";
import { useTenant } from "@/core/tenant-context";
import { SevaIcon } from "@/components/site/SevaIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { embedUrl, formatCurrency, formatDate, telHref, whatsappHref } from "@/lib/format";
import { useFt } from "@/core/formText";

/* ------------------------------ HERO ------------------------------ */

export function HeroSlider({ slides }: { slides: any[] }) {
  const { lang } = useLang();
  const tenant = useTenant();
  const [api, setApi] = useState<CarouselApi | undefined>(undefined);
  const [cur, setCur] = useState(0);
  const hi = lang === "hi";
  const pick = (s: any, k: string) => (hi && s[`${k}_hi`]) || s[k];
  useEffect(() => {
    if (!api) return;
    const onSel = () => setCur(api.selectedScrollSnap());
    api.on("select", onSel); onSel();
    const t = setInterval(() => { if (!document.hidden) api.scrollNext(); }, 6500);
    return () => { clearInterval(t); api.off("select", onSel); };
  }, [api]);
  if (!slides.length) return null;
  const donate = moduleOn(tenant.branding, "donate");
  return (
    <section aria-label="Highlights" className="relative">
      <Carousel opts={{ loop: true }} setApi={setApi} className="relative">
        <CarouselContent>
          {slides.map((s, i) => (
            <CarouselItem key={s.id}>
              <div className="relative min-h-[26rem] w-full overflow-hidden bg-[#12383a] md:min-h-[34rem]">
                {s.image ? (
                  <img src={s.image} alt="" className="absolute inset-0 size-full object-cover object-[70%_center]" loading={i === 0 ? "eager" : "lazy"} fetchPriority={i === 0 ? "high" : undefined} />
                ) : (
                  <div className="gradient-teal absolute inset-0" />
                )}
                {/* readable headline on the left, artwork stays visible on the right */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#0b2a2c]/90 via-[#0b2a2c]/55 to-transparent" />
                <div className="container-page relative flex min-h-[26rem] flex-col justify-center py-14 text-white md:min-h-[34rem]">
                  {pick(s, "subtitle") ? <p className="eyebrow text-amber-200">{pick(s, "subtitle")}</p> : null}
                  <h1 className="mt-2 max-w-2xl font-display text-3xl font-semibold leading-tight drop-shadow md:text-5xl">{pick(s, "title")}</h1>
                  {pick(s, "description") ? <p className="mt-4 max-w-xl text-base opacity-95 md:text-lg">{pick(s, "description")}</p> : null}
                  <div className="mt-7 flex flex-wrap gap-3">
                    {s.button_text && s.button_url ? (
                      <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                        {String(s.button_url).startsWith("http") ? <a href={s.button_url}>{pick(s, "button_text")}</a> : <Link to={s.button_url}>{pick(s, "button_text")}</Link>}
                      </Button>
                    ) : null}
                    {donate ? <Button asChild size="lg" variant="secondary"><Link to="/donate">{hi ? "दान करें" : "Donate"}</Link></Button> : null}
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {slides.length > 1 ? (
          <>
            <CarouselPrevious className="left-4 hidden md:flex" />
            <CarouselNext className="right-4 hidden md:flex" />
          </>
        ) : null}
      </Carousel>
      {slides.length > 1 ? (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
          {slides.map((s, i) => <button key={s.id} type="button" aria-label={`Slide ${i + 1}`} onClick={() => api?.scrollTo(i)} className={`h-2 rounded-full transition-all ${i === cur ? "w-6 bg-amber-300" : "w-2 bg-white/50"}`} />)}
        </div>
      ) : null}
    </section>
  );
}

/* --------------------------- FESTIVAL --------------------------- */

export function FestivalSlider({ festivals }: { festivals: any[] }) {
  const today = new Date();
  const relevant = festivals.filter((f) => {
    if (!f.festival_date) return true;
    const d = new Date(f.festival_date);
    const diff = Math.abs(d.getTime() - today.getTime()) / 86400000;
    const sameWindow = d.getMonth() === today.getMonth() && Math.abs(d.getDate() - today.getDate()) <= 3;
    return diff <= 3 || sameWindow;
  });
  const list = relevant.length ? relevant : [];
  if (!list.length) return null;

  return (
    <section className="bg-accent-soft">
      <div className="container-page py-8">
        <Carousel opts={{ loop: list.length > 1 }}>
          <CarouselContent>
            {list.map((f) => (
              <CarouselItem key={f.id}>
                <div className="flex flex-col items-center gap-4 text-center md:flex-row md:text-left">
                  {f.image ? (
                    <img
                      src={f.image}
                      alt=""
                      loading="lazy"
                      className="h-28 w-full rounded-xl object-cover md:w-48"
                    />
                  ) : (
                    <span className="gradient-warm flex size-14 items-center justify-center rounded-full text-accent-foreground">
                      <Sparkles className="size-6" />
                    </span>
                  )}
                  <div>
                    <p className="eyebrow">{f.festival_name}</p>
                    <h2 className="mt-1 font-display text-xl font-semibold">{f.title ?? f.festival_name}</h2>
                    {f.message ? <p className="mt-1 text-sm text-muted-foreground">{f.message}</p> : null}
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </section>
  );
}

/* ----------------------------- SEVA ----------------------------- */

export function SevaGrid({
  seva,
  title,
  subtitle,
  limit,
}: {
  seva: any[];
  title: string;
  subtitle?: string | null;
  limit?: number;
}) {
  if (!seva.length) return null;
  const list = limit ? seva.slice(0, limit) : seva;
  return (
    <section className="section-y">
      <div className="container-page">
        <SectionHeading
          eyebrow={`${seva.length} seva prakalp`}
          title={title}
          subtitle={subtitle}
          action={limit && seva.length > limit ? { label: "View all", to: "/seva" } : undefined}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <Link key={p.id} to="/seva/$slug" params={{ slug: p.slug }} className="surface-card lift-on-hover p-5">
              <span className="bg-primary-soft text-primary-deep flex size-11 items-center justify-center rounded-lg">
                <SevaIcon name={p.icon} className="size-5" />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold">{p.name}</h3>
              {p.short_description ? (
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{p.short_description}</p>
              ) : null}
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                Read more <ArrowRight className="size-4" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------ TODAY ACTIVITIES ------------------------ */

export function TodayActivities({
  blogs,
  contributors,
  title,
  subtitle,
}: {
  blogs: any[];
  contributors: any[];
  title: string;
  subtitle?: string | null;
}) {
  const cutoff = Date.now() - 36 * 60 * 60 * 1000;
  const recent = blogs.filter((b) => b.published_at && new Date(b.published_at).getTime() >= cutoff);
  const items = recent.length ? recent : blogs.slice(0, 3);
  if (!items.length && !contributors.length) return null;

  return (
    <section className="bg-secondary/60 section-y">
      <div className="container-page">
        <SectionHeading eyebrow="Last 24 hours" title={title} subtitle={subtitle} action={{ label: "All updates", to: "/blogs" }} />
        <div className="grid gap-4 md:grid-cols-3">
          {items.slice(0, 3).map((b) => (
            <Link key={b.id} to="/blogs/$slug" params={{ slug: b.slug }} className="surface-card lift-on-hover overflow-hidden">
              {b.featured_image ? (
                <img src={b.featured_image} alt="" loading="lazy" className="h-40 w-full object-cover" />
              ) : null}
              <div className="p-5">
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarDays className="size-3.5" />
                  {formatDate(b.published_at)}
                  {b.city ? (
                    <>
                      <MapPin className="ml-1 size-3.5" />
                      {b.city}
                    </>
                  ) : null}
                </p>
                <h3 className="mt-2 font-display text-base font-semibold">{b.title}</h3>
                {b.excerpt ? <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{b.excerpt}</p> : null}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------- BLOOD STRIP -------------------------- */

export function BloodRequirementSection({
  requirements,
  title,
  subtitle,
}: {
  requirements: any[];
  title: string;
  subtitle?: string | null;
}) {
  return (
    <section className="section-y">
      <div className="container-page">
        <SectionHeading
          eyebrow="Blood seva"
          title={title}
          subtitle={subtitle}
          action={{ label: "All requirements", to: "/blood" }}
        />
        {requirements.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {requirements.slice(0, 3).map((r) => (
              <BloodRequirementCard key={r.id} requirement={r} />
            ))}
          </div>
        ) : (
          <div className="surface-card flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-lg font-semibold">No verified requirement right now</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Register as a donor so we can reach you the moment someone needs your blood group.
              </p>
            </div>
            <Button asChild>
              <Link to="/blood">Register as donor</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

export function BloodRequirementCard({ requirement: r }: { requirement: any }) {
  const t = useFt();
  const hi = useLang().lang === "hi";
  const urgencyTone =
    r.urgency === "critical"
      ? "bg-blood text-blood-foreground"
      : r.urgency === "urgent"
        ? "bg-accent text-accent-foreground"
        : "bg-secondary text-secondary-foreground";
  return (
    <article className="surface-card flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="bg-blood-soft text-blood flex size-12 items-center justify-center rounded-lg font-display text-base font-bold">
          {r.blood_group}
        </span>
        <Badge className={urgencyTone}>{t(r.urgency)}</Badge>
      </div>
      <h3 className="mt-4 font-display text-base font-semibold">
        {hi ? `${r.units_required} यूनिट` : `${r.units_required} unit${r.units_required > 1 ? "s" : ""}`} · {t(r.component)}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{r.hospital}</p>
      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <MapPin className="size-3.5" />
        {[r.city, r.district, r.state].filter(Boolean).join(", ")}
      </p>
      {r.required_date ? (
        <p className="mt-1 text-xs text-muted-foreground">{hi ? "कब तक: " : "Needed by "}{formatDate(r.required_date)}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {r.requester_mobile ? (
          <Button asChild size="sm" variant="outline">
            <a href={telHref(r.requester_mobile)}>
              <Phone className="size-4" /> {hi ? "फ़ोन करें" : "Call"}
            </a>
          </Button>
        ) : null}
        {r.requester_whatsapp || r.requester_mobile ? (
          <Button asChild size="sm" variant="outline">
            <a
              href={whatsappHref(
                r.requester_whatsapp ?? r.requester_mobile,
                `Hello, I saw the ${r.blood_group} blood requirement at ${r.hospital}. I would like to help.`,
              )}
              target="_blank"
              rel="noreferrer noopener"
            >
              <MessageCircle className="size-4" /> WhatsApp
            </a>
          </Button>
        ) : null}
        <Button asChild size="sm">
          <Link to="/blood">
            <Droplet className="size-4" /> Donate blood
          </Link>
        </Button>
      </div>
      {r.requirement_id ? (
        <p className="mt-3 text-[11px] uppercase tracking-wider text-muted-foreground">Ref {r.requirement_id}</p>
      ) : null}
    </article>
  );
}

/* --------------------------- BHOJAN SEVA --------------------------- */

export function BhojanSeva({
  project,
  title,
  subtitle,
}: {
  project?: any;
  title: string;
  subtitle?: string | null;
}) {
  return (
    <section className="bg-primary-soft/60 section-y">
      <div className="container-page grid items-center gap-8 md:grid-cols-2">
        <div>
          <p className="eyebrow">Bhojan sewa</p>
          <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">{title}</h2>
          <p className="mt-3 text-muted-foreground">
            {subtitle ?? project?.short_description ?? "Warm meals served with dignity, every single day."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/donate">Sponsor a meal</Link>
            </Button>
            {project ? (
              <Button asChild variant="outline">
                <Link to="/seva/$slug" params={{ slug: project.slug }}>
                  About Bhojan Seva
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
        <div className="surface-card flex items-center gap-4 p-6">
          <span className="gradient-warm flex size-14 shrink-0 items-center justify-center rounded-full text-accent-foreground">
            <UtensilsCrossed className="size-6" />
          </span>
          <p className="text-sm text-muted-foreground">
            Our kitchen team starts at 5:30 am. Meals are cooked, counted, packed and delivered before 11 am —
            no questions asked, no documents needed.
          </p>
        </div>
      </div>
    </section>
  );
}

/* --------------------------- CONTRIBUTORS --------------------------- */

export function Contributors({
  contributors,
  title,
  subtitle,
}: {
  contributors: any[];
  title: string;
  subtitle?: string | null;
}) {
  if (!contributors.length) return null;
  return (
    <section className="section-y">
      <div className="container-page">
        <SectionHeading eyebrow="Gratitude" title={title} subtitle={subtitle} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {contributors.map((c) => (
            <article key={c.id} className="surface-card p-5 text-center">
              {c.photo ? (
                <img src={c.photo} alt="" loading="lazy" className="mx-auto size-16 rounded-full object-cover" />
              ) : (
                <span className="bg-accent-soft text-accent mx-auto flex size-16 items-center justify-center rounded-full">
                  <Heart className="size-6" />
                </span>
              )}
              <h3 className="mt-3 font-display text-base font-semibold">{c.name}</h3>
              {c.organization ? <p className="text-xs text-muted-foreground">{c.organization}</p> : null}
              {c.contribution_type ? (
                <Badge variant="secondary" className="mt-2">
                  {c.contribution_type}
                </Badge>
              ) : null}
              {c.recognition_message ? (
                <p className="mt-2 text-sm text-muted-foreground">{c.recognition_message}</p>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ BLOGS ------------------------------ */

export function BlogGrid({
  blogs,
  title,
  subtitle,
}: {
  blogs: any[];
  title: string;
  subtitle?: string | null;
}) {
  if (!blogs.length) return null;
  return (
    <section className="bg-secondary/60 section-y">
      <div className="container-page">
        <SectionHeading eyebrow="From the field" title={title} subtitle={subtitle} action={{ label: "All blogs", to: "/blogs" }} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {blogs.slice(0, 6).map((b) => (
            <BlogCard key={b.id} blog={b} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function BlogCard({ blog: b }: { blog: any }) {
  return (
    <Link to="/blogs/$slug" params={{ slug: b.slug }} className="surface-card lift-on-hover overflow-hidden">
      {b.featured_image ? (
        <img src={b.featured_image} alt="" loading="lazy" className="h-44 w-full object-cover" />
      ) : (
        <div className="gradient-teal h-44 w-full" />
      )}
      <div className="p-5">
        <p className="text-xs text-muted-foreground">{formatDate(b.published_at)}</p>
        <h3 className="mt-2 font-display text-lg font-semibold">{b.title}</h3>
        {b.excerpt ? <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{b.excerpt}</p> : null}
      </div>
    </Link>
  );
}

/* ------------------------------ NEWS ------------------------------ */

export function NewsSlider({ news, title }: { news: any[]; title: string }) {
  if (!news.length) return null;
  return (
    <section className="section-y">
      <div className="container-page">
        <SectionHeading eyebrow="Press & updates" title={title} action={{ label: "All news", to: "/news" }} />
        <Carousel opts={{ align: "start" }}>
          <CarouselContent>
            {news.map((n) => (
              <CarouselItem key={n.id} className="sm:basis-1/2 lg:basis-1/3">
                <NewsCard item={n} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex" />
          <CarouselNext className="hidden md:flex" />
        </Carousel>
      </div>
    </section>
  );
}

export function NewsCard({ item: n }: { item: any }) {
  return (
    <Link to="/news/$slug" params={{ slug: n.slug }} className="surface-card lift-on-hover block h-full overflow-hidden">
      {n.thumbnail ? (
        <img src={n.thumbnail} alt="" loading="lazy" className="h-36 w-full object-cover" />
      ) : (
        <div className="gradient-warm h-36 w-full" />
      )}
      <div className="p-5">
        <p className="text-xs text-muted-foreground">
          {n.source_name ? `${n.source_name} · ` : ""}
          {formatDate(n.published_at)}
        </p>
        <h3 className="mt-2 font-display text-base font-semibold">{n.title}</h3>
        {n.description ? <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{n.description}</p> : null}
      </div>
    </Link>
  );
}

/* --------------------------- VIDEOS / REELS --------------------------- */

export function VideoSection({ videos, title }: { videos: any[]; title: string }) {
  if (!videos.length) return null;
  return (
    <section className="section-y">
      <div className="container-page">
        <SectionHeading eyebrow="Watch" title={title} action={{ label: "All videos", to: "/videos" }} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {videos.slice(0, 3).map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function VideoCard({ video: v, vertical }: { video: any; vertical?: boolean }) {
  return (
    <article className="surface-card overflow-hidden">
      <div className={vertical ? "aspect-[9/16]" : "aspect-video"}>
        <iframe
          src={embedUrl(v.platform, v.video_url)}
          title={v.title}
          loading="lazy"
          allowFullScreen
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          className="size-full"
        />
      </div>
      <div className="p-4">
        <h3 className="font-display text-sm font-semibold">{v.title}</h3>
        {v.description ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{v.description}</p> : null}
      </div>
    </article>
  );
}

export function ReelSection({ reels, title }: { reels: any[]; title: string }) {
  if (!reels.length) return null;
  return (
    <section className="bg-secondary/60 section-y">
      <div className="container-page">
        <SectionHeading eyebrow="Short videos" title={title} action={{ label: "All reels", to: "/reels" }} />
        <div className="scrollbar-none -mx-4 flex gap-4 overflow-x-auto px-4 pb-2">
          {reels.map((r) => (
            <div key={r.id} className="w-64 shrink-0">
              <VideoCard video={r} vertical />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------- CAMPAIGNS --------------------------- */

export function CampaignSection({
  campaigns,
  title,
  subtitle,
}: {
  campaigns: any[];
  title: string;
  subtitle?: string | null;
}) {
  if (!campaigns.length) return null;
  return (
    <section className="section-y">
      <div className="container-page">
        <SectionHeading eyebrow="Campaigns" title={title} subtitle={subtitle} action={{ label: "All campaigns", to: "/campaigns" }} />
        <div className="grid gap-4 md:grid-cols-2">
          {campaigns.slice(0, 2).map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function CampaignCard({ campaign: c }: { campaign: any }) {
  const target = Number(c.target_amount ?? 0);
  const raised = Number(c.raised_amount ?? 0);
  const pct = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
  return (
    <Link to="/campaigns/$slug" params={{ slug: c.slug }} className="surface-card lift-on-hover overflow-hidden">
      {c.cover_image ? (
        <img src={c.cover_image} alt="" loading="lazy" className="h-48 w-full object-cover" />
      ) : (
        <div className="gradient-teal h-48 w-full" />
      )}
      <div className="p-5">
        <h3 className="font-display text-lg font-semibold">{c.title}</h3>
        {c.description ? <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{c.description}</p> : null}
        {target > 0 ? (
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div className="gradient-warm h-full" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Goal {formatCurrency(target)} · {pct}% funded
            </p>
          </div>
        ) : null}
      </div>
    </Link>
  );
}

/* --------------------------- TESTIMONIALS --------------------------- */

export function Testimonials({
  testimonials,
  title,
  subtitle,
}: {
  testimonials: any[];
  title: string;
  subtitle?: string | null;
}) {
  if (!testimonials.length) return null;
  return (
    <section className="section-y">
      <div className="container-page">
        <SectionHeading eyebrow="Voices" title={title} subtitle={subtitle} />
        <Carousel opts={{ align: "start", loop: testimonials.length > 2 }}>
          <CarouselContent>
            {testimonials.map((t) => (
              <CarouselItem key={t.id} className="md:basis-1/2 lg:basis-1/3">
                <article className="surface-card flex h-full flex-col p-6">
                  <Quote className="text-accent size-6" />
                  <p className="mt-3 flex-1 text-sm leading-relaxed">{t.message}</p>
                  <div className="mt-5 flex items-center gap-3">
                    {t.photo ? (
                      <img src={t.photo} alt="" loading="lazy" className="size-10 rounded-full object-cover" />
                    ) : (
                      <span className="bg-primary-soft text-primary-deep flex size-10 items-center justify-center rounded-full font-semibold">
                        {t.name?.[0] ?? "?"}
                      </span>
                    )}
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[t.role, t.city].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </div>
                </article>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex" />
          <CarouselNext className="hidden md:flex" />
        </Carousel>
      </div>
    </section>
  );
}

/* ------------------------------ CTAs ------------------------------ */

export function DonateCta({ title, subtitle, text }: { title: string; subtitle?: string | null | undefined; text?: string | null | undefined }) {
  return (
    <section className="gradient-teal text-primary-foreground">
      <div className="container-page flex flex-col items-start gap-6 py-14 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold sm:text-3xl">{title}</h2>
          <p className="mt-3 opacity-90">{text ?? subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/donate">Donate</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link to="/campaigns">See campaigns</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export function VolunteerCta({ title, subtitle }: { title: string; subtitle?: string | null }) {
  return (
    <section className="section-y">
      <div className="container-page grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <p className="eyebrow">Join us</p>
          <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">{title}</h2>
          <p className="mt-3 text-muted-foreground">
            {subtitle ?? "Give your time, skills and heart. Volunteers run almost everything we do."}
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Button asChild size="lg">
            <Link to="/join">Become a volunteer</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/internship">Apply for internship</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export function ContactCta({
  org,
  title,
  subtitle,
}: {
  org?: any;
  title: string;
  subtitle?: string | null;
}) {
  return (
    <section className="bg-secondary/60 section-y">
      <div className="container-page grid gap-6 md:grid-cols-2">
        <div>
          <p className="eyebrow">Contact</p>
          <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">{title}</h2>
          <p className="mt-3 text-muted-foreground">{subtitle ?? "We would love to hear from you."}</p>
          <div className="mt-5 space-y-2 text-sm">
            {org?.phone ? (
              <p className="flex items-center gap-2">
                <Phone className="size-4 text-primary" />
                <a href={telHref(org.phone)} className="hover:underline">
                  {org.phone}
                </a>
              </p>
            ) : null}
            {org?.address ? (
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 text-primary" />
                <span>
                  {[org.address, org.city, org.state, org.pincode].filter(Boolean).join(", ")}
                </span>
              </p>
            ) : null}
          </div>
        </div>
        <div className="surface-card flex flex-col justify-center gap-3 p-6">
          <p className="text-sm text-muted-foreground">
            Have a question, a requirement, or want to organise a seva activity with us?
          </p>
          <Button asChild>
            <Link to="/contact">Send us a message</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
