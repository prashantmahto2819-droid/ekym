// Umbrella home sections: member organizations of the platform and their public activity.
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { SectionHeading } from "@/components/site/SectionHeading";
import { useLang } from "@/core/i18n";
import { networkQuery } from "@/lib/queries";
import type { Network, NetworkItem, NetworkOrg } from "@/lib/public.functions";

const KIND: Record<string, [string, string]> = { samaj: ["Samaj", "समाज"], foundation: ["Foundation", "फ़ाउंडेशन"], trust: ["Trust", "ट्रस्ट"], committee: ["Committee", "समिति"], association: ["Association", "संघ"], youth_wing: ["Youth wing", "युवा मंच"], women_wing: ["Women's wing", "महिला मंच"], business: ["Business body", "व्यापार मंडल"], other: ["Organization", "संस्था"] };

export function orgUrl(o: { hostname: string | null; slug: string }, path = "") {
  return o.hostname ? `https://${o.hostname}${path}` : `/p/${o.slug}${path}`;
}

export function OrgCard({ o }: { o: NetworkOrg }) {
  const { lang } = useLang();
  const hi = lang === "hi";
  const name = hi && o.name_hi ? o.name_hi : o.name;
  const place = [o.city, o.district, o.state].filter(Boolean).join(", ");
  return (
    <a href={orgUrl(o)} className="surface-card lift-on-hover flex gap-4 p-5">
      {o.logo ? <img src={o.logo} alt="" className="size-14 shrink-0 rounded-lg object-contain" /> : <span className="bg-primary-soft text-primary-deep grid size-14 shrink-0 place-items-center rounded-lg font-display text-xl font-semibold">{name.slice(0, 1)}</span>}
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{(KIND[o.kind] ?? KIND["other"]!)[hi ? 1 : 0]}{place ? ` · ${place}` : ""}</p>
        <h3 className="font-display text-lg font-semibold leading-tight">{name}</h3>
        {o.tagline || o.tagline_hi ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{hi && o.tagline_hi ? o.tagline_hi : o.tagline}</p> : null}
        <p className="mt-2 text-xs text-muted-foreground">{o.members ? `${o.members} ${hi ? "सदस्य" : "members"} · ` : ""}{o.events ? `${o.events} ${hi ? "आयोजन" : "events"} · ` : ""}{o.hostname ?? ""}</p>
      </div>
    </a>
  );
}

export function NetworkSection({ title, subtitle, limit = 6 }: { title: string; subtitle?: string | null; limit?: number }) {
  const { lang } = useLang();
  const hi = lang === "hi";
  const q = useQuery(networkQuery());
  const orgs = q.data?.orgs ?? [];
  if (!orgs.length) return null;
  return (
    <section className="section-y">
      <div className="container-page">
        <SectionHeading eyebrow={`${orgs.length} ${hi ? "संस्थाएँ" : "organizations"}`} title={title} subtitle={subtitle} action={orgs.length > limit ? { label: hi ? "सभी देखें" : "View all", to: "/organizations" } : undefined} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{orgs.slice(0, limit).map((o) => <OrgCard key={o.id} o={o} />)}</div>
        <p className="mt-6 text-sm text-muted-foreground">{hi ? "आपकी समिति / संस्था भी इस मंच पर अपनी वेबसाइट, सदस्य, आयोजन और लेखा चला सकती है — " : "Your samiti or sanstha can run its website, members, events and accounts on this platform too — "}<Link to="/contact" className="underline">{hi ? "संपर्क करें" : "get in touch"}</Link>.</p>
      </div>
    </section>
  );
}

function ItemCard({ it, kind }: { it: NetworkItem; kind: "events" | "news" | "campaigns" | "seva" }) {
  const { lang } = useLang();
  const hi = lang === "hi";
  const title = (hi && (it.title_hi || it.name_hi)) || it.title || it.name || "";
  const img = it.cover_image || it.thumbnail || it.featured_image;
  const path = kind === "events" ? `/events/${it.slug}` : kind === "news" ? `/news/${it.slug}` : kind === "campaigns" ? `/campaigns/${it.slug}` : `/seva/${it.slug}`;
  const when = it.starts_at ? new Date(it.starts_at).toLocaleString(hi ? "hi-IN" : "en-IN", { dateStyle: "medium", timeStyle: "short" }) : it.published_at ? new Date(it.published_at).toLocaleDateString(hi ? "hi-IN" : "en-IN", { dateStyle: "medium" }) : null;
  return (
    <a href={orgUrl({ hostname: it.hostname, slug: it.org_slug }, path)} className="surface-card lift-on-hover overflow-hidden">
      {img ? <img src={img} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" /> : null}
      <div className="p-4">
        <p className="text-xs uppercase tracking-wide text-primary">{hi && it.org_hi ? it.org_hi : it.org}</p>
        <h3 className="mt-1 font-display text-base font-semibold leading-tight">{title}</h3>
        {when ? <p className="mt-1 text-xs text-muted-foreground">{when}{it.venue ? ` · ${it.venue}` : ""}</p> : null}
        {kind === "campaigns" && it.target_amount ? <p className="mt-1 text-xs text-muted-foreground">₹{Number(it.raised_amount ?? 0).toLocaleString("en-IN")} / ₹{Number(it.target_amount).toLocaleString("en-IN")}</p> : null}
        {kind === "seva" && (it.short_description || it.short_description_hi) ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{hi && it.short_description_hi ? it.short_description_hi : it.short_description}</p> : null}
      </div>
    </a>
  );
}

export function ActivitiesSection({ title, subtitle }: { title: string; subtitle?: string | null }) {
  const { lang } = useLang();
  const hi = lang === "hi";
  const q = useQuery(networkQuery());
  const d: Network | undefined = q.data;
  if (!d) return null;
  const groups: [string, NetworkItem[], "events" | "news" | "campaigns" | "seva"][] = [
    [hi ? "आगामी आयोजन" : "Upcoming events", d.events, "events"],
    [hi ? "समाचार" : "News", d.news, "news"],
    [hi ? "अभियान" : "Campaigns", d.campaigns, "campaigns"],
    [hi ? "सेवा प्रकल्प" : "Seva projects", d.seva, "seva"],
  ];
  if (!groups.some(([, items]) => items.length)) return null;
  return (
    <section className="section-y bg-secondary/40">
      <div className="container-page">
        <SectionHeading title={title} subtitle={subtitle} />
        {groups.filter(([, items]) => items.length).map(([label, items, kind]) => (
          <div key={kind} className="mt-6">
            <h3 className="mb-3 font-display text-lg font-semibold">{label}</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{items.slice(0, 4).map((it) => <ItemCard key={it.id} it={it} kind={kind} />)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
