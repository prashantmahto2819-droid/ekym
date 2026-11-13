// Facebook-style frame for the community pages: left shortcuts menu, centre column (feed), right rail with
// friend requests, birthdays, people you may know, who's online and sponsors. On phones the rails fold into a
// shortcut strip on top and a "people you may know" strip inside the feed.
import { Link, useLocation } from "@tanstack/react-router";
import { BookOpen, Briefcase, CalendarDays, Droplet, Heart, Home, Images, MessageCircle, Megaphone, Store, Network, User, Users, Vote, type LucideIcon } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { Avatar, FriendButton } from "@/components/community/ChatBits";
import { OccasionsCard } from "@/components/community/Occasions";
import { SponsoredCard, useBoard } from "@/components/site/SponsoredBoard";
import { useChatUnread, useFriendRequests, useMe, usePeople, useRecommendations } from "@/community/chat";
import { useLang } from "@/core/i18n";
import { moduleOn } from "@/core/modules";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

type Short = { to: string; icon: LucideIcon; hi: string; en: string; tone: string; mod?: string; badge?: number };

function useShortcuts(): Short[] {
  const tenant = useTenant();
  const { user, orgs } = useAuth();
  const on = !!user && orgs.length > 0;
  const unread = useChatUnread(on);
  const list: Short[] = [
    { to: "/community", icon: Home, hi: "समुदाय फ़ीड", en: "Feed", tone: "from-sky-500 to-blue-600" },
    { to: "/community/chat", icon: MessageCircle, hi: "चैट व मित्र", en: "Chat & friends", tone: "from-violet-500 to-fuchsia-600", badge: unread.data ?? 0 },
    { to: "/me/profile", icon: User, hi: "मेरी प्रोफ़ाइल", en: "My profile", tone: "from-teal-500 to-emerald-600" },
    { to: "/my-family", icon: Network, hi: "मेरा परिवार", en: "My family", tone: "from-amber-500 to-orange-600" },
    { to: "/business", icon: Store, hi: "व्यापार", en: "Business", tone: "from-amber-500 to-orange-600", mod: "directory" },
    { to: "/events", icon: CalendarDays, hi: "आयोजन", en: "Events", tone: "from-rose-500 to-red-600", mod: "events" },
    { to: "/polls", icon: Vote, hi: "मतदान", en: "Polls", tone: "from-indigo-500 to-blue-700", mod: "polls" },
    { to: "/matrimony", icon: Heart, hi: "विवाह", en: "Matrimony", tone: "from-pink-500 to-rose-600", mod: "matrimony" },
    { to: "/blood", icon: Droplet, hi: "रक्त सहायता", en: "Blood help", tone: "from-red-500 to-red-700", mod: "blood" },
    { to: "/jobs", icon: Briefcase, hi: "रोज़गार", en: "Jobs", tone: "from-slate-500 to-slate-700", mod: "directory" },
    { to: "/directory", icon: Users, hi: "निर्देशिका", en: "Directory", tone: "from-cyan-500 to-sky-700", mod: "directory" },
    { to: "/gallery", icon: Images, hi: "गैलरी", en: "Gallery", tone: "from-lime-500 to-green-700", mod: "gallery" },
    { to: "/magazine", icon: BookOpen, hi: "पत्रिका", en: "Magazine", tone: "from-yellow-500 to-amber-700", mod: "magazine" },
    { to: "/sponsored", icon: Megaphone, hi: "प्रायोजित", en: "Sponsored", tone: "from-zinc-400 to-zinc-600" },
  ];
  return list.filter((s) => (!s.mod || moduleOn(tenant.branding, s.mod)) && (on || !["/me/profile", "/my-family", "/community/chat"].includes(s.to)));
}

const box = "rounded-2xl bg-card p-3 shadow-sm ring-1 ring-border/70";
const RailTitle = ({ children, to, more }: { children: ReactNode; to?: string; more?: string }) => (
  <div className="mb-1.5 flex items-center justify-between px-1"><p className="text-[15px] font-semibold text-muted-foreground">{children}</p>{to && more ? <Link to={to} className="text-xs font-medium text-primary hover:underline">{more}</Link> : null}</div>
);

function LeftRail() {
  const { lang } = useLang();
  const L = lang === "hi";
  const { user } = useAuth();
  const { me } = useMe();
  const path = useLocation({ select: (l) => l.pathname });
  const items = useShortcuts();
  return (
    <nav aria-label={L ? "समुदाय मेनू" : "Community menu"} className="space-y-0.5">
      {user && me ? (
        <Link to="/u/$id" params={{ id: me.id }} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-card">
          <Avatar url={me.photo} name={me.name} size={9} /><span className="truncate font-semibold">{me.name}</span>
        </Link>
      ) : null}
      {items.map((s) => (
        <Link key={s.to} to={s.to} className={`flex items-center gap-3 rounded-xl px-2 py-1.5 text-[15px] transition hover:bg-card ${path === s.to ? "bg-card font-semibold shadow-sm" : ""}`}>
          <span className={`grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br text-white ${s.tone}`}><s.icon className="size-[18px]" /></span>
          <span className="min-w-0 flex-1 truncate">{L ? s.hi : s.en}</span>
          {s.badge ? <span className="rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white">{s.badge}</span> : null}
        </Link>
      ))}
      <p className="px-2 pt-4 text-[11px] leading-relaxed text-muted-foreground">
        <Link to="/privacy-policy" className="hover:underline">{L ? "गोपनीयता" : "Privacy"}</Link> · <Link to="/contact" className="hover:underline">{L ? "संपर्क" : "Contact"}</Link> · Kalchuri One © {new Date().getFullYear()}
      </p>
    </nav>
  );
}

/** Horizontal shortcut chips for phones (the left menu is hidden there). */
function ShortcutStrip() {
  const { lang } = useLang();
  const L = lang === "hi";
  const path = useLocation({ select: (l) => l.pathname });
  const items = useShortcuts();
  return (
    <div className="scrollbar-none -mx-3 mb-3 flex gap-2 overflow-x-auto px-3 lg:hidden">
      {items.map((s) => (
        <Link key={s.to} to={s.to} className={`flex shrink-0 items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-sm shadow-sm ring-1 ring-border/70 ${path === s.to ? "bg-primary text-primary-foreground" : "bg-card"}`}>
          <span className={`grid size-7 place-items-center rounded-full bg-gradient-to-br text-white ${s.tone}`}><s.icon className="size-3.5" /></span>
          {L ? s.hi : s.en}{s.badge ? <span className="rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{s.badge}</span> : null}
        </Link>
      ))}
    </div>
  );
}

function FriendRequests({ L }: { L: boolean }) {
  const q = useFriendRequests(true);
  const rows = (q.data ?? []).filter((r) => r.direction === "in").slice(0, 3);
  if (!rows.length) return null;
  return (
    <section className={box}>
      <RailTitle to="/community/chat" more={L ? "सभी देखें" : "See all"}>{L ? "मित्रता अनुरोध" : "Friend requests"}</RailTitle>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.user_id} className="flex gap-2.5 rounded-xl p-1">
            <Link to="/u/$id" params={{ id: r.user_id }}><Avatar url={r.photo_url} name={r.name} size={12} /></Link>
            <div className="min-w-0 flex-1">
              <p className="flex justify-between gap-2"><Link to="/u/$id" params={{ id: r.user_id }} className="truncate text-sm font-semibold hover:underline">{r.name}</Link></p>
              <p className="truncate text-xs text-muted-foreground">{r.mutual ? (L ? `${r.mutual} साझा मित्र` : `${r.mutual} mutual friends`) : r.org_names}</p>
              <div className="mt-1"><FriendButton userId={r.user_id} status="pending_in" L={L} /></div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PeopleYouMayKnow({ L }: { L: boolean }) {
  const q = useRecommendations(true);
  const rows = (q.data ?? []).slice(0, 4);
  if (!rows.length) return null;
  return (
    <section className={box}>
      <RailTitle to="/community/chat" more={L ? "और" : "More"}>{L ? "जिन्हें आप जानते होंगे" : "People you may know"}</RailTitle>
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.user_id} className="flex items-center gap-2.5 rounded-xl p-1">
            <Link to="/u/$id" params={{ id: r.user_id }}><Avatar url={r.photo_url} name={r.name} size={10} online={r.online} /></Link>
            <div className="min-w-0 flex-1">
              <Link to="/u/$id" params={{ id: r.user_id }} className="block truncate text-sm font-semibold hover:underline">{r.name}</Link>
              <p className="truncate text-xs text-muted-foreground">{r.mutual ? (L ? `${r.mutual} साझा मित्र` : `${r.mutual} mutual`) : (r.why ?? r.village ?? r.org_names ?? "")}</p>
            </div>
            <FriendButton userId={r.user_id} status="none" L={L} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Same, as swipeable cards inside the feed on phones. */
export function PeopleStrip() {
  const { lang } = useLang();
  const L = lang === "hi";
  const { user, orgs } = useAuth();
  const q = useRecommendations(!!user && orgs.length > 0);
  const rows = (q.data ?? []).slice(0, 10);
  if (!rows.length) return null;
  return (
    <section className="rounded-2xl bg-card py-3 shadow-sm ring-1 ring-border/70 md:hidden">
      <p className="px-4 font-semibold">{L ? "जिन्हें आप जानते होंगे" : "People you may know"}</p>
      <div className="scrollbar-none mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
        {rows.map((r) => (
          <div key={r.user_id} className="w-36 shrink-0 overflow-hidden rounded-xl ring-1 ring-border">
            <Link to="/u/$id" params={{ id: r.user_id }} className="block aspect-square bg-secondary">
              {r.photo_url ? <img src={r.photo_url} alt="" className="size-full object-cover" loading="lazy" /> : <span className="grid size-full place-items-center bg-gradient-to-br from-primary to-primary-deep font-display text-4xl text-primary-foreground">{r.name.slice(0, 1)}</span>}
            </Link>
            <div className="space-y-1.5 p-2">
              <p className="truncate text-sm font-semibold">{r.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{r.mutual ? (L ? `${r.mutual} साझा मित्र` : `${r.mutual} mutual`) : (r.village ?? r.org_names ?? " ")}</p>
              <div className="[&>button]:w-full [&_button]:h-8 [&_button]:text-xs"><FriendButton userId={r.user_id} status="none" L={L} /></div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function OnlineNow({ L }: { L: boolean }) {
  const q = usePeople({ q: "", onlineOnly: true, friendsOnly: false, city: "", org: "" }, true, 12);
  const rows = q.data ?? [];
  if (!rows.length) return null;
  return (
    <section>
      <RailTitle>{L ? "अभी ऑनलाइन" : "Online now"} <span className="ml-1 text-xs font-normal">({rows[0]?.total ?? rows.length})</span></RailTitle>
      <ul>
        {rows.map((r) => (
          <li key={r.user_id}>
            <Link to="/community/chat" search={{ dm: r.user_id }} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-card">
              <Avatar url={r.photo_url} name={r.name} size={8} online /><span className="truncate text-sm font-medium">{r.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Sponsors({ L }: { L: boolean }) {
  const tenant = useTenant();
  const q = useBoard();
  const ads = (q.data ?? []).slice(0, 2);
  useEffect(() => { for (const a of ads) supabase.rpc("k1_ad_hit", { p_org: tenant.organization_id, p_slot: "board", p_campaign: a.id, p_click: false } as never).then(() => undefined, () => undefined); }, [ads.map((a) => a.id).join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ads.length) return null;
  return (
    <section>
      <RailTitle to="/sponsored" more={L ? "सभी" : "All"}>{L ? "प्रायोजित" : "Sponsored"}</RailTitle>
      <div className="space-y-2">{ads.map((a) => <SponsoredCard key={a.id} ad={a} org={tenant.organization_id} />)}</div>
    </section>
  );
}

function RightRail() {
  const { lang } = useLang();
  const L = lang === "hi";
  const { user, orgs } = useAuth();
  const on = !!user && orgs.length > 0;
  if (!on) {
    return (
      <div className="space-y-4">
        <section className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border/70">
          <div className="page-hero p-4 text-primary-foreground"><p className="font-display text-lg font-semibold">{L ? "समाज से जुड़िए" : "Join the community"}</p><p className="mt-1 text-sm text-white/85">{L ? "पोस्ट, मित्र, चैट, जन्मदिन की शुभकामनाएँ — सब एक जगह।" : "Posts, friends, chat and birthday wishes in one place."}</p></div>
          <div className="flex gap-2 p-3"><Link to="/auth" className="flex-1 rounded-full bg-primary py-2 text-center text-sm font-semibold text-primary-foreground">{L ? "लॉगिन" : "Sign in"}</Link><Link to="/join" className="flex-1 rounded-full bg-secondary py-2 text-center text-sm font-semibold">{L ? "सदस्य बनें" : "Join"}</Link></div>
        </section>
        <Sponsors L={L} />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <FriendRequests L={L} />
      <OccasionsCard L={L} enabled compact />
      <PeopleYouMayKnow L={L} />
      <Sponsors L={L} />
      <OnlineNow L={L} />
    </div>
  );
}

/** Three-column community frame. `wide` drops the right rail (e.g. for a single post). */
export function CommunityLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[70vh] bg-secondary/50">
      <div className="mx-auto grid max-w-[1320px] gap-6 px-3 py-4 sm:px-4 md:grid-cols-[minmax(0,1fr)_300px] lg:grid-cols-[260px_minmax(0,1fr)_320px] lg:py-5">
        <aside className="scrollbar-none sticky top-20 hidden max-h-[calc(100vh-6rem)] self-start overflow-y-auto lg:block"><LeftRail /></aside>
        <main className="mx-auto w-full min-w-0 max-w-[620px]"><ShortcutStrip />{children}</main>
        <aside className="scrollbar-none sticky top-20 hidden max-h-[calc(100vh-6rem)] self-start overflow-y-auto pb-4 md:block"><RightRail /></aside>
      </div>
    </div>
  );
}
