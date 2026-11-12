// Shared bits for community chat / profiles: avatar with online dot, profile popup card.
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { call, timeAgo, useProfile } from "@/community/chat";

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

