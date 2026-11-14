import { useTenant } from "@/core/tenant-context";
import { useLang } from "@/core/i18n";
import { moduleOn } from "@/core/modules";
import { RichText } from "@/components/site/Blocks";
import { Committees } from "@/components/site/Committees";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { CalendarDays, Droplet, Facebook, HandHeart, HeartHandshake, Instagram, Send, ShieldCheck, Sprout, TreePine, Twitter, UserCheck, Users, Youtube } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { pageMeta } from "@/core/seo";

import { PageHeader } from "@/components/site/PageHeader";
import { SectionHeading } from "@/components/site/SectionHeading";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { organizationQuery, sevaListQuery } from "@/lib/queries";

export const Route = createFileRoute("/about")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(organizationQuery()),
      context.queryClient.ensureQueryData(sevaListQuery()),
    ]);
  },
  head: ({ matches }) => pageMeta(matches, { en: "About us", hi: "हमारे बारे में" }, { en: "Who we are, our objectives, office bearers and how the organization works.", hi: "हम कौन हैं, हमारे उद्देश्य, पदाधिकारी और संगठन की कार्यप्रणाली।" }),
  component: AboutPage,
});

const values = [
  { icon: HeartHandshake, en: ["Seva first", "We serve without asking for identity, religion, caste or documents."], hi: ["सेवा सर्वोपरि", "सेवा में पहचान, धर्म, जाति या कागज़ नहीं पूछे जाते।"] },
  { icon: ShieldCheck, en: ["Transparency", "Every requirement is verified and every contribution is recorded."], hi: ["पारदर्शिता", "हर ज़रूरत की जाँच होती है और हर सहयोग का हिसाब रखा जाता है।"] },
  { icon: Users, en: ["Volunteer-led", "Our teams are ordinary people who give a few hours every week."], hi: ["स्वयंसेवकों से चलता", "हमारी टीम आम लोग हैं जो हर हफ़्ते कुछ घंटे देते हैं।"] },
  { icon: HandHeart, en: ["Dignity", "People we serve are guests, never beneficiaries on a list."], hi: ["सम्मान", "जिनकी सेवा करते हैं वे हमारे अतिथि हैं, सूची के नाम नहीं।"] },
];

type Counts = { members: number; families: number; people: number; events: number; seva: number; donors: number };

function AboutPage() {
  const { data: org } = useSuspenseQuery(organizationQuery());
  const tenant = useTenant();
  const { data: seva } = useSuspenseQuery(sevaListQuery());
  const { lang } = useLang();
  const hi = lang === "hi";
  const counts = useQuery({ queryKey: ["public_counts", tenant.organization_id], queryFn: async () => { const { data } = await supabase.rpc("k1_public_counts" as never, { p_org: tenant.organization_id } as never); return (data ?? null) as Counts | null; } });
  const name = (hi && org?.organization_name_hi) || org?.organization_name || (hi && tenant.name_hi) || tenant.name;
  const tagline = (hi && org?.tagline_hi) || org?.tagline;
  const c = counts.data;
  const stats = c ? [
    { icon: UserCheck, n: c.members, l: hi ? "सदस्य" : "Members" },
    { icon: TreePine, n: c.families, l: hi ? "परिवार (वंश वृक्ष)" : "Families (family tree)" },
    { icon: Users, n: c.people, l: hi ? "वंश वृक्ष में लोग" : "People in family trees" },
    { icon: CalendarDays, n: c.events, l: hi ? "आयोजन" : "Events" },
    { icon: Sprout, n: c.seva || seva.length, l: hi ? "सेवा प्रकल्प" : "Seva projects" },
    { icon: Droplet, n: c.donors, l: hi ? "रक्तदाता" : "Blood donors" },
  ].filter((s) => s.n > 0) : [];
  const social = [
    { href: org?.facebook, icon: Facebook, label: "Facebook" }, { href: org?.instagram, icon: Instagram, label: "Instagram" },
    { href: org?.youtube, icon: Youtube, label: "YouTube" }, { href: org?.x, icon: Twitter, label: "X" }, { href: org?.telegram, icon: Send, label: "Telegram" },
  ].filter((s) => !!s.href);

  return (
    <>
      <PageHeader title={hi ? `${name} के बारे में` : `About ${name}`} description={tagline ?? undefined} crumbs={[{ label: hi ? "हमारे बारे में" : "About" }]} />

      {stats.length ? (
        <section className="container-page -mt-6 relative z-10">
          <div className="flex flex-wrap justify-evenly gap-3 rounded-2xl border border-border bg-card p-4 shadow-lg">
            {stats.map((s) => (
              <div key={s.l} className="flex min-w-[120px] flex-1 flex-col items-center gap-1 rounded-xl p-2 text-center sm:flex-none">
                <span className="bg-primary-soft text-primary-deep grid size-10 place-items-center rounded-full"><s.icon className="size-5" /></span>
                <CountUp n={s.n} className="font-display text-2xl font-semibold tabular-nums" />
                <span className="text-xs text-muted-foreground">{s.l}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="section-y">
        <div className="container-page grid gap-10 lg:grid-cols-[2fr_1fr]">
          <div>
            {(hi && org?.about_long_hi) || org?.about_long ? (
              <RichText text={(hi && org?.about_long_hi) || org?.about_long || ""} />
            ) : (
              <div className="prose-content">
                <p>{(hi && org?.about_short_hi) || org?.about_short || (hi ? `${name} एक सामाजिक संगठन है। इसका परिचय एडमिन पैनल (संगठन सेटिंग → हमारे बारे में) से लिखा जा सकता है।` : `${name} is a community organisation. Its introduction can be written from the admin panel (Organization settings → About us).`)}</p>
                {seva.length ? <p>{hi ? `हमारा काम ${seva.length} सेवा प्रकल्पों में बँटा है।` : `Our work is organised into ${seva.length} seva prakalp.`}</p> : null}
              </div>
            )}
            <Committees />
          </div>
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <div className="surface-card p-6">
              <h2 className="font-display text-lg font-semibold">{hi ? "हमसे जुड़िए" : "Get involved"}</h2>
              <div className="mt-4 flex flex-col gap-2">
                <Button asChild><Link to="/join">{hi ? "सदस्य बनें" : "Become a member"}</Link></Button>
                {moduleOn(tenant.branding, "donate") ? <Button asChild variant="outline"><Link to="/donate">{hi ? "दान करें" : "Donate"}</Link></Button> : null}
                <Button asChild variant="outline"><Link to="/team">{hi ? "हमारी टीम" : "Our team"}</Link></Button>
                <Button asChild variant="outline"><Link to="/contact">{hi ? "संपर्क करें" : "Contact us"}</Link></Button>
              </div>
            </div>
            {social.length ? (
              <div className="surface-card p-5">
                <p className="text-sm font-semibold">{hi ? "सोशल मीडिया पर" : "Follow us"}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {social.map((s) => <Button key={s.label} asChild variant="outline" size="icon" className="rounded-full" title={s.label}><a href={s.href!} target="_blank" rel="noreferrer"><s.icon className="size-4" /></a></Button>)}
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </section>

      {seva.length ? (
        <section className="section-y">
          <div className="container-page">
            <SectionHeading eyebrow={hi ? "हमारा काम" : "Our work"} title={hi ? "सेवा प्रकल्प" : "Seva projects"} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {seva.slice(0, 8).map((s: { id: string; slug: string; name: string; name_hi?: string | null; short_description?: string | null; short_description_hi?: string | null; featured_image?: string | null }) => (
                <Link key={s.id} to="/seva/$slug" params={{ slug: s.slug }} className="surface-card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
                  {s.featured_image ? <img src={s.featured_image} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" /> : <div className="aspect-[16/9] w-full bg-gradient-to-br from-primary/20 to-amber-200/40" />}
                  <div className="p-3"><p className="font-semibold group-hover:text-primary">{(hi && s.name_hi) || s.name}</p>{(hi && s.short_description_hi) || s.short_description ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{(hi && s.short_description_hi) || s.short_description}</p> : null}</div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="bg-secondary/60 section-y">
        <div className="container-page">
          <SectionHeading eyebrow={hi ? "हमारी राह" : "What guides us"} title={hi ? "हमारे मूल्य" : "Our values"} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => {
              const [t, d] = hi ? v.hi : v.en;
              return (
                <article key={v.en[0]} className="surface-card p-5">
                  <span className="bg-primary-soft text-primary-deep flex size-11 items-center justify-center rounded-lg"><v.icon className="size-5" /></span>
                  <h3 className="mt-4 font-display text-base font-semibold">{t}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{d}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}

/** Counts up once when it scrolls into view. */
function CountUp({ n, className }: { n: number; className?: string }) {
  const [v, setV] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let raf = 0;
    const run = () => { const t0 = performance.now(); const step = (t: number) => { const p = Math.min(1, (t - t0) / 900); setV(Math.round(n * (1 - (1 - p) ** 3))); if (p < 1) raf = requestAnimationFrame(step); }; raf = requestAnimationFrame(step); };
    if (typeof IntersectionObserver === "undefined") { setV(n); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); run(); } });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [n]);
  return <span ref={ref} className={className}>{v.toLocaleString("en-IN")}</span>;
}
