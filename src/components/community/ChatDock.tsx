// Facebook जैसी चैट-खिड़कियाँ, साइट के हर पेज पर (चैट पेज को छोड़कर):
// * किसी का सीधा संदेश आए (cm_notifications kind chat_dm, realtime) और वह चैट म्यूट न हो —
//   कंप्यूटर पर नीचे दाईं ओर छोटी खिड़की खुलती है; फ़ोन पर ऊपर छोटी सूचना आती है, दबाने पर खिड़की (पूरी स्क्रीन) खुलती है।
// * खिड़की: छोटा करें (—), बंद करें (✕), म्यूट (1 घंटा / 8 घंटे / 1 दिन / 1 हफ़्ता / हमेशा), पूरे चैट पेज पर खोलें।
// * कंप्यूटर पर नीचे दाईं ओर गोल चैट-बटन: बिना पढ़े संदेशों की गिनती + हाल की बातचीत की सूची।
// * साइट खुली रहे तो हर मिनट "ऑनलाइन" का संकेत (k1_touch_presence) — ताकि WhatsApp / push सूचना बेवजह न जाए।
import { Link, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Maximize2, MessageCircle, Minus, Paperclip, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Avatar } from "@/components/community/ChatBits";
import { isMuted, MuteMenu, useChatMutes } from "@/components/community/MuteMenu";
import { call, CHAT_FILE_ACCEPT, roomTitle, uploadChatFile, useChatSigned, useChatUnread, useMe, useMessages, useRooms, type ChatMedia, type Room } from "@/community/chat";
import { useLang } from "@/core/i18n";
import { moduleOn } from "@/core/modules";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

type Win = { id: string; min: boolean };
const KEY = "k1_chat_dock";
const load = (): Win[] => { try { return JSON.parse(sessionStorage.getItem(KEY) ?? "[]") as Win[]; } catch { return []; } };
const roomFromLink = (link: string | null | undefined) => /room=([0-9a-f-]{36})/.exec(link ?? "")?.[1] ?? null;
const isPhone = () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;

export function ChatDock() {
  const L = useLang().lang === "hi";
  const { user, me } = useMe();
  const { orgs } = useAuth();
  const tenant = useTenant();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const hidden = !user || !orgs.length || !moduleOn(tenant.branding, "community") || path.startsWith("/community/chat") || path.startsWith("/admin") || path.startsWith("/auth");
  const qc = useQueryClient();
  const [wins, setWins] = useState<Win[]>([]);
  const [list, setList] = useState(false);
  const rooms = useRooms(!!user);
  const mutes = useChatMutes(!!user);
  const unread = useChatUnread(!!user);
  const mutesRef = useRef(mutes.data); mutesRef.current = mutes.data;
  const hiddenRef = useRef(hidden); hiddenRef.current = hidden;

  useEffect(() => { setWins(load()); }, []);
  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(wins)); } catch { /* निजी विंडो */ } }, [wins]);

  const open = (id: string, min = false) => setWins((w) => {
    const rest = w.filter((x) => x.id !== id);
    const max = isPhone() ? 1 : 3;
    return [...rest, { id, min }].slice(-max);
  });

  // ऑनलाइन संकेत (हर पेज पर)
  useEffect(() => {
    if (!user) return;
    const beat = () => { if (document.visibilityState === "visible") void call("k1_touch_presence").catch(() => undefined); };
    beat(); const t = setInterval(beat, 60_000);
    document.addEventListener("visibilitychange", beat);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", beat); };
  }, [user]);

  // नया सीधा संदेश → खिड़की / सूचना
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`dock:${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "cm_notifications", filter: `user_id=eq.${user.id}` }, (p) => {
        const n = p.new as { kind: string; link: string | null; text: string | null };
        if (n.kind !== "chat_dm") return;
        void qc.invalidateQueries({ queryKey: ["chat_rooms"] }); void qc.invalidateQueries({ queryKey: ["chat_unread"] });
        const rid = roomFromLink(n.link);
        if (!rid || hiddenRef.current || isMuted(mutesRef.current, rid)) return;
        void qc.invalidateQueries({ queryKey: ["chat_msgs", rid] });
        if (isPhone()) {
          toast(n.text ?? (L ? "नया संदेश" : "New message"), { icon: "✉️", duration: 6000, action: { label: L ? "खोलें" : "Open", onClick: () => open(rid) } });
        } else setWins((w) => (w.some((x) => x.id === rid) ? w : [...w, { id: rid, min: false }].slice(-3)));
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user, qc, L]);

  if (hidden) return null;
  const byId = new Map((rooms.data ?? []).map((r) => [r.id, r]));
  const recent = (rooms.data ?? []).filter((r) => r.kind !== "channel" || r.unread > 0).slice(0, 12);
  const total = unread.data ?? 0;

  return (
    <div className="pointer-events-none fixed bottom-0 right-0 z-[45] flex items-end gap-2 pr-2 sm:pr-4 max-md:inset-x-0 max-md:p-0">
      {wins.map((w) => {
        const r = byId.get(w.id);
        return <ChatWindow key={w.id} roomId={w.id} room={r} min={w.min} L={L} me={me}
          onMin={() => setWins((ws) => ws.map((x) => (x.id === w.id ? { ...x, min: !x.min } : x)))}
          onClose={() => setWins((ws) => ws.filter((x) => x.id !== w.id))} />;
      })}
      {/* कंप्यूटर: गोल चैट-बटन + हाल की बातचीत */}
      <div className="pointer-events-auto relative mb-4 hidden md:block">
        {list ? (
          <div className="absolute bottom-16 right-0 w-80 overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-3 py-2"><b className="text-sm">💬 {L ? "बातचीत" : "Chats"}</b><Link to="/community/chat" className="text-xs text-primary hover:underline" onClick={() => setList(false)}>{L ? "सब देखें" : "See all"}</Link></div>
            <ul className="max-h-96 overflow-y-auto py-1">
              {recent.map((r) => (
                <li key={r.id}><button type="button" onClick={() => { open(r.id); setList(false); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-secondary">
                  <Avatar url={r.kind === "dm" ? r.other_photo : null} name={roomTitle(r, L)} size={9} online={!!r.other_online} />
                  <span className="min-w-0 flex-1"><span className={`block truncate text-sm ${r.unread ? "font-semibold" : ""}`}>{roomTitle(r, L)}</span><span className="block truncate text-xs text-muted-foreground">{r.last_text ?? ""}</span></span>
                  {r.unread ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-emerald-600 px-1 text-[11px] font-bold text-white">{r.unread}</span> : null}
                </button></li>
              ))}
              {!recent.length ? <li className="px-3 py-6 text-center text-sm text-muted-foreground">{L ? "अभी कोई बातचीत नहीं" : "No chats yet"}</li> : null}
            </ul>
          </div>
        ) : null}
        <button type="button" onClick={() => setList((v) => !v)} className="relative grid size-12 place-items-center rounded-full bg-emerald-600 text-white shadow-lg ring-4 ring-background hover:bg-emerald-700" aria-label={L ? "चैट" : "Chats"}>
          <MessageCircle className="size-6" />
          {total ? <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-bold">{total > 99 ? "99+" : total}</span> : null}
        </button>
      </div>
    </div>
  );
}

function ChatWindow({ roomId, room, min, L, me, onMin, onClose }: { roomId: string; room: Room | undefined; min: boolean; L: boolean; me: { id: string; name: string; photo: string | null } | null; onMin: () => void; onClose: () => void }) {
  const qc = useQueryClient();
  const msgs = useMessages(roomId, me);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const list = msgs.data ?? [];
  const signed = useChatSigned(list.flatMap((m) => (m.media ?? []).filter((x) => x.path).map((x) => x.path!)));
  const srcOf = (x: ChatMedia) => x.url ?? (x.path ? signed.data?.[x.path] : undefined) ?? "";
  const title = room ? roomTitle(room, L) : "…";
  const lastId = list[list.length - 1]?.id;
  useEffect(() => { if (!min) endRef.current?.scrollIntoView({ block: "end" }); }, [lastId, min]);
  useEffect(() => {
    if (min) return;
    void call("k1_chat_read", { p_room: roomId }).then(() => { msgs.ping(); void qc.invalidateQueries({ queryKey: ["chat_unread"] }); void qc.invalidateQueries({ queryKey: ["chat_rooms"] }); }).catch(() => undefined);
  }, [roomId, lastId, min]); // eslint-disable-line react-hooks/exhaustive-deps

  async function send(files: File[] = []) {
    if (!text.trim() && !files.length) return;
    setBusy(true);
    try {
      const media: ChatMedia[] = [];
      for (const f of files.slice(0, 4)) media.push(await uploadChatFile(f, roomId));
      await call("k1_chat_send", { p_room: roomId, p_body: text.trim(), p_media: media, p_reply: null });
      setText(""); await qc.invalidateQueries({ queryKey: ["chat_msgs", roomId] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  }

  const head = (
    <div className="flex items-center gap-2 bg-emerald-700 px-2.5 py-2 text-white">
      <button type="button" onClick={onMin} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <Avatar url={room?.kind === "dm" ? room.other_photo : null} name={title} size={8} online={!!room?.other_online} />
        <span className="min-w-0"><span className="block truncate text-sm font-semibold">{title}</span>{!min ? <span className="block text-[11px] opacity-80">{room?.other_online ? (L ? "ऑनलाइन" : "online") : msgs.typing.length ? (L ? "लिख रहे हैं…" : "typing…") : ""}</span> : null}</span>
        {min && room?.unread ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-bold">{room.unread}</span> : null}
      </button>
      <MuteMenu roomId={roomId} L={L} className="size-7 hover:bg-white/15" iconClass="size-4" />
      <Link to="/community/chat" search={{ room: roomId }} className="grid size-7 place-items-center rounded-full hover:bg-white/15" title={L ? "पूरे पेज पर खोलें" : "Open full chat"}><Maximize2 className="size-3.5" /></Link>
      <button type="button" onClick={onMin} className="grid size-7 place-items-center rounded-full hover:bg-white/15" title={min ? (L ? "खोलें" : "Expand") : (L ? "छोटा करें" : "Minimise")}><Minus className="size-4" /></button>
      <button type="button" onClick={onClose} className="grid size-7 place-items-center rounded-full hover:bg-white/15" title={L ? "बंद करें" : "Close"}><X className="size-4" /></button>
    </div>
  );

  if (min) return <div className="pointer-events-auto w-60 overflow-hidden rounded-t-xl shadow-xl max-md:hidden">{head}</div>;
  return (
    <div className="pointer-events-auto flex h-[440px] w-80 flex-col overflow-hidden rounded-t-xl border border-border bg-background shadow-2xl max-md:fixed max-md:inset-0 max-md:h-[100dvh] max-md:w-full max-md:rounded-none">
      {head}
      <div className="chat-wall min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-2">
        {msgs.isLoading ? <div className="h-20 animate-pulse rounded-lg bg-card/70" /> : null}
        {list.slice(-40).map((m) => {
          const imgs = (m.media ?? []).filter((x) => x.type === "image").map(srcOf).filter(Boolean);
          const docs = (m.media ?? []).filter((x) => x.type === "file");
          return (
            <div key={m.id} className={`flex ${m.mine ? "justify-end" : ""}`}>
              <div className={`max-w-[85%] rounded-lg px-2 py-1 text-[13.5px] shadow-sm ${m.mine ? "bg-[#d9fdd3] text-[#111b21] dark:bg-[#005c4b] dark:text-[#e9edef]" : "bg-white text-[#111b21] dark:bg-[#202c33] dark:text-[#e9edef]"}`}>
                {m.deleted ? <i className="opacity-60">🚫 {L ? "हटाया गया" : "deleted"}</i> : <>
                  {imgs.map((u, i) => <a key={i} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" className="mb-1 max-h-48 rounded-md" /></a>)}
                  {docs.map((d, i) => <a key={i} href={srcOf(d)} target="_blank" rel="noreferrer" className="mb-1 block truncate rounded bg-black/5 px-2 py-1 text-xs underline">📎 {d.name ?? "file"}</a>)}
                  {(m.media ?? []).some((x) => x.type === "expired") ? <i className="block text-xs opacity-70">🗂️ {L ? "फ़ाइल 30 दिन बाद हटाई गई" : "file removed after 30 days"}</i> : null}
                  {m.body ? <span className="whitespace-pre-wrap break-words">{m.body}</span> : null}
                </>}
                <span className="ml-2 float-right mt-1 text-[10px] opacity-60">{new Date(m.created_at).toLocaleTimeString(L ? "hi-IN" : "en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="flex items-end gap-1 border-t border-border bg-card p-1.5">
        <input ref={fileRef} type="file" accept={CHAT_FILE_ACCEPT} multiple hidden onChange={(e) => { const fs = Array.from(e.target.files ?? []); e.target.value = ""; if (fs.length) void send(fs); }} />
        <button type="button" onClick={() => fileRef.current?.click()} className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary" title={L ? "फोटो / फ़ाइल (30 दिन तक रहेगी)" : "Photo / file (kept 30 days)"}><Paperclip className="size-4" /></button>
        <textarea value={text} rows={1} onChange={(e) => { setText(e.target.value); msgs.sendTyping(); }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !("ontouchstart" in window)) { e.preventDefault(); void send(); } }}
          placeholder={L ? "संदेश लिखें" : "Type a message"} className="max-h-24 min-h-[36px] flex-1 resize-none rounded-2xl border border-input bg-background px-3 py-1.5 text-sm outline-none" />
        <button type="button" onClick={() => void send()} disabled={busy || !text.trim()} className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-600 text-white disabled:opacity-50"><Send className="size-4" /></button>
      </div>
    </div>
  );
}
