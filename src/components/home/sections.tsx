import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  GraduationCap,
  Users,
  Droplet,
  Heart,
  MapPin,
  MessageCircle,
  Phone,
  Quote,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";

import { useEffect, useState, type ReactNode } from "react";

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
import { videoThumb } from "@/components/site/kit";
import { placeLine } from "@/lib/places";

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
  const donate = moduleOn(tenant.branding, "donate");
  if (!slides.length) return <DefaultHero />;
  return (
    <>
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
        <div className="absolute bottom-16 left-0 right-0 flex justify-center gap-2 md:bottom-20">
          {slides.map((s, i) => <button key={s.id} type="button" aria-label={`Slide ${i + 1}`} onClick={() => api?.scrollTo(i)} className={`h-2 rounded-full transition-all ${i === cur ? "w-6 bg-amber-300" : "w-2 bg-white/50"}`} />)}
        </div>
      ) : null}
    </section>
    <QuickActions />
    </>
  );
}

/** Shown when no slides are set: organization name, tagline and the main buttons. */
function DefaultHero() {
  const tenant = useTenant();
  const { lang } = useLang();
  const hi = lang === "hi";
  const t = tenant as unknown as { name: string; name_hi?: string | null; branding?: Record<string, unknown> };
  const tag = (hi ? t.branding?.["tagline_hi"] : t.branding?.["tagline"]) as string | undefined;
  return (
    <>
      <section className="page-hero relative isolate overflow-hidden text-white">
        <div aria-hidden className="page-hero-pattern absolute inset-0 -z-10" />
        <div aria-hidden className="absolute -right-20 top-10 -z-10 size-96 rounded-full bg-accent/30 blur-3xl" />
        <div className="container-page flex min-h-[26rem] flex-col justify-center py-16 md:min-h-[32rem]">
          <p className="eyebrow text-amber-200">{hi ? "एक समाज · एक मंच" : "One community · one platform"}</p>
          <h1 className="mt-3 max-w-3xl text-balance font-display text-4xl font-semibold leading-tight md:text-6xl">{(hi && t.name_hi) || t.name}</h1>
          {tag ? <p className="mt-4 max-w-2xl text-lg text-white/85">{tag}</p> : null}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/join" className="inline-flex h-12 items-center rounded-full bg-accent px-7 font-semibold text-accent-foreground shadow-lg hover:opacity-95">{hi ? "सदस्य बनें" : "Become a member"}</Link>
            <Link to="/events" className="inline-flex h-12 items-center rounded-full bg-white/15 px-7 font-semibold ring-1 ring-white/30 backdrop-blur hover:bg-white/25">{hi ? "आगामी आयोजन" : "Upcoming events"}</Link>
          </div>
        </div>
      </section>
      <QuickActions />
    </>
  );
}

/** Big, friendly shortcuts under the hero (only for modules that are switched on). */
function QuickActions() {
  const tenant = useTenant();
  const { lang } = useLang();
  const hi = lang === "hi";
  const items: { to: string; mod?: string; icon: ReactNode; hi: string; en: string; sub_hi: string; sub_en: string; tone: string }[] = [
    { to: "/blood", mod: "blood", icon: <Droplet />, hi: "रक्त सहायता", en: "Blood help", sub_hi: "ज़रूरत दर्ज करें / रक्तदाता बनें", sub_en: "Request or donate", tone: "from-rose-500 to-red-700" },
    { to: "/donate", mod: "donate", icon: <Heart />, hi: "दान करें", en: "Donate", sub_hi: "सुरक्षित ऑनलाइन दान", sub_en: "Give securely online", tone: "from-amber-500 to-orange-600" },
    { to: "/events", mod: "events", icon: <CalendarDays />, hi: "आयोजन", en: "Events", sub_hi: "कार्यक्रम व पंजीकरण", sub_en: "Programmes & registration", tone: "from-teal-500 to-emerald-700" },
    { to: "/exams", mod: "exam", icon: <GraduationCap />, hi: "परीक्षा", en: "Exams", sub_hi: "स्तर परीक्षा व प्रमाण-पत्र", sub_en: "Level tests & certificates", tone: "from-sky-500 to-indigo-600" },
    { to: "/matrimony", mod: "matrimony", icon: <Users />, hi: "विवाह", en: "Matrimony", sub_hi: "समाज के रिश्ते", sub_en: "Find a match", tone: "from-fuchsia-500 to-pink-700" },
    { to: "/join", icon: <Sparkles />, hi: "सदस्य बनें", en: "Join", sub_hi: "समाज से जुड़ें", sub_en: "Become a member", tone: "from-violet-500 to-purple-700" },
  ];
  const list = items.filter((i) => !i.mod || moduleOn(tenant.branding, i.mod)).slice(0, 6);
  return (
    <section aria-label={hi ? "मुख्य सुविधाएँ" : "Quick links"} className="relative z-10 -mt-10 md:-mt-14">
      <div className="container-page">
        <div className="grid grid-cols-2 gap-3 rounded-3xl bg-card/95 p-3 shadow-xl ring-1 ring-border backdrop-blur sm:grid-cols-3 lg:grid-cols-6">
          {list.map((i) => (
            <Link key={i.to} to={i.to} className="group flex items-center gap-3 rounded-2xl p-3 transition hover:bg-secondary">
              <span className={`grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md transition group-hover:scale-105 [&>svg]:size-5 ${i.tone}`}>{i.icon}</span>
              <span className="min-w-0"><span className="block font-semibold leading-tight">{hi ? i.hi : i.en}</span><span className="block truncate text-xs text-muted-foreground">{hi ? i.sub_hi : i.sub_en}</span></span>
            </Link>
          ))}
        </div>
      </div>
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
  const { lang, loc } = useLang();
  const hi = lang === "hi";
  if (!seva.length) return null;
  const list = limit ? seva.slice(0, limit) : seva;
  return (
    <section className="section-y">
      <div className="container-page">
        <SectionHeading
          eyebrow={hi ? `${seva.length} सेवा प्रकल्प` : `${seva.length} seva projects`}
          title={title}
          subtitle={subtitle}
          action={limit && seva.length > limit ? { label: hi ? "सभी देखें" : "View all", to: "/seva" } : undefined}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p, i) => (
            <Link key={p.id} to="/seva/$slug" params={{ slug: p.slug }} className="group surface-card lift-on-hover relative overflow-hidden p-6">
              <span aria-hidden className="absolute -right-10 -top-10 size-32 rounded-full bg-primary-soft opacity-60 transition group-hover:scale-125" />
              <span className={`relative flex size-12 items-center justify-center rounded-2xl text-primary-foreground shadow-md ${i % 3 === 1 ? "bg-gradient-to-br from-accent to-orange-600" : "bg-gradient-to-br from-primary to-primary-deep"}`}>
                <SevaIcon name={p.icon} className="size-6" />
              </span>
              <h3 className="relative mt-5 font-display text-lg font-semibold">{loc(p, "name")}</h3>
              {loc(p, "short_description") ? <p className="relative mt-2 line-clamp-3 text-sm text-muted-foreground">{loc(p, "short_description")}</p> : null}
              <span className="relative mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                {hi ? "और जानें" : "Read more"} <ArrowRight className="size-4 transition group-hover:translate-x-1" />
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
  const { lang } = useLang();
  const hi = lang === "hi";
  const cutoff = Date.now() - 36 * 60 * 60 * 1000;
  const recent = blogs.filter((b) => b.published_at && new Date(b.published_at).getTime() >= cutoff);
  const items = recent.length ? recent : blogs.slice(0, 3);
  if (!items.length && !contributors.length) return null;
  return (
    <section className="bg-secondary/60 section-y">
      <div className="container-page">
        <SectionHeading eyebrow={recent.length ? (hi ? "पिछले 24 घंटे" : "Last 24 hours") : (hi ? "हाल की गतिविधियाँ" : "Recent activity")} title={title} subtitle={subtitle} action={{ label: hi ? "सभी अपडेट" : "All updates", to: "/blogs" }} />
        <div className="grid gap-5 md:grid-cols-3">
          {items.slice(0, 3).map((b) => <BlogCard key={b.id} blog={b} />)}
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
  const { lang } = useLang();
  const hi = lang === "hi";
  return (
    <section className="section-y">
      <div className="container-page">
        <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-rose-600 via-red-700 to-rose-900 p-6 text-white shadow-xl md:p-10">
          <Droplet aria-hidden className="absolute -right-6 -top-6 -z-10 size-56 text-white/10" />
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="eyebrow text-rose-100">{hi ? "रक्त सेवा" : "Blood seva"}</p>
              <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">{title}</h2>
              {subtitle ? <p className="mt-2 text-white/85">{subtitle}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/blood" className="inline-flex h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-red-700 shadow hover:bg-white/90">{hi ? "रक्तदाता बनें" : "Become a donor"}</Link>
              <Link to="/blood" className="inline-flex h-11 items-center rounded-full bg-white/15 px-5 text-sm font-semibold ring-1 ring-white/40 hover:bg-white/25">{hi ? "ज़रूरत दर्ज करें" : "Request blood"}</Link>
            </div>
          </div>
          {requirements.length ? (
            <div className="mt-6 grid gap-4 text-foreground sm:grid-cols-2 lg:grid-cols-3">
              {requirements.slice(0, 3).map((r) => <BloodRequirementCard key={r.id} requirement={r} />)}
            </div>
          ) : (
            <p className="mt-6 rounded-2xl bg-white/10 p-4 text-sm text-white/90 ring-1 ring-white/20">{hi ? "अभी कोई सत्यापित आवश्यकता नहीं है। रक्तदाता के रूप में पंजीयन करें, ताकि ज़रूरत पड़ते ही हम आप तक पहुँच सकें।" : "No verified requirement right now. Register as a donor so we can reach you the moment someone needs your blood group."}</p>
          )}
        </div>
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
        {placeLine([r.city, r.district, r.state], hi)}
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
            <Droplet className="size-4" /> {hi ? "रक्तदान करें" : "Donate blood"}
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
  const { lang, loc } = useLang();
  const hi = lang === "hi";
  return (
    <section className="section-y">
      <div className="container-page">
        <div className="grid items-center gap-8 overflow-hidden rounded-3xl bg-accent-soft p-6 md:grid-cols-2 md:p-10">
          <div>
            <p className="eyebrow">{hi ? "भोजन सेवा" : "Bhojan seva"}</p>
            <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">{title}</h2>
            <p className="mt-3 text-muted-foreground">{subtitle ?? (loc(project, "short_description") || (hi ? "सम्मान के साथ गरम भोजन, हर दिन।" : "Warm meals served with dignity, every single day."))}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/donate" className="inline-flex h-11 items-center rounded-full bg-accent px-6 text-sm font-semibold text-accent-foreground shadow hover:opacity-95">{hi ? "एक समय का भोजन प्रायोजित करें" : "Sponsor a meal"}</Link>
              {project ? <Link to="/seva/$slug" params={{ slug: project.slug }} className="inline-flex h-11 items-center rounded-full border border-border bg-background px-6 text-sm font-semibold hover:border-primary hover:text-primary">{hi ? "भोजन सेवा के बारे में" : "About Bhojan Seva"}</Link> : null}
            </div>
          </div>
          <div className="relative">
            {project?.featured_image ? <img src={project.featured_image} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-2xl object-cover shadow-lg" /> : (
              <div className="grid aspect-[4/3] place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-lg"><UtensilsCrossed className="size-20 opacity-90" /></div>
            )}
            <div className="absolute -bottom-4 left-4 right-4 rounded-2xl bg-card p-4 text-sm shadow-lg ring-1 ring-border md:left-auto md:w-72">
              {hi ? "रसोई सुबह 5:30 बजे शुरू होती है — 11 बजे से पहले भोजन पककर, गिनकर, पैक होकर पहुँच जाता है।" : "Our kitchen starts at 5:30 am — meals are cooked, packed and delivered before 11 am."}
            </div>
          </div>
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
  const { lang } = useLang();
  if (!contributors.length) return null;
  return (
    <section className="section-y">
      <div className="container-page">
        <SectionHeading eyebrow={lang === "hi" ? "आभार" : "Gratitude"} title={title} subtitle={subtitle} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {contributors.map((c) => (
            <article key={c.id} className="surface-card lift-on-hover p-6 text-center">
              {c.photo ? (
                <img src={c.photo} alt="" loading="lazy" className="mx-auto size-20 rounded-full object-cover ring-4 ring-accent-soft" />
              ) : (
                <span className="bg-accent-soft text-accent mx-auto flex size-20 items-center justify-center rounded-full">
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
  const { lang } = useLang();
  const hi = lang === "hi";
  if (!blogs.length) return null;
  return (
    <section className="bg-secondary/60 section-y">
      <div className="container-page">
        <SectionHeading eyebrow={hi ? "मैदान से" : "From the field"} title={title} subtitle={subtitle} action={{ label: hi ? "सभी लेख" : "All blogs", to: "/blogs" }} />
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
  const { lang, loc } = useLang();
  const hi = lang === "hi";
  const words = `${loc(b, "excerpt")} ${loc(b, "content")}`.split(/\s+/).length;
  return (
    <Link to="/blogs/$slug" params={{ slug: b.slug }} className="group surface-card lift-on-hover flex h-full flex-col overflow-hidden">
      <div className="zoom-media relative aspect-[16/10]">
        {b.featured_image ? <img src={b.featured_image} alt="" loading="lazy" className="size-full object-cover" /> : <div className="gradient-teal size-full" />}
        {b.city ? <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium shadow backdrop-blur"><MapPin className="size-3" />{b.city}</span> : null}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs text-muted-foreground">{formatDate(b.published_at)}{words > 40 ? ` · ${Math.max(1, Math.round(words / 180))} ${hi ? "मिनट पढ़ें" : "min read"}` : ""}</p>
        <h3 className="mt-2 line-clamp-2 font-display text-lg font-semibold group-hover:text-primary">{loc(b, "title")}</h3>
        {loc(b, "excerpt") ? <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{loc(b, "excerpt")}</p> : null}
        <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-primary">{hi ? "पूरा पढ़ें" : "Read"} <ArrowRight className="size-4 transition group-hover:translate-x-1" /></span>
      </div>
    </Link>
  );
}

/* ------------------------------ NEWS ------------------------------ */

export function NewsSlider({ news, title }: { news: any[]; title: string }) {
  const { lang } = useLang();
  const hi = lang === "hi";
  if (!news.length) return null;
  return (
    <section className="section-y">
      <div className="container-page">
        <SectionHeading eyebrow={hi ? "समाचार व अपडेट" : "Press & updates"} title={title} action={{ label: hi ? "सभी समाचार" : "All news", to: "/news" }} />
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

export function NewsCard({ item: n, featured }: { item: any; featured?: boolean }) {
  const { loc } = useLang();
  return (
    <Link to="/news/$slug" params={{ slug: n.slug }} className={`group surface-card lift-on-hover flex h-full overflow-hidden ${featured ? "flex-col md:flex-row" : "flex-col"}`}>
      <div className={`zoom-media relative shrink-0 ${featured ? "aspect-[16/10] md:aspect-auto md:w-3/5" : "aspect-[16/10]"}`}>
        {n.thumbnail ? <img src={n.thumbnail} alt="" loading="lazy" className="size-full object-cover" /> : <div className="gradient-warm size-full" />}
        {n.source_name ? <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold text-primary shadow backdrop-blur">{n.source_name}</span> : null}
      </div>
      <div className={`flex flex-1 flex-col ${featured ? "p-6 md:p-8" : "p-5"}`}>
        <p className="inline-flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="size-3.5" />{formatDate(n.published_at)}</p>
        <h3 className={`mt-2 font-display font-semibold group-hover:text-primary ${featured ? "text-2xl md:text-3xl" : "line-clamp-2 text-base"}`}>{loc(n, "title")}</h3>
        {loc(n, "description") ? <p className={`mt-2 text-sm text-muted-foreground ${featured ? "line-clamp-4 md:text-base" : "line-clamp-2"}`}>{loc(n, "description")}</p> : null}
      </div>
    </Link>
  );
}

/* --------------------------- VIDEOS / REELS --------------------------- */

export function VideoSection({ videos, title }: { videos: any[]; title: string }) {
  const { lang } = useLang();
  const hi = lang === "hi";
  if (!videos.length) return null;
  return (
    <section className="section-y">
      <div className="container-page">
        <SectionHeading eyebrow={hi ? "देखें" : "Watch"} title={title} action={{ label: hi ? "सभी वीडियो" : "All videos", to: "/videos" }} />
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
  const { loc } = useLang();
  const [play, setPlay] = useState(false);
  const thumb = v.thumbnail || videoThumb(v.platform, v.video_url);
  return (
    <article className="group surface-card overflow-hidden">
      <div className={`relative bg-black ${vertical ? "aspect-[9/16]" : "aspect-video"}`}>
        {play || !thumb ? (
          <iframe src={`${embedUrl(v.platform, v.video_url)}${play && /youtube/.test(embedUrl(v.platform, v.video_url)) ? "?autoplay=1" : ""}`} title={loc(v, "title")} loading="lazy" allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" className="size-full" />
        ) : (
          <button type="button" onClick={() => setPlay(true)} className="zoom-media absolute inset-0 size-full" aria-label={loc(v, "title")}>
            <img src={thumb} alt="" loading="lazy" className="size-full object-cover opacity-90" />
            <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <span className="absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-primary shadow-xl transition group-hover:scale-110">
              <svg viewBox="0 0 24 24" className="ml-1 size-7 fill-current"><path d="M8 5v14l11-7z" /></svg>
            </span>
          </button>
        )}
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 font-display text-sm font-semibold">{loc(v, "title")}</h3>
        {loc(v, "description") ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{loc(v, "description")}</p> : null}
      </div>
    </article>
  );
}

export function ReelSection({ reels, title }: { reels: any[]; title: string }) {
  const { lang } = useLang();
  const hi = lang === "hi";
  if (!reels.length) return null;
  return (
    <section className="bg-secondary/60 section-y">
      <div className="container-page">
        <SectionHeading eyebrow={hi ? "छोटे वीडियो" : "Short videos"} title={title} action={{ label: hi ? "सभी रील्स" : "All reels", to: "/reels" }} />
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
  const { lang } = useLang();
  const hi = lang === "hi";
  if (!campaigns.length) return null;
  return (
    <section className="section-y">
      <div className="container-page">
        <SectionHeading eyebrow={hi ? "अभियान" : "Campaigns"} title={title} subtitle={subtitle} action={{ label: hi ? "सभी अभियान" : "All campaigns", to: "/campaigns" }} />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.slice(0, 3).map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function CampaignCard({ campaign: c }: { campaign: any }) {
  const { lang, loc } = useLang();
  const hi = lang === "hi";
  const target = Number(c.target_amount ?? 0);
  const raised = Number(c.raised_amount ?? 0);
  const pct = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
  const days = c.end_date ? Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 864e5) : null;
  return (
    <Link to="/campaigns/$slug" params={{ slug: c.slug }} className="group surface-card lift-on-hover flex h-full flex-col overflow-hidden">
      <div className="zoom-media relative aspect-[16/9]">
        {c.cover_image ? <img src={c.cover_image} alt="" loading="lazy" className="size-full object-cover" /> : <div className="gradient-teal size-full" />}
        {days != null ? <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold shadow ${days < 0 ? "bg-muted text-muted-foreground" : days <= 7 ? "bg-blood text-blood-foreground" : "bg-background/90 text-foreground backdrop-blur"}`}>{days < 0 ? (hi ? "समाप्त" : "Ended") : days === 0 ? (hi ? "आज अंतिम दिन" : "Last day") : hi ? `${days} दिन बाकी` : `${days} days left`}</span> : null}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-semibold group-hover:text-primary">{loc(c, "title")}</h3>
        {loc(c, "description") ? <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{loc(c, "description")}</p> : null}
        {target > 0 ? (
          <div className="mt-auto pt-5">
            <div className="flex items-baseline justify-between text-sm">
              <span><b className="font-display text-base">{formatCurrency(raised)}</b> <span className="text-muted-foreground">{hi ? "जुटे" : "raised"}</span></span>
              <span className="font-semibold text-primary">{pct}%</span>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
              <div className="gradient-warm h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(pct, 2)}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{hi ? `लक्ष्य ${formatCurrency(target)}` : `Goal ${formatCurrency(target)}`}</p>
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
  const { lang, loc } = useLang();
  if (!testimonials.length) return null;
  return (
    <section className="section-y bg-secondary/40">
      <div className="container-page">
        <SectionHeading eyebrow={lang === "hi" ? "लोगों की बात" : "Voices"} title={title} subtitle={subtitle} />
        <Carousel opts={{ align: "start", loop: testimonials.length > 2 }}>
          <CarouselContent>
            {testimonials.map((t) => (
              <CarouselItem key={t.id} className="md:basis-1/2 lg:basis-1/3">
                <article className="surface-card relative flex h-full flex-col overflow-hidden p-7">
                  <Quote aria-hidden className="absolute -right-2 -top-2 size-24 text-accent/10" />
                  <Quote className="size-7 text-accent" />
                  <p className="mt-4 flex-1 text-base leading-relaxed">{loc(t, "message") || t.message}</p>
                  <div className="mt-6 flex items-center gap-3 border-t border-border pt-4">
                    {t.photo ? <img src={t.photo} alt="" loading="lazy" className="size-12 rounded-full object-cover ring-2 ring-primary-soft" /> : <span className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-deep font-semibold text-primary-foreground">{t.name?.[0] ?? "?"}</span>}
                    <div>
                      <p className="font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{[t.role, t.city].filter(Boolean).join(" · ")}</p>
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
  const { lang } = useLang();
  const hi = lang === "hi";
  return (
    <section className="section-y">
      <div className="container-page">
        <div className="page-hero relative isolate overflow-hidden rounded-3xl px-6 py-12 text-primary-foreground shadow-xl md:px-12">
          <div aria-hidden className="page-hero-pattern absolute inset-0 -z-10" />
          <Heart aria-hidden className="absolute -bottom-8 -right-8 -z-10 size-56 text-white/10" />
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-semibold sm:text-4xl">{title}</h2>
              <p className="mt-3 text-white/85">{text ?? subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/donate" className="inline-flex h-12 items-center rounded-full bg-accent px-7 font-semibold text-accent-foreground shadow-lg hover:opacity-95">{hi ? "दान करें" : "Donate"}</Link>
              <Link to="/campaigns" className="inline-flex h-12 items-center rounded-full bg-white/15 px-7 font-semibold ring-1 ring-white/30 backdrop-blur hover:bg-white/25">{hi ? "अभियान देखें" : "See campaigns"}</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function VolunteerCta({ title, subtitle }: { title: string; subtitle?: string | null }) {
  const { lang } = useLang();
  const hi = lang === "hi";
  const ways = hi ? [["⏱️", "समय दें", "आयोजन, शिविर और सेवा में हाथ बँटाएँ"], ["🧠", "कौशल दें", "पढ़ाना, डिज़ाइन, लेखा, तकनीक"], ["🤝", "जुड़ें", "अपने गाँव-शहर की टीम बनाएँ"]] : [["⏱️", "Give time", "Help at events, camps and seva"], ["🧠", "Share skills", "Teaching, design, accounts, tech"], ["🤝", "Connect", "Build a team in your town"]];
  return (
    <section className="section-y">
      <div className="container-page grid items-center gap-8 md:grid-cols-5">
        <div className="md:col-span-2">
          <p className="eyebrow">{hi ? "हमसे जुड़ें" : "Join us"}</p>
          <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">{title}</h2>
          <p className="mt-3 text-muted-foreground">{subtitle ?? (hi ? "अपना समय, कौशल और मन दीजिए — हमारा लगभग हर काम स्वयंसेवक चलाते हैं।" : "Give your time, skills and heart. Volunteers run almost everything we do.")}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/join" className="inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow hover:opacity-95">{hi ? "स्वयंसेवक बनें" : "Become a volunteer"}</Link>
            <Link to="/internship" className="inline-flex h-11 items-center rounded-full border border-border px-6 text-sm font-semibold hover:border-primary hover:text-primary">{hi ? "इंटर्नशिप के लिए आवेदन" : "Apply for internship"}</Link>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3 md:col-span-3">
          {ways.map(([ic, h, d]) => (
            <div key={h} className="surface-card lift-on-hover p-5">
              <span className="text-3xl">{ic}</span>
              <p className="mt-3 font-display font-semibold">{h}</p>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
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
  const { lang } = useLang();
  const hi = lang === "hi";
  return (
    <section className="bg-secondary/60 section-y">
      <div className="container-page grid gap-6 md:grid-cols-2">
        <div>
          <p className="eyebrow">{hi ? "संपर्क" : "Contact"}</p>
          <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">{title}</h2>
          <p className="mt-3 text-muted-foreground">{subtitle ?? (hi ? "हमें आपसे बात करके खुशी होगी।" : "We would love to hear from you.")}</p>
          <div className="mt-5 space-y-3 text-sm">
            {org?.phone ? <p className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary-deep"><Phone className="size-4" /></span><a href={telHref(org.phone)} className="font-medium hover:underline">{org.phone}</a></p> : null}
            {org?.address ? <p className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-deep"><MapPin className="size-4" /></span><span>{[org.address, org.city, org.state, org.pincode].filter(Boolean).join(", ")}</span></p> : null}
          </div>
        </div>
        <div className="surface-card flex flex-col justify-center gap-4 p-6 md:p-8">
          <p className="text-muted-foreground">{hi ? "कोई सवाल, ज़रूरत, या हमारे साथ कोई सेवा कार्य करना चाहते हैं?" : "Have a question, a requirement, or want to organise a seva activity with us?"}</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/contact" className="inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground hover:opacity-95">{hi ? "संदेश भेजें" : "Send us a message"}</Link>
            {org?.whatsapp || org?.phone ? <a href={whatsappHref(org.whatsapp ?? org.phone)} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full bg-[#25D366] px-6 text-sm font-semibold text-white hover:opacity-90"><MessageCircle className="size-4" />WhatsApp</a> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
