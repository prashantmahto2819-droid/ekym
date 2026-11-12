// Birthdays & anniversaries, Facebook-style: today's / upcoming list with one-tap wishes, and the wishes wall on a profile.
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar } from "@/components/community/ChatBits";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { call, timeAgo } from "@/community/chat";
import { useTenant } from "@/core/tenant-context";

export type Occasion = { user_id: string; name: string; photo_url: string | null; kind: "birthday" | "anniversary"; on_date: string; days_until: number; age: number | null; wished: boolean; wishes: number; online: boolean | null; org_names: string | null };
export type Wish = { from_user: string; from_name: string; from_photo: string | null; kind: string; year: number; message: string | null; created_at: string };

export const occasionLabel = (k: string, L: boolean) => k === "birthday" ? (L ? "जन्मदिन" : "birthday") : (L ? "विवाह वर्षगाँठ" : "anniversary");
const icon = (k: string) => k === "birthday" ? "🎂" : "💐";

export function useOccasions(enabled: boolean, days = 7) {
  const tenant = useTenant();
  return useQuery({ queryKey: ["occasions", tenant.organization_id, days], enabled, staleTime: 60000, queryFn: () => call<Occasion[]>("k1_occasions", { p_org: tenant.organization_id, p_days: days }).catch(() => [] as Occasion[]) });
}

/** Wish dialog: a short message (optional) → k1_wish. */
export function WishDialog({ userId, name, kind, L, onClose }: { userId: string; name: string; kind: "birthday" | "anniversary"; L: boolean; onClose: (sent: boolean) => void }) {
  const tenant = useTenant();
  const qc = useQueryClient();
  const presets = kind === "birthday"
    ? ["जन्मदिन की हार्दिक शुभकामनाएँ! 🎂🎉", "आप स्वस्थ रहें, सुखी रहें, दीर्घायु हों। 🙏", "Happy birthday! God bless you. 🎈"]
    : ["विवाह वर्षगाँठ की हार्दिक बधाई! 💐", "आप दोनों का साथ यूँ ही बना रहे। 🙏", "Happy anniversary to you both! 💞"];
  const [msg, setMsg] = useState(presets[0] ?? "");
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true);
    try { await call("k1_wish", { p_org: tenant.organization_id, p_user: userId, p_kind: kind, p_message: msg }); toast.success(L ? "शुभकामना भेज दी 🎉" : "Wish sent 🎉"); await qc.invalidateQueries({ queryKey: ["occasions"] }); await qc.invalidateQueries({ queryKey: ["wishes", userId] }); onClose(true); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(false); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="font-display">{icon(kind)} {name} — {occasionLabel(kind, L)} {L ? "की शुभकामना" : "wish"}</DialogTitle></DialogHeader>
        <div className="flex flex-wrap gap-1">{presets.map((p) => <button key={p} type="button" onClick={() => setMsg(p)} className={`rounded-full border px-2 py-0.5 text-xs ${msg === p ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"}`}>{p}</button>)}</div>
        <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} maxLength={300} placeholder={L ? "अपने शब्दों में…" : "In your own words…"} />
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => onClose(false)}>{L ? "रहने दें" : "Cancel"}</Button><Button onClick={() => void send()} disabled={busy}>{L ? "शुभकामना भेजें" : "Send wish"}</Button></div>
      </DialogContent>
    </Dialog>
  );
}

/** Today + upcoming (7 days) card. compact = sidebar version. */
export function OccasionsCard({ L, enabled, compact = false, onProfile }: { L: boolean; enabled: boolean; compact?: boolean; onProfile?: (uid: string) => void }) {
  const occ = useOccasions(enabled);
  const [wish, setWish] = useState<Occasion | null>(null);
  const rows = occ.data ?? [];
  if (!enabled || !rows.length) return null;
  const today = rows.filter((r) => r.days_until === 0); const soon = rows.filter((r) => r.days_until > 0);
  const Row = ({ r }: { r: Occasion }) => (
    <li className="flex items-center gap-2 py-1">
      {onProfile ? <button type="button" onClick={() => onProfile(r.user_id)}><Avatar url={r.photo_url} name={r.name} size={compact ? 7 : 9} online={!!r.online} /></button> : <Link to="/u/$id" params={{ id: r.user_id }}><Avatar url={r.photo_url} name={r.name} size={compact ? 7 : 9} online={!!r.online} /></Link>}
      <span className="min-w-0 flex-1 text-sm">
        <Link to="/u/$id" params={{ id: r.user_id }} className="block truncate font-medium hover:underline">{icon(r.kind)} {r.name}</Link>
        <span className="block truncate text-[11px] text-muted-foreground">{r.days_until === 0 ? (L ? "आज" : "today") : r.days_until === 1 ? (L ? "कल" : "tomorrow") : new Date(r.on_date).toLocaleDateString(L ? "hi-IN" : "en-IN", { day: "numeric", month: "short" })} · {occasionLabel(r.kind, L)}{r.age ? ` (${r.age}${r.kind === "birthday" ? (L ? " वर्ष" : " yrs") : (L ? "वीं" : "th")})` : ""}{r.wishes ? ` · ${r.wishes} ${L ? "शुभकामनाएँ" : "wishes"}` : ""}{!compact && r.org_names ? ` · ${r.org_names}` : ""}</span>
      </span>
      {r.days_until === 0 ? <Button size="sm" variant={r.wished ? "ghost" : "default"} className="h-7 px-2 text-xs" onClick={() => setWish(r)}>{r.wished ? (L ? "✓ दी" : "✓ sent") : (L ? "शुभकामना" : "Wish")}</Button> : null}
    </li>
  );
  return (
    <section className={`rounded-xl border border-amber-300/60 bg-gradient-to-br from-amber-50 to-rose-50 p-3 dark:from-amber-950/20 dark:to-rose-950/20 ${compact ? "mb-2" : ""}`}>
      <p className="font-display text-sm font-semibold">🎉 {L ? "जन्मदिन और वर्षगाँठ" : "Birthdays & anniversaries"}</p>
      {today.length ? <ul className="mt-1">{today.map((r) => <Row key={r.user_id + r.kind} r={r} />)}</ul> : <p className="mt-1 text-xs text-muted-foreground">{L ? "आज किसी का नहीं।" : "None today."}</p>}
      {soon.length ? <><p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{L ? "आने वाले" : "Upcoming"}</p><ul>{soon.slice(0, compact ? 4 : 10).map((r) => <Row key={r.user_id + r.kind} r={r} />)}</ul></> : null}
      {wish ? <WishDialog userId={wish.user_id} name={wish.name} kind={wish.kind} L={L} onClose={() => setWish(null)} /> : null}
    </section>
  );
}

/** Wishes wall on a profile: this year's wishes + a composer so people can post a wish any time. */
export function WishesWall({ userId, name, L, mine, birthday, anniversary }: { userId: string; name: string; L: boolean; mine: boolean; birthday: string | null; anniversary: string | null }) {
  const wishes = useQuery({ queryKey: ["wishes", userId], queryFn: () => call<Wish[]>("k1_wishes_for", { p_user: userId }).catch(() => [] as Wish[]) });
  const [kind, setKind] = useState<"birthday" | "anniversary" | null>(null);
  const rows = wishes.data ?? [];
  const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString(L ? "hi-IN" : "en-IN", { day: "numeric", month: "long" }) : null;
  return (
    <section className="rounded-xl border border-border bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">🎉 {L ? "शुभकामनाएँ" : "Wishes"} <span className="text-sm font-normal text-muted-foreground">({rows.length})</span></h2>
        {!mine ? <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => setKind("birthday")}>🎂 {L ? "जन्मदिन की शुभकामना" : "Birthday wish"}</Button>
          {anniversary ? <Button size="sm" variant="outline" onClick={() => setKind("anniversary")}>💐 {L ? "वर्षगाँठ की शुभकामना" : "Anniversary wish"}</Button> : null}
        </div> : null}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{[birthday ? `🎂 ${L ? "जन्मदिन" : "Birthday"}: ${fmt(birthday)}` : null, anniversary ? `💐 ${L ? "वर्षगाँठ" : "Anniversary"}: ${fmt(anniversary)}` : null].filter(Boolean).join(" · ") || (mine ? (L ? "अपनी जन्मतिथि / वर्षगाँठ \"प्रोफ़ाइल सुधारें\" में भरिए — समाज के लोग शुभकामना दे पाएँगे।" : "Add your birthday / anniversary in Edit profile.") : "")}</p>
      <ul className="mt-3 space-y-2">
        {rows.map((w) => (
          <li key={w.from_user + w.kind + w.year} className="flex gap-2">
            <Link to="/u/$id" params={{ id: w.from_user }}><Avatar url={w.from_photo} name={w.from_name} size={8} /></Link>
            <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-secondary px-3 py-2 text-sm">
              <p className="text-xs"><Link to="/u/$id" params={{ id: w.from_user }} className="font-semibold hover:underline">{w.from_name}</Link> <span className="text-muted-foreground">· {icon(w.kind)} {occasionLabel(w.kind, L)} · {timeAgo(w.created_at, L)}</span></p>
              <p className="whitespace-pre-wrap">{w.message || (w.kind === "birthday" ? "🎂 जन्मदिन की शुभकामनाएँ!" : "💐 वर्षगाँठ की शुभकामनाएँ!")}</p>
            </div>
          </li>
        ))}
        {wishes.isSuccess && !rows.length ? <li className="text-sm text-muted-foreground">{L ? "इस साल अभी कोई शुभकामना नहीं।" : "No wishes this year yet."}</li> : null}
      </ul>
      {kind ? <WishDialog userId={userId} name={name} kind={kind} L={L} onClose={() => setKind(null)} /> : null}
    </section>
  );
}
