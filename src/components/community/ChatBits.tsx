// Shared bits for community chat / profiles: avatar with online dot, profile popup card.
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useConsent } from "@/components/community/ConsentGate";
import { call, timeAgo, useFriendActions, useProfile, type FriendStatus } from "@/community/chat";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/hooks/use-auth";

export const Avatar = ({ url, name, size = 9, online }: { url: string | null | undefined; name: string; size?: number | undefined; online?: boolean | undefined }) => (
  <span className="relative inline-grid shrink-0 place-items-center rounded-full bg-primary/10 font-display font-semibold text-primary" style={{ width: size * 4, height: size * 4, fontSize: size * 1.6 }}>
    <span className="grid size-full place-items-center overflow-hidden rounded-full">{url ? <img src={url} alt="" className="size-full object-cover" /> : name.slice(0, 1)}</span>
    {online ? <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-background bg-emerald-500" /> : null}
  </span>
);

/** Profile card (popup) with "message" / "full profile" / block. */
export function ProfileCard({ userId, L, online, onClose, onDm }: { userId: string; L: boolean; online: boolean; onClose: () => void; onDm: (uid: string) => void }) {
  const p = useProfile(userId);
  const qc = useQueryClient();
  const d = p.data;
  async function block(on: boolean) { try { await call("k1_chat_block", { p_user: userId, p_on: on }); await qc.invalidateQueries({ queryKey: ["profile", userId] }); toast.success(on ? (L ? "ब्लॉक किया" : "Blocked") : (L ? "अनब्लॉक किया" : "Unblocked")); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md overflow-hidden p-0">
        <div className="h-28 bg-gradient-to-r from-primary/30 to-primary/10 bg-cover bg-center" style={d?.cover_url ? { backgroundImage: `url(${d.cover_url})` } : undefined} />
        <div className="-mt-10 px-5 pb-5">
          <div className="flex items-end gap-3">
            <span className="rounded-full border-4 border-background"><Avatar url={d?.photo_url} name={d?.name ?? "?"} size={20} online={online || !!d?.online} /></span>
            <div className="min-w-0 flex-1 pb-1"><DialogHeader><DialogTitle className="truncate font-display text-lg">{d?.name ?? "…"}</DialogTitle></DialogHeader><p className="text-xs text-muted-foreground">{online || d?.online ? (L ? "🟢 ऑनलाइन" : "🟢 online") : d?.last_seen_at ? `${L ? "आख़िरी बार" : "last seen"} ${timeAgo(d.last_seen_at, L)}` : ""}</p></div>
          </div>
          {d ? (
            <div className="mt-3 space-y-2 text-sm">
              {d.bio ? <p className="whitespace-pre-wrap">{d.bio}</p> : null}
              <p className="text-muted-foreground">{[d.occupation, d.village, d.district].filter(Boolean).join(" · ")}</p>
              <div className="flex flex-wrap gap-1">{d.orgs.map((o) => <Badge key={o.id} variant="secondary">{L ? (o.name_hi || o.name) : o.name}{o.member_no ? ` · ${o.member_no}` : ""}</Badge>)}</div>
              {d.roles.length ? <div className="flex flex-wrap gap-1">{d.roles.map((r, i) => <Badge key={i} variant="outline">{L ? (r.role || r.role_en) : r.role_en} · {L ? (r.org || r.org_en) : r.org_en}</Badge>)}</div> : null}
              {d.phone ? <p>📞 <a href={`tel:${d.phone}`} className="hover:underline">{d.phone}</a></p> : null}
              <SocialLine userId={userId} L={L} mine={d.mine} />
              <div className="flex flex-wrap gap-2 pt-1">
                {!d.mine ? <Button size="sm" onClick={() => onDm(userId)} disabled={d.blocked}><Send className="size-4" /> {L ? "संदेश भेजें" : "Message"}</Button> : null}
                <Button asChild size="sm" variant="outline"><Link to="/u/$id" params={{ id: userId }}>{L ? "पूरी प्रोफ़ाइल" : "Full profile"}</Link></Button>
                {d.mine ? <Button asChild size="sm" variant="outline"><Link to="/me/profile">{L ? "प्रोफ़ाइल सुधारें" : "Edit profile"}</Link></Button> : <Button size="sm" variant="ghost" onClick={() => void block(!d.blocked)}>{d.blocked ? (L ? "अनब्लॉक" : "Unblock") : (L ? "ब्लॉक" : "Block")}</Button>}
              </div>
            </div>
          ) : <p className="mt-3 text-sm text-muted-foreground">…</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}


/** Friend request / accept / friends state button. */
export function FriendButton({ userId, status, L, size = "sm", onChanged }: { userId: string; status: FriendStatus | undefined; L: boolean; size?: "sm" | "default"; onChanged?: (s: FriendStatus) => void }) {
  const acts = useFriendActions();
  const consent = useConsent();
  const [busy, setBusy] = useState(false);
  const [st, setSt] = useState<FriendStatus>(status ?? "none");
  useEffect(() => { setSt(status ?? "none"); }, [status]);
  const run = async (fn: () => Promise<FriendStatus | void>, next: FriendStatus, msg: string) => { setBusy(true); try { const r = await fn(); const s = (r as FriendStatus | undefined) ?? next; setSt(s); onChanged?.(s); toast.success(msg); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); } };
  if (st === "friends") return <Button size={size} variant="outline" disabled={busy} onClick={() => { if (confirm(L ? "मित्र सूची से हटाएँ?" : "Remove friend?")) void run(() => acts.unfriend(userId), "none", L ? "हटाया।" : "Removed"); }}>✓ {L ? "मित्र" : "Friends"}</Button>;
  if (st === "pending_out") return <Button size={size} variant="ghost" disabled={busy} onClick={() => void run(() => acts.unfriend(userId), "none", L ? "अनुरोध वापस लिया।" : "Request withdrawn")}>⏳ {L ? "अनुरोध भेजा" : "Requested"}</Button>;
  if (st === "pending_in") return <span className="flex gap-1"><Button size={size} disabled={busy} onClick={() => void run(() => acts.respond(userId, true), "friends", L ? "अब आप मित्र हैं 🤝" : "You are friends now 🤝")}>{L ? "स्वीकारें" : "Accept"}</Button><Button size={size} variant="ghost" disabled={busy} onClick={() => void run(() => acts.respond(userId, false), "none", L ? "अस्वीकार किया।" : "Declined")}>{L ? "नहीं" : "Decline"}</Button></span>;
  return <Button size={size} variant="outline" disabled={busy} onClick={() => consent.ensure(() => run(() => acts.request(userId), "pending_out", L ? "मित्रता अनुरोध भेजा।" : "Friend request sent"))}>{L ? "+ मित्र बनाएँ" : "+ Add friend"}</Button>;
}

export type Social = { friend_status: FriendStatus; friends: number; mutual: number; followers?: number; following?: number; i_follow?: boolean };
export function useProfileSocial(userId: string | null) {
  return useQuery({ queryKey: ["profile_social", userId], enabled: !!userId, queryFn: () => call<Social>("k1_profile_social", { p_user: userId }).catch(() => null) });
}

/** One-way follow (Instagram-style). Friends follow each other automatically. */
export function FollowButton({ userId, following, L, size = "sm", variant = "button", onChanged }: { userId: string; following: boolean; L: boolean; size?: "sm" | "default"; variant?: "button" | "link"; onChanged?: (f: boolean) => void }) {
  const qc = useQueryClient();
  const consent = useConsent();
  const [f, setF] = useState(following);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setF(following); }, [following]);
  const run = async () => {
    setBusy(true);
    const next = !f; setF(next);
    try {
      await call(next ? "k1_follow" : "k1_unfollow", { p_user: userId });
      onChanged?.(next);
      void qc.invalidateQueries({ queryKey: ["profile_social", userId] });
      void qc.invalidateQueries({ queryKey: ["follow_list"] });
      if (next) toast.success(L ? "फ़ॉलो किया — इनकी पोस्ट अब आपके फ़ीड में ऊपर आएँगी" : "Following — their posts will show up in your feed");
    } catch (e) { setF(!next); toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  };
  if (variant === "link") return <button type="button" disabled={busy} onClick={() => (f ? void run() : consent.ensure(() => void run()))} className={`text-sm font-semibold hover:underline ${f ? "text-muted-foreground" : "text-primary"}`}>{f ? (L ? "फ़ॉलो कर रहे हैं" : "Following") : (L ? "फ़ॉलो करें" : "Follow")}</button>;
  return <Button size={size} variant={f ? "outline" : "default"} disabled={busy} onClick={() => (f ? void run() : consent.ensure(() => void run()))}>{f ? (L ? "✓ फ़ॉलो कर रहे हैं" : "✓ Following") : (L ? "+ फ़ॉलो करें" : "+ Follow")}</Button>;
}

/** Followers / following list in a popup. */
export function FollowListDialog({ userId, kind, L, onClose }: { userId: string; kind: "followers" | "following"; L: boolean; onClose: () => void }) {
  const q = useQuery({ queryKey: ["follow_list", userId, kind], queryFn: () => call<{ user_id: string; name: string; photo_url: string | null; i_follow: boolean; friend: boolean }[]>("k1_follow_list", { p_user: userId, p_kind: kind, p_limit: 200 }).catch(() => []) });
  const { user } = useSession();
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[80vh] max-w-sm overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">{kind === "followers" ? (L ? "फ़ॉलोअर्स" : "Followers") : (L ? "फ़ॉलो कर रहे हैं" : "Following")}</DialogTitle></DialogHeader>
        <ul className="space-y-1">
          {(q.data ?? []).map((r) => (
            <li key={r.user_id} className="flex items-center gap-2.5 rounded-xl p-1.5 hover:bg-secondary">
              <Link to="/u/$id" params={{ id: r.user_id }} onClick={onClose}><Avatar url={r.photo_url} name={r.name} size={10} /></Link>
              <Link to="/u/$id" params={{ id: r.user_id }} onClick={onClose} className="min-w-0 flex-1 truncate text-sm font-semibold hover:underline">{r.name}{r.friend ? <span className="ml-1 text-xs font-normal text-muted-foreground">· {L ? "मित्र" : "friend"}</span> : null}</Link>
              {r.user_id !== user?.id ? <FollowButton userId={r.user_id} following={r.i_follow} L={L} /> : null}
            </li>
          ))}
          {q.isSuccess && !q.data?.length ? <li className="py-6 text-center text-sm text-muted-foreground">{L ? "अभी कोई नहीं।" : "No one yet."}</li> : null}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

/** "N मित्र · M फ़ॉलोअर्स · K फ़ॉलो कर रहे" + follow and friend buttons (used in the card and the profile page). */
export function SocialLine({ userId, L, mine }: { userId: string; L: boolean; mine: boolean }) {
  const s = useProfileSocial(userId);
  const [list, setList] = useState<null | "followers" | "following">(null);
  if (!s.data) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span>👥 {s.data.friends} {L ? "मित्र" : "friends"}{!mine && s.data.mutual ? ` · ${s.data.mutual} ${L ? "साझा" : "mutual"}` : ""}</span>
      <button type="button" className="hover:underline" onClick={() => setList("followers")}><b className="text-foreground">{s.data.followers ?? 0}</b> {L ? "फ़ॉलोअर्स" : "followers"}</button>
      <button type="button" className="hover:underline" onClick={() => setList("following")}><b className="text-foreground">{s.data.following ?? 0}</b> {L ? "फ़ॉलो कर रहे" : "following"}</button>
      {!mine ? <FollowButton userId={userId} following={!!s.data.i_follow} L={L} /> : null}
      {!mine ? <FriendButton userId={userId} status={s.data.friend_status} L={L} /> : null}
      {list ? <FollowListDialog userId={userId} kind={list} L={L} onClose={() => setList(null)} /> : null}
    </div>
  );
}
