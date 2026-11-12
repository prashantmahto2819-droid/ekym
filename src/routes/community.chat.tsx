// समुदाय चैट — channels by category (this organization + the whole Kalchuri community), private groups, 1:1 messages,
// who is online, people directory across organizations, profile card. Members only.
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Hash, Image as ImageIcon, Lock, MessageCircle, Plus, Search, Send, Users, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, FriendButton, ProfileCard } from "@/components/community/ChatBits";
import { OccasionsCard } from "@/components/community/Occasions";
import { StoriesStrip } from "@/components/community/Stories";
import { call, roomTitle, timeAgo, uploadCommunityImage, useFacets, useFriendRequests, useMe, useMessages, usePeople, usePresence, useRecommendations, useRooms, useStickToBottom, type Msg, type PeopleFilter, type Person, type Room, type RoomMember } from "@/community/chat";
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
  const channels = list.filter((r) => r.kind === "channel");
  const cats = Array.from(new Set(channels.map((c) => c.category || (L ? "अन्य" : "Other"))));
  const dms = list.filter((r) => r.kind === "dm");
  const groups = list.filter((r) => r.kind === "group");
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
        <div className="min-h-0 flex-1 overflow-y-auto p-2 text-sm">
          <OccasionsCard L={L} enabled compact onProfile={(uid) => setProfileOf(uid)} />
          {cats.map((cat) => (
            <div key={cat} className="mb-3">
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{cat}</p>
              {channels.filter((c) => (c.category || (L ? "अन्य" : "Other")) === cat).map((c) => <RoomRow key={c.id} r={c} L={L} active={c.id === roomId} onClick={() => openRoom(c.id)} />)}
            </div>
          ))}
          {groups.length ? <div className="mb-3"><p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{L ? "समूह" : "Groups"}</p>{groups.map((c) => <RoomRow key={c.id} r={c} L={L} active={c.id === roomId} onClick={() => openRoom(c.id)} />)}</div> : null}
          <div className="mb-3">
            <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{L ? "सीधे संदेश" : "Direct messages"}</p>
            {dms.length ? dms.map((c) => <RoomRow key={c.id} r={c} L={L} active={c.id === roomId} onClick={() => openRoom(c.id)} online={!!c.other_user && online.has(c.other_user)} />)
              : <p className="px-2 text-xs text-muted-foreground">{L ? "\"लोग\" में किसी पर क्लिक करके संदेश भेजिए।" : "Pick someone under People to start a conversation."}</p>}
          </div>
        </div>
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
          {room ? <RoomView room={room} L={L} online={online} onBack={() => { setRoomId(null); void navigate({ to: "/community/chat", search: {}, replace: true }); }} onProfile={(uid) => setProfileOf(uid)} />
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

function RoomRow({ r, L, active, onClick, online }: { r: Room; L: boolean; active: boolean; onClick: () => void; online?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-secondary ${active ? "bg-secondary font-semibold" : ""}`}>
      {r.kind === "dm" ? <Avatar url={r.other_photo} name={r.other_name ?? "?"} size={7} online={online} /> : r.is_private || r.kind === "group" ? <Lock className="size-4 shrink-0 text-muted-foreground" /> : <Hash className="size-4 shrink-0 text-muted-foreground" />}
      <span className="min-w-0 flex-1">
        <span className="block truncate">{roomTitle(r, L)}</span>
        {r.last_text ? <span className="block truncate text-[11px] font-normal text-muted-foreground">{r.last_text}</span> : r.description ? <span className="block truncate text-[11px] font-normal text-muted-foreground">{r.description}</span> : null}
      </span>
      {r.unread > 0 ? <Badge className="h-5 min-w-5 justify-center px-1.5 text-[10px]">{r.unread}</Badge> : null}
    </button>
  );
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

function RoomView({ room, L, online, onBack, onProfile }: { room: Room; L: boolean; online: Set<string>; onBack: () => void; onProfile: (uid: string) => void }) {
  const tenant = useTenant();
  const qc = useQueryClient();
  const msgs = useMessages(room.id);
  const [text, setText] = useState(""); const [files, setFiles] = useState<File[]>([]); const [reply, setReply] = useState<Msg | null>(null); const [busy, setBusy] = useState(false); const [showMembers, setShowMembers] = useState(false);
  const { ref, onScroll } = useStickToBottom(msgs.data?.length);
  const fileRef = useRef<HTMLInputElement>(null);
  const consent = useConsent();
  useEffect(() => { void call("k1_chat_read", { p_room: room.id }).then(() => qc.invalidateQueries({ queryKey: ["chat_rooms"] })).catch(() => undefined); }, [room.id, msgs.data?.length, qc]);
  const members = useQuery({ queryKey: ["chat_members", room.id], enabled: showMembers, queryFn: () => call<RoomMember[]>("k1_chat_members", { p_room: room.id }) });
  async function send() {
    if (!text.trim() && !files.length) return;
    if (!consent.accepted) { consent.ensure(() => void send()); return; }
    setBusy(true);
    try {
      const media: { type: string; url: string }[] = [];
      for (const f of files.slice(0, 4)) media.push({ type: "image", url: await uploadCommunityImage(f, `${tenant.organization_id}/chat/${room.id}`) });
      await call("k1_chat_send", { p_room: room.id, p_body: text.trim(), p_media: media, p_reply: reply?.id ?? null });
      setText(""); setFiles([]); setReply(null);
      await qc.invalidateQueries({ queryKey: ["chat_msgs", room.id] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  }
  async function del(m: Msg) { if (!confirm(L ? "संदेश हटाएँ?" : "Delete message?")) return; try { await call("k1_chat_delete", { p_message: m.id }); await qc.invalidateQueries({ queryKey: ["chat_msgs", room.id] }); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } }
  const title = roomTitle(room, L);
  const list = msgs.data ?? [];
  let lastDay = "";
  return (
    <>
      <header className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Button size="icon" variant="ghost" className="lg:hidden" onClick={onBack}><ArrowLeft className="size-4" /></Button>
        {room.kind === "dm" ? <button type="button" onClick={() => room.other_user && onProfile(room.other_user)}><Avatar url={room.other_photo} name={title} size={8} online={!!room.other_user && online.has(room.other_user)} /></button> : <Hash className="size-5 text-muted-foreground" />}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{title} {room.kind === "channel" ? <span className="text-xs font-normal text-muted-foreground">· {room.org_name}</span> : null}</p>
          <p className="truncate text-xs text-muted-foreground">{room.kind === "dm" ? (room.other_user && online.has(room.other_user) ? (L ? "ऑनलाइन" : "online") : (L ? "ऑफ़लाइन" : "offline")) : room.description || `${room.member_count} ${L ? "सदस्य" : "members"}`}</p>
        </div>
        {room.kind !== "dm" ? <Button size="sm" variant="ghost" onClick={() => setShowMembers((v) => !v)}><Users className="size-4" /> {room.member_count}</Button> : null}
      </header>
      <div className="relative flex min-h-0 flex-1">
        <div ref={ref} onScroll={onScroll} className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {list.length >= 50 ? <div className="text-center"><Button size="sm" variant="ghost" onClick={() => void msgs.loadOlder()}>{L ? "पुराने संदेश" : "Older messages"}</Button></div> : null}
          {msgs.isSuccess && !list.length ? <p className="py-10 text-center text-sm text-muted-foreground">{L ? "अभी कोई संदेश नहीं — पहला संदेश आप लिखिए।" : "No messages yet — say hello."}</p> : null}
          {list.map((m) => {
            const day = new Date(m.created_at).toDateString(); const showDay = day !== lastDay; lastDay = day;
            return (
              <div key={m.id}>
                {showDay ? <div className="my-2 text-center text-[11px] text-muted-foreground"><span className="rounded-full bg-secondary px-2 py-0.5">{new Date(m.created_at).toLocaleDateString(L ? "hi-IN" : "en-IN", { day: "numeric", month: "long", year: "numeric" })}</span></div> : null}
                <div className={`group flex gap-2 ${m.mine ? "flex-row-reverse" : ""}`}>
                  {!m.mine ? <button type="button" onClick={() => onProfile(m.sender_id)} className="mt-1 shrink-0"><Avatar url={m.sender_photo} name={m.sender_name} size={7} online={online.has(m.sender_id)} /></button> : null}
                  <div className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-sm ${m.mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-secondary"}`}>
                    {!m.mine && room.kind !== "dm" ? <button type="button" onClick={() => onProfile(m.sender_id)} className="block text-[11px] font-semibold text-primary hover:underline">{m.sender_name}</button> : null}
                    {m.reply_to ? <div className={`mb-1 border-l-2 pl-2 text-[11px] opacity-80 ${m.mine ? "border-primary-foreground/60" : "border-primary"}`}><b>{m.reply_name}</b>: {m.reply_text}</div> : null}
                    {m.deleted ? <i className="opacity-70">{L ? "संदेश हटाया गया" : "message deleted"}</i> : <>
                      {m.body ? <p className="whitespace-pre-wrap break-words">{linkify(m.body)}</p> : null}
                      {m.media?.length ? <div className="mt-1 flex flex-wrap gap-1">{m.media.map((x, i) => <a key={i} href={x.url} target="_blank" rel="noreferrer"><img src={x.url} alt="" className="max-h-56 rounded-lg object-cover" /></a>)}</div> : null}
                    </>}
                    <div className={`mt-0.5 flex items-center gap-2 text-[10px] opacity-70 ${m.mine ? "justify-end" : ""}`}>
                      <span>{new Date(m.created_at).toLocaleTimeString(L ? "hi-IN" : "en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                      {!m.deleted ? <button type="button" className="opacity-0 hover:underline group-hover:opacity-100" onClick={() => setReply(m)}>{L ? "जवाब" : "reply"}</button> : null}
                      {!m.deleted && m.mine ? <button type="button" className="opacity-0 hover:underline group-hover:opacity-100" onClick={() => void del(m)}>{L ? "हटाएँ" : "delete"}</button> : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {showMembers ? (
          <div className="absolute inset-y-0 right-0 w-64 overflow-y-auto border-l border-border bg-background p-2 text-sm shadow-lg">
            <div className="flex items-center justify-between"><p className="font-semibold">{L ? "सदस्य" : "Members"}</p><Button size="icon" variant="ghost" className="size-7" onClick={() => setShowMembers(false)}><X className="size-4" /></Button></div>
            {(members.data ?? []).map((u) => <button key={u.user_id} type="button" onClick={() => onProfile(u.user_id)} className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left hover:bg-secondary"><Avatar url={u.photo_url} name={u.name} size={7} online={u.online || online.has(u.user_id)} /><span className="min-w-0 flex-1 truncate">{u.name}</span>{u.role !== "member" ? <Badge variant="outline" className="text-[10px]">{u.role}</Badge> : null}</button>)}
            {room.kind === "channel" && !room.joined ? <p className="mt-2 text-xs text-muted-foreground">{L ? "पहला संदेश भेजते ही आप सदस्य बन जाएँगे।" : "You join when you send your first message."}</p> : null}
          </div>
        ) : null}
      </div>
      <footer className="border-t border-border p-2">
        {reply ? <div className="mb-1 flex items-center gap-2 rounded-md bg-secondary px-2 py-1 text-xs"><span className="min-w-0 flex-1 truncate"><b>{reply.sender_name}</b>: {reply.body ?? "📷"}</span><button type="button" onClick={() => setReply(null)}><X className="size-3" /></button></div> : null}
        {files.length ? <div className="mb-1 flex gap-1">{files.map((f, i) => <span key={i} className="rounded bg-secondary px-2 py-0.5 text-xs">{f.name} <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))}>✕</button></span>)}</div> : null}
        <div className="flex items-end gap-1">
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => setFiles([...files, ...Array.from(e.target.files ?? [])].slice(0, 4))} />
          <Button size="icon" variant="ghost" onClick={() => fileRef.current?.click()} title={L ? "फोटो" : "Photo"}><ImageIcon className="size-5" /></Button>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !("ontouchstart" in window)) { e.preventDefault(); void send(); } }} rows={1} placeholder={L ? `${title} में लिखें… (Enter = भेजें, Shift+Enter = नई पंक्ति)` : `Message ${title}…`} className="min-h-[40px] max-h-32 flex-1 resize-none" />
          <Button size="icon" onClick={() => void send()} disabled={busy || (!text.trim() && !files.length)} title={L ? "भेजें" : "Send"}><Send className="size-4" /></Button>
        </div>
      </footer>
    </>
  );
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
