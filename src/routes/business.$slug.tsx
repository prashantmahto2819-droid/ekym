// One business page: cover, logo, follow, call / WhatsApp / map, offer, about, services, hours, posts; owner edits and posts
// (with today's quota), moderators can block or unblock.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Globe, Mail, MapPin, Pencil, Phone, Share2, ShieldAlert, Store } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { bizTrack, catOf, catLabel, inr, planName, telLink, useBizPage, useBizRefresh, useSponsorStatus, waLink, type BizPage } from "@/components/business/biz";
import { PlanDialog } from "@/components/business/PlanDialog";
import { ManagerBanner, ManagersBox, RatingLine, Reviews, StatsPanel } from "@/components/business/BizExtras";
import { BizEditor, BizFollowButton, BizLogo, TierBadge, Verified } from "@/components/business/BizUI";
import { CreatePost, PostCard, type Post } from "@/components/site/Feed";
import { EmptyState } from "@/components/site/kit";
import { Button } from "@/components/ui/button";
import { call } from "@/community/chat";
import { useLang } from "@/core/i18n";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/business/$slug")({
  head: () => ({ meta: [{ title: "व्यापार पेज · Business page" }] }),
  component: BizPageView,
});

function BizPageView() {
  const { slug } = Route.useParams();
  const { lang } = useLang();
  const hi = lang === "hi";
  const tenant = useTenant();
  const { user } = useAuth();
  const qc = useQueryClient();
  const refresh = useBizRefresh();
  const q = useBizPage(slug);
  const b = q.data;
  const [editing, setEditing] = useState(false);
  const [posting, setPosting] = useState(false);
  const [tab, setTab] = useState<"posts" | "reviews" | "stats">("posts");
  const { orgs } = useAuth();
  useEffect(() => { if (q.data?.id && !q.data.mine) bizTrack(q.data.id, "view"); }, [q.data?.id, q.data?.mine]);
  const posts = useInfiniteQuery({
    queryKey: ["feed", "biz-page", b?.id ?? null],
    enabled: !!b,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => call<Post[]>("biz_feed", { p_org: tenant.organization_id, p_page: b!.id, p_category: null, p_city: null, p_q: null, p_offset: pageParam, p_limit: 15 }),
    getNextPageParam: (last, all) => (last.length === 15 ? all.flat().length : undefined),
  });
  if (q.isLoading) return <div className="container-page py-10"><div className="h-64 animate-pulse rounded-2xl bg-muted" /></div>;
  if (!b) return <div className="container-page py-16"><EmptyState icon={<Store />} title={hi ? "यह व्यापार पेज नहीं मिला" : "Business page not found"} action={{ label: hi ? "व्यापार निर्देशिका" : "Business directory", to: "/business" }} /></div>;
  const c = catOf(b.category);
  const left = Math.max(0, b.daily_limit - (b.today_posts ?? 0));
  const list = posts.data?.pages.flat() ?? [];
  const tabs: ["posts" | "reviews" | "stats", string][] = [["posts", hi ? `पोस्ट (${b.posts})` : `Posts (${b.posts})`], ["reviews", hi ? `समीक्षा (${b.rating?.count ?? 0})` : `Reviews (${b.rating?.count ?? 0})`]];
  if (b.mine || b.i_manage || b.can_moderate) tabs.push(["stats", hi ? "आँकड़े" : "Insights"]);
  const wa = b.whatsapp || b.phone;
  async function share() {
    const url = `${window.location.origin}/business/${b!.slug}`;
    bizTrack(b!.id, "share");
    try { if (typeof navigator.share === "function") await navigator.share({ title: b!.name, url }); else { await navigator.clipboard.writeText(url); toast.success(hi ? "लिंक कॉपी हुआ" : "Link copied"); } } catch { /* cancelled */ }
  }
  async function block(on: boolean) {
    const note = on ? prompt(hi ? "रोकने का कारण (मालिक को दिखेगा)" : "Reason (shown to the owner)") : null;
    if (on && note === null) return;
    try { await call("biz_block_page", { p_page: b!.id, p_block: on, p_note: note || null }); await refresh(); toast.success(on ? (hi ? "पेज रोका गया" : "Page blocked") : (hi ? "पेज फिर चालू" : "Page unblocked")); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  const Contact = ({ href, icon, label, tone, kind }: { href: string; icon: ReactNode; label: string; tone: string; kind: "call" | "whatsapp" | "map" | "website" }) => (
    <a onClick={() => bizTrack(b.id, kind)} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold shadow-sm transition hover:opacity-90 ${tone}`}>{icon}{label}</a>
  );
  return (
    <div className="min-h-[70vh] bg-secondary/50 pb-10">
      <div className="mx-auto max-w-5xl sm:px-4 sm:pt-4">
        <div className="overflow-hidden bg-card shadow-sm ring-1 ring-border/70 sm:rounded-2xl">
          <div className="relative h-44 bg-gradient-to-br from-amber-200 via-orange-100 to-rose-200 sm:h-64 dark:from-amber-950 dark:via-orange-950/60 dark:to-rose-950">
            {b.cover_url ? <img src={b.cover_url} alt="" className="size-full object-cover" /> : <span className="absolute inset-0 grid place-items-center text-7xl opacity-30">{c.icon}</span>}
          </div>
          <div className="px-4 pb-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="relative z-10 -mt-12 sm:-mt-16"><BizLogo url={b.logo_url} name={b.name} className="size-24 border-4 border-card shadow-md sm:size-32" /></div>
              <div className="min-w-0 flex-1 sm:pb-2">
                <h1 className="flex flex-wrap items-center gap-2 font-display text-2xl font-semibold leading-tight sm:text-3xl">{b.name}<Verified on={b.verified} className="size-6" /><TierBadge tier={b.tier} hi={hi} /></h1>
                <button type="button" onClick={() => setTab("reviews")} className="mt-0.5 hover:underline"><RatingLine r={b.rating} hi={hi} /></button>
                <p className="mt-1 text-sm text-muted-foreground">{c.icon} {catLabel(b.category, hi)}{b.city ? ` · ${b.city}` : ""}{b.district && b.district !== b.city ? `, ${b.district}` : ""} · <b className="text-foreground">{b.followers}</b> {hi ? "फ़ॉलोअर्स" : "followers"} · {b.posts} {hi ? "पोस्ट" : "posts"}</p>
                <p className="text-xs text-muted-foreground">{hi ? "संचालक" : "Run by"}: <Link to="/u/$id" params={{ id: b.owner_id }} className="font-medium hover:underline">{b.owner_name}</Link></p>
              </div>
              <div className="flex flex-wrap gap-2 sm:pb-2">
                {b.mine ? <Button size="sm" className="rounded-full" onClick={() => setEditing(true)}><Pencil className="size-4" /> {hi ? "पेज सुधारें" : "Edit page"}</Button> : <BizFollowButton pageId={b.id} following={b.i_follow} hi={hi} onChanged={() => void q.refetch()} />}
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => void share()}><Share2 className="size-4" /> {hi ? "शेयर" : "Share"}</Button>
              </div>
            </div>
            {b.status === "blocked" ? <p className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200"><ShieldAlert className="mt-0.5 size-4 shrink-0" />{hi ? "यह पेज एडमिन ने रोका है — यह सबको नहीं दिखता।" : "An admin has blocked this page — it is hidden from others."}{b.admin_note ? ` ${hi ? "कारण" : "Reason"}: ${b.admin_note}` : ""}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {b.phone ? <Contact href={telLink(b.phone)} icon={<Phone className="size-4" />} label={hi ? "कॉल करें" : "Call"} tone="bg-primary text-primary-foreground" kind="call" /> : null}
              {wa ? <Contact href={`${waLink(wa)}?text=${encodeURIComponent(hi ? `नमस्ते, मैंने आपका पेज कलचुरी वन पर देखा (${b.name})।` : `Hello, I saw your page ${b.name} on Kalchuri One.`)}`} icon={<span className="text-base leading-none">✆</span>} label="WhatsApp" tone="bg-emerald-600 text-white" kind="whatsapp" /> : null}
              {b.map_url ? <Contact href={b.map_url} icon={<MapPin className="size-4" />} label={hi ? "रास्ता देखें" : "Directions"} tone="bg-secondary" kind="map" /> : null}
              {b.website ? <Contact href={b.website} icon={<Globe className="size-4" />} label={hi ? "वेबसाइट" : "Website"} tone="bg-secondary" kind="website" /> : null}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 px-3 sm:px-0 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            {b.mine ? <PlanPanel b={b} hi={hi} onChanged={() => void q.refetch()} /> : null}
            {b.mine ? <ManagersBox b={b} hi={hi} org={tenant.organization_id} /> : null}
            {b.board_live && (b.mine || b.i_manage) ? <p className="rounded-2xl bg-amber-50 px-4 py-2 text-xs text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-200">📌 {hi ? "आपका विज्ञापन कार्ड अभी \"प्रायोजित\" बोर्ड पर चल रहा है।" : "Your ad card is live on the Sponsored board."} <Link to="/sponsored" className="underline">{hi ? "देखें" : "See"}</Link></p> : null}
            {b.offer ? <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 p-4 text-white shadow-sm"><p className="text-xs font-bold uppercase tracking-wide opacity-90">{hi ? "समाज के लिए खास" : "Community offer"}</p><p className="mt-1 font-display text-lg font-semibold leading-snug">🏷️ {b.offer}</p></div> : null}
            <section className="space-y-3 rounded-2xl bg-card p-4 text-sm shadow-sm ring-1 ring-border/70">
              <h2 className="font-display text-lg font-semibold">{hi ? "परिचय" : "About"}</h2>
              {b.about ? <p className="whitespace-pre-wrap leading-relaxed">{b.about}</p> : <p className="text-muted-foreground">{b.mine ? (hi ? "\"पेज सुधारें\" से अपने व्यापार के बारे में लिखिए।" : "Describe your business via Edit page.") : "—"}</p>}
              <ul className="space-y-2 text-muted-foreground">
                {b.address ? <li className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0" /><span>{b.address}{b.state ? `, ${b.state}` : ""}</span></li> : null}
                {b.hours ? <li className="flex gap-2"><Clock className="mt-0.5 size-4 shrink-0" /><span>{b.hours}</span></li> : null}
                {b.phone ? <li className="flex gap-2"><Phone className="mt-0.5 size-4 shrink-0" /><a href={telLink(b.phone)} className="hover:underline">{b.phone}</a></li> : null}
                {b.email ? <li className="flex gap-2"><Mail className="mt-0.5 size-4 shrink-0" /><a href={`mailto:${b.email}`} className="break-all hover:underline">{b.email}</a></li> : null}
              </ul>
            </section>
            {b.services.length ? (
              <section className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/70">
                <h2 className="font-display text-lg font-semibold">{hi ? "सेवाएँ / उत्पाद" : "Services / products"}</h2>
                <ul className="mt-2 divide-y divide-border text-sm">{b.services.map((s, i) => <li key={i} className="flex items-center justify-between gap-3 py-2"><span>{s.name}</span>{s.price ? <span className="shrink-0 font-semibold text-primary">{s.price}</span> : null}</li>)}</ul>
              </section>
            ) : null}
            {b.can_moderate && !b.mine ? <Button variant="outline" size="sm" className="w-full" onClick={() => void block(b.status !== "blocked")}><ShieldAlert className="size-4" /> {b.status === "blocked" ? (hi ? "पेज फिर चालू करें" : "Unblock page") : (hi ? "पेज रोकें (एडमिन)" : "Block page (admin)")}</Button> : null}
          </aside>

          <main className="min-w-0 space-y-4">
            {b.i_manage && !b.mine ? <ManagerBanner b={b} hi={hi} onLeft={() => void q.refetch()} /> : null}
            {(b.mine || b.i_manage) && b.status === "active" ? (
              <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/70">
                <BizLogo url={b.logo_url} name={b.name} className="size-10 rounded-xl" />
                <button type="button" disabled={!left} onClick={() => setPosting(true)} className="h-10 min-w-0 flex-1 truncate rounded-full bg-secondary px-4 text-left text-sm text-muted-foreground hover:bg-secondary/70 disabled:opacity-60">{left ? (hi ? `${b.name} की ओर से पोस्ट करें…` : `Post as ${b.name}…`) : (hi ? "आज की पोस्ट हो चुकी — कल फिर" : "Today's post is done — tomorrow again")}</button>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${left ? "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200" : "bg-secondary text-muted-foreground"}`}>{hi ? `आज ${left}/${b.daily_limit}` : `${left}/${b.daily_limit} today`}</span>
              </div>
            ) : null}
            <div className="flex gap-1 rounded-2xl bg-card p-1 shadow-sm ring-1 ring-border/70" role="tablist">
              {tabs.map(([k, label]) => (
                <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${tab === k ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm" : "text-muted-foreground hover:bg-secondary"}`}>{label}</button>
              ))}
            </div>
            {tab === "reviews" ? <Reviews b={b} hi={hi} member={orgs.length > 0} /> : null}
            {tab === "stats" ? <StatsPanel b={b} hi={hi} /> : null}
            {tab === "posts" ? <>
            {list.map((p) => <PostCard key={p.id} p={p} L={hi} signedIn={!!user} onChange={() => { void qc.invalidateQueries({ queryKey: ["feed"] }); void q.refetch(); }} />)}
            {posts.isSuccess && !list.length ? <div className="rounded-2xl bg-card px-6 py-10 text-center text-sm text-muted-foreground shadow-sm ring-1 ring-border/70">{b.mine ? (hi ? "पहली पोस्ट कीजिए — नया सामान, छूट या सेवा की जानकारी।" : "Make your first post — a new product, an offer or a service.") : (hi ? "अभी कोई पोस्ट नहीं।" : "No posts yet.")}</div> : null}
            {posts.hasNextPage ? <div className="text-center"><Button variant="outline" className="rounded-full bg-card" onClick={() => void posts.fetchNextPage()} disabled={posts.isFetchingNextPage}>{hi ? "और पोस्ट देखें" : "Load more"}</Button></div> : null}
            </> : null}
          </main>
        </div>
      </div>
      {editing ? <BizEditor page={b} hi={hi} onClose={() => { setEditing(false); void q.refetch(); }} /> : null}
      {posting ? <CreatePost org={tenant.organization_id} L={hi} start="text" bizId={b.id} onClose={() => setPosting(false)} onPosted={() => { setPosting(false); void q.refetch(); void posts.refetch(); }} /> : null}
    </div>
  );
}

/** Owner's box: current plan, pending request, sponsored posts this month, buy / renew. */
function PlanPanel({ b, hi, onChanged }: { b: BizPage; hi: boolean; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const sp = useSponsorStatus(b.tier !== "free" ? b.id : null);
  const paid = b.tier !== "free";
  const days = b.tier_until ? Math.ceil((new Date(b.tier_until).getTime() - Date.now()) / 864e5) : null;
  async function cancel() {
    if (!b.pending_request || !confirm(hi ? "यह अनुरोध रद्द करें?" : "Cancel this request?")) return;
    try { await call("biz_cancel_request", { p_id: b.pending_request.id }); onChanged(); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  return (
    <section className={`space-y-3 rounded-2xl p-4 text-sm shadow-sm ring-1 ${b.tier === "gold" ? "bg-amber-50 ring-amber-300 dark:bg-amber-950/30" : paid ? "bg-slate-50 ring-slate-300" : "bg-card ring-border/70"}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">{hi ? "पैकेज" : "Plan"}: {planName(b.tier, hi)}</h2>
        {paid && days !== null ? <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${days <= 7 ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>{hi ? `${days} दिन बाकी` : `${days} days left`}</span> : null}
      </div>
      <p className="text-muted-foreground">{hi ? `रोज़ ${b.daily_limit} पोस्ट` : `${b.daily_limit} posts a day`}{paid && b.tier_until ? ` · ${hi ? "वैध" : "valid till"} ${new Date(b.tier_until).toLocaleDateString(hi ? "hi-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}</p>
      {paid && sp.data ? <p>{hi ? "इस महीने प्रायोजित पोस्ट" : "Sponsored posts this month"}: <b>{sp.data.used}/{sp.data.limit}</b>{sp.data.active.length ? ` · ${hi ? "अभी चल रही" : "running"} ${sp.data.active.length}` : ""}<br /><span className="text-xs text-muted-foreground">{hi ? "किसी पोस्ट के ⋯ मेनू में \"प्रायोजित करें\" दबाएँ।" : "Use \"Sponsor\" in a post's ⋯ menu."}</span></p> : null}
      {b.pending_request ? (
        <div className="rounded-xl bg-amber-100 px-3 py-2 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
          ⏳ {hi ? `${planName(b.pending_request.plan, true)} (${b.pending_request.period === "year" ? "साल" : "महीना"}) ${inr(b.pending_request.amount)} — एडमिन की मंज़ूरी बाकी` : `${planName(b.pending_request.plan, false)} (${b.pending_request.period}) ${inr(b.pending_request.amount)} — awaiting admin approval`}
          <button type="button" onClick={() => void cancel()} className="ml-2 text-xs underline">{hi ? "रद्द करें" : "Cancel"}</button>
        </div>
      ) : <Button className="w-full rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-95" onClick={() => setOpen(true)}>{paid ? (hi ? "नवीनीकरण / पैकेज बदलें" : "Renew / change plan") : (hi ? "⭐ पैकेज लें — रोज़ 10 पोस्ट + प्रायोजित" : "⭐ Get a plan — 10 posts/day + sponsored")}</Button>}
      {open ? <PlanDialog page={b} hi={hi} onClose={() => { setOpen(false); onChanged(); }} /> : null}
    </section>
  );
}
