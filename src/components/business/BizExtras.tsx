// Business page extras: star rating, reviews (write / edit / delete, owner reply, moderator hide) and the owner's stats panel.
import { Link } from "@tanstack/react-router";
import { Eye, Globe, Heart, MapPin, MessageCircle, Phone, Rocket, Share2, Star, UserPlus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { useBizRefresh, useBizStats, useReviews, type BizPage, type Review } from "@/components/business/biz";
import { Avatar } from "@/components/community/ChatBits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { call, timeAgo } from "@/community/chat";
import { useAuth } from "@/hooks/use-auth";

export function Stars({ value, size = "size-4", onPick }: { value: number; size?: string; onPick?: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  const v = hover || value;
  return (
    <span className="inline-flex items-center gap-0.5" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const full = v >= n, half = !full && v >= n - 0.5;
        const icon = <Star className={`${size} ${full ? "fill-amber-400 text-amber-400" : half ? "fill-amber-200 text-amber-400" : "text-muted-foreground/40"}`} />;
        return onPick ? <button key={n} type="button" aria-label={`${n}★`} onMouseEnter={() => setHover(n)} onClick={() => onPick(n)} className="p-0.5">{icon}</button> : <span key={n}>{icon}</span>;
      })}
    </span>
  );
}

export function RatingLine({ r, hi }: { r: { avg: number | null; count: number } | undefined; hi: boolean }) {
  if (!r?.count) return <span className="text-xs text-muted-foreground">{hi ? "अभी कोई समीक्षा नहीं" : "No reviews yet"}</span>;
  return <span className="inline-flex items-center gap-1 text-sm"><b>{r.avg?.toFixed(1)}</b><Stars value={r.avg ?? 0} size="size-3.5" /><span className="text-xs text-muted-foreground">({r.count})</span></span>;
}

export function Reviews({ b, hi, member }: { b: BizPage; hi: boolean; member: boolean }) {
  const { user } = useAuth();
  const q = useReviews(b.id);
  const refresh = useBizRefresh();
  const mine = q.data?.find((r) => r.mine);
  const [rating, setRating] = useState(b.my_review?.rating ?? 0);
  const [body, setBody] = useState(b.my_review?.body ?? "");
  const [editing, setEditing] = useState(!b.my_review);
  const [busy, setBusy] = useState(false);
  const L = (h: string, e: string) => (hi ? h : e);
  async function save() {
    if (!rating) { toast.error(L("सितारे चुनें", "Pick the stars")); return; }
    setBusy(true);
    try { await call("biz_review_save", { p_page: b.id, p_rating: rating, p_body: body.trim() || null }); toast.success(L("समीक्षा सहेजी — धन्यवाद!", "Review saved — thank you!")); setEditing(false); await refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  }
  async function del() {
    if (!confirm(L("अपनी समीक्षा हटाएँ?", "Delete your review?"))) return;
    try { await call("biz_review_delete", { p_page: b.id }); setRating(0); setBody(""); setEditing(true); await refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  const counts = [5, 4, 3, 2, 1].map((n) => ({ n, c: (q.data ?? []).filter((r) => r.status === "active" && r.rating === n).length }));
  const total = counts.reduce((a, x) => a + x.c, 0);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/70 sm:grid-cols-[160px_1fr]">
        <div className="text-center">
          <p className="font-display text-5xl font-bold">{b.rating?.avg?.toFixed(1) ?? "—"}</p>
          <Stars value={b.rating?.avg ?? 0} />
          <p className="text-xs text-muted-foreground">{b.rating?.count ?? 0} {L("समीक्षाएँ", "reviews")}</p>
        </div>
        <div className="space-y-1">
          {counts.map((x) => (
            <div key={x.n} className="flex items-center gap-2 text-xs"><span className="w-6 text-right">{x.n}★</span><span className="h-2 flex-1 overflow-hidden rounded-full bg-secondary"><span className="block h-full rounded-full bg-amber-400" style={{ width: `${total ? (x.c / total) * 100 : 0}%` }} /></span><span className="w-6 text-muted-foreground">{x.c}</span></div>
          ))}
        </div>
      </div>
      {user && member && !b.mine ? (
        editing ? (
          <div className="space-y-2 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/70">
            <p className="text-sm font-semibold">{mine ? L("अपनी समीक्षा बदलें", "Edit your review") : L("अपना अनुभव बताइए", "Share your experience")}</p>
            <Stars value={rating} size="size-7" onPick={setRating} />
            <Textarea rows={3} maxLength={1500} value={body} onChange={(e) => setBody(e.target.value)} placeholder={L("सेवा, सामान, व्यवहार कैसा लगा… (वैकल्पिक)", "How was the service, product, behaviour… (optional)")} />
            <div className="flex gap-2"><Button size="sm" onClick={() => void save()} disabled={busy}>{L("सहेजें", "Save")}</Button>{mine ? <Button size="sm" variant="outline" onClick={() => setEditing(false)}>{L("रहने दें", "Cancel")}</Button> : null}</div>
          </div>
        ) : <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setEditing(true)}>{L("मेरी समीक्षा बदलें", "Edit my review")}</Button><Button size="sm" variant="ghost" onClick={() => void del()}>{L("हटाएँ", "Delete")}</Button></div>
      ) : !user ? <p className="text-sm text-muted-foreground"><Link to="/auth" className="underline">{L("लॉगिन करें", "Sign in")}</Link> {L("और समीक्षा लिखें।", "to write a review.")}</p> : null}
      {(q.data ?? []).map((r) => <ReviewRow key={r.user_id} r={r} b={b} hi={hi} onChanged={() => void refresh()} />)}
      {q.isSuccess && !q.data.length ? <p className="rounded-2xl bg-card px-4 py-8 text-center text-sm text-muted-foreground shadow-sm ring-1 ring-border/70">{L("अभी कोई समीक्षा नहीं — पहली आप लिखिए।", "No reviews yet — be the first.")}</p> : null}
    </div>
  );
}

function ReviewRow({ r, b, hi, onChanged }: { r: Review; b: BizPage; hi: boolean; onChanged: () => void }) {
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState(r.reply ?? "");
  const L = (h: string, e: string) => (hi ? h : e);
  async function sendReply() {
    try { await call("biz_review_reply", { p_page: b.id, p_user: r.user_id, p_reply: reply }); setReplying(false); onChanged(); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  async function hide(h: boolean) { try { await call("biz_review_hide", { p_page: b.id, p_user: r.user_id, p_hide: h }); onChanged(); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } }
  return (
    <article className={`rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/70 ${r.status === "hidden" ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-2.5">
        <Link to="/u/$id" params={{ id: r.user_id }}><Avatar url={r.photo} name={r.name} size={9} /></Link>
        <div className="min-w-0 flex-1"><Link to="/u/$id" params={{ id: r.user_id }} className="text-sm font-semibold hover:underline">{r.name}</Link><p className="flex items-center gap-2 text-xs text-muted-foreground"><Stars value={r.rating} size="size-3.5" />{timeAgo(r.updated_at, hi)}{r.status === "hidden" ? ` · ${L("छिपाई गई", "hidden")}` : ""}</p></div>
        {b.can_moderate ? <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => void hide(r.status !== "hidden")}>{r.status === "hidden" ? L("दिखाएँ", "Show") : L("छिपाएँ", "Hide")}</button> : null}
      </div>
      {r.body ? <p className="mt-2 whitespace-pre-wrap text-sm">{r.body}</p> : null}
      {r.reply && !replying ? <div className="ml-4 mt-3 rounded-xl bg-secondary/60 px-3 py-2 text-sm"><p className="text-xs font-semibold">{L("व्यापारी का जवाब", "Owner's reply")}</p><p className="whitespace-pre-wrap">{r.reply}</p></div> : null}
      {b.mine ? (replying ? (
        <div className="ml-4 mt-2 space-y-2"><Textarea rows={2} maxLength={1000} value={reply} onChange={(e) => setReply(e.target.value)} placeholder={L("धन्यवाद या जवाब लिखें…", "Write a thank-you or reply…")} /><div className="flex gap-2"><Button size="sm" onClick={() => void sendReply()}>{L("जवाब भेजें", "Send reply")}</Button><Button size="sm" variant="ghost" onClick={() => setReplying(false)}>{L("रहने दें", "Cancel")}</Button></div></div>
      ) : <button type="button" className="ml-4 mt-2 text-xs font-semibold text-primary hover:underline" onClick={() => setReplying(true)}>{r.reply ? L("जवाब बदलें", "Edit reply") : L("जवाब दें", "Reply")}</button>) : null}
    </article>
  );
}

export function StatsPanel({ b, hi }: { b: BizPage; hi: boolean }) {
  const [days, setDays] = useState(30);
  const q = useBizStats(b.id, days);
  const s = q.data;
  const L = (h: string, e: string) => (hi ? h : e);
  const ev = s?.events ?? {};
  const contacts = (ev.call ?? 0) + (ev.whatsapp ?? 0) + (ev.map ?? 0) + (ev.website ?? 0) + (ev.email ?? 0);
  const Tile = ({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number; tone: string }) => (
    <div className="rounded-2xl bg-card p-3 shadow-sm ring-1 ring-border/70"><span className={`grid size-9 place-items-center rounded-xl ${tone}`}>{icon}</span><p className="mt-2 font-display text-2xl font-bold">{value.toLocaleString("en-IN")}</p><p className="text-xs text-muted-foreground">{label}</p></div>
  );
  // fill missing days so the bars line up
  const series = (() => {
    const map = new Map((s?.daily ?? []).map((d) => [d.day, d]));
    const out: { day: string; views: number; contacts: number }[] = [];
    const n = Math.min(days, 30);
    for (let i = n - 1; i >= 0; i--) { const d = new Date(Date.now() - i * 864e5 + 5.5 * 36e5).toISOString().slice(0, 10); out.push(map.get(d) ?? { day: d, views: 0, contacts: 0 }); }
    return out;
  })();
  const max = Math.max(1, ...series.map((x) => x.views + x.contacts));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{L("आपके पेज पर लोगों की गतिविधि (आपकी अपनी विज़िट नहीं गिनी जाती)", "Activity on your page (your own visits are not counted)")}</p>
        <div className="flex rounded-full bg-secondary p-0.5 text-xs font-semibold">{[7, 30, 90].map((d) => <button key={d} type="button" onClick={() => setDays(d)} className={`rounded-full px-3 py-1 ${days === d ? "bg-background shadow-sm" : "text-muted-foreground"}`}>{d} {L("दिन", "days")}</button>)}</div>
      </div>
      {q.isLoading ? <div className="h-40 animate-pulse rounded-2xl bg-muted" /> : null}
      {s ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile icon={<Eye className="size-5" />} label={L("पेज देखा गया", "Page views")} value={ev.view ?? 0} tone="bg-sky-100 text-sky-700 dark:bg-sky-950/50" />
            <Tile icon={<Phone className="size-5" />} label={L("संपर्क (कॉल/WhatsApp/रास्ता)", "Contacts (call/WA/map)")} value={contacts} tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50" />
            <Tile icon={<UserPlus className="size-5" />} label={L("नए फ़ॉलोअर्स", "New followers")} value={s.new_followers} tone="bg-violet-100 text-violet-700 dark:bg-violet-950/50" />
            <Tile icon={<Rocket className="size-5" />} label={L("प्रायोजित पहुँच", "Sponsored reach")} value={s.sponsored_reach} tone="bg-orange-100 text-orange-700 dark:bg-orange-950/50" />
          </div>
          <div className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/70">
            <div className="mb-2 flex items-center gap-4 text-xs"><span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-sky-500" />{L("देखा", "Views")}</span><span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-emerald-500" />{L("संपर्क", "Contacts")}</span></div>
            <div className="flex h-36 items-end gap-0.5">
              {series.map((x) => (
                <div key={x.day} className="group relative flex h-full flex-1 flex-col justify-end" title={`${x.day}: ${x.views} / ${x.contacts}`}>
                  <span className="block rounded-t-sm bg-emerald-500" style={{ height: `${(x.contacts / max) * 100}%` }} />
                  <span className="block bg-sky-500" style={{ height: `${(x.views / max) * 100}%` }} />
                </div>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>{series[0]?.day.slice(5)}</span><span>{series.at(-1)?.day.slice(5)}</span></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 rounded-2xl bg-card p-4 text-sm shadow-sm ring-1 ring-border/70">
              <p className="font-semibold">{L("संपर्क का ब्योरा", "Contact breakdown")}</p>
              {([["call", <Phone key="i" className="size-4" />, L("कॉल", "Calls")], ["whatsapp", <MessageCircle key="i" className="size-4" />, "WhatsApp"], ["map", <MapPin key="i" className="size-4" />, L("रास्ता देखा", "Directions")], ["website", <Globe key="i" className="size-4" />, L("वेबसाइट", "Website")], ["share", <Share2 key="i" className="size-4" />, L("शेयर", "Shares")]] as const).map(([k, icon, label]) => (
                <p key={k} className="flex items-center justify-between"><span className="flex items-center gap-2 text-muted-foreground">{icon}{label}</span><b>{ev[k] ?? 0}</b></p>
              ))}
            </div>
            <div className="space-y-2 rounded-2xl bg-card p-4 text-sm shadow-sm ring-1 ring-border/70">
              <p className="font-semibold">{L("पोस्ट", "Posts")} ({s.posts}) · <Heart className="inline size-3.5" /> {s.likes} · 💬 {s.comments} · ↗ {s.shares}</p>
              {s.top_posts.length ? s.top_posts.map((t) => <Link key={t.id} to="/community/$id" params={{ id: t.id }} className="flex justify-between gap-2 rounded-lg px-2 py-1 hover:bg-secondary"><span className="truncate">{t.body || "—"}</span><span className="shrink-0 text-xs text-muted-foreground">👍 {t.likes} · 💬 {t.comments}</span></Link>) : <p className="text-muted-foreground">{L("इस अवधि में कोई पोस्ट नहीं।", "No posts in this period.")}</p>}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{L(`कुल फ़ॉलोअर्स: ${s.followers}। ज़्यादा लोगों तक पहुँचने के लिए किसी पोस्ट के ⋯ मेनू से "बूस्ट करें" चुनें।`, `Total followers: ${s.followers}. To reach more people, use "Boost" in a post's ⋯ menu.`)}</p>
        </>
      ) : null}
    </div>
  );
}
