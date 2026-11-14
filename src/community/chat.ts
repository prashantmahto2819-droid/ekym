// Community chat + social profile data layer: rooms, messages (Realtime), presence, people, profiles.
// Everything goes through security-definer RPCs (migration cm_06_chat_social_profiles); the browser never writes tables directly.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { useTenant } from "@/core/tenant-context";
import { useSession } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export async function call<T = unknown>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(fn as never, args as never);
  if (error) throw new Error(error.message);
  return data as T;
}

export type Room = { id: string; organization_id: string; org_name: string; kind: "channel" | "group" | "dm"; name: string; name_hi: string | null; description: string | null; category: string | null; sort_order: number; is_private: boolean; member_count: number; unread: number; last_message_at: string | null; last_text: string | null; joined: boolean; other_user: string | null; other_name: string | null; other_photo: string | null; other_online: boolean | null };
export type Msg = { id: string; sender_id: string; sender_name: string; sender_photo: string | null; body: string | null; media: { type: string; url: string }[]; reply_to: string | null; reply_text: string | null; reply_name: string | null; created_at: string; edited_at: string | null; deleted: boolean; mine: boolean; reactions?: { e: string; n: number; mine: boolean }[]; seen_by?: number; others?: number };
export type RoomFlags = { room_id: string; muted: boolean; last_mine: boolean | null; last_seen: boolean | null; last_at: string | null };
export type Person = { user_id: string; name: string; photo_url: string | null; org_names: string | null; village: string | null; district?: string | null; last_seen_at: string | null; online: boolean; friend_status?: FriendStatus; total?: number };
export type FriendStatus = "none" | "pending_out" | "pending_in" | "friends";
export type Facets = { total: number; online: number; today: number; friends: number; incoming: number; orgs: { id: string; name: string; n: number }[]; districts: { name: string; n: number }[]; cities: { name: string; n: number }[] };
export type FriendRequest = { user_id: string; name: string; photo_url: string | null; direction: "in" | "out"; since: string; org_names: string | null; mutual: number };
export type Recommendation = { user_id: string; name: string; photo_url: string | null; org_names: string | null; village: string | null; online: boolean; score: number; why: string | null; mutual: number };
export type PeopleFilter = { q: string; onlineOnly: boolean; friendsOnly: boolean; city: string; org: string };
export type RoomMember = { user_id: string; name: string; photo_url: string | null; role: string; online: boolean; last_seen_at: string | null };
export type Profile = { user_id: string; name: string; photo_url: string | null; cover_url: string | null; theme?: { preset?: string; layout?: string; stickers?: { e: string; x: number; y: number; s: number }[] }; bio: string | null; village: string | null; district: string | null; state: string | null; occupation: string | null; interests: string[]; links: Record<string, string>; last_seen_at: string | null; online: boolean; mine: boolean; dm_from: string; show_phone: boolean; show_email: boolean; phone: string | null; email: string | null; joined_at: string | null; orgs: { id: string; slug: string; name: string; name_hi: string | null; member_no: string | null; since: string | null; family_id: string | null }[]; roles: { org: string | null; org_en: string; role: string | null; role_en: string }[]; posts: number; blocked: boolean };

export const roomTitle = (r: Room, L: boolean) => r.kind === "dm" ? (r.other_name ?? "…") : (L ? (r.name_hi || r.name) : r.name);

export function useRooms(enabled: boolean) {
  const tenant = useTenant();
  return useQuery({
    queryKey: ["chat_rooms", tenant.organization_id],
    enabled,
    refetchInterval: 30000,
    queryFn: async () => { await call("k1_chat_ensure_defaults", { p_org: tenant.organization_id }).catch(() => undefined); return call<Room[]>("k1_chat_rooms", { p_org: tenant.organization_id }); },
  });
}

/** Messages of one room, newest first from the server, kept oldest→newest for display; new rows arrive over Realtime. */
export function useMessages(roomId: string | null, me?: { id: string; name: string } | null) {
  const qc = useQueryClient();
  const [typing, setTyping] = useState<Record<string, { name: string; at: number }>>({});
  const chRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const q = useQuery({
    queryKey: ["chat_msgs", roomId],
    enabled: !!roomId,
    queryFn: async () => (await call<Msg[]>("k1_chat_messages2", { p_room: roomId, p_limit: 50 })).reverse(),
  });
  useEffect(() => {
    if (!roomId) return;
    const refresh = () => { void qc.invalidateQueries({ queryKey: ["chat_msgs", roomId] }); void qc.invalidateQueries({ queryKey: ["chat_rooms"] }); void qc.invalidateQueries({ queryKey: ["chat_flags"] }); };
    // table changes = new / edited / deleted messages; broadcast = typing, reactions and "read" pings from other people (no table)
    const ch = supabase.channel(`room:${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "cm_chat_messages", filter: `room_id=eq.${roomId}` }, refresh)
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const p = payload as { id: string; name: string };
        if (!p?.id || p.id === me?.id) return;
        setTyping((t) => ({ ...t, [p.id]: { name: p.name, at: Date.now() } }));
      })
      .on("broadcast", { event: "changed" }, refresh)
      .subscribe();
    chRef.current = ch;
    const t = setInterval(() => setTyping((cur) => { const now = Date.now(); const n = Object.fromEntries(Object.entries(cur).filter(([, v]) => now - v.at < 4000)); return Object.keys(n).length === Object.keys(cur).length ? cur : n; }), 1500);
    return () => { clearInterval(t); chRef.current = null; setTyping({}); void supabase.removeChannel(ch); };
  }, [roomId, qc, me?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const lastTyping = useRef(0);
  /** Tell others in the room that I am typing (at most every 2.5 s). */
  function sendTyping() {
    const now = Date.now();
    if (!me || now - lastTyping.current < 2500) return;
    lastTyping.current = now;
    void chRef.current?.send({ type: "broadcast", event: "typing", payload: { id: me.id, name: me.name } });
  }
  /** Ask others to refresh (after a reaction or after I read the room). */
  function ping() { void chRef.current?.send({ type: "broadcast", event: "changed", payload: {} }); }
  async function loadOlder() {
    const cur = q.data ?? [];
    if (!cur.length || !roomId) return 0;
    const older = (await call<Msg[]>("k1_chat_messages2", { p_room: roomId, p_before: cur[0]!.created_at, p_limit: 50 })).reverse();
    qc.setQueryData<Msg[]>(["chat_msgs", roomId], [...older, ...cur]);
    return older.length;
  }
  return { ...q, loadOlder, typing: Object.values(typing).map((v) => v.name), sendTyping, ping };
}

/** Muted / my-last-message / seen per room, for the chat list ticks. */
export function useRoomFlags(enabled: boolean) {
  return useQuery({ queryKey: ["chat_flags"], enabled, refetchInterval: 30000, queryFn: () => call<RoomFlags[]>("k1_chat_room_flags") });
}

/** Who is online right now (Realtime presence per root community) + a heartbeat on last_seen_at. */
export function usePresence(enabled: boolean, me: { id: string; name: string; photo: string | null } | null) {
  const tenant = useTenant();
  const [online, setOnline] = useState<Set<string>>(new Set());
  const key = tenant.organization_id;
  useEffect(() => {
    if (!enabled || !me) return;
    const ch = supabase.channel(`presence:community`, { config: { presence: { key: me.id } } });
    ch.on("presence", { event: "sync" }, () => setOnline(new Set(Object.keys(ch.presenceState()))))
      .subscribe(async (status) => { if (status === "SUBSCRIBED") await ch.track({ name: me.name, photo: me.photo, org: key, at: Date.now() }); });
    const beat = () => { if (document.visibilityState === "visible") void call("k1_touch_presence").catch(() => undefined); };
    beat();
    const t = setInterval(beat, 60000);
    document.addEventListener("visibilitychange", beat);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", beat); void supabase.removeChannel(ch); };
  }, [enabled, me?.id, me?.name, me?.photo, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return online;
}

export function usePeople(f: PeopleFilter, enabled: boolean, limit = 80) {
  const tenant = useTenant();
  return useQuery({
    queryKey: ["chat_people", tenant.organization_id, f, limit],
    enabled,
    staleTime: 20000,
    queryFn: () => call<Person[]>("k1_people", { p_org: tenant.organization_id, p_q: f.q || null, p_online: f.onlineOnly, p_limit: limit, p_friends: f.friendsOnly, p_city: f.city || null, p_filter_org: f.org || null, p_offset: 0 }),
  });
}
export function useFacets(enabled: boolean) {
  const tenant = useTenant();
  return useQuery({ queryKey: ["people_facets", tenant.organization_id], enabled, staleTime: 60000, queryFn: () => call<Facets>("k1_people_facets", { p_org: tenant.organization_id }).catch(() => null) });
}
export function useFriendRequests(enabled: boolean) {
  return useQuery({ queryKey: ["friend_requests"], enabled, refetchInterval: 60000, queryFn: () => call<FriendRequest[]>("k1_friend_requests").catch(() => [] as FriendRequest[]) });
}
export function useRecommendations(enabled: boolean) {
  const tenant = useTenant();
  return useQuery({ queryKey: ["people_recommend", tenant.organization_id], enabled, staleTime: 120000, queryFn: () => call<Recommendation[]>("k1_people_recommend", { p_org: tenant.organization_id, p_limit: 12 }).catch(() => [] as Recommendation[]) });
}
/** Friend actions; all invalidate the people/profile queries. */
export function useFriendActions() {
  const tenant = useTenant();
  const qc = useQueryClient();
  const done = async () => { await Promise.all([qc.invalidateQueries({ queryKey: ["chat_people"] }), qc.invalidateQueries({ queryKey: ["friend_requests"] }), qc.invalidateQueries({ queryKey: ["people_recommend"] }), qc.invalidateQueries({ queryKey: ["people_facets"] }), qc.invalidateQueries({ queryKey: ["profile_social"] }), qc.invalidateQueries({ queryKey: ["friends_of"] })]); };
  return {
    request: async (uid: string) => { const r = await call<string>("k1_friend_request", { p_org: tenant.organization_id, p_user: uid }); await done(); return r as FriendStatus; },
    respond: async (uid: string, accept: boolean) => { await call("k1_friend_respond", { p_org: tenant.organization_id, p_user: uid, p_accept: accept }); await done(); },
    unfriend: async (uid: string) => { await call("k1_unfriend", { p_user: uid }); await done(); },
  };
}

export function useProfile(userId: string | null) {
  return useQuery({ queryKey: ["profile", userId], enabled: !!userId, queryFn: () => call<Profile>("k1_profile", { p_user: userId }) });
}

export function useMe() {
  const { user } = useSession();
  const p = useProfile(user?.id ?? null);
  return { user, profile: p.data ?? null, me: user ? { id: user.id, name: p.data?.name ?? "…", photo: p.data?.photo_url ?? null } : null };
}

export function useChatUnread(enabled: boolean) {
  return useQuery({ queryKey: ["chat_unread"], enabled, refetchInterval: 30000, queryFn: () => call<number>("k1_chat_unread").catch(() => 0) });
}

/** Upload a picture into the public community bucket; returns its public URL. */
export async function uploadCommunityImage(file: File, folder: string, maxEdge = 1600): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("image only");
  if (file.type === "image/gif") {
    if (file.size > 5 * 1024 * 1024) throw new Error("GIF 5 MB से छोटी रखें");
    const gpath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.gif`;
    const { error: gerr } = await supabase.storage.from("community").upload(gpath, file, { contentType: "image/gif", upsert: true });
    if (gerr) throw new Error(gerr.message);
    return supabase.storage.from("community").getPublicUrl(gpath).data.publicUrl;
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => b ? res(b) : rej(new Error("encode")), "image/jpeg", 0.85));
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
  const { error } = await supabase.storage.from("community").upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(error.message);
  return supabase.storage.from("community").getPublicUrl(path).data.publicUrl;
}

export const timeAgo = (iso: string | null | undefined, L: boolean) => {
  if (!iso) return "";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 90) return L ? "अभी" : "just now";
  if (s < 3600) return `${Math.round(s / 60)} ${L ? "मिनट पहले" : "min ago"}`;
  if (s < 86400) return `${Math.round(s / 3600)} ${L ? "घंटे पहले" : "h ago"}`;
  return new Date(iso).toLocaleDateString(L ? "hi-IN" : "en-IN", { day: "numeric", month: "short" });
};

/** Scroll a list to the bottom when new items arrive and the user was already near the bottom. */
export function useStickToBottom<T>(dep: T) {
  const ref = useRef<HTMLDivElement | null>(null);
  const stick = useRef(true);
  const [away, setAway] = useState(false);
  useEffect(() => { const el = ref.current; if (el && stick.current) el.scrollTop = el.scrollHeight; }, [dep]);
  const onScroll = () => { const el = ref.current; if (el) { stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; setAway(!stick.current); } };
  const toBottom = () => { const el = ref.current; if (el) { el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }); stick.current = true; setAway(false); } };
  return { ref, onScroll, away, toBottom };
}
