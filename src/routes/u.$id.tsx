// Member profile, Facebook-style: wide cover, big round photo, name with friend / follower counts and a stack of friends'
// faces, action buttons, then tabs — Posts (intro + photos + friends on the left, posts on the right), About, Friends, Photos.
// Keeps the member's own theme (cover preset, colours, "centered" layout, stickers). Members only (signed in).
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PostSkeleton } from "@/components/site/Skeletons";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Cake, GraduationCap, Heart, Home, Images, Info, Link2, Mail, MapPin, MoreHorizontal, Network, Pencil, Phone, Send, Users } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Avatar, FollowButton, FollowListDialog, FriendButton, ProfileCard, useProfileSocial } from "@/components/community/ChatBits";
import { WishesWall } from "@/components/community/Occasions";
import { AboutSection, workLine } from "@/components/community/ProfileAbout";
import { Cover, presetOf, type Theme } from "@/components/community/ProfileTheme";
import { Composer, Lightbox, mediaUrl, PostCard, type Post } from "@/components/site/Feed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { call, timeAgo, useProfile, type Profile } from "@/community/chat";
import { useLang } from "@/core/i18n";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import { placeLine } from "@/lib/places";

export const Route = createFileRoute("/u/$id")({
  head: () => ({ meta: [{ title: "सदस्य प्रोफ़ाइल · Member profile" }, { name: "robots", content: "noindex" }] }),
  component: ProfilePage,
});

type Friend = { user_id: string; name: string; photo_url: string | null; online: boolean };
type Tab = "posts" | "about" | "friends" | "photos";
const box = "rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/70";

function ProfilePage() {
  const { id } = Route.useParams();
  const { lang } = useLang(); const L = lang === "hi";
  const tenant = useTenant();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const p = useProfile(user ? id : null);
  const social = useProfileSocial(user ? id : null);
  const [card, setCard] = useState(false);
  const [tab, setTab] = useState<Tab>("posts");
  const [list, setList] = useState<null | "followers" | "following">(null);
  const [photo, setPhoto] = useState<number | null>(null);
  const posts = useQuery({ queryKey: ["user_posts", tenant.organization_id, id], enabled: !!user, queryFn: () => call<Post[]>("k1_user_posts_json", { p_org: tenant.organization_id, p_user: id, p_limit: 60 }) });
  const friends = useQuery({ queryKey: ["friends_of", id], enabled: !!user, queryFn: () => call<Friend[]>("k1_friends", { p_user: id, p_q: null, p_limit: 200 }).catch(() => [] as Friend[]) });
  const occ = useQuery({ queryKey: ["profile_occasions", id], enabled: !!user, queryFn: () => call<{ birthday: string | null; anniversary: string | null }>("k1_profile_occasions", { p_user: id }).catch(() => ({ birthday: null, anniversary: null })) });
  const d = p.data;
  const theme: Theme = d?.theme ?? {};
  const pre = presetOf(theme);
  const centered = theme.layout === "centered";
  const photos = useMemo(() => (posts.data ?? []).flatMap((x) => [...(x.media ?? []), ...(x.shared?.available && x.shared.author_id === id ? x.shared.media ?? [] : [])]).filter((m) => m.type === "image").map((m) => mediaUrl(m.path)), [posts.data, id]);
  const fr = friends.data ?? [];
  const s = social.data;

  async function dm() { try { const rid = await call<string>("k1_chat_open_dm", { p_org: tenant.organization_id, p_user: id }); void navigate({ to: "/community/chat", search: { room: rid } }); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } }

  if (!loading && !user) return <section className="container-page py-10 text-center text-sm"><p>{L ? "प्रोफ़ाइल देखने के लिए साइन इन कीजिए।" : "Sign in to view member profiles."}</p><Button asChild className="mt-3"><Link to="/auth">{L ? "साइन इन" : "Sign in"}</Link></Button></section>;

  const TABS: [Tab, string, ReactNode][] = [
    ["posts", L ? "पोस्ट" : "Posts", null],
    ["about", L ? "परिचय" : "About", <Info key="i" className="size-4" />],
    ["friends", `${L ? "मित्र" : "Friends"}${fr.length ? ` ${fr.length}` : ""}`, <Users key="i" className="size-4" />],
    ["photos", `${L ? "फोटो" : "Photos"}${photos.length ? ` ${photos.length}` : ""}`, <Images key="i" className="size-4" />],
  ];

  return (
    <div className="min-h-[70vh] bg-secondary/50 pb-10">
      {/* header */}
      <div className={`shadow-sm ${pre.card} bg-card`}>
        <div className="mx-auto max-w-5xl sm:px-4">
          <div className="overflow-hidden sm:rounded-b-2xl"><Cover url={d?.cover_url} theme={theme} height="h-48 sm:h-80" /></div>
          <div className="px-4 sm:px-6">
            <div className={`flex flex-col gap-3 pb-4 sm:flex-row sm:items-end sm:gap-5 ${centered ? "items-center text-center sm:flex-col sm:items-center" : ""}`}>
              <span className={`relative z-10 -mt-16 inline-flex shrink-0 rounded-full border-4 bg-card shadow-md sm:-mt-20 ${centered ? "self-center" : "self-start sm:self-auto"} ${pre.ring}`}><Avatar url={d?.photo_url} name={d?.name ?? "?"} size={36} online={!!d?.online} /></span>
              <div className={`min-w-0 flex-1 sm:pb-2 ${centered ? "sm:text-center" : ""}`}>
                <h1 className={`font-display text-3xl font-bold leading-tight ${pre.accent}`}>{d?.name ?? "…"}</h1>
                <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm font-semibold text-muted-foreground">
                  <button type="button" className="hover:underline" onClick={() => setTab("friends")}>{s?.friends ?? fr.length} {L ? "मित्र" : "friends"}</button>
                  {!d?.mine && s?.mutual ? <span className="font-normal">({s.mutual} {L ? "साझा" : "mutual"})</span> : null}
                  <span>·</span><button type="button" className="hover:underline" onClick={() => setList("followers")}>{s?.followers ?? 0} {L ? "फ़ॉलोअर्स" : "followers"}</button>
                  <span>·</span><button type="button" className="hover:underline" onClick={() => setList("following")}>{s?.following ?? 0} {L ? "फ़ॉलो कर रहे" : "following"}</button>
                </p>
                {fr.length ? (
                  <div className={`mt-2 flex -space-x-2 ${centered ? "justify-center" : ""}`}>
                    {fr.slice(0, 8).map((f) => <Link key={f.user_id} to="/u/$id" params={{ id: f.user_id }} title={f.name} className="rounded-full ring-2 ring-card"><Avatar url={f.photo_url} name={f.name} size={8} /></Link>)}
                  </div>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">{d?.online ? (L ? "🟢 अभी ऑनलाइन" : "🟢 online now") : d?.last_seen_at ? `${L ? "आख़िरी बार" : "last seen"} ${timeAgo(d.last_seen_at, L)}` : ""}{d?.joined_at ? ` · ${L ? "सदस्य" : "member since"} ${new Date(d.joined_at).getFullYear()}` : ""}</p>
              </div>
              <div className={`flex flex-wrap gap-2 sm:pb-2 ${centered ? "justify-center" : ""}`}>
                {d?.mine ? (
                  <Button asChild size="sm" className="rounded-lg"><Link to="/me/profile"><Pencil className="size-4" /> {L ? "प्रोफ़ाइल सुधारें" : "Edit profile"}</Link></Button>
                ) : d && s ? (
                  <>
                    <FriendButton userId={id} status={s.friend_status} L={L} />
                    <FollowButton userId={id} following={!!s.i_follow} L={L} />
                    <Button size="sm" variant="secondary" className="rounded-lg" onClick={() => void dm()} disabled={d.blocked}><Send className="size-4" /> {L ? "संदेश" : "Message"}</Button>
                    <Button size="sm" variant="secondary" className="rounded-lg" aria-label={L ? "और" : "More"} onClick={() => setCard(true)}><MoreHorizontal className="size-4" /></Button>
                  </>
                ) : null}
              </div>
            </div>
            <nav className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto border-t border-border px-4 sm:mx-0 sm:px-0" role="tablist">
              {TABS.map(([k, label, icon]) => (
                <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                  className={`flex shrink-0 items-center gap-1.5 border-b-[3px] px-4 py-3 text-sm font-semibold transition ${tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:bg-secondary/60"}`}>{icon}{label}</button>
              ))}
              {d?.orgs.some((o) => o.family_id) ? <Link to="/admin/families/$id" params={{ id: d.orgs.find((o) => o.family_id)!.family_id! }} className="flex shrink-0 items-center gap-1.5 border-b-[3px] border-transparent px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-secondary/60"><Network className="size-4" />{L ? "वंश वृक्ष" : "Family tree"}</Link> : null}
            </nav>
          </div>
        </div>
      </div>

      {/* body */}
      <div className="mx-auto mt-4 max-w-5xl px-3 sm:px-4">
        {!d ? <div className="h-40 animate-pulse rounded-2xl bg-muted" /> : tab === "posts" ? (
          <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
              <Intro d={d} L={L} onMore={() => setTab("about")} birthday={occ.data?.birthday ?? null} />
              {photos.length ? (
                <section className={box}>
                  <div className="mb-2 flex items-center justify-between"><h2 className="font-display text-lg font-semibold">{L ? "फोटो" : "Photos"}</h2><button type="button" className="text-sm text-primary hover:underline" onClick={() => setTab("photos")}>{L ? "सभी देखें" : "See all"}</button></div>
                  <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-xl">{photos.slice(0, 9).map((u, i) => <button key={u + i} type="button" onClick={() => setPhoto(i)} className="aspect-square overflow-hidden bg-secondary"><img src={u} alt="" loading="lazy" className="size-full object-cover transition hover:scale-105" /></button>)}</div>
                </section>
              ) : null}
              <section className={box}>
                <div className="mb-2 flex items-center justify-between"><div><h2 className="font-display text-lg font-semibold">{L ? "मित्र" : "Friends"}</h2><p className="text-xs text-muted-foreground">{s?.friends ?? fr.length} {L ? "मित्र" : "friends"}</p></div>{fr.length ? <button type="button" className="text-sm text-primary hover:underline" onClick={() => setTab("friends")}>{L ? "सभी देखें" : "See all"}</button> : null}</div>
                {fr.length ? <div className="grid grid-cols-3 gap-2">{fr.slice(0, 9).map((f) => <FriendTile key={f.user_id} f={f} small />)}</div>
                  : <p className="text-sm text-muted-foreground">{d.mine ? (L ? "अभी कोई मित्र नहीं — समुदाय में \"जिन्हें आप जानते होंगे\" से जोड़िए।" : "No friends yet — add some from People you may know.") : "—"}</p>}
              </section>
            </aside>
            <main className="min-w-0 space-y-4">
              {d.mine ? <Composer org={tenant.organization_id} onPosted={() => void posts.refetch()} L={L} /> : null}
              <WishesWall userId={id} name={d.name} L={L} mine={d.mine} birthday={occ.data?.birthday ?? null} anniversary={occ.data?.anniversary ?? null} />
              <h2 className={`${box} py-3 font-display text-lg font-semibold`}>{L ? "पोस्ट" : "Posts"} <span className="text-sm font-normal text-muted-foreground">({d.posts})</span></h2>
              {(posts.data ?? []).map((x) => <PostCard key={x.id} p={x} L={L} signedIn={!!user} onChange={() => void posts.refetch()} />)}
              {posts.isLoading ? <><PostSkeleton /><PostSkeleton photo={false} /></> : null}
              {posts.isSuccess && !posts.data?.length ? <p className={`${box} py-10 text-center text-sm text-muted-foreground`}>{L ? "अभी कोई पोस्ट नहीं।" : "No posts yet."}</p> : null}
            </main>
          </div>
        ) : tab === "about" ? <About d={d} L={L} birthday={occ.data?.birthday ?? null} anniversary={occ.data?.anniversary ?? null} />
          : tab === "friends" ? (
            <section className={box}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-xl font-semibold">{L ? "मित्र" : "Friends"} <span className="text-sm font-normal text-muted-foreground">({s?.friends ?? fr.length})</span></h2>
                <div className="flex gap-2 text-sm"><button type="button" className="rounded-full bg-secondary px-3 py-1 hover:bg-secondary/70" onClick={() => setList("followers")}>{s?.followers ?? 0} {L ? "फ़ॉलोअर्स" : "followers"}</button><button type="button" className="rounded-full bg-secondary px-3 py-1 hover:bg-secondary/70" onClick={() => setList("following")}>{s?.following ?? 0} {L ? "फ़ॉलो कर रहे" : "following"}</button></div></div>
              {fr.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{fr.map((f) => <FriendTile key={f.user_id} f={f} />)}</div> : <p className="py-8 text-center text-sm text-muted-foreground">{L ? "अभी कोई मित्र नहीं।" : "No friends yet."}</p>}
            </section>
          ) : (
            <section className={box}>
              <h2 className="mb-3 font-display text-xl font-semibold">{L ? "फोटो" : "Photos"} <span className="text-sm font-normal text-muted-foreground">({photos.length})</span></h2>
              {photos.length ? <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-5">{photos.map((u, i) => <button key={u + i} type="button" onClick={() => setPhoto(i)} className="aspect-square overflow-hidden rounded-lg bg-secondary"><img src={u} alt="" loading="lazy" className="size-full object-cover transition hover:scale-105" /></button>)}</div>
                : <p className="py-8 text-center text-sm text-muted-foreground">{L ? "पोस्ट में अभी कोई फोटो नहीं।" : "No photos in posts yet."}</p>}
            </section>
          )}
      </div>

      {photo !== null ? <Lightbox urls={photos} index={photo} onClose={() => setPhoto(null)} /> : null}
      {list ? <FollowListDialog userId={id} kind={list} L={L} onClose={() => setList(null)} /> : null}
      {card ? <ProfileCard userId={id} L={L} online={!!d?.online} onClose={() => setCard(false)} onDm={() => void dm()} /> : null}
    </div>
  );
}

function FriendTile({ f, small = false }: { f: Friend; small?: boolean }) {
  return (
    <Link to="/u/$id" params={{ id: f.user_id }} className={`group block overflow-hidden ${small ? "" : "rounded-xl ring-1 ring-border/70 hover:shadow-md"}`}>
      <span className={`relative block aspect-square overflow-hidden bg-secondary ${small ? "rounded-lg" : ""}`}>
        {f.photo_url ? <img src={f.photo_url} alt="" loading="lazy" className="size-full object-cover transition group-hover:scale-105" />
          : <span className="grid size-full place-items-center bg-gradient-to-br from-primary to-primary-deep font-display text-3xl text-primary-foreground">{[...f.name.trim()][0] ?? "?"}</span>}
        {f.online ? <span className="absolute bottom-1.5 right-1.5 size-3 rounded-full bg-emerald-500 ring-2 ring-card" /> : null}
      </span>
      <span className={`block truncate font-semibold group-hover:underline ${small ? "mt-1 text-xs" : "p-2 text-sm"}`}>{f.name}</span>
    </Link>
  );
}

const fmtDay = (iso: string, L: boolean) => new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString(L ? "hi-IN" : "en-IN", { day: "numeric", month: "long" });

/** Left-column intro card (Facebook's "Intro"). */
function Intro({ d, L, onMore, birthday }: { d: Profile; L: boolean; onMore: () => void; birthday: string | null }) {
  const a = d.about ?? {};
  const lives = placeLine([d.village, d.district, d.state], L);
  const Row = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => <li className="flex gap-2.5"><span className="mt-0.5 text-muted-foreground [&>svg]:size-5">{icon}</span><span className="min-w-0">{children}</span></li>;
  return (
    <section className={`${box} space-y-3 text-sm`}>
      <h2 className="font-display text-lg font-semibold">{L ? "परिचय" : "Intro"}</h2>
      {d.bio ? <p className="whitespace-pre-wrap text-center">{d.bio}</p> : d.mine ? <Link to="/me/profile" className="block rounded-lg bg-secondary py-2 text-center font-semibold hover:bg-secondary/70">{L ? "अपने बारे में लिखें" : "Add a bio"}</Link> : null}
      <ul className="space-y-2.5">
        {workLine(a, d.occupation, L) ? <Row icon={<Briefcase />}>{workLine(a, d.occupation, L)}</Row> : null}
        {a.education ? <Row icon={<GraduationCap />}>{L ? "शिक्षा: " : "Studied "}{a.education}{a.college ? ` · ${a.college}` : ""}</Row> : null}
        {lives ? <Row icon={<Home />}>{L ? "निवास: " : "Lives in "}<b>{lives}</b></Row> : null}
        {a.hometown ? <Row icon={<MapPin />}>{L ? "मूल ग्राम: " : "From "}<b>{a.hometown}</b></Row> : null}
        {d.orgs.slice(0, 2).map((o) => <Row key={o.id} icon={<Users />}>{L ? "सदस्य: " : "Member of "}<b>{L ? (o.name_hi || o.name) : o.name}</b>{o.member_no ? <span className="text-muted-foreground"> · {o.member_no}</span> : null}</Row>)}
        {birthday ? <Row icon={<Cake />}>{L ? "जन्मदिन: " : "Birthday: "}{fmtDay(birthday, L)}</Row> : null}
      </ul>
      {d.interests.length ? <div className="flex flex-wrap gap-1">{d.interests.slice(0, 8).map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}</div> : null}
      <Button variant="secondary" className="w-full" onClick={onMore}>{L ? "पूरा परिचय देखें" : "See full details"}</Button>
    </section>
  );
}

function About({ d, L, birthday, anniversary }: { d: Profile; L: boolean; birthday: string | null; anniversary: string | null }) {
  const a = d.about ?? {};
  const lives = placeLine([d.village, d.district, d.state], L);
  const LINK: Record<string, string> = { facebook: "Facebook", instagram: "Instagram", youtube: "YouTube", linkedin: "LinkedIn", x: "X", website: L ? "वेबसाइट" : "Website" };
  const links = Object.entries(d.links).filter(([, v]) => v);
  const filled = !!(d.bio || d.occupation || lives || birthday || d.phone || d.email || Object.keys(a).some((k) => k !== "show_family" && a[k as keyof typeof a]));
  const contact = [
    ...(d.phone ? [{ icon: <Phone />, label: L ? "मोबाइल" : "Mobile", value: <a href={`tel:${d.phone}`} className="hover:underline">{d.phone}</a> }] : []),
    ...(d.email ? [{ icon: <Mail />, label: L ? "ईमेल" : "Email", value: <a href={`mailto:${d.email}`} className="break-all hover:underline">{d.email}</a> }] : []),
  ];
  return (
    <div className="space-y-4">
      {d.bio ? <section className={box}><h2 className="mb-2 font-display text-lg font-semibold">{L ? "परिचय" : "About"}</h2><p className="whitespace-pre-wrap text-sm">{d.bio}</p></section> : null}
      {!filled ? <p className={`${box} text-sm text-muted-foreground`}>{d.mine ? <Link to="/me/profile" className="underline">{L ? "अपनी जानकारी भरें — कार्य, शिक्षा, परिवार, समाज सेवा…" : "Add your details — work, education, family, community work…"}</Link> : (L ? "अभी कोई जानकारी नहीं भरी गई।" : "No details yet.")}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <AboutSection id="basic" a={a} L={L} box={box} extra={[
          ...(birthday ? [{ icon: <Cake />, label: L ? "जन्मदिन" : "Birthday", value: fmtDay(birthday, L) }] : []),
          ...(anniversary ? [{ icon: <Heart />, label: L ? "विवाह वर्षगाँठ" : "Anniversary", value: fmtDay(anniversary, L) }] : []),
        ]} />
        <AboutSection id="work" a={a} L={L} box={box} extra={d.occupation ? [{ icon: <Briefcase />, label: L ? "कार्य / व्यवसाय" : "Work", value: d.occupation }] : []} />
        <AboutSection id="place" a={a} L={L} box={box} extra={lives ? [{ icon: <Home />, label: L ? "वर्तमान निवास" : "Lives in", value: lives }] : []} />
        <AboutSection id="family" a={a} L={L} box={box} extra={d.orgs.some((o) => o.family_id) ? [{ icon: <Network />, label: L ? "वंश वृक्ष" : "Family tree", value: <Link to="/admin/families/$id" params={{ id: d.orgs.find((o) => o.family_id)!.family_id! }} className="text-primary hover:underline">{L ? "वंश वृक्ष देखें" : "View family tree"}</Link> }] : []} />
        <AboutSection id="society" a={a} L={L} box={box} extra={d.interests.length ? [{ icon: <Heart />, label: L ? "रुचियाँ" : "Interests", value: <span className="flex flex-wrap gap-1">{d.interests.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}</span> }] : []} />
        {contact.length || links.length ? (
          <section className={`${box} space-y-3 text-sm`}>
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Phone className="size-5 text-primary" />{L ? "संपर्क व लिंक" : "Contact & links"}</h2>
            <ul className="space-y-3">{contact.map((r, i) => <li key={i} className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground [&>svg]:size-5">{r.icon}</span><span className="min-w-0"><span className="block">{r.value}</span><span className="block text-xs text-muted-foreground">{r.label}</span></span></li>)}</ul>
            {links.length ? <div className="flex flex-wrap gap-2 text-xs">{links.map(([k, v]) => <a key={k} href={v} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 hover:bg-secondary"><Link2 className="size-3" />{LINK[k] ?? k}</a>)}</div> : null}
          </section>
        ) : null}
        <section className={`${box} space-y-4 text-sm`}>
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Users className="size-5 text-primary" />{L ? "संगठन" : "Organizations"}</h2>
            <ul className="mt-2 space-y-2">{d.orgs.map((o) => <li key={o.id} className="flex items-center justify-between gap-2 rounded-xl bg-secondary/50 px-3 py-2"><span><b>{L ? (o.name_hi || o.name) : o.name}</b>{o.since ? <span className="block text-xs text-muted-foreground">{L ? "सदस्य " : "since "}{new Date(o.since).getFullYear()}</span> : null}</span>{o.member_no ? <Badge variant="secondary">{o.member_no}</Badge> : null}</li>)}{!d.orgs.length ? <li className="text-muted-foreground">—</li> : null}</ul>
          </div>
          {d.roles.length ? <div><h2 className="font-display text-lg font-semibold">{L ? "जिम्मेदारियाँ" : "Roles"}</h2><ul className="mt-2 space-y-1">{d.roles.map((r, i) => <li key={i}>🏅 {L ? (r.role || r.role_en) : r.role_en} <span className="text-muted-foreground">· {L ? (r.org || r.org_en) : r.org_en}</span></li>)}</ul></div> : null}
        </section>
      </div>
    </div>
  );
}
