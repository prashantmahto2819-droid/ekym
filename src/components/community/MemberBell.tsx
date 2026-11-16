// Member notification bell (header): everything addressed to the signed-in person — likes, comments, mentions, chat DMs,
// friend requests, wishes, birthdays, renewal and organisation messages. Realtime + 60 s poll; mark all read on open.
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Avatar } from "@/components/community/ChatBits";
import { Button } from "@/components/ui/button";
import { call, timeAgo } from "@/community/chat";
import { supabase } from "@/integrations/supabase/client";

type N = { id: string; kind: string; text: string | null; link: string | null; actor_id: string | null; actor_name: string | null; actor_photo: string | null; post_id: string | null; read_at: string | null; created_at: string; unread: number };
const ICON: Record<string, string> = { like: "👍", comment: "💬", reply: "↩️", mention: "@", moderation: "🛡️", appeal: "🙋", chat_dm: "✉️", birthday: "🎂", anniversary: "💐", wish: "🎉", friend_request: "🤝", friend_accept: "✅", system: "📣", renewal: "🔔", announcement: "📣", event: "📅", blood: "🩸" };

export function MemberBell({ L, userId }: { L: boolean; userId: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const q = useQuery({ queryKey: ["my_notifications"], refetchInterval: 60_000, queryFn: () => call<N[]>("k1_my_notifications", { p_limit: 40 }).catch(() => [] as N[]) });
  const unread = q.data?.[0]?.unread ?? 0;
  const prefs = useQuery({ queryKey: ["notif_prefs"], staleTime: 300_000, queryFn: () => call<{ muted_kinds: string[] }>("k1_notification_prefs_get").catch(() => ({ muted_kinds: [] as string[] })) });
  const mutedRef = useRef<string[]>([]); mutedRef.current = prefs.data?.muted_kinds ?? [];
  const go = (link: string | null, post: string | null) => {
    const to = link ?? (post ? `/community/${post}` : null);
    if (!to) return;
    if (to.startsWith("http")) window.open(to, "_blank"); else void navigate({ href: to });
  };
  const goRef = useRef(go); goRef.current = go;
  useEffect(() => {
    const ch = supabase.channel(`notif:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "cm_notifications", filter: `user_id=eq.${userId}` }, (p) => {
        void qc.invalidateQueries({ queryKey: ["my_notifications"] });
        // हर पेज पर छोटी सूचना (चैट वाली ChatDock दिखाता है)
        const n = p.new as { kind: string; text: string | null; link: string | null; post_id: string | null };
        if (n.kind === "chat_dm" || mutedRef.current.includes(n.kind) || !n.text) return;
        toast(n.text.slice(0, 140), { icon: ICON[n.kind] ?? "🔔", duration: 6000, ...(n.link || n.post_id ? { action: { label: "देखें", onClick: () => goRef.current(n.link, n.post_id) } } : {}) });
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [userId, qc]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  async function toggle() {
    const next = !open; setOpen(next);
    if (next && unread) { await call("k1_cm_notifications_read", { p_ids: null }).catch(() => undefined); void qc.invalidateQueries({ queryKey: ["my_notifications"] }); void qc.invalidateQueries({ queryKey: ["cm_notifications"] }); }
  }
  return (
    <div ref={box} className="relative">
      <Button variant="ghost" size="icon" className="relative" title={L ? "सूचनाएँ" : "Notifications"} onClick={() => void toggle()}>
        <Bell className="size-5" />
        {unread > 0 ? <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">{unread > 99 ? "99+" : unread}</span> : null}
      </Button>
      {open ? (
        <div className="absolute right-0 z-50 mt-1 w-[min(92vw,360px)] overflow-hidden rounded-xl border border-border bg-background shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-3 py-2"><p className="font-semibold">{L ? "सूचनाएँ" : "Notifications"}</p><Link to="/me/notifications" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground" title={L ? "सूचना सेटिंग" : "Settings"}><Settings className="size-4" /></Link></div>
          <ul className="max-h-[70vh] overflow-y-auto text-sm">
            {(q.data ?? []).map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => { setOpen(false); go(n.link, n.post_id); }} className={`flex w-full gap-2 px-3 py-2 text-left hover:bg-secondary ${n.read_at ? "" : "bg-primary/5"}`}>
                  {n.actor_id ? <Avatar url={n.actor_photo} name={n.actor_name ?? "?"} size={8} /> : <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-base">{ICON[n.kind] ?? "•"}</span>}
                  <span className="min-w-0 flex-1"><span className="line-clamp-3">{n.actor_id ? <>{ICON[n.kind] ?? ""} </> : null}{n.text}</span><span className="block text-[11px] text-muted-foreground">{timeAgo(n.created_at, L)}</span></span>
                </button>
              </li>
            ))}
            {q.isSuccess && !q.data?.length ? <li className="p-4 text-center text-muted-foreground">{L ? "अभी कोई सूचना नहीं।" : "No notifications yet."}</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
