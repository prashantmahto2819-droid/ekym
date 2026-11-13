// "Kalchuri One" community feed, Facebook-style: composer popup (text, photos, video link, audience, post as organization),
// post cards with photo grid + lightbox, reaction/comment/share counts, full-width action bar, comment bubbles with photos.
import { Link } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Globe, Repeat2, Sparkles, Clock, Hash, ImagePlus, Link2, MessageCircle, MoreHorizontal, Pin, Search, Send, Share2, ThumbsUp, Users, UserCheck, X } from "lucide-react";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { AdSlot } from "@/components/site/Ads";
import { Avatar, FollowButton } from "@/components/community/ChatBits";
import { useConsent } from "@/components/community/ConsentGate";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { timeAgo, useMe } from "@/community/chat";
import { useLang } from "@/core/i18n";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export type Post = { id: string; author_id: string; author_name: string; author_photo: string | null; body: string | null; media: { type: string; path: string }[]; link_url: string | null; link_kind: string | null; visibility: string; pinned: boolean; like_count: number; comment_count: number; share_count: number; created_at: string; liked: boolean; mine: boolean; can_moderate: boolean; reach: string; moderation_status: string; as_org: string | null; as_org_name: string | null; tags: string[]; political?: boolean; shared?: Shared | null; author_rel?: "me" | "friend" | "following" | "none"; reason?: { kind: "like" | "comment"; user_id: string; name: string } | null };
export type Shared = { id: string; available: boolean; author_id?: string; author_name?: string; author_photo?: string | null; as_org?: string | null; body?: string | null; media?: { type: string; path: string }[]; link_url?: string | null; link_kind?: string | null; created_at?: string; visibility?: string };
type Comment = { id: string; parent_id: string | null; author_id: string; author_name: string; author_photo?: string | null; body: string; created_at: string; mine: boolean };

export const COMMUNITY_NAME = { en: "Kalchuri One", hi: "कलचुरी वन" };
const rpc = async <T,>(fn: string, args: Record<string, unknown>): Promise<T> => { const { data, error } = await supabase.rpc(fn as never, args as never); if (error) throw new Error(error.message); return data as T; };
export const mediaUrl = (path: string) => supabase.storage.from("community").getPublicUrl(path).data.publicUrl;
const card = "rounded-2xl bg-card shadow-sm ring-1 ring-border/70";

/* Posts that stayed on screen for a moment are reported in small batches, so the "For you" feed can sink them later. */
const seenBuf = new Set<string>(); const seenSent = new Set<string>(); let seenTimer: number | null = null;
function markSeen(id: string) {
  if (seenSent.has(id)) return; seenBuf.add(id);
  if (seenTimer !== null || typeof window === "undefined") return;
  seenTimer = window.setTimeout(() => {
    seenTimer = null; const ids = [...seenBuf].slice(0, 50); seenBuf.clear(); ids.forEach((x) => seenSent.add(x));
    if (ids.length) supabase.rpc("k1_posts_seen" as never, { p_ids: ids } as never).then(() => undefined, () => undefined);
  }, 4000);
}
function useSeen(id: string, enabled: boolean) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current; if (!enabled || !el || typeof IntersectionObserver === "undefined") return;
    let t: number | null = null;
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) t = window.setTimeout(() => { markSeen(id); io.disconnect(); }, 1500); else if (t) { clearTimeout(t); t = null; } }, { threshold: 0.5 });
    io.observe(el); return () => { io.disconnect(); if (t) clearTimeout(t); };
  }, [id, enabled]);
  return ref;
}

/** Detect embeddable video/social links. Only URLs are stored — nothing is uploaded, so video hosting stays free. */
export function linkKind(url: string): "youtube" | "instagram" | "facebook" | "other" {
  if (/youtu\.be\/|youtube\.com\//.test(url)) return "youtube";
  if (/instagram\.com\//.test(url)) return "instagram";
  if (/facebook\.com\/|fb\.watch\//.test(url)) return "facebook";
  return "other";
}
function LinkEmbed({ url, kind }: { url: string; kind: string | null }) {
  const k = kind ?? linkKind(url);
  if (k === "youtube") {
    const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{6,})/); const id = m?.[1];
    return id ? <iframe className="aspect-video w-full" src={`https://www.youtube.com/embed/${id}`} title="video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" /> : null;
  }
  if (k === "facebook") return <iframe className="aspect-video w-full" src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`} title="video" allowFullScreen loading="lazy" />;
  if (k === "instagram") { const m = url.match(/instagram\.com\/(?:p|reel|reels)\/([\w-]+)/); return m ? <div className="flex justify-center bg-secondary/50"><iframe className="h-[560px] w-full max-w-sm" src={`https://www.instagram.com/p/${m[1]}/embed`} title="instagram" loading="lazy" /></div> : <a href={url} target="_blank" rel="noreferrer" className="mx-4 block underline">{url}</a>; }
  let host = url; try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { /* keep */ }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="mx-4 flex items-center gap-3 rounded-xl bg-secondary/60 p-3 text-sm ring-1 ring-border hover:bg-secondary">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-background text-muted-foreground"><Link2 className="size-5" /></span>
      <span className="min-w-0"><span className="block text-xs uppercase tracking-wide text-muted-foreground">{host}</span><span className="block truncate font-medium">{url}</span></span>
    </a>
  );
}

function dedupe(list: Post[]) { const seen = new Set<string>(); return list.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true))); }

export function Feed({ postId, inline }: { postId?: string; inline?: ReactNode }) {
  const tenant = useTenant();
  const org = tenant.organization_id;
  const { user } = useAuth();
  const { lang } = useLang();
  const L = lang === "hi";
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const searching = !postId && (q.trim().length >= 2 || !!tag);
  const [mode, setMode] = useState<"for_you" | "latest">("for_you");
  const member = useQuery({ queryKey: ["is_member", org], enabled: !!user, queryFn: () => rpc<boolean>("k1_is_member", { p_org: org }) });
  const applicant = useQuery({ queryKey: ["is_applicant", org], enabled: !!user && member.isSuccess && !member.data, queryFn: () => rpc<boolean>("k1_is_applicant", { p_org: org }) });
  const tags = useQuery({ queryKey: ["cm_tags", org], enabled: !postId, staleTime: 120_000, queryFn: () => rpc<{ tag: string; n: number }[]>("k1_cm_tags", { p_org: org, p_limit: 12 }) });
  const ranked = !postId && !searching;
  const feed = useInfiniteQuery({
    queryKey: ["feed", org, postId ?? null, searching ? q.trim() : "", tag, ranked ? mode : ""],
    initialPageParam: null as string | number | null,
    queryFn: ({ pageParam }) => ranked
      ? rpc<Post[]>("k1_feed2", { p_org: org, p_mode: mode, p_offset: typeof pageParam === "number" ? pageParam : 0, p_limit: 15 })
      : searching
        ? rpc<Post[]>("k1_feed_search", { p_org: org, p_q: q.trim() || null, p_tag: tag, p_before: pageParam, p_limit: 15 })
        : rpc<Post[]>("k1_feed", { p_org: org, p_before: pageParam, p_limit: 15, p_post: postId ?? null }),
    getNextPageParam: (last, all) => (last.length === 15 ? (ranked ? all.flat().length : last[last.length - 1]!.created_at) : undefined),
  });
  const posts = dedupe(feed.data?.pages.flat() ?? []);
  const refresh = () => qc.invalidateQueries({ queryKey: ["feed", org] });
  const note = (cls: string, children: ReactNode) => <div className={`${card} p-4 text-sm ${cls}`}>{children}</div>;
  return (
    <div className="space-y-4">
      {!postId ? (user ? (member.data ? <Composer org={org} onPosted={refresh} L={L} /> : member.isSuccess ? (applicant.data
          ? note("bg-amber-50 text-amber-900 ring-amber-300 dark:bg-amber-950/40 dark:text-amber-200", L ? "⏳ आपकी सदस्यता की मंज़ूरी बाकी है — तब तक आप पढ़ सकते हैं; मंज़ूरी मिलते ही पोस्ट, लाइक और टिप्पणी खुल जाएँगे।" : "⏳ Your membership is awaiting approval — you can read meanwhile; posting, likes and comments open once approved.")
          : note("", <div className="flex flex-wrap items-center justify-between gap-2"><span>{L ? "पोस्ट करने के लिए संगठन का सदस्य बनें।" : "Become a member to post."}</span><Button asChild size="sm" className="rounded-full"><Link to="/join">{L ? "सदस्यता फ़ॉर्म" : "Membership form"}</Link></Button></div>)) : null)
        : note("", <div className="flex flex-wrap items-center justify-between gap-2"><span>{L ? "पोस्ट, लाइक और टिप्पणी के लिए लॉगिन करें।" : "Sign in to post, like and comment."}</span><Button asChild size="sm" className="rounded-full"><Link to="/auth">{L ? "लॉगिन करें" : "Sign in"}</Link></Button></div>)) : null}

      {ranked ? (
        <div className="flex gap-1 rounded-2xl bg-card p-1 shadow-sm ring-1 ring-border/70" role="tablist">
          {([["for_you", <Sparkles key="i" className="size-4" />, L ? "आपके लिए" : "For you"], ["latest", <Clock key="i" className="size-4" />, L ? "सबसे नई" : "Latest"]] as const).map(([k, icon, label]) => (
            <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => setMode(k)} className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition ${mode === k ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary"}`}>{icon}{label}</button>
          ))}
        </div>
      ) : null}
      {!postId ? (
        <div className="space-y-2">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-10 rounded-full border-0 bg-card pl-10 shadow-sm ring-1 ring-border/70" placeholder={L ? "पोस्ट खोजें… (नाम, शब्द, #टैग)" : "Search posts… (name, words, #tag)"} value={q} onChange={(e) => { const v = e.target.value; if (v.startsWith("#") && v.length > 1) { setTag(v.slice(1)); setQ(""); } else setQ(v); }} />
            {q ? <button type="button" onClick={() => setQ("")} aria-label="clear" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-secondary"><X className="size-4" /></button> : null}
          </label>
          {tag || tags.data?.length ? (
            <div className="scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
              {tag ? <button type="button" onClick={() => setTag(null)} className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">#{tag} <X className="size-3" /></button>
                : tags.data!.map((t) => <button key={t.tag} type="button" className="shrink-0 rounded-full bg-card px-3 py-1 text-xs shadow-sm ring-1 ring-border/70 hover:text-primary" onClick={() => setTag(t.tag)}>#{t.tag} <span className="text-muted-foreground">{t.n}</span></button>)}
            </div>
          ) : null}
        </div>
      ) : null}

      {feed.isLoading ? [0, 1].map((i) => <div key={i} className={`${card} animate-pulse p-4`}><div className="flex gap-3"><span className="size-10 rounded-full bg-muted" /><span className="flex-1 space-y-2"><span className="block h-3 w-1/3 rounded bg-muted" /><span className="block h-2.5 w-1/4 rounded bg-muted" /></span></div><div className="mt-4 h-40 rounded-xl bg-muted" /></div>) : null}
      {posts.map((p, i) => (
        <Fragment key={p.id}>
          <PostCard p={p} L={L} signedIn={!!user} onChange={refresh} onTag={setTag} startOpen={!!postId} />
          {i === 1 && inline && !searching ? inline : null}
          {i === 2 ? <AdSlot slot="feed" className={`${card} p-3`} /> : null}
        </Fragment>
      ))}
      {feed.isSuccess && !posts.length ? (
        <div className={`${card} px-6 py-12 text-center`}>
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary-deep"><MessageCircle className="size-7" /></span>
          <p className="mt-3 font-display text-lg font-semibold">{searching ? (L ? "कुछ नहीं मिला" : "Nothing found") : ranked && mode === "latest" ? (L ? "अभी यहाँ कुछ नहीं" : "Nothing here yet") : (L ? "अभी कोई पोस्ट नहीं" : "No posts yet")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{searching ? (L ? "दूसरा शब्द या टैग आज़माइए।" : "Try another word or tag.") : ranked && mode === "latest" ? (L ? "यहाँ मित्रों और जिन्हें आप फ़ॉलो करते हैं उनकी पोस्ट आती है। \"आपके लिए\" में लोगों को देखकर फ़ॉलो करें।" : "Posts from friends and people you follow appear here. Follow people from \"For you\".") : (L ? "पहली पोस्ट आप कीजिए!" : "Be the first to post!")}</p>
        </div>
      ) : null}
      {feed.hasNextPage ? <div className="text-center"><Button variant="outline" className="rounded-full bg-card" onClick={() => feed.fetchNextPage()} disabled={feed.isFetchingNextPage}>{feed.isFetchingNextPage ? "…" : (L ? "और पोस्ट देखें" : "Load more")}</Button></div> : null}
      {feed.isSuccess && posts.length && !feed.hasNextPage && !postId ? <p className="py-2 text-center text-xs text-muted-foreground">{L ? "आप सब पोस्ट देख चुके ✓" : "You're all caught up ✓"}</p> : null}
    </div>
  );
}

const VIS = (L: boolean) => [
  { v: "members" as const, icon: <Users className="size-3.5" />, label: L ? "समुदाय के सदस्य" : "Community members" },
  { v: "public" as const, icon: <Globe className="size-3.5" />, label: L ? "सार्वजनिक (सबको)" : "Public" },
  { v: "friends" as const, icon: <UserCheck className="size-3.5" />, label: L ? "सिर्फ़ मेरे मित्र" : "Friends only" },
];

/** Composer card ("What's on your mind?") that opens a "Create post" popup. */
function Composer({ org, onPosted, L }: { org: string; onPosted: () => void; L: boolean }) {
  const { me } = useMe();
  const [open, setOpen] = useState<null | "text" | "photo" | "link">(null);
  const first = (me?.name ?? "").split(" ")[0] || "";
  const Act = ({ k, icon, label, tone }: { k: "photo" | "link" | "text"; icon: ReactNode; label: string; tone: string }) => (
    <button type="button" onClick={() => setOpen(k)} className="flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary">
      <span className={tone}>{icon}</span><span className="truncate">{label}</span>
    </button>
  );
  return (
    <div className={`${card} p-3 sm:p-4`}>
      <div className="flex items-center gap-2.5">
        <Avatar url={me?.photo} name={me?.name ?? "?"} size={10} />
        <button type="button" onClick={() => setOpen("text")} className="h-10 flex-1 truncate rounded-full bg-secondary px-4 text-left text-[15px] text-muted-foreground transition hover:bg-secondary/70">
          {L ? `क्या सोच रहे हैं${first ? `, ${first}` : ""}?` : `What's on your mind${first ? `, ${first}` : ""}?`}
        </button>
      </div>
      <div className="mt-3 flex border-t border-border pt-2">
        <Act k="photo" icon={<ImagePlus className="size-5" />} label={L ? "फोटो" : "Photo"} tone="text-emerald-600" />
        <Act k="link" icon={<Link2 className="size-5" />} label={L ? "वीडियो / लिंक" : "Video / link"} tone="text-rose-600" />
        <Act k="text" icon={<Hash className="size-5" />} label={L ? "विचार" : "Thought"} tone="text-amber-600" />
      </div>
      {open ? <CreatePost org={org} L={L} start={open} onClose={() => setOpen(null)} onPosted={() => { setOpen(null); onPosted(); }} /> : null}
    </div>
  );
}

function CreatePost({ org, L, start, onClose, onPosted }: { org: string; L: boolean; start: "text" | "photo" | "link"; onClose: () => void; onPosted: () => void }) {
  const { me } = useMe();
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [showLink, setShowLink] = useState(start === "link");
  const [files, setFiles] = useState<File[]>([]);
  const [vis, setVis] = useState<"members" | "public" | "friends">("members");
  const [asOrg, setAsOrg] = useState<string>("");
  const asOpts = useQuery({ queryKey: ["post_as_options"], queryFn: () => rpc<{ id: string; name: string; name_hi: string | null; logo: string | null }[]>("k1_post_as_options", {}) });
  const [busy, setBusy] = useState(false);
  const [mentions, setMentions] = useState<{ user_id: string; full_name: string }[]>([]);
  const mq = /(?:^|\s)@([^\s@]{1,30})$/.exec(body);
  const sugg = useQuery({ queryKey: ["mention", org, mq?.[1]], enabled: !!mq, queryFn: () => rpc<{ user_id: string; full_name: string; org_name: string }[]>("k1_mention_search", { p_org: org, p_q: mq![1], p_limit: 8 }) });
  const previews = files.map((f) => URL.createObjectURL(f));
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [files]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (start === "photo") document.getElementById("cp-files")?.click(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  function pickMention(m: { user_id: string; full_name: string }) {
    setBody((b) => b.replace(/@([^\s@]{1,30})$/, `@${m.full_name} `));
    setMentions((x) => (x.some((y) => y.user_id === m.user_id) ? x : [...x, m]));
  }
  const consent = useConsent();
  const empty = !body.trim() && !link.trim() && !files.length;
  async function post() {
    if (empty) return;
    if (!consent.accepted) { consent.ensure(() => void post()); return; }
    setBusy(true);
    try {
      const uid = (await supabase.auth.getUser()).data.user!.id;
      const media: { type: string; path: string }[] = [];
      for (const f of files.slice(0, 6)) {
        if (f.size > 5 * 1024 * 1024) throw new Error(L ? "फोटो 5 MB से छोटी रखें" : "Images must be under 5 MB");
        const path = `${org}/posts/${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${f.name.split(".").pop()}`;
        const { error } = await supabase.storage.from("community").upload(path, f, { contentType: f.type }); if (error) throw error;
        media.push({ type: "image", path });
      }
      await rpc("k1_post_create", { p_org: org, p_body: body.trim() || null, p_media: media, p_link: link.trim() || null, p_link_kind: link.trim() ? linkKind(link.trim()) : null, p_visibility: vis, p_as_org: asOrg || null, p_mentions: mentions.filter((m) => body.includes(`@${m.full_name}`)).map((m) => m.user_id) });
      toast.success(L ? "पोस्ट हो गई 🎉" : "Posted 🎉");
      onPosted();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  const org_ = asOpts.data?.find((o) => o.id === asOrg);
  const big = !files.length && !showLink && body.length < 90;
  return (
    <Dialog open onOpenChange={(o) => { if (!o && !busy) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-lg gap-0 overflow-y-auto p-0">
        <DialogHeader className="border-b border-border px-4 py-3"><DialogTitle className="text-center font-display text-lg">{L ? "पोस्ट बनाएँ" : "Create post"}</DialogTitle></DialogHeader>
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-2.5">
            {org_ ? <Avatar url={org_.logo} name={org_.name} size={10} /> : <Avatar url={me?.photo} name={me?.name ?? "?"} size={10} />}
            <div className="min-w-0 space-y-1">
              <p className="truncate font-semibold leading-tight">{org_ ? (L && org_.name_hi ? org_.name_hi : org_.name) : me?.name}</p>
              <div className="flex flex-wrap gap-1">
                <select aria-label={L ? "कौन देखे" : "Audience"} className="h-7 rounded-md bg-secondary px-2 text-xs font-medium" value={vis} onChange={(e) => setVis(e.target.value as typeof vis)}>
                  {VIS(L).map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
                </select>
                {asOpts.data?.length ? <select aria-label={L ? "किसकी ओर से" : "Post as"} className="h-7 max-w-[200px] rounded-md bg-secondary px-2 text-xs font-medium" value={asOrg} onChange={(e) => setAsOrg(e.target.value)}><option value="">{L ? "व्यक्तिगत पोस्ट" : "Personal post"}</option>{asOpts.data.map((o) => <option key={o.id} value={o.id}>{L ? "संगठन: " : "As: "}{L && o.name_hi ? o.name_hi : o.name}</option>)}</select> : null}
              </div>
            </div>
          </div>
          <div className="relative">
            <Textarea autoFocus={start === "text"} rows={big ? 4 : 3} className={`resize-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 ${big ? "text-xl" : "text-base"}`}
              placeholder={L ? "क्या साझा करना चाहते हैं? किसी सदस्य को @नाम से जोड़ें, #टैग लगाएँ" : "What would you like to share? Mention with @name, add #tags"} value={body} onChange={(e) => setBody(e.target.value)} />
            {mq && sugg.data?.length ? <ul className="absolute left-0 z-20 mt-1 w-72 overflow-hidden rounded-xl border border-border bg-popover text-sm shadow-lg">{sugg.data.map((m) => <li key={m.user_id}><button type="button" className="flex w-full flex-col items-start px-3 py-1.5 text-left hover:bg-secondary" onClick={() => pickMention(m)}><span className="font-medium">@{m.full_name}</span><span className="text-xs text-muted-foreground">{m.org_name}</span></button></li>)}</ul> : null}
          </div>
          {files.length ? (
            <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-border p-1.5">
              {previews.map((u, i) => (
                <div key={u} className="relative aspect-square overflow-hidden rounded-lg">
                  <img src={u} alt="" className="size-full object-cover" />
                  <button type="button" aria-label="remove" onClick={() => setFiles((f) => f.filter((_, j) => j !== i))} className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white"><X className="size-3.5" /></button>
                </div>
              ))}
            </div>
          ) : null}
          {showLink ? <Input autoFocus={start === "link"} placeholder={L ? "YouTube / Instagram / Facebook वीडियो या कोई लिंक" : "YouTube / Instagram / Facebook video or any link"} value={link} onChange={(e) => setLink(e.target.value)} /> : null}
          <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
            <span className="text-sm font-medium">{L ? "पोस्ट में जोड़ें" : "Add to your post"}</span>
            <span className="flex gap-1">
              <label title={L ? "फोटो (6 तक)" : "Photos (up to 6)"} className="grid size-9 cursor-pointer place-items-center rounded-full text-emerald-600 hover:bg-secondary"><ImagePlus className="size-5" /><input id="cp-files" type="file" accept="image/*" multiple hidden onChange={(e) => setFiles((f) => [...f, ...(e.target.files ?? [])].slice(0, 6))} /></label>
              <button type="button" title={L ? "वीडियो / लिंक" : "Video / link"} onClick={() => setShowLink((v) => !v)} className={`grid size-9 place-items-center rounded-full text-rose-600 hover:bg-secondary ${showLink ? "bg-secondary" : ""}`}><Link2 className="size-5" /></button>
              <button type="button" title={L ? "किसी को जोड़ें" : "Mention someone"} onClick={() => setBody((b) => `${b}${b && !b.endsWith(" ") ? " " : ""}@`)} className="grid size-9 place-items-center rounded-full font-bold text-sky-600 hover:bg-secondary">@</button>
              <button type="button" title={L ? "टैग" : "Tag"} onClick={() => setBody((b) => `${b}${b && !b.endsWith(" ") ? " " : ""}#`)} className="grid size-9 place-items-center rounded-full text-amber-600 hover:bg-secondary"><Hash className="size-5" /></button>
            </span>
          </div>
          <Button className="h-11 w-full rounded-xl text-base" onClick={() => void post()} disabled={busy || empty}>{busy ? (L ? "पोस्ट हो रही है…" : "Posting…") : (L ? "पोस्ट करें" : "Post")}</Button>
          <p className="text-center text-[11px] leading-snug text-muted-foreground">{L ? "विज्ञापन / व्यापारिक या चुनावी प्रचार वाली पोस्ट की पहुँच अपने-आप सीमित होती है। विज्ञापन के लिए " : "Advertising, business or political promotion gets limited reach automatically. To advertise, see "}<Link to="/sponsored" className="underline">{L ? "प्रायोजित सेक्शन" : "Sponsored"}</Link>.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Body text with clickable #hashtags and highlighted @mentions; long text is folded with "see more". */
function Body({ text, onTag, big }: { text: string; onTag?: ((t: string) => void) | undefined; big: boolean }) {
  const { lang } = useLang();
  const long = text.length > 420;
  const [more, setMore] = useState(false);
  const shown = long && !more ? `${text.slice(0, 360).trimEnd()}… ` : text;
  const parts = shown.split(/(#[^\s#@.,!?()[\]{}"'|<>]{2,40}|@[^\s#@.,!?()[\]{}"'|<>]+(?: [^\s#@.,!?()[\]{}"'|<>]+)?)/g);
  return (
    <p className={`whitespace-pre-wrap px-4 ${big ? "py-2 font-display text-2xl leading-snug" : "text-[15px] leading-relaxed"}`}>
      {parts.map((x, i) => x.startsWith("#") && x.length > 1 ? <button key={i} type="button" className="font-medium text-primary hover:underline" onClick={() => onTag?.(x.slice(1).toLowerCase())}>{x}</button> : x.startsWith("@") ? <span key={i} className="font-semibold text-primary">{x}</span> : <span key={i}>{x}</span>)}
      {long && !more ? <button type="button" className="font-semibold text-muted-foreground hover:underline" onClick={() => setMore(true)}>{lang === "hi" ? "और देखें" : "See more"}</button> : null}
    </p>
  );
}

/** Facebook-style photo grid: 1 big, 2 side by side, 3 = one wide + two, 4+ = 2×2 with "+N" on the last tile. */
function PhotoGrid({ urls, onOpen }: { urls: string[]; onOpen: (i: number) => void }) {
  const n = urls.length;
  if (n === 1) return <button type="button" onClick={() => onOpen(0)} className="block w-full bg-secondary/40"><img src={urls[0]} alt="" loading="lazy" className="mx-auto max-h-[620px] w-full object-cover" /></button>;
  const shown = urls.slice(0, 4);
  return (
    <div className={`grid gap-0.5 ${n === 3 ? "grid-cols-2" : "grid-cols-2"}`}>
      {shown.map((u, i) => (
        <button key={u} type="button" onClick={() => onOpen(i)} className={`relative overflow-hidden bg-secondary ${n === 3 && i === 0 ? "col-span-2 aspect-[2/1]" : "aspect-square"}`}>
          <img src={u} alt="" loading="lazy" className="size-full object-cover transition duration-300 hover:scale-[1.02]" />
          {i === 3 && n > 4 ? <span className="absolute inset-0 grid place-items-center bg-black/50 font-display text-3xl font-semibold text-white">+{n - 4}</span> : null}
        </button>
      ))}
    </div>
  );
}

function Lightbox({ urls, index, onClose }: { urls: string[]; index: number; onClose: () => void }) {
  const [i, setI] = useState(index);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowRight") setI((x) => Math.min(urls.length - 1, x + 1)); if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1)); };
    document.addEventListener("keydown", k); const o = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = o; };
  }, [urls.length, onClose]);
  return (
    <div role="dialog" aria-modal className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95" onClick={onClose}>
      <img src={urls[i]} alt="" className="max-h-[92vh] max-w-[96vw] object-contain" onClick={(e) => e.stopPropagation()} />
      <button type="button" aria-label="close" onClick={onClose} className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"><X className="size-5" /></button>
      {urls.length > 1 ? <>
        <button type="button" aria-label="previous" disabled={i === 0} onClick={(e) => { e.stopPropagation(); setI(i - 1); }} className="absolute left-3 grid size-11 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25 disabled:opacity-30"><ChevronLeft className="size-6" /></button>
        <button type="button" aria-label="next" disabled={i === urls.length - 1} onClick={(e) => { e.stopPropagation(); setI(i + 1); }} className="absolute right-3 grid size-11 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25 disabled:opacity-30"><ChevronRight className="size-6" /></button>
        <span className="absolute bottom-4 rounded-full bg-white/15 px-3 py-1 text-sm text-white">{i + 1} / {urls.length}</span>
      </> : null}
    </div>
  );
}

export function PostCard({ p, L, signedIn, onChange, onTag, startOpen = false }: { p: Post; L: boolean; signedIn: boolean; onChange: () => void; onTag?: ((t: string) => void) | undefined; startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const [liked, setLiked] = useState(p.liked); const [likes, setLikes] = useState(p.like_count);
  const [comments, setComments] = useState(p.comment_count);
  const [photo, setPhoto] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);
  const seenRef = useSeen(p.id, signedIn && !p.mine);
  useEffect(() => { setLiked(p.liked); setLikes(p.like_count); setComments(p.comment_count); }, [p.liked, p.like_count, p.comment_count]);
  const url = typeof window !== "undefined" ? `${window.location.origin}/community/${p.id}` : `/community/${p.id}`;
  const urls = p.media.filter((m) => m.type === "image").map((m) => mediaUrl(m.path));
  async function like() {
    if (!signedIn) { toast.error(L ? "लाइक के लिए लॉगिन करें" : "Sign in to like"); return; }
    const was = liked; setLiked(!was); setLikes((n) => n + (was ? -1 : 1));
    try { const r = await rpc<boolean>("k1_toggle_like", { p_post: p.id }); if (r === was) { setLiked(r); setLikes((n) => n + (r ? 1 : -1)); } } catch (e) { setLiked(was); setLikes((n) => n + (was ? 1 : -1)); toast.error((e as Error).message); }
  }
  async function share(kind: "wa" | "copy" | "native") {
    const text = `${p.author_name}: ${(p.body ?? "").slice(0, 120)}\n${url}`;
    try {
      if (kind === "native" && typeof navigator.share === "function") await navigator.share({ title: COMMUNITY_NAME.en, text, url });
      else if (kind === "wa") window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
      else { await navigator.clipboard.writeText(url); toast.success(L ? "लिंक कॉपी हुआ" : "Link copied"); }
      supabase.rpc("k1_post_shared", { p_post: p.id } as never).then(() => undefined, () => undefined);
    } catch { /* cancelled */ }
  }
  async function appeal() { const note = prompt(L ? "यह पोस्ट विज्ञापन/प्रचार क्यों नहीं है? (मॉडरेटर को जाएगा)" : "Why is this not promotion? (sent to moderators)"); if (note === null) return; try { await rpc("k1_cm_appeal", { p_post: p.id, p_note: note || null }); toast.success(L ? "अनुरोध भेजा गया" : "Request sent"); } catch (e) { toast.error((e as Error).message); } }
  async function moderate(status: string | null, pinned: boolean | null) { try { await rpc("k1_post_moderate", { p_post: p.id, p_status: status, p_pinned: pinned }); onChange(); } catch (e) { toast.error((e as Error).message); } }
  async function remove() { if (!confirm(L ? "पोस्ट हटाएँ?" : "Delete this post?")) return; const { error } = await supabase.from("cm_posts").delete().eq("id", p.id); if (error) toast.error(error.message); else onChange(); }
  async function report() { const r = prompt(L ? "क्या गलत है? (एडमिन देखेगा)" : "What's wrong? (sent to moderators)"); if (!r) return; const uid = (await supabase.auth.getUser()).data.user?.id; const { error } = await supabase.from("cm_post_reports").insert({ post_id: p.id, organization_id: (await supabase.from("cm_posts").select("organization_id").eq("id", p.id).single()).data?.organization_id, reporter_id: uid, reason: r } as never); if (error) toast.error(error.message); else toast.success(L ? "रिपोर्ट भेजी" : "Reported"); }
  const vis = VIS(L).find((v) => v.v === p.visibility) ?? VIS(L)[0]!;
  const big = !!p.body && !p.shared && !urls.length && !p.link_url && p.body.length < 110 && !p.body.includes("\n");
  const ActBtn = ({ onClick, active, children }: { onClick?: () => void; active?: boolean; children: ReactNode }) => (
    <button type="button" onClick={onClick} className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition hover:bg-secondary ${active ? "text-primary" : "text-muted-foreground"}`}>{children}</button>
  );
  const canWall = signedIn && p.visibility !== "friends" && p.reach === "normal" && (!p.shared || p.shared.available) && p.shared?.visibility !== "friends";
  return (
    <article ref={seenRef} className={`${card} overflow-hidden`}>
      {p.reason ? (
        <p className="mx-4 flex items-center gap-1.5 border-b border-border py-2 text-xs text-muted-foreground">
          {p.reason.kind === "like" ? <ThumbsUp className="size-3.5 text-primary" /> : <MessageCircle className="size-3.5 text-primary" />}
          <Link to="/u/$id" params={{ id: p.reason.user_id }} className="font-semibold text-foreground hover:underline">{p.reason.name}</Link>
          {p.reason.kind === "like" ? (L ? "ने यह पसंद किया" : "liked this") : (L ? "ने इस पर टिप्पणी की" : "commented on this")}
        </p>
      ) : null}
      <header className="flex items-start gap-2.5 px-4 pt-3">
        {p.as_org ? <Avatar url={p.author_photo} name={p.author_name} size={10} /> : <Link to="/u/$id" params={{ id: p.author_id }} title={L ? "प्रोफ़ाइल देखें" : "View profile"}><Avatar url={p.author_photo} name={p.author_name} size={10} /></Link>}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">{p.as_org ? p.author_name : <Link to="/u/$id" params={{ id: p.author_id }} className="hover:underline">{p.author_name}</Link>}{p.as_org ? <span className="ml-1.5 rounded bg-primary-soft px-1.5 py-0.5 text-[10px] font-medium text-primary-deep">{L ? "संगठन" : "Organization"}</span> : null}{p.shared ? <span className="font-normal text-muted-foreground"> {L ? "ने एक पोस्ट शेयर की" : "shared a post"}</span> : null}{signedIn && !p.as_org && !p.mine && p.author_rel === "none" ? <> <span className="font-normal text-muted-foreground">·</span> <FollowButton userId={p.author_id} following={false} L={L} variant="link" /></> : null}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            {p.pinned ? <><Pin className="size-3 text-primary" /><span className="text-primary">{L ? "पिन" : "Pinned"}</span> ·</> : null}
            <Link to="/community/$id" params={{ id: p.id }} className="hover:underline" title={new Date(p.created_at).toLocaleString(L ? "hi-IN" : "en-IN")}>{timeAgo(p.created_at, L)}</Link> · <span title={vis.label}>{vis.icon}</span>
          </p>
        </div>
        {signedIn ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-secondary" aria-label={L ? "विकल्प" : "Options"}><MoreHorizontal className="size-5" /></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => void share("copy")}>{L ? "लिंक कॉपी करें" : "Copy link"}</DropdownMenuItem>
              {p.can_moderate ? <><DropdownMenuItem onClick={() => void moderate(null, !p.pinned)}>{p.pinned ? (L ? "अनपिन करें" : "Unpin") : (L ? "ऊपर पिन करें" : "Pin to top")}</DropdownMenuItem><DropdownMenuItem onClick={() => void moderate("hidden", null)}>{L ? "छिपाएँ" : "Hide"}</DropdownMenuItem></> : null}
              {!p.mine ? <DropdownMenuItem onClick={() => void report()}>{L ? "रिपोर्ट करें" : "Report"}</DropdownMenuItem> : null}
              {p.mine || p.can_moderate ? <><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive" onClick={() => void remove()}>{L ? "पोस्ट हटाएँ" : "Delete post"}</DropdownMenuItem></> : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </header>
      {p.reach === "limited" ? <p className="mx-4 mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">{p.political ? (L ? "🗳️ राजनीतिक विषय: समाज के मंच पर राजनीतिक पोस्ट एडमिन की मंज़ूरी के बाद ही सबको दिखती है। अभी सिर्फ़ आपको और मॉडरेटर को दिख रही है; एडमिन को सूचना चली गई है।" : "🗳️ Political topic: political posts are shown to everyone only after admin approval. Only you and moderators can see it now; admins have been notified.") : (L ? "⚠️ पहुँच सीमित: यह पोस्ट प्रचार/विज्ञापन जैसी लगी, इसलिए सिर्फ़ आपको और मॉडरेटर को दिख रही है। मॉडरेटर समीक्षा करेंगे।" : "⚠️ Limited reach: this post looks like promotion/advertising, so only you and moderators can see it. A moderator will review it.")}{p.can_moderate ? <> · <Link to="/admin/community" className="underline">{L ? "समीक्षा" : "review"}</Link></> : null}{p.mine ? <> · <button type="button" className="underline" onClick={appeal}>{L ? "समीक्षा का अनुरोध करें" : "Request review"}</button></> : null}</p> : null}
      <div className="mt-2.5 space-y-3">
        {p.body ? <Body text={p.body} onTag={onTag} big={big} /> : null}
        {urls.length ? <PhotoGrid urls={urls} onOpen={setPhoto} /> : null}
        {p.link_url ? <LinkEmbed url={p.link_url} kind={p.link_kind} /> : null}
        {p.shared ? <SharedBox s={p.shared} L={L} onTag={onTag} /> : null}
      </div>
      {likes || comments || p.share_count ? (
        <div className="mx-4 mt-3 flex items-center justify-between gap-2 text-[13px] text-muted-foreground">
          <span className="flex items-center gap-1.5">{likes ? <><span className="grid size-[18px] place-items-center rounded-full bg-gradient-to-b from-sky-400 to-blue-600 text-white"><ThumbsUp className="size-2.5 fill-current" /></span>{liked ? (likes > 1 ? (L ? `आप और ${likes - 1} अन्य` : `You and ${likes - 1} others`) : (L ? "आप" : "You")) : likes}</> : null}</span>
          <span className="flex gap-3">
            {comments ? <button type="button" className="hover:underline" onClick={() => setOpen(true)}>{comments} {L ? "टिप्पणियाँ" : comments === 1 ? "comment" : "comments"}</button> : null}
            {p.share_count ? <span>{p.share_count} {L ? "शेयर" : "shares"}</span> : null}
          </span>
        </div>
      ) : null}
      <footer className="mx-3 mt-2 flex border-t border-border py-1">
        <ActBtn onClick={() => void like()} active={liked}><ThumbsUp className={`size-[18px] ${liked ? "fill-current" : ""}`} />{L ? "पसंद" : "Like"}</ActBtn>
        <ActBtn onClick={() => setOpen((v) => !v)}><MessageCircle className="size-[18px]" />{L ? "टिप्पणी" : "Comment"}</ActBtn>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold text-muted-foreground transition hover:bg-secondary"><Share2 className="size-[18px]" />{L ? "शेयर" : "Share"}</DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            {canWall ? <><DropdownMenuItem onClick={() => setSharing(true)}><Repeat2 className="size-4 text-primary" /> {L ? "अपनी प्रोफ़ाइल पर शेयर करें" : "Share to your profile"}</DropdownMenuItem><DropdownMenuSeparator /></> : null}
            <DropdownMenuItem onClick={() => void share("wa")}><span className="text-emerald-600">●</span> WhatsApp {L ? "पर भेजें" : ""}</DropdownMenuItem>
            {typeof navigator !== "undefined" && typeof navigator.share === "function" ? <DropdownMenuItem onClick={() => void share("native")}>{L ? "दूसरे ऐप में…" : "Other apps…"}</DropdownMenuItem> : null}
            <DropdownMenuItem onClick={() => void share("copy")}>{L ? "लिंक कॉपी करें" : "Copy link"}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </footer>
      {open ? <Comments post={p} L={L} signedIn={signedIn} onCount={setComments} /> : null}
      {photo !== null ? <Lightbox urls={urls} index={photo} onClose={() => setPhoto(null)} /> : null}
      {sharing ? <ShareToWall p={p} L={L} onClose={() => setSharing(false)} onDone={() => { setSharing(false); onChange(); }} /> : null}
    </article>
  );
}

/** The original post shown inside a share. */
function SharedBox({ s, L, onTag }: { s: Shared; L: boolean; onTag?: ((t: string) => void) | undefined }) {
  const [photo, setPhoto] = useState<number | null>(null);
  if (!s.available) return <p className="mx-4 rounded-xl border border-dashed border-border bg-secondary/40 px-4 py-6 text-center text-sm text-muted-foreground">{L ? "यह पोस्ट अब उपलब्ध नहीं है — हटाई गई है या आप इसे नहीं देख सकते।" : "This post is no longer available — it was removed or you can't see it."}</p>;
  const urls = (s.media ?? []).filter((m) => m.type === "image").map((m) => mediaUrl(m.path));
  return (
    <div className="mx-4 overflow-hidden rounded-xl border border-border">
      {urls.length ? <PhotoGrid urls={urls} onOpen={setPhoto} /> : null}
      {s.link_url ? <div className="pt-3"><LinkEmbed url={s.link_url} kind={s.link_kind ?? null} /></div> : null}
      <div className="flex items-center gap-2 px-4 pt-3">
        {s.as_org ? <Avatar url={s.author_photo} name={s.author_name ?? "?"} size={8} /> : <Link to="/u/$id" params={{ id: s.author_id! }}><Avatar url={s.author_photo} name={s.author_name ?? "?"} size={8} /></Link>}
        <div className="min-w-0 text-sm">
          {s.as_org ? <p className="truncate font-semibold">{s.author_name}</p> : <Link to="/u/$id" params={{ id: s.author_id! }} className="block truncate font-semibold hover:underline">{s.author_name}</Link>}
          <Link to="/community/$id" params={{ id: s.id }} className="text-xs text-muted-foreground hover:underline">{timeAgo(s.created_at, L)}</Link>
        </div>
      </div>
      <div className="pb-3 pt-2">{s.body ? <Body text={s.body} onTag={onTag} big={false} /> : null}</div>
      {photo !== null ? <Lightbox urls={urls} index={photo} onClose={() => setPhoto(null)} /> : null}
    </div>
  );
}

/** "Share to your profile": your words on top, the original underneath. */
function ShareToWall({ p, L, onClose, onDone }: { p: Post; L: boolean; onClose: () => void; onDone: () => void }) {
  const { me } = useMe();
  const consent = useConsent();
  const [body, setBody] = useState("");
  const [vis, setVis] = useState<"members" | "public" | "friends">("members");
  const [busy, setBusy] = useState(false);
  const original: Shared = p.shared ?? { id: p.id, available: true, author_id: p.author_id, author_name: p.author_name, author_photo: p.author_photo, as_org: p.as_org, body: p.body, media: p.media, link_url: p.link_url, link_kind: p.link_kind, created_at: p.created_at, visibility: p.visibility };
  async function go() {
    if (!consent.accepted) { consent.ensure(() => void go()); return; }
    setBusy(true);
    try { await rpc("k1_post_share_to_wall", { p_post: original.id, p_body: body.trim() || null, p_visibility: vis }); toast.success(L ? "आपकी प्रोफ़ाइल पर शेयर हो गई" : "Shared to your profile"); onDone(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o && !busy) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-lg gap-0 overflow-y-auto p-0">
        <DialogHeader className="border-b border-border px-4 py-3"><DialogTitle className="text-center font-display text-lg">{L ? "अपनी प्रोफ़ाइल पर शेयर करें" : "Share to your profile"}</DialogTitle></DialogHeader>
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-2.5">
            <Avatar url={me?.photo} name={me?.name ?? "?"} size={10} />
            <div className="min-w-0 space-y-1">
              <p className="truncate font-semibold leading-tight">{me?.name}</p>
              <select aria-label={L ? "कौन देखे" : "Audience"} className="h-7 rounded-md bg-secondary px-2 text-xs font-medium" value={vis} onChange={(e) => setVis(e.target.value as typeof vis)}>{VIS(L).map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}</select>
            </div>
          </div>
          <Textarea autoFocus rows={2} className="resize-none border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0" placeholder={L ? "इसके बारे में कुछ लिखें… (वैकल्पिक)" : "Say something about this… (optional)"} value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} />
          <div className="pointer-events-none max-h-72 overflow-hidden opacity-90"><SharedBox s={original} L={L} /></div>
          <Button className="h-11 w-full rounded-xl text-base" onClick={() => void go()} disabled={busy}><Repeat2 className="size-5" /> {busy ? "…" : (L ? "अभी शेयर करें" : "Share now")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Comments({ post, L, signedIn, onCount }: { post: Post; L: boolean; signedIn: boolean; onCount: (n: number) => void }) {
  const tenant = useTenant();
  const qc = useQueryClient();
  const { me } = useMe();
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: ["comments", post.id], queryFn: () => rpc<Comment[]>("k1_post_comments", { p_post: post.id }) });
  useEffect(() => { if (q.data) onCount(q.data.length); }, [q.data]); // eslint-disable-line react-hooks/exhaustive-deps
  async function send() {
    if (!body.trim() || busy) return;
    setBusy(true);
    try {
      const uid = (await supabase.auth.getUser()).data.user?.id;
      const root = (await rpc<string | null>("k1_root_org", { p_org: tenant.organization_id })) ?? tenant.organization_id;
      const { error } = await supabase.from("cm_post_comments").insert({ post_id: post.id, organization_id: root, author_id: uid, parent_id: replyTo?.id ?? null, body: body.trim() } as never);
      if (error) { toast.error(error.message); return; }
      setBody(""); setReplyTo(null); await qc.invalidateQueries({ queryKey: ["comments", post.id] });
    } finally { setBusy(false); }
  }
  async function del(id: string) { if (!confirm(L ? "टिप्पणी हटाएँ?" : "Delete comment?")) return; const { error } = await supabase.from("cm_post_comments").delete().eq("id", id); if (error) toast.error(error.message); else await qc.invalidateQueries({ queryKey: ["comments", post.id] }); }
  const all = q.data ?? []; const roots = all.filter((c) => !c.parent_id);
  const C = ({ c, depth }: { c: Comment; depth: number }) => (
    <div className={`flex gap-2 ${depth ? "ml-10 mt-2" : "mt-2.5"}`}>
      <Link to="/u/$id" params={{ id: c.author_id }} className="shrink-0"><Avatar url={c.author_photo} name={c.author_name} size={depth ? 7 : 8} /></Link>
      <div className="min-w-0 flex-1">
        <div className="inline-block max-w-full rounded-2xl bg-secondary px-3 py-2">
          <Link to="/u/$id" params={{ id: c.author_id }} className="block text-[13px] font-semibold hover:underline">{c.author_name}</Link>
          <p className="whitespace-pre-wrap break-words text-sm">{c.body}</p>
        </div>
        <div className="flex gap-3 px-3 pt-0.5 text-xs font-semibold text-muted-foreground">
          <span className="font-normal">{timeAgo(c.created_at, L)}</span>
          {signedIn && !depth ? <button type="button" className="hover:underline" onClick={() => { setReplyTo(c); document.getElementById(`cmt-${post.id}`)?.focus(); }}>{L ? "जवाब दें" : "Reply"}</button> : null}
          {c.mine || post.can_moderate ? <button type="button" className="hover:underline" onClick={() => void del(c.id)}>{L ? "हटाएँ" : "Delete"}</button> : null}
        </div>
        {all.filter((x) => x.parent_id === c.id).map((x) => <C key={x.id} c={x} depth={1} />)}
      </div>
    </div>
  );
  return (
    <div className="border-t border-border px-4 pb-3 pt-1">
      {q.isLoading ? <p className="py-2 text-xs text-muted-foreground">…</p> : null}
      {roots.map((c) => <C key={c.id} c={c} depth={0} />)}
      {q.isSuccess && !roots.length ? <p className="pt-2 text-xs text-muted-foreground">{L ? "अभी कोई टिप्पणी नहीं — पहली आप लिखिए।" : "No comments yet — write the first."}</p> : null}
      {signedIn ? (
        <div className="mt-3 flex items-start gap-2">
          <Avatar url={me?.photo} name={me?.name ?? "?"} size={8} />
          <div className="min-w-0 flex-1">
            {replyTo ? <p className="mb-1 text-xs text-muted-foreground">↳ {L ? `${replyTo.author_name} को जवाब` : `Replying to ${replyTo.author_name}`} · <button type="button" className="font-semibold hover:underline" onClick={() => setReplyTo(null)}>{L ? "रद्द" : "Cancel"}</button></p> : null}
            <div className="flex items-center rounded-full bg-secondary pr-1">
              <input id={`cmt-${post.id}`} className="h-9 min-w-0 flex-1 bg-transparent px-4 text-sm outline-none" placeholder={L ? "टिप्पणी लिखें…" : "Write a comment…"} value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void send(); }} />
              <button type="button" aria-label={L ? "भेजें" : "Send"} disabled={!body.trim() || busy} onClick={() => void send()} className="grid size-8 place-items-center rounded-full text-primary hover:bg-background disabled:opacity-40"><Send className="size-4" /></button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
