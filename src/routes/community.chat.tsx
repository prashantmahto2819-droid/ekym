// समुदाय चैट — channels by category (this organization + the whole Kalchuri community), private groups, 1:1 messages,
// who is online, people directory across organizations, profile card. Members only.
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, Bell, BellOff, Check, CheckCheck, Copy, Hash, Image as ImageIcon, Lock, MessageCircle, Pencil, Plus, Reply, Search, Send, Smile, Trash2, Users, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, FriendButton, ProfileCard } from "@/components/community/ChatBits";
import { OccasionsCard } from "@/components/community/Occasions";
import { StoriesStrip } from "@/components/community/Stories";
import { call, roomTitle, timeAgo, uploadCommunityImage, useFacets, useFriendRequests, useMe, useMessages, usePeople, usePresence, useRecommendations, useRoomFlags, useRooms, useStickToBottom, type Msg, type PeopleFilter, type Person, type Room, type RoomFlags, type RoomMember } from "@/community/chat";
import { Lightbox } from "@/components/site/Feed";
import { useLang } from "@/core/i18n";
import { useTenant } from "@/core/tenant-context";
import { useConsent } from "@/components/community/ConsentGate";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/community/chat")({
  validateSearch: (s: Record<string, unknown>): { room?: string; dm?: string } => ({ ...(typeof s["room"] === "string" ? { room: s["room"] } : {}), ...(typeof s["dm"] === "string" ? { dm: s["dm"] } : {}) }),
  head: () => ({ meta: [{ title: "समुदाय चैट · Community chat" }, { name: "robots", content: "noindex" }] }),
  component: ChatPage,
});


function ChatPage() {
  const { lang } = useLang(); const L = lang === "hi";
  const tenant = useTenant();
  const { user, orgs, loading } = useAuth();
  const { me } = useMe();
  const isMember = orgs.length > 0;
  const search = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const rooms = useRooms(!!user && isMember);
  const flags = useRoomFlags(!!user && isMember);
  const online = usePresence(!!user && isMember, me);
  const [roomId, setRoomId] = useState<string | null>(search.room ?? null);
  const [pane, setPane] = useState<"rooms" | "people">("rooms");
  const [profileOf, setProfileOf] = useState<string | null>(null);
  const [newRoom, setNewRoom] = useState(false);
  const room = rooms.data?.find((r) => r.id === roomId) ?? null;

  // deep links: ?room=… or ?dm=<user>
  useEffect(() => { if (search.room && search.room !== roomId) setRoomId(search.room); }, [search.room]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!search.dm || !user) return;
    call<string>("k1_chat_open_dm", { p_org: tenant.organization_id, p_user: search.dm })
      .then((id) => { void qc.invalidateQueries({ queryKey: ["chat_rooms"] }); setRoomId(id); void navigate({ to: "/community/chat", search: { room: id }, replace: true }); })
      .catch((e: Error) => toast.error(e.message));
  }, [search.dm, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const openRoom = (id: string) => { setRoomId(id); void navigate({ to: "/community/chat", search: { room: id }, replace: true }); };
  const openDm = async (uid: string) => {
    try { const id = await call<string>("k1_chat_open_dm", { p_org: tenant.organization_id, p_user: uid }); await qc.invalidateQueries({ queryKey: ["chat_rooms"] }); openRoom(id); setProfileOf(null); setPane("rooms"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  if (loading) return <div className="container-page py-10 text-sm text-muted-foreground">…</div>;
  if (!user) return <Gate L={L} text={L ? "चैट के लिए पहले साइन इन कीजिए।" : "Sign in to use the community chat."} to="/auth" btn={L ? "साइन इन" : "Sign in"} />;
  if (!isMember) return <Gate L={L} text={L ? "चैट सिर्फ़ सदस्यों के लिए है। सदस्यता के लिए आवेदन कीजिए; मंज़ूरी मिलते ही चैट खुल जाएगी।" : "Chat is for members. Apply for membership; it opens as soon as you are approved."} to="/join" btn={L ? "सदस्यता आवेदन" : "Apply"} />;

  const list = rooms.data ?? [];
  const onlineCount = online.size;

  const sidebar = (
    <aside className="flex h-full min-h-0 flex-col border-r border-border bg-background">
      <div className="flex items-center gap-1 border-b border-border p-2">
        <Button size="sm" variant={pane === "rooms" ? "default" : "ghost"} onClick={() => setPane("rooms")}><MessageCircle className="size-4" /> {L ? "बातचीत" : "Chats"}</Button>
        <Button size="sm" variant={pane === "people" ? "default" : "ghost"} onClick={() => setPane("people")}><Users className="size-4" /> {L ? "लोग" : "People"} <Badge variant="secondary" className="ml-1 bg-emerald-100 text-emerald-800">{onlineCount} {L ? "ऑनलाइन" : "online"}</Badge></Button>
        <span className="flex-1" />
        <Button size="icon" variant="ghost" title={L ? "नया समूह / चैनल" : "New group / channel"} onClick={() => setNewRoom(true)}><Plus className="size-4" /></Button>
      </div>
      {pane === "rooms" ? (
        <ChatList L={L} list={list} flags={flags.data ?? []} online={online} activeId={roomId} onOpen={openRoom} onProfile={(uid) => setProfileOf(uid)} />
      ) : <PeoplePane L={L} online={online} onOpen={(uid) => setProfileOf(uid)} onDm={openDm} />}
    </aside>
  );

  return (
    <section className="container-page py-3 sm:py-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-xl font-semibold sm:text-2xl">💬 {L ? "समुदाय चैट" : "Community chat"} <span className="text-sm font-normal text-muted-foreground">· {L ? (tenant.name_hi || tenant.name) : tenant.name}</span></h1>
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="inline-block size-2 rounded-full bg-emerald-500" /> {onlineCount} {L ? "ऑनलाइन" : "online"} · <Link to="/community" className="hover:underline">{L ? "चौपाल (पोस्ट)" : "Community wall"}</Link> · <Link to="/me/profile" className="hover:underline">{L ? "मेरी प्रोफ़ाइल" : "My profile"}</Link></div>
      </div>
      <div className="grid h-[calc(100dvh-170px)] min-h-[480px] overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:grid-cols-[300px_1fr]">
        {/* sidebar: hidden on phones when a room is open */}
        <div className={`${roomId ? "hidden lg:flex" : "flex"} min-h-0 flex-col`}>{sidebar}</div>
        <div className={`${roomId ? "flex" : "hidden lg:flex"} min-h-0 flex-col`}>
          {room ? <RoomView key={room.id} room={room} L={L} online={online} me={me} muted={!!flags.data?.find((f) => f.room_id === room.id)?.muted} onBack={() => { setRoomId(null); void navigate({ to: "/community/chat", search: {}, replace: true }); }} onProfile={(uid) => setProfileOf(uid)} />
            : roomId && rooms.isLoading ? <p className="p-6 text-sm text-muted-foreground">…</p>
            : <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"><StoriesStrip L={L} enabled /><div className="grid flex-1 place-items-center text-center text-sm text-muted-foreground"><div><MessageCircle className="mx-auto mb-2 size-8 opacity-40" />{L ? "बाईं ओर कोई चैनल चुनिए, या \"लोग\" में से किसी को संदेश भेजिए।" : "Pick a channel on the left, or message someone under People."}</div></div></div>}
        </div>
      </div>
      {profileOf ? <ProfileCard userId={profileOf} L={L} online={online.has(profileOf)} onClose={() => setProfileOf(null)} onDm={openDm} /> : null}
      {newRoom ? <NewRoomDialog L={L} onClose={() => setNewRoom(false)} onCreated={(id) => { setNewRoom(false); void qc.invalidateQueries({ queryKey: ["chat_rooms"] }); openRoom(id); }} /> : null}
    </section>
  );
}

function Gate({ L, text, to, btn }: { L: boolean; text: string; to: string; btn: string }) {
  return <section className="container-page py-10"><div className="mx-auto max-w-md rounded-xl border border-border bg-card p-6 text-center"><MessageCircle className="mx-auto mb-3 size-8 text-primary" /><p className="text-sm">{text}</p><Button asChild className="mt-4"><Link to={to}>{btn}</Link></Button><p className="mt-3 text-xs text-muted-foreground"><Link to="/community" className="hover:underline">{L ? "← समुदाय की चौपाल" : "← Community wall"}</Link></p></div></section>;
}

/** WhatsApp-style list: one list sorted by the latest message, search, filter chips, time, ticks, unread bubble. */
function ChatList({ L, list, flags, online, activeId, onOpen, onProfile }: { L: boolean; list: Room[]; flags: RoomFlags[]; online: Set<string>; activeId: string | null; onOpen: (id: string) => void; onProfile: (uid: string) => void }) {
  const [q, setQ] = useState("");
  const [chip, setChip] = useState<"all" | "unread" | "dm" | "group" | "channel">("all");
  const fl = useMemo(() => new Map(flags.map((f) => [f.room_id, f])), [flags]);
  const rows = useMemo(() => {
    const k = q.trim().toLowerCase();
    return list
      .filter((r) => chip === "all" || (chip === "unread" ? r.unread > 0 : r.kind === chip))
      .filter((r) => !k || roomTitle(r, L).toLowerCase().includes(k) || (r.name ?? "").toLowerCase().includes(k) || (r.last_text ?? "").toLowerCase().includes(k))
      .sort((a, b) => (b.last_message_at ? Date.parse(b.last_message_at) : 0) - (a.last_message_at ? Date.parse(a.last_message_at) : 0) || a.sort_order - b.sort_order);
  }, [list, chip, q, L]);
  const unreadRooms = list.filter((r) => r.unread > 0).length;
  const Chip = ({ id, label, n }: { id: typeof chip; label: string; n?: number }) => (
    <button type="button" onClick={() => setChip(id)} className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${chip === id ? "bg-emerald-600 text-white" : "bg-secondary text-foreground hover:bg-secondary/70"}`}>
      {label}{n ? <span className="ml-1">{n}</span> : null}
    </button>
  );
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-2 p-2">
        <div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L ? "बातचीत खोजें" : "Search chats"} className="h-9 rounded-full bg-secondary pl-9" /></div>
        <div className="flex gap-1 overflow-x-auto pb-0.5">
          <Chip id="all" label={L ? "सभी" : "All"} />
          <Chip id="unread" label={L ? "बिना पढ़े" : "Unread"} n={unreadRooms} />
          <Chip id="dm" label={L ? "सीधे" : "Direct"} />
          <Chip id="group" label={L ? "समूह" : "Groups"} />
          <Chip id="channel" label={L ? "चैनल" : "Channels"} />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {chip === "all" && !q ? <div className="px-2"><OccasionsCard L={L} enabled compact onProfile={onProfile} /></div> : null}
        {rows.map((r) => {
          const f = fl.get(r.id);
          const isOnline = r.kind === "dm" && !!r.other_user && online.has(r.other_user);
          return (
            <button key={r.id} type="button" onClick={() => onOpen(r.id)} className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-secondary/70 ${r.id === activeId ? "bg-secondary" : ""}`}>
              {r.kind === "dm" ? <Avatar url={r.other_photo} name={r.other_name ?? "?"} size={11} online={isOnline} />
                : <span className={`grid size-11 shrink-0 place-items-center rounded-full ${r.kind === "group" ? "bg-sky-100 text-sky-700" : "bg-emerald-100 text-emerald-700"}`}>{r.kind === "group" || r.is_private ? <Users className="size-5" /> : <Hash className="size-5" />}</span>}
              <span className="min-w-0 flex-1 border-b border-border/60 pb-2.5">
                <span className="flex items-baseline gap-2">
                  <span className={`min-w-0 flex-1 truncate text-[15px] ${r.unread ? "font-semibold" : "font-medium"}`}>{roomTitle(r, L)}</span>
                  <span className={`shrink-0 text-[11px] ${r.unread && !f?.muted ? "font-semibold text-emerald-600" : "text-muted-foreground"}`}>{shortTime(r.last_message_at, L)}</span>
                </span>
                <span className="mt-0.5 flex items-center gap-1">
                  {f?.last_mine ? (f.last_seen ? <CheckCheck className="size-4 shrink-0 text-sky-500" /> : <Check className="size-4 shrink-0 text-muted-foreground" />) : null}
                  <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">{r.last_text ?? r.description ?? (r.kind === "channel" ? r.org_name : "")}</span>
                  {f?.muted ? <BellOff className="size-3.5 shrink-0 text-muted-foreground" /> : null}
                  {r.unread > 0 ? <span className={`grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-[11px] font-semibold text-white ${f?.muted ? "bg-muted-foreground/60" : "bg-emerald-600"}`}>{r.unread > 99 ? "99+" : r.unread}</span> : null}
                </span>
              </span>
            </button>
          );
        })}
        {!rows.length ? <p className="p-6 text-center text-xs text-muted-foreground">{q || chip !== "all" ? (L ? "कुछ नहीं मिला।" : "Nothing found.") : (L ? "\"लोग\" में किसी पर क्लिक करके बातचीत शुरू कीजिए।" : "Pick someone under People to start a conversation.")}</p> : null}
      </div>
    </div>
  );
}

/** "14:05" today, "कल" yesterday, weekday this week, else a short date. */
function shortTime(iso: string | null, L: boolean) {
  if (!iso) return "";
  const d = new Date(iso); const now = new Date();
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86400000);
  if (diff === 0) return d.toLocaleTimeString(L ? "hi-IN" : "en-IN", { hour: "2-digit", minute: "2-digit" });
  if (diff === 1) return L ? "कल" : "Yesterday";
  if (diff < 7) return d.toLocaleDateString(L ? "hi-IN" : "en-IN", { weekday: "short" });
  return d.toLocaleDateString(L ? "hi-IN" : "en-IN", { day: "numeric", month: "short" });
}

function PeoplePane({ L, online, onOpen, onDm }: { L: boolean; online: Set<string>; onOpen: (uid: string) => void; onDm: (uid: string) => void }) {
  const [tab, setTab] = useState<"all" | "friends" | "suggest" | "requests">("all");
  const [f, setF] = useState<PeopleFilter>({ q: "", onlineOnly: false, friendsOnly: false, city: "", org: "" });
  const filter = { ...f, friendsOnly: tab === "friends" };
  const people = usePeople(filter, tab === "all" || tab === "friends");
  const facets = useFacets(true);
  const reqs = useFriendRequests(true);
  const recs = useRecommendations(tab === "suggest");
  const rows = (people.data ?? []).map((p) => ({ ...p, online: p.online || online.has(p.user_id) })).sort((a, b) => Number(b.online) - Number(a.online));
  const total = rows[0]?.total ?? rows.length;
  const incoming = (reqs.data ?? []).filter((r) => r.direction === "in");
  const fc = facets.data;
  const Tab = ({ id, label, n }: { id: typeof tab; label: string; n?: number | undefined }) => <button type="button" onClick={() => setTab(id)} className={`rounded-full px-2.5 py-1 text-xs ${tab === id ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/70"}`}>{label}{n ? <span className="ml-1 rounded-full bg-background/30 px-1.5">{n}</span> : null}</button>;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-2 border-b border-border p-2">
        {fc ? <p className="text-[11px] text-muted-foreground">👥 {L ? "कुल सदस्य" : "Members"} <b>{fc.total}</b> · 🟢 {L ? "ऑनलाइन" : "online"} <b>{Math.max(fc.online, online.size)}</b> · {L ? "आज सक्रिय" : "active today"} <b>{fc.today}</b> · {L ? "मेरे मित्र" : "friends"} <b>{fc.friends}</b></p> : null}
        <div className="flex flex-wrap gap-1"><Tab id="all" label={L ? "सभी समुदाय" : "All"} /><Tab id="friends" label={L ? "मित्र" : "Friends"} n={fc?.friends} /><Tab id="suggest" label={L ? "सुझाव" : "Suggestions"} /><Tab id="requests" label={L ? "अनुरोध" : "Requests"} n={incoming.length} /></div>
        {tab === "all" || tab === "friends" ? <>
          <div className="relative"><Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" /><Input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder={L ? "नाम, संगठन, गाँव/शहर खोजें" : "Search name, organization, city"} className="h-9 pl-8" /></div>
          <div className="flex flex-wrap gap-1">
            <select value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} className="h-8 max-w-[150px] rounded-md border border-input bg-background px-2 text-xs"><option value="">{L ? "सभी शहर/ज़िले" : "All cities"}</option>{(fc?.districts ?? []).map((d) => <option key={"d" + d.name} value={d.name}>{d.name} ({d.n})</option>)}{(fc?.cities ?? []).filter((c) => !(fc?.districts ?? []).some((d) => d.name === c.name)).map((c) => <option key={"c" + c.name} value={c.name}>{c.name} ({c.n})</option>)}</select>
            <select value={f.org} onChange={(e) => setF({ ...f, org: e.target.value })} className="h-8 max-w-[170px] rounded-md border border-input bg-background px-2 text-xs"><option value="">{L ? "सभी संगठन" : "All organizations"}</option>{(fc?.orgs ?? []).map((o) => <option key={o.id} value={o.id}>{o.name} ({o.n})</option>)}</select>
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={f.onlineOnly} onChange={(e) => setF({ ...f, onlineOnly: e.target.checked })} /> {L ? "ऑनलाइन" : "online"}</label>
          </div>
          <p className="text-[11px] text-muted-foreground">{people.isFetching ? "…" : `${total} ${L ? "लोग" : "people"}${rows.length < total ? ` (${L ? "पहले" : "first"} ${rows.length})` : ""}`}</p>
        </> : null}
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto p-1 text-sm">
        {(tab === "all" || tab === "friends") ? <>
          {rows.map((p: Person) => (
            <li key={p.user_id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-secondary">
              <button type="button" onClick={() => onOpen(p.user_id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                <Avatar url={p.photo_url} name={p.name} size={8} online={p.online} />
                <span className="min-w-0"><span className="block truncate font-medium">{p.name}{p.friend_status === "friends" ? <span className="ml-1 text-[10px] text-emerald-700">✓ {L ? "मित्र" : "friend"}</span> : null}</span><span className="block truncate text-[11px] text-muted-foreground">{[p.org_names, p.village || p.district].filter(Boolean).join(" · ")}{!p.online && p.last_seen_at ? ` · ${timeAgo(p.last_seen_at, L)}` : ""}</span></span>
              </button>
              {p.friend_status && p.friend_status !== "friends" ? <span className="hidden sm:block"><FriendButton userId={p.user_id} status={p.friend_status} L={L} /></span> : null}
              <Button size="icon" variant="ghost" className="size-8" title={L ? "संदेश" : "Message"} onClick={() => onDm(p.user_id)}><Send className="size-4" /></Button>
            </li>
          ))}
          {people.isSuccess && !rows.length ? <li className="p-3 text-xs text-muted-foreground">{tab === "friends" ? (L ? "अभी कोई मित्र नहीं — \"सुझाव\" या \"सभी समुदाय\" में से मित्र बनाइए।" : "No friends yet — add some from Suggestions or All.") : (L ? "कोई नहीं मिला।" : "No one found.")}</li> : null}
        </> : null}
        {tab === "suggest" ? <>
          <li className="px-2 py-1 text-[11px] text-muted-foreground">{L ? "आपके गाँव/ज़िले, संगठन, मूल ग्राम और साझा मित्रों के आधार पर" : "Based on your village/district, organization, native place and mutual friends"}</li>
          {(recs.data ?? []).map((p) => (
            <li key={p.user_id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-secondary">
              <button type="button" onClick={() => onOpen(p.user_id)} className="flex min-w-0 flex-1 items-center gap-2 text-left"><Avatar url={p.photo_url} name={p.name} size={8} online={p.online || online.has(p.user_id)} /><span className="min-w-0"><span className="block truncate font-medium">{p.name}</span><span className="block truncate text-[11px] text-muted-foreground">{p.why || p.org_names}</span></span></button>
              <FriendButton userId={p.user_id} status="none" L={L} />
            </li>
          ))}
          {recs.isSuccess && !recs.data?.length ? <li className="p-3 text-xs text-muted-foreground">{L ? "अभी कोई सुझाव नहीं — प्रोफ़ाइल में गाँव/ज़िला भरिए तो बेहतर सुझाव मिलेंगे।" : "No suggestions yet — fill your village/district in the profile."}</li> : null}
        </> : null}
        {tab === "requests" ? <>
          {incoming.length ? <li className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{L ? "आए हुए" : "Incoming"}</li> : null}
          {incoming.map((r) => <li key={r.user_id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-secondary"><button type="button" onClick={() => onOpen(r.user_id)} className="flex min-w-0 flex-1 items-center gap-2 text-left"><Avatar url={r.photo_url} name={r.name} size={8} online={online.has(r.user_id)} /><span className="min-w-0"><span className="block truncate font-medium">{r.name}</span><span className="block truncate text-[11px] text-muted-foreground">{[r.org_names, r.mutual ? `${r.mutual} ${L ? "साझा मित्र" : "mutual"}` : null].filter(Boolean).join(" · ")} · {timeAgo(r.since, L)}</span></span></button><FriendButton userId={r.user_id} status="pending_in" L={L} /></li>)}
          {(reqs.data ?? []).some((r) => r.direction === "out") ? <li className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{L ? "भेजे हुए" : "Sent"}</li> : null}
          {(reqs.data ?? []).filter((r) => r.direction === "out").map((r) => <li key={r.user_id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-secondary"><button type="button" onClick={() => onOpen(r.user_id)} className="flex min-w-0 flex-1 items-center gap-2 text-left"><Avatar url={r.photo_url} name={r.name} size={8} /><span className="min-w-0"><span className="block truncate font-medium">{r.name}</span><span className="block truncate text-[11px] text-muted-foreground">{timeAgo(r.since, L)}</span></span></button><FriendButton userId={r.user_id} status="pending_out" L={L} /></li>)}
          {reqs.isSuccess && !reqs.data?.length ? <li className="p-3 text-xs text-muted-foreground">{L ? "कोई अनुरोध नहीं।" : "No requests."}</li> : null}
        </> : null}
      </ul>
    </div>
  );
}

const QUICK = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
const EMOJIS = ["😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😎", "🤔", "😮", "😢", "😭", "😡", "👍", "👎", "👏", "🙏", "💪", "🤝", "❤️", "💐", "🌹", "🎉", "🎂", "🪔", "🕉️", "🚩", "✅", "🔥", "⭐"];

/** WhatsApp-style conversation: wallpaper, grouped bubbles with tails, time + ticks inside, reactions, reply / copy / edit / delete menu, typing line, jump-down button, photo viewer. */
function RoomView({ room, L, online, me, muted, onBack, onProfile }: { room: Room; L: boolean; online: Set<string>; me: { id: string; name: string } | null; muted: boolean; onBack: () => void; onProfile: (uid: string) => void }) {
  const tenant = useTenant();
  const qc = useQueryClient();
  const msgs = useMessages(room.id, me);
  const [text, setText] = useState(""); const [files, setFiles] = useState<File[]>([]); const [reply, setReply] = useState<Msg | null>(null); const [editing, setEditing] = useState<Msg | null>(null);
  const [busy, setBusy] = useState(false); const [showMembers, setShowMembers] = useState(false); const [menu, setMenu] = useState<string | null>(null); const [emoji, setEmoji] = useState(false);
  const [viewer, setViewer] = useState<{ urls: string[]; i: number } | null>(null);
  const list = msgs.data ?? [];
  const { ref, onScroll, away, toBottom } = useStickToBottom(list.length);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const consent = useConsent();
  const lastId = list[list.length - 1]?.id;
  useEffect(() => {
    void call("k1_chat_read", { p_room: room.id }).then(() => { msgs.ping(); void qc.invalidateQueries({ queryKey: ["chat_rooms"] }); void qc.invalidateQueries({ queryKey: ["chat_flags"] }); }).catch(() => undefined);
  }, [room.id, lastId]); // eslint-disable-line react-hooks/exhaustive-deps
  // grow the box with the text, like WhatsApp
  useEffect(() => { const t = taRef.current; if (t) { t.style.height = "auto"; t.style.height = `${Math.min(t.scrollHeight, 128)}px`; } }, [text]);
  const members = useQuery({ queryKey: ["chat_members", room.id], enabled: showMembers, queryFn: () => call<RoomMember[]>("k1_chat_members", { p_room: room.id }) });
  const refresh = async () => { await qc.invalidateQueries({ queryKey: ["chat_msgs", room.id] }); msgs.ping(); };
  async function send() {
    if (editing) {
      try { await call("k1_chat_edit", { p_message: editing.id, p_body: text }); setEditing(null); setText(""); await refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
      return;
    }
    if (!text.trim() && !files.length) return;
    if (!consent.accepted) { consent.ensure(() => void send()); return; }
    setBusy(true);
    try {
      const media: { type: string; url: string }[] = [];
      for (const f of files.slice(0, 4)) media.push({ type: "image", url: await uploadCommunityImage(f, `${tenant.organization_id}/chat/${room.id}`) });
      await call("k1_chat_send", { p_room: room.id, p_body: text.trim(), p_media: media, p_reply: reply?.id ?? null });
      setText(""); setFiles([]); setReply(null); setEmoji(false);
      await qc.invalidateQueries({ queryKey: ["chat_msgs", room.id] });
      toBottom();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  }
  async function del(m: Msg) { setMenu(null); if (!confirm(L ? "संदेश सबके लिए हटाएँ?" : "Delete for everyone?")) return; try { await call("k1_chat_delete", { p_message: m.id }); await refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } }
  async function react(m: Msg, e: string) {
    setMenu(null);
    // show it at once, then confirm from the server
    qc.setQueryData<Msg[]>(["chat_msgs", room.id], (cur) => (cur ?? []).map((x) => {
      if (x.id !== m.id) return x;
      const was = (x.reactions ?? []).find((r) => r.mine)?.e;
      let rs = (x.reactions ?? []).map((r) => (r.mine ? { ...r, n: r.n - 1, mine: false } : r)).filter((r) => r.n > 0);
      if (was !== e) rs = rs.some((r) => r.e === e) ? rs.map((r) => (r.e === e ? { ...r, n: r.n + 1, mine: true } : r)) : [...rs, { e, n: 1, mine: true }];
      return { ...x, reactions: rs };
    }));
    try { await call("k1_chat_react", { p_message: m.id, p_emoji: e }); await refresh(); } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); void refresh(); }
  }
  async function toggleMute() {
    try { await call("k1_chat_mute", { p_room: room.id, p_muted: !muted }); await qc.invalidateQueries({ queryKey: ["chat_flags"] }); toast.success(muted ? (L ? "सूचनाएँ चालू" : "Unmuted") : (L ? "म्यूट किया" : "Muted")); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  const title = roomTitle(room, L);
  const canEdit = (m: Msg) => m.mine && !m.deleted && !!m.body && Date.now() - Date.parse(m.created_at) < 15 * 60000;
  const otherOnline = room.kind === "dm" && !!room.other_user && online.has(room.other_user);
  const sub = msgs.typing.length
    ? (room.kind === "dm" ? (L ? "लिख रहे हैं…" : "typing…") : `${msgs.typing.slice(0, 2).join(", ")} ${L ? "लिख रहे हैं…" : "typing…"}`)
    : room.kind === "dm" ? (otherOnline ? (L ? "ऑनलाइन" : "online") : (L ? "प्रोफ़ाइल के लिए दबाएँ" : "tap for profile"))
    : room.description || `${room.member_count} ${L ? "सदस्य" : "members"}${room.kind === "channel" ? ` · ${room.org_name}` : ""}`;
  return (
    <>
      <header className="flex items-center gap-2 border-b border-border bg-card px-2 py-2">
        <Button size="icon" variant="ghost" className="lg:hidden" onClick={onBack} aria-label={L ? "वापस" : "Back"}><ArrowLeft className="size-5" /></Button>
        <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => (room.kind === "dm" ? room.other_user && onProfile(room.other_user) : setShowMembers((v) => !v))}>
          {room.kind === "dm" ? <Avatar url={room.other_photo} name={title} size={10} online={otherOnline} />
            : <span className={`grid size-10 shrink-0 place-items-center rounded-full ${room.kind === "group" ? "bg-sky-100 text-sky-700" : "bg-emerald-100 text-emerald-700"}`}>{room.kind === "group" || room.is_private ? <Users className="size-5" /> : <Hash className="size-5" />}</span>}
          <span className="min-w-0">
            <span className="block truncate font-semibold">{title}</span>
            <span className={`block truncate text-xs ${msgs.typing.length || otherOnline ? "text-emerald-600" : "text-muted-foreground"}`}>{sub}</span>
          </span>
        </button>
        <Button size="icon" variant="ghost" onClick={() => void toggleMute()} title={muted ? (L ? "सूचनाएँ चालू करें" : "Unmute") : (L ? "म्यूट करें" : "Mute")}>{muted ? <BellOff className="size-4" /> : <Bell className="size-4" />}</Button>
        {room.kind !== "dm" ? <Button size="sm" variant="ghost" onClick={() => setShowMembers((v) => !v)}><Users className="size-4" /> {room.member_count}</Button> : null}
      </header>
      <div className="relative flex min-h-0 flex-1">
        <div ref={ref} onScroll={onScroll} onClick={() => setMenu(null)} className="chat-wall min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:px-6">
          {list.length >= 50 ? <div className="mb-2 text-center"><Button size="sm" variant="secondary" className="rounded-full shadow-sm" onClick={() => void msgs.loadOlder()}>{L ? "पुराने संदेश" : "Older messages"}</Button></div> : null}
          {msgs.isSuccess && !list.length ? <div className="mx-auto mt-10 max-w-xs rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-900 shadow-sm dark:bg-amber-950 dark:text-amber-100">{L ? "अभी कोई संदेश नहीं — पहला संदेश आप लिखिए। 🙏" : "No messages yet — say hello. 🙏"}</div> : null}
          {list.map((m, idx) => {
            const prev = list[idx - 1]; const next = list[idx + 1];
            const day = new Date(m.created_at).toDateString();
            const showDay = !prev || new Date(prev.created_at).toDateString() !== day;
            const first = showDay || !prev || prev.sender_id !== m.sender_id || Date.parse(m.created_at) - Date.parse(prev.created_at) > 5 * 60000;
            const last = !next || next.sender_id !== m.sender_id || new Date(next.created_at).toDateString() !== day || Date.parse(next.created_at) - Date.parse(m.created_at) > 5 * 60000;
            const imgs = (m.media ?? []).filter((x) => x.type === "image").map((x) => x.url);
            const onlyImg = !m.body && imgs.length > 0 && !m.reply_to;
            const ticks = m.mine && !m.deleted ? ((m.others ?? 0) > 0 && (m.seen_by ?? 0) >= (m.others ?? 0) ? <CheckCheck className="size-3.5 text-sky-500" /> : (m.seen_by ?? 0) > 0 ? <CheckCheck className="size-3.5" /> : <Check className="size-3.5" />) : null;
            return (
              <div key={m.id} className={first ? "mt-2" : "mt-0.5"}>
                {showDay ? <div className="sticky top-0 z-10 my-2 text-center"><span className="rounded-md bg-card/95 px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm">{dayLabel(m.created_at, L)}</span></div> : null}
                <div className={`group flex items-end gap-1.5 ${m.mine ? "flex-row-reverse" : ""}`}>
                  {!m.mine && room.kind !== "dm" ? (last ? <button type="button" onClick={() => onProfile(m.sender_id)} className="shrink-0"><Avatar url={m.sender_photo} name={m.sender_name} size={7} online={online.has(m.sender_id)} /></button> : <span className="w-7 shrink-0" />) : null}
                  <div className={`relative max-w-[82%] sm:max-w-[65%] ${(m.reactions?.length ?? 0) ? "mb-3" : ""}`}>
                    <div
                      onContextMenu={(e) => { e.preventDefault(); if (!m.deleted) setMenu(m.id); }}
                      className={`relative rounded-lg text-[14.5px] leading-snug shadow-sm ${onlyImg ? "p-1" : "px-2 pb-1 pt-1"} ${m.mine ? "bg-[#d9fdd3] text-[#111b21] dark:bg-[#005c4b] dark:text-[#e9edef]" : "bg-white text-[#111b21] dark:bg-[#202c33] dark:text-[#e9edef]"} ${first ? (m.mine ? "rounded-tr-none" : "rounded-tl-none") : ""}`}
                    >
                      {first ? <span aria-hidden className={`absolute top-0 size-2.5 ${m.mine ? "-right-2 bg-[#d9fdd3] dark:bg-[#005c4b]" : "-left-2 bg-white dark:bg-[#202c33]"}`} style={{ clipPath: m.mine ? "polygon(0 0, 100% 0, 0 100%)" : "polygon(0 0, 100% 0, 100% 100%)" }} /> : null}
                      {!m.mine && room.kind !== "dm" && first ? <button type="button" onClick={() => onProfile(m.sender_id)} className="block text-[12.5px] font-semibold hover:underline" style={{ color: nameColor(m.sender_id) }}>{m.sender_name}</button> : null}
                      {m.reply_to ? <div className="mb-1 rounded-md border-l-4 border-emerald-500 bg-black/5 px-2 py-1 text-[12px] dark:bg-white/10"><b className="block text-emerald-700 dark:text-emerald-300">{m.reply_name}</b><span className="line-clamp-2 opacity-80">{m.reply_text}</span></div> : null}
                      {m.deleted ? <i className="flex items-center gap-1 pr-12 text-[13px] opacity-60">🚫 {m.mine ? (L ? "आपने यह संदेश हटाया" : "You deleted this message") : (L ? "यह संदेश हटाया गया" : "This message was deleted")}</i> : <>
                        {imgs.length ? <div className={`grid gap-1 ${imgs.length > 1 ? "grid-cols-2" : ""}`}>{imgs.map((u, i) => <button key={i} type="button" onClick={() => setViewer({ urls: imgs, i })} className="overflow-hidden rounded-md"><img src={u} alt="" loading="lazy" className={`w-full object-cover ${imgs.length > 1 ? "aspect-square max-w-[150px]" : "max-h-72 max-w-xs"}`} /></button>)}</div> : null}
                        {m.body ? <p className="whitespace-pre-wrap break-words">{linkify(m.body)}<span className={`inline-block ${m.edited_at ? "w-24" : m.mine ? "w-16" : "w-12"}`} aria-hidden /></p> : null}
                      </>}
                      <span className={`float-right -mt-3.5 ml-2 flex items-center gap-0.5 text-[10.5px] ${onlyImg ? "absolute bottom-2 right-2 mt-0 rounded bg-black/40 px-1 text-white" : "relative top-1 opacity-60"}`}>
                        {m.edited_at && !m.deleted ? <span>{L ? "बदला" : "edited"}</span> : null}
                        {new Date(m.created_at).toLocaleTimeString(L ? "hi-IN" : "en-IN", { hour: "2-digit", minute: "2-digit" })}
                        {ticks}
                      </span>
                      <span className="clear-both block" />
                      {!m.deleted ? <button type="button" onClick={(e) => { e.stopPropagation(); setMenu(menu === m.id ? null : m.id); }} className={`absolute top-1 grid size-6 place-items-center rounded-full bg-card/90 text-muted-foreground opacity-0 shadow transition group-hover:opacity-100 ${m.mine ? "-left-8" : "-right-8"}`} aria-label={L ? "विकल्प" : "Options"}><Smile className="size-3.5" /></button> : null}
                    </div>
                    {m.reactions?.length ? (
                      <div className={`absolute -bottom-3.5 flex gap-0.5 ${m.mine ? "right-2" : "left-2"}`}>
                        {m.reactions.map((r) => <button key={r.e} type="button" onClick={() => void react(m, r.e)} className={`flex items-center gap-0.5 rounded-full border px-1.5 text-[12px] leading-5 shadow-sm ${r.mine ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950" : "border-border bg-card"}`}>{r.e}{r.n > 1 ? <span className="text-[10px]">{r.n}</span> : null}</button>)}
                      </div>
                    ) : null}
                    {menu === m.id ? (
                      <div onClick={(e) => e.stopPropagation()} className={`absolute z-20 mt-1 w-56 rounded-xl border border-border bg-popover p-1.5 shadow-xl ${m.mine ? "right-0" : "left-0"}`}>
                        <div className="mb-1 flex justify-between border-b border-border pb-1.5">{QUICK.map((e) => <button key={e} type="button" onClick={() => void react(m, e)} className={`grid size-8 place-items-center rounded-full text-lg transition hover:scale-125 ${m.reactions?.some((r) => r.mine && r.e === e) ? "bg-emerald-100 dark:bg-emerald-900" : ""}`}>{e}</button>)}</div>
                        <MenuItem icon={<Reply className="size-4" />} label={L ? "जवाब दें" : "Reply"} onClick={() => { setReply(m); setEditing(null); setMenu(null); taRef.current?.focus(); }} />
                        {m.body ? <MenuItem icon={<Copy className="size-4" />} label={L ? "कॉपी करें" : "Copy"} onClick={() => { void navigator.clipboard?.writeText(m.body ?? ""); setMenu(null); toast.success(L ? "कॉपी हुआ" : "Copied"); }} /> : null}
                        {canEdit(m) ? <MenuItem icon={<Pencil className="size-4" />} label={L ? "बदलें (15 मिनट तक)" : "Edit (15 min)"} onClick={() => { setEditing(m); setReply(null); setText(m.body ?? ""); setMenu(null); taRef.current?.focus(); }} /> : null}
                        {m.mine ? <MenuItem icon={<Trash2 className="size-4" />} label={L ? "सबके लिए हटाएँ" : "Delete for everyone"} danger onClick={() => void del(m)} /> : null}
                        {m.mine && room.kind !== "dm" && (m.others ?? 0) > 0 ? <p className="px-2 pt-1 text-[11px] text-muted-foreground">{L ? `${m.seen_by ?? 0}/${m.others} ने पढ़ा` : `Read by ${m.seen_by ?? 0} of ${m.others}`}</p> : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
          {msgs.typing.length ? <div className="mt-2 flex"><span className="flex items-center gap-1 rounded-lg rounded-tl-none bg-white px-3 py-2 shadow-sm dark:bg-[#202c33]"><Dot d={0} /><Dot d={150} /><Dot d={300} /></span></div> : null}
        </div>
        {away ? <button type="button" onClick={toBottom} className="absolute bottom-3 right-4 grid size-10 place-items-center rounded-full bg-card text-muted-foreground shadow-lg ring-1 ring-border hover:text-foreground" aria-label={L ? "नीचे जाएँ" : "Scroll down"}><ArrowDown className="size-5" /></button> : null}
        {showMembers ? (
          <div className="absolute inset-y-0 right-0 z-30 w-72 max-w-full overflow-y-auto border-l border-border bg-background p-2 text-sm shadow-lg">
            <div className="flex items-center justify-between"><p className="font-semibold">{L ? "सदस्य" : "Members"} · {room.member_count}</p><Button size="icon" variant="ghost" className="size-7" onClick={() => setShowMembers(false)}><X className="size-4" /></Button></div>
            {room.description ? <p className="mb-2 text-xs text-muted-foreground">{room.description}</p> : null}
            {(members.data ?? []).map((u) => <button key={u.user_id} type="button" onClick={() => onProfile(u.user_id)} className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left hover:bg-secondary"><Avatar url={u.photo_url} name={u.name} size={8} online={u.online || online.has(u.user_id)} /><span className="min-w-0 flex-1"><span className="block truncate">{u.name}</span><span className="block truncate text-[11px] text-muted-foreground">{u.online || online.has(u.user_id) ? (L ? "ऑनलाइन" : "online") : timeAgo(u.last_seen_at, L)}</span></span>{u.role !== "member" ? <Badge variant="outline" className="text-[10px]">{u.role}</Badge> : null}</button>)}
            {room.kind === "channel" && !room.joined ? <p className="mt-2 text-xs text-muted-foreground">{L ? "पहला संदेश भेजते ही आप सदस्य बन जाएँगे।" : "You join when you send your first message."}</p> : null}
          </div>
        ) : null}
      </div>
      <footer className="border-t border-border bg-card p-2">
        {reply || editing ? (
          <div className="mb-1.5 flex items-center gap-2 rounded-lg border-l-4 border-emerald-500 bg-secondary px-2 py-1.5 text-xs">
            {editing ? <Pencil className="size-3.5 shrink-0 text-emerald-600" /> : <Reply className="size-3.5 shrink-0 text-emerald-600" />}
            <span className="min-w-0 flex-1"><b className="block text-emerald-700 dark:text-emerald-300">{editing ? (L ? "संदेश बदल रहे हैं" : "Editing message") : reply?.sender_name}</b><span className="block truncate opacity-80">{(editing ?? reply)?.body ?? "📷"}</span></span>
            <button type="button" onClick={() => { setReply(null); if (editing) { setEditing(null); setText(""); } }} aria-label={L ? "रद्द" : "Cancel"}><X className="size-4" /></button>
          </div>
        ) : null}
        {files.length ? <div className="mb-1.5 flex gap-1.5">{files.map((f, i) => <span key={i} className="relative"><img src={URL.createObjectURL(f)} alt="" className="size-14 rounded-md object-cover" /><button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-foreground text-[10px] text-background">✕</button></span>)}</div> : null}
        {emoji ? <div className="mb-1.5 grid grid-cols-10 gap-0.5 rounded-lg border border-border bg-background p-1.5">{EMOJIS.map((e) => <button key={e} type="button" onClick={() => { setText((t) => t + e); taRef.current?.focus(); }} className="grid h-8 place-items-center rounded text-lg hover:bg-secondary">{e}</button>)}</div> : null}
        <div className="flex items-end gap-1.5">
          <div className="flex min-w-0 flex-1 items-end rounded-3xl border border-input bg-background px-1">
            <Button size="icon" variant="ghost" className="size-9 shrink-0 rounded-full" onClick={() => setEmoji((v) => !v)} title={L ? "इमोजी" : "Emoji"}><Smile className={`size-5 ${emoji ? "text-emerald-600" : ""}`} /></Button>
            <textarea
              ref={taRef} value={text} rows={1}
              onChange={(e) => { setText(e.target.value); msgs.sendTyping(); }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !("ontouchstart" in window)) { e.preventDefault(); void send(); } if (e.key === "Escape" && (editing || reply)) { setEditing(null); setReply(null); } }}
              placeholder={L ? "संदेश लिखें" : "Type a message"}
              className="max-h-32 min-h-[38px] w-full min-w-0 flex-1 resize-none bg-transparent px-1 py-2 text-[15px] outline-none"
            />
            {!editing ? <>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { setFiles([...files, ...Array.from(e.target.files ?? [])].slice(0, 4)); e.target.value = ""; }} />
              <Button size="icon" variant="ghost" className="size-9 shrink-0 rounded-full" onClick={() => fileRef.current?.click()} title={L ? "फोटो" : "Photo"}><ImageIcon className="size-5" /></Button>
            </> : null}
          </div>
          <Button size="icon" className="size-11 shrink-0 rounded-full bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => void send()} disabled={busy || (!text.trim() && !files.length)} title={L ? "भेजें" : "Send"}>{editing ? <Check className="size-5" /> : <Send className="size-5" />}</Button>
        </div>
      </footer>
      {viewer ? <Lightbox urls={viewer.urls} index={viewer.i} onClose={() => setViewer(null)} /> : null}
    </>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return <button type="button" onClick={onClick} className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-secondary ${danger ? "text-red-600" : ""}`}>{icon}{label}</button>;
}

function Dot({ d }: { d: number }) {
  return <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${d}ms` }} />;
}

function dayLabel(iso: string, L: boolean) {
  const d = new Date(iso); const now = new Date();
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86400000);
  if (diff === 0) return L ? "आज" : "Today";
  if (diff === 1) return L ? "कल" : "Yesterday";
  return d.toLocaleDateString(L ? "hi-IN" : "en-IN", { day: "numeric", month: "long", year: "numeric" });
}

/** A steady colour per person for names in groups (like WhatsApp). */
function nameColor(id: string) {
  const c = ["#e5484d", "#0090ff", "#30a46c", "#d6409f", "#f76b15", "#8e4ec6", "#12a594", "#ad7f58"];
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return c[Math.abs(h) % c.length];
}

function linkify(s: string) {
  const parts = s.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((p, i) => /^https?:\/\//.test(p) ? <a key={i} href={p} target="_blank" rel="noreferrer" className="underline">{p}</a> : p);
}

function NewRoomDialog({ L, onClose, onCreated }: { L: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const tenant = useTenant();
  const { can } = useAuth();
  const canChannel = can("community.listing.moderate");
  const [kind, setKind] = useState<"group" | "channel">(canChannel ? "channel" : "group");
  const [name, setName] = useState(""); const [nameHi, setNameHi] = useState(""); const [cat, setCat] = useState(""); const [desc, setDesc] = useState(""); const [priv, setPriv] = useState(false);
  const [q, setQ] = useState(""); const [picked, setPicked] = useState<Person[]>([]);
  const people = usePeople({ q, onlineOnly: false, friendsOnly: false, city: "", org: "" }, kind === "group" || priv);
  const [busy, setBusy] = useState(false);
  const options = useMemo(() => (people.data ?? []).filter((p) => !picked.some((x) => x.user_id === p.user_id)).slice(0, 8), [people.data, picked]);
  async function create() {
    setBusy(true);
    try {
      const id = await call<string>("k1_chat_create_room", { p_org: tenant.organization_id, p_kind: kind, p_name: name, p_name_hi: nameHi || null, p_category: cat || null, p_private: priv, p_members: picked.map((p) => p.user_id), p_description: desc || null });
      toast.success(L ? "बन गया।" : "Created"); onCreated(id);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="font-display">{L ? "नया समूह / चैनल" : "New group / channel"}</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          {canChannel ? <div className="flex gap-2"><Button size="sm" variant={kind === "channel" ? "default" : "outline"} onClick={() => setKind("channel")}><Hash className="size-4" /> {L ? "चैनल (सबके लिए)" : "Channel"}</Button><Button size="sm" variant={kind === "group" ? "default" : "outline"} onClick={() => setKind("group")}><Lock className="size-4" /> {L ? "निजी समूह" : "Private group"}</Button></div>
            : <p className="text-xs text-muted-foreground">{L ? "निजी समूह: आप जिन्हें जोड़ेंगे वही देखेंगे। (सबके लिए खुले चैनल संगठन की टीम बनाती है।)" : "Private group: only the people you add can see it. (Public channels are created by the organization team.)"}</p>}
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={L ? "नाम (जैसे: युवा मंच)" : "Name"} />
          {kind === "channel" ? <>
            <Input value={nameHi} onChange={(e) => setNameHi(e.target.value)} placeholder={L ? "हिंदी नाम (वैकल्पिक)" : "Hindi name (optional)"} />
            <Input value={cat} onChange={(e) => setCat(e.target.value)} placeholder={L ? "श्रेणी / सेक्शन (जैसे: सेवा, अवसर)" : "Category / section"} list="chat-cats" />
            <datalist id="chat-cats">{["सामान्य", "सेवा", "अवसर", "कार्यक्रम", "परिवार", "शिक्षा", "युवा", "महिला"].map((c) => <option key={c} value={c} />)}</datalist>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={priv} onChange={(e) => setPriv(e.target.checked)} /> {L ? "निजी चैनल (सिर्फ़ जोड़े गए सदस्य)" : "Private channel (invited members only)"}</label>
          </> : null}
          <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder={L ? "किस बारे में है (वैकल्पिक)" : "What is it about (optional)"} />
          {kind === "group" || priv ? (
            <div>
              <p className="mb-1 text-xs font-semibold">{L ? "सदस्य जोड़ें" : "Add members"}</p>
              <div className="mb-1 flex flex-wrap gap-1">{picked.map((p) => <Badge key={p.user_id} variant="secondary" className="cursor-pointer" onClick={() => setPicked(picked.filter((x) => x.user_id !== p.user_id))}>{p.name} ✕</Badge>)}</div>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L ? "नाम खोजें…" : "Search people…"} />
              {q.length >= 2 ? <ul className="mt-1 max-h-40 overflow-y-auto rounded-md border border-border">{options.map((p) => <li key={p.user_id}><button type="button" className="flex w-full items-center gap-2 px-2 py-1 text-left hover:bg-secondary" onClick={() => { setPicked([...picked, p]); setQ(""); }}><Avatar url={p.photo_url} name={p.name} size={6} /><span className="truncate">{p.name} <span className="text-xs text-muted-foreground">{p.org_names}</span></span></button></li>)}</ul> : null}
            </div>
          ) : null}
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>{L ? "रहने दें" : "Cancel"}</Button><Button onClick={() => void create()} disabled={busy || !name.trim()}>{L ? "बनाएँ" : "Create"}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
