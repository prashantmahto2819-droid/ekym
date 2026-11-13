// Member dashboard: who I am, how complete my profile is, quick numbers, shortcuts to everything I use,
// my certificates and applications, and account actions.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Award, Bell, BookUser, CalendarDays, ChevronRight, Droplet, GraduationCap, Heart, LogOut, MessageCircle, Network, PenLine, ShieldCheck, UserRound, Users,
} from "lucide-react";
import type { ReactNode } from "react";

import { Avatar } from "@/components/community/ChatBits";
import { sb } from "@/components/exams/db";
import { useLang } from "@/core/i18n";
import { moduleOn } from "@/core/modules";
import { siteName } from "@/core/seo";
import { useTenant } from "@/core/tenant-context";
import { call, useChatUnread, useProfile } from "@/community/chat";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/account")({
  head: ({ matches }) => ({
    meta: [
      { title: `My account — ${siteName(matches)}` },
      { name: "description", content: `Your ${siteName(matches)} account and activity.` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

type Cert = { id: string; track: string; track_hi: string | null; level: number; passed: boolean | null; token: string | null; submitted_at: string | null; percent: number | null };
const ROLE_HI: Record<string, string> = { member: "सदस्य", org_admin: "संस्था एडमिन", super_admin: "मुख्य एडमिन", admin: "एडमिन", editor: "संपादक", moderator: "मॉडरेटर", accountant: "लेखापाल", volunteer: "स्वयंसेवक", platform_admin: "मंच एडमिन" };
const STATUS_HI: Record<string, string> = { new: "नया", submitted: "जमा", pending: "बाकी", approved: "मंज़ूर", selected: "चयनित", shortlisted: "चयन सूची में", rejected: "अस्वीकार", contacted: "संपर्क किया" };

function AccountPage() {
  const { user, currentOrg, isStaff, signOut } = useAuth();
  const tenant = useTenant();
  const { lang } = useLang();
  const hi = lang === "hi";
  const on = (m: string) => moduleOn(tenant.branding, m);
  const roles = currentOrg?.role_keys ?? [];
  const p = useProfile(user?.id ?? null);
  const unread = useChatUnread(on("community"));
  const fam = useQuery({ queryKey: ["my_family"], enabled: !!user, queryFn: () => call<{ members: unknown[] } | null>("k1_my_family").catch(() => null) });
  const certs = useQuery({ queryKey: ["ex_level_my"], enabled: !!user, queryFn: async () => { const { data } = await sb.rpc("ex_level_my"); return (data ?? []) as Cert[]; } });
  const apps = useQuery({
    queryKey: ["my-applications", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [volunteer, intern] = await Promise.all([
        supabase.from("volunteer_applications").select("id,application_id,status,created_at").eq("user_id", user!.id),
        supabase.from("intern_applications").select("id,application_id,status,created_at").eq("user_id", user!.id),
      ]);
      return [...(volunteer.data ?? []).map((a) => ({ ...a, kind: "v" })), ...(intern.data ?? []).map((a) => ({ ...a, kind: "i" }))];
    },
  });

  const pr = p.data;
  const name = pr && pr.name !== "Member" ? pr.name : user?.email?.split("@")[0] ?? "";
  const checks = pr ? [!!pr.photo_url, !!pr.bio, !!pr.village, !!pr.district, !!pr.occupation, (pr.interests ?? []).length > 0, pr.name !== "Member"] : [];
  const pct = checks.length ? Math.round((checks.filter(Boolean).length / checks.length) * 100) : 0;
  const passed = (certs.data ?? []).filter((c) => c.passed && c.token);
  const hour = new Date().getHours();
  const greet = hi ? (hour < 12 ? "सुप्रभात" : hour < 17 ? "नमस्कार" : "शुभ संध्या") : hour < 12 ? "Good morning" : hour < 17 ? "Hello" : "Good evening";

  const tiles: { to: string; icon: ReactNode; hi: string; en: string; mod?: string; badge?: number | undefined; ext?: boolean }[] = [
    { to: "/me/profile", icon: <UserRound />, hi: "मेरी प्रोफ़ाइल", en: "My profile" },
    { to: "/my-family", icon: <Users />, hi: "मेरा परिवार", en: "My family" },
    { to: "/community/chat", icon: <MessageCircle />, hi: "समुदाय चैट", en: "Community chat", mod: "community", badge: unread.data ?? 0 },
    { to: "/exams/levels", icon: <GraduationCap />, hi: "परीक्षा व प्रमाण-पत्र", en: "Exams & certificates", mod: "exam" },
    { to: "/matrimony", icon: <Heart />, hi: "विवाह प्रोफ़ाइल", en: "Matrimony", mod: "matrimony" },
    { to: "/donations", icon: <BookUser />, hi: "मेरे दान व रसीदें", en: "My donations", mod: "donate" },
    { to: "/events", icon: <CalendarDays />, hi: "आयोजन", en: "Events", mod: "events" },
    { to: "/blood", icon: <Droplet />, hi: "रक्त सेवा", en: "Blood seva", mod: "blood" },
    { to: "/me/notifications", icon: <Bell />, hi: "सूचना सेटिंग", en: "Notification settings" },
    { to: "https://shokpatra.kalchuri.org/app.html", icon: <Network />, hi: "वंश वृक्ष / शोकपत्र", en: "Family tree / shokpatra", mod: "shok", ext: true },
  ];

  return (
    <>
      <header className="page-hero relative isolate overflow-hidden text-white">
        <div aria-hidden className="page-hero-pattern absolute inset-0 -z-10" />
        <div aria-hidden className="absolute -right-24 -top-24 -z-10 size-80 rounded-full bg-accent/30 blur-3xl" />
        <div className="container-page flex flex-col gap-6 pb-20 pt-10 md:flex-row md:items-center md:pb-24">
          <span className="w-fit rounded-full bg-white/20 p-1 ring-2 ring-white/40"><Avatar url={pr?.photo_url ?? null} name={name || "?"} size={20} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-white/80">{greet},</p>
            <h1 className="truncate font-display text-3xl font-semibold md:text-4xl">{name}</h1>
            <p className="mt-1 text-sm text-white/75">{[pr?.occupation, pr?.village, pr?.district].filter(Boolean).join(" · ") || user?.email}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(roles.length ? roles : ["member"]).map((r) => <span key={r} className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs ring-1 ring-white/25">{hi ? ROLE_HI[r.toLowerCase()] ?? r.replaceAll("_", " ").toLowerCase() : r === "member" ? "Member" : r.replaceAll("_", " ").toLowerCase()}</span>)}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isStaff ? <Link to="/admin" className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-primary-deep shadow-lg hover:bg-white/90"><ShieldCheck className="size-4" />{hi ? "एडमिन पैनल" : "Admin panel"}</Link> : null}
            <Link to="/me/profile" className="inline-flex h-11 items-center gap-2 rounded-full bg-white/15 px-5 text-sm font-semibold ring-1 ring-white/30 backdrop-blur hover:bg-white/25"><PenLine className="size-4" />{hi ? "प्रोफ़ाइल बदलें" : "Edit profile"}</Link>
          </div>
        </div>
      </header>

      <section className="relative z-10 -mt-12 pb-16">
        <div className="container-page space-y-6">
          {/* numbers */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label={hi ? "प्रोफ़ाइल पूरी" : "Profile complete"} value={`${pct}%`} bar={pct} to="/me/profile" />
            <Stat label={hi ? "परिवार के सदस्य" : "Family members"} value={fam.data?.members?.length ?? "—"} to="/my-family" />
            <Stat label={hi ? "प्रमाण-पत्र" : "Certificates"} value={passed.length} to="/exams/levels" />
            <Stat label={hi ? "नए संदेश" : "Unread messages"} value={unread.data ?? 0} to="/community/chat" highlight={(unread.data ?? 0) > 0} />
          </div>

          {pct < 100 && pr ? (
            <Link to="/me/profile" className="flex items-center gap-4 rounded-2xl border border-accent/40 bg-accent-soft p-4 transition hover:shadow-md">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground"><UserRound className="size-5" /></span>
              <span className="min-w-0 flex-1"><b className="block">{hi ? "अपनी प्रोफ़ाइल पूरी करें" : "Complete your profile"}</b><span className="text-sm text-muted-foreground">{hi ? "फोटो, परिचय, गाँव और व्यवसाय जोड़ने से समाज के लोग आपको आसानी से पहचान पाएँगे।" : "Add a photo, bio, village and occupation so people can find you."}</span></span>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
            </Link>
          ) : null}

          {/* shortcuts */}
          <div>
            <h2 className="mb-3 font-display text-lg font-semibold">{hi ? "मेरी सुविधाएँ" : "My shortcuts"}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {tiles.filter((t) => !t.mod || on(t.mod)).map((t) => {
                const inner = (
                  <>
                    <span className="relative grid size-11 place-items-center rounded-xl bg-primary-soft text-primary-deep transition group-hover:bg-primary group-hover:text-primary-foreground [&>svg]:size-5">
                      {t.icon}
                      {t.badge ? <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-blood px-1 text-[10px] font-bold text-blood-foreground">{t.badge}</span> : null}
                    </span>
                    <span className="text-sm font-medium leading-snug">{hi ? t.hi : t.en}{t.ext ? " ↗" : ""}</span>
                  </>
                );
                const cls = "group surface-card lift-on-hover flex flex-col items-start gap-3 p-4";
                return t.ext ? <a key={t.to} href={t.to} className={cls}>{inner}</a> : <Link key={t.to} to={t.to} className={cls}>{inner}</Link>;
              })}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* certificates */}
            <div className="surface-card p-6">
              <div className="flex items-center justify-between"><h2 className="font-display text-lg font-semibold">{hi ? "मेरे प्रमाण-पत्र" : "My certificates"}</h2><Award className="size-5 text-accent" /></div>
              {passed.length ? (
                <ul className="mt-3 divide-y divide-border">
                  {passed.slice(0, 5).map((c) => (
                    <li key={c.id}><Link to="/exams/levels/cert/$token" params={{ token: c.token! }} className="flex items-center gap-3 py-2.5 hover:text-primary">
                      <span className="grid size-9 place-items-center rounded-full bg-accent-soft font-display text-sm font-bold text-accent">{c.level}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{(hi && c.track_hi) || c.track}</span><span className="text-xs text-muted-foreground">{c.percent}% · {formatDate(c.submitted_at ?? "")}</span></span>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </Link></li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">{hi ? "अभी कोई प्रमाण-पत्र नहीं। " : "No certificates yet. "}<Link to="/exams/levels" className="font-medium text-primary hover:underline">{hi ? "स्तर परीक्षा दें ›" : "Take a level test ›"}</Link></p>
              )}
            </div>

            {/* applications */}
            <div className="surface-card p-6">
              <h2 className="font-display text-lg font-semibold">{hi ? "मेरे आवेदन" : "My applications"}</h2>
              {apps.isLoading ? <p className="mt-3 text-sm text-muted-foreground">{hi ? "लोड हो रहा है…" : "Loading…"}</p>
                : !(apps.data ?? []).length ? <p className="mt-3 text-sm text-muted-foreground">{hi ? "इस खाते से कोई आवेदन नहीं जुड़ा। " : "No applications linked to this account yet. "}<Link to="/volunteer" className="font-medium text-primary hover:underline">{hi ? "स्वयंसेवक बनें ›" : "Apply to volunteer ›"}</Link></p>
                : (
                  <ul className="mt-3 divide-y divide-border text-sm">
                    {(apps.data ?? []).map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                        <span>{a.kind === "v" ? (hi ? "स्वयंसेवक" : "Volunteer") : (hi ? "इंटर्नशिप" : "Internship")} · <span className="text-muted-foreground">{a.application_id ?? "—"}</span></span>
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">{hi ? STATUS_HI[a.status] ?? a.status : a.status} · {formatDate(a.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
            <span className="text-muted-foreground">{hi ? "लॉगिन:" : "Signed in as"} <b className="text-foreground">{user?.email}</b></span>
            <button type="button" onClick={signOut} className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 hover:border-destructive hover:text-destructive"><LogOut className="size-4" />{hi ? "लॉग आउट" : "Sign out"}</button>
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({ label, value, to, bar, highlight }: { label: string; value: ReactNode; to: string; bar?: number; highlight?: boolean }) {
  return (
    <Link to={to} className={`surface-card lift-on-hover p-4 ${highlight ? "ring-2 ring-blood/50" : ""}`}>
      <p className="font-display text-3xl font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      {bar != null ? <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-gradient-to-r from-accent to-primary" style={{ width: `${bar}%` }} /></div> : null}
    </Link>
  );
}
