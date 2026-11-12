// "Kalchuri One" community feed: compose (text + photos + video/link), like, comment, share, report; moderators pin/hide.
import { Link } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { AdSlot } from "@/components/site/Ads";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLang } from "@/core/i18n";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export type Post = { id: string; author_id: string; author_name: string; author_photo: string | null; body: string | null; media: { type: string; path: string }[]; link_url: string | null; link_kind: string | null; visibility: string; pinned: boolean; like_count: number; comment_count: number; share_count: number; created_at: string; liked: boolean; mine: boolean; can_moderate: boolean; reach: string; moderation_status: string; as_org: string | null; as_org_name: string | null; tags: string[] };
type Comment = { id: string; parent_id: string | null; author_id: string; author_name: string; body: string; created_at: string; mine: boolean };

export const COMMUNITY_NAME = { en: "Kalchuri One", hi: "कलचुरी वन" };
const rpc = async <T,>(fn: string, args: Record<string, unknown>): Promise<T> => { const { data, error } = await supabase.rpc(fn as never, args as never); if (error) throw new Error(error.message); return data as T; };
export const mediaUrl = (path: string) => supabase.storage.from("community").getPublicUrl(path).data.publicUrl;

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
    return id ? <iframe className="aspect-video w-full rounded-lg" src={`https://www.youtube.com/embed/${id}`} title="video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" /> : null;
  }
  if (k === "facebook") return <iframe className="aspect-video w-full rounded-lg" src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`} title="video" allowFullScreen loading="lazy" />;
  if (k === "instagram") { const m = url.match(/instagram\.com\/(?:p|reel|reels)\/([\w-]+)/); return m ? <iframe className="h-[560px] w-full max-w-sm rounded-lg" src={`https://www.instagram.com/p/${m[1]}/embed`} title="instagram" loading="lazy" /> : <a href={url} target="_blank" rel="noreferrer" className="underline">{url}</a>; }
  return <a href={url} target="_blank" rel="noreferrer" className="block truncate rounded-md border border-border bg-secondary/40 p-2 text-sm underline">{url}</a>;
}

export function Feed({ postId }: { postId?: string }) {
  const tenant = useTenant();
  const org = tenant.organization_id;
  const { user } = useAuth();
  const { lang } = useLang();
  const L = lang === "hi";
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const searching = !postId && (q.trim().length >= 2 || !!tag);
  const member = useQuery({ queryKey: ["is_member", org], enabled: !!user, queryFn: () => rpc<boolean>("k1_is_member", { p_org: org }) });
  const applicant = useQuery({ queryKey: ["is_applicant", org], enabled: !!user && member.isSuccess && !member.data, queryFn: () => rpc<boolean>("k1_is_applicant", { p_org: org }) });
  const tags = useQuery({ queryKey: ["cm_tags", org], enabled: !postId, staleTime: 120_000, queryFn: () => rpc<{ tag: string; n: number }[]>("k1_cm_tags", { p_org: org, p_limit: 12 }) });
  const feed = useInfiniteQuery({
    queryKey: ["feed", org, postId ?? null, searching ? q.trim() : "", tag],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => searching
      ? rpc<Post[]>("k1_feed_search", { p_org: org, p_q: q.trim() || null, p_tag: tag, p_before: pageParam, p_limit: 15 })
      : rpc<Post[]>("k1_feed", { p_org: org, p_before: pageParam, p_limit: 15, p_post: postId ?? null }),
    getNextPageParam: (last) => (last.length === 15 ? last[last.length - 1]!.created_at : undefined),
  });
  const posts = feed.data?.pages.flat() ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ["feed", org] });
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {!postId ? (
        <div className="flex flex-wrap items-center gap-2">
          <Input className="max-w-xs" placeholder={L ? "खोजें… (नाम, शब्द, #टैग)" : "Search… (name, words, #tag)"} value={q} onChange={(e) => { const v = e.target.value; if (v.startsWith("#") && v.length > 1) { setTag(v.slice(1)); setQ(""); } else setQ(v); }} />
          {tag ? <Badge className="cursor-pointer" onClick={() => setTag(null)}>#{tag} ×</Badge> : null}
          {user ? <NotificationsBell L={L} /> : null}
        </div>
      ) : null}
      {!postId && !tag && tags.data?.length ? <div className="flex flex-wrap gap-1 text-xs">{tags.data.map((t) => <button key={t.tag} type="button" className="rounded-full border border-border px-2 py-0.5 hover:bg-secondary" onClick={() => setTag(t.tag)}>#{t.tag} <span className="text-muted-foreground">{t.n}</span></button>)}</div> : null}
      {!postId ? (user ? (member.data ? <Composer org={org} onPosted={refresh} L={L} /> : member.isSuccess ? (applicant.data
          ? <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{L ? "आपकी सदस्यता की मंज़ूरी बाकी है — तब तक आप पढ़ सकते हैं; मंज़ूरी मिलते ही पोस्ट, लाइक और टिप्पणी खुल जाएँगे।" : "Your membership is awaiting approval — you can read meanwhile; posting, likes and comments open once approved."}</p>
          : <p className="rounded-lg border border-border bg-secondary/40 p-3 text-sm">{L ? "पोस्ट करने के लिए संगठन का सदस्य बनें: " : "Become a member to post: "}<Link to="/join" className="underline">{L ? "सदस्यता फ़ॉर्म" : "membership form"}</Link></p>) : null) : <p className="rounded-lg border border-border bg-secondary/40 p-3 text-sm"><Link to="/auth" className="underline">{L ? "लॉगिन करें" : "Sign in"}</Link>{L ? " — फिर पोस्ट, लाइक और टिप्पणी कर सकेंगे।" : " to post, like and comment."}</p>) : null}
      {posts.map((p, i) => <div key={p.id}><PostCard p={p} L={L} signedIn={!!user} onChange={refresh} onTag={setTag} />{i === 2 ? <AdSlot slot="feed" className="mt-4 surface-card p-3" /> : null}</div>)}
      {feed.isSuccess && !posts.length ? <p className="text-center text-sm text-muted-foreground">{searching ? (L ? "कुछ नहीं मिला।" : "Nothing found.") : (L ? "अभी कोई पोस्ट नहीं — पहली पोस्ट आप करें!" : "No posts yet — be the first!")}</p> : null}
      {feed.hasNextPage ? <div className="text-center"><Button variant="outline" onClick={() => feed.fetchNextPage()} disabled={feed.isFetchingNextPage}>{L ? "और देखें" : "Load more"}</Button></div> : null}
    </div>
  );
}

function Composer({ org, onPosted, L }: { org: string; onPosted: () => void; L: boolean }) {
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [vis, setVis] = useState<"members" | "public">("members");
  const [asOrg, setAsOrg] = useState<string>("");
  const asOpts = useQuery({ queryKey: ["post_as_options"], queryFn: () => rpc<{ id: string; name: string; name_hi: string | null; logo: string | null }[]>("k1_post_as_options", {}) });
  const [busy, setBusy] = useState(false);
  const [mentions, setMentions] = useState<{ user_id: string; full_name: string }[]>([]);
  const mq = /(?:^|\s)@([^\s@]{1,30})$/.exec(body);
  const sugg = useQuery({ queryKey: ["mention", org, mq?.[1]], enabled: !!mq, queryFn: () => rpc<{ user_id: string; full_name: string; org_name: string }[]>("k1_mention_search", { p_org: org, p_q: mq![1], p_limit: 8 }) });
  function pickMention(m: { user_id: string; full_name: string }) {
    setBody((b) => b.replace(/@([^\s@]{1,30})$/, `@${m.full_name} `));
    setMentions((x) => (x.some((y) => y.user_id === m.user_id) ? x : [...x, m]));
  }
  async function post() {
    if (!body.trim() && !link.trim() && !files.length) return;
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
      void uid;
      await rpc("k1_post_create", { p_org: org, p_body: body.trim() || null, p_media: media, p_link: link.trim() || null, p_link_kind: link.trim() ? linkKind(link.trim()) : null, p_visibility: vis, p_as_org: asOrg || null, p_mentions: mentions.filter((m) => body.includes(`@${m.full_name}`)).map((m) => m.user_id) });
      setBody(""); setLink(""); setFiles([]); setMentions([]); onPosted();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="surface-card space-y-2 p-4">
      <div className="relative">
        <Textarea rows={3} placeholder={L ? "क्या साझा करना चाहते हैं? किसी सदस्य को @नाम से जोड़ें" : "What would you like to share? Mention a member with @name"} value={body} onChange={(e) => setBody(e.target.value)} />
        {mq && sugg.data?.length ? <ul className="absolute left-0 z-20 mt-1 w-72 rounded-md border border-border bg-background text-sm shadow-md">{sugg.data.map((m) => <li key={m.user_id}><button type="button" className="flex w-full flex-col items-start px-3 py-1.5 text-left hover:bg-secondary" onClick={() => pickMention(m)}><span className="font-medium">@{m.full_name}</span><span className="text-xs text-muted-foreground">{m.org_name}</span></button></li>)}</ul> : null}
      </div>
      <p className="text-xs text-muted-foreground">{L ? "विज्ञापन / व्यापारिक प्रचार / चुनावी प्रचार वाली पोस्ट की पहुँच अपने-आप सीमित हो जाती है। विज्ञापन देना हो तो " : "Advertising, business or political promotion gets limited reach automatically. To advertise, see "}<Link to="/sponsored" className="underline">{L ? "प्रायोजित सेक्शन" : "the Sponsored section"}</Link>.</p>
      <Input placeholder={L ? "YouTube / Instagram / Facebook वीडियो या कोई link (वैकल्पिक)" : "YouTube / Instagram / Facebook video or any link (optional)"} value={link} onChange={(e) => setLink(e.target.value)} />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="cursor-pointer rounded-md border border-border px-3 py-1.5">📷 {L ? "फोटो" : "Photos"}{files.length ? ` (${files.length})` : ""}<input type="file" accept="image/*" multiple hidden onChange={(e) => setFiles([...(e.target.files ?? [])])} /></label>
        <select className="h-9 rounded-md border border-input bg-background px-2" value={vis} onChange={(e) => setVis(e.target.value as typeof vis)}><option value="members">{L ? "सिर्फ़ सदस्य" : "Members only"}</option><option value="public">{L ? "सार्वजनिक" : "Public"}</option></select>
        {asOpts.data?.length ? <select className="h-9 max-w-[220px] rounded-md border border-input bg-background px-2" value={asOrg} onChange={(e) => setAsOrg(e.target.value)} title={L ? "किसकी ओर से" : "Post as"}><option value="">{L ? "व्यक्तिगत पोस्ट" : "Personal post"}</option>{asOpts.data.map((o) => <option key={o.id} value={o.id}>{L ? "संगठन: " : "As: "}{L && o.name_hi ? o.name_hi : o.name}</option>)}</select> : null}
        <Button className="ml-auto" onClick={post} disabled={busy}>{L ? "पोस्ट करें" : "Post"}</Button>
      </div>
      {files.length ? <div className="flex flex-wrap gap-2">{files.map((f, i) => <img key={i} src={URL.createObjectURL(f)} alt="" className="h-16 w-16 rounded object-cover" />)}</div> : null}
    </div>
  );
}

/** Body text with clickable #hashtags. */
function Body({ text, onTag }: { text: string; onTag?: ((t: string) => void) | undefined }) {
  const parts = text.split(/(#[^\s#@.,!?()[\]{}"'|<>]{2,40}|@[^\s#@.,!?()[\]{}"'|<>]+(?: [^\s#@.,!?()[\]{}"'|<>]+)?)/g);
  return <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">{parts.map((x, i) => x.startsWith("#") && x.length > 1 ? <button key={i} type="button" className="text-primary hover:underline" onClick={() => onTag?.(x.slice(1).toLowerCase())}>{x}</button> : x.startsWith("@") ? <span key={i} className="font-semibold text-primary">{x}</span> : <span key={i}>{x}</span>)}</p>;
}

export function PostCard({ p, L, signedIn, onChange, onTag }: { p: Post; L: boolean; signedIn: boolean; onChange: () => void; onTag?: ((t: string) => void) | undefined }) {
  const [open, setOpen] = useState(false);
  const [liked, setLiked] = useState(p.liked); const [likes, setLikes] = useState(p.like_count);
  const url = typeof window !== "undefined" ? `${window.location.origin}/community/${p.id}` : `/community/${p.id}`;
  async function like() {
    if (!signedIn) { toast.error(L ? "लाइक के लिए लॉगिन करें" : "Sign in to like"); return; }
    try { const r = await rpc<boolean>("k1_toggle_like", { p_post: p.id }); setLiked(r); setLikes((n) => n + (r ? 1 : -1)); } catch (e) { toast.error((e as Error).message); }
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
  return (
    <article className="surface-card p-4">
      <header className="flex items-center gap-3">
        <Link to="/u/$id" params={{ id: p.author_id }} title={L ? "प्रोफ़ाइल देखें" : "View profile"}>{p.author_photo ? <img src={p.author_photo} alt="" className="size-10 rounded-full object-cover" /> : <span className="grid size-10 place-items-center rounded-full bg-primary/10 font-display font-semibold text-primary">{p.author_name.slice(0, 1)}</span>}</Link>
        <div className="min-w-0 flex-1"><p className="font-semibold">{p.as_org ? p.author_name : <Link to="/u/$id" params={{ id: p.author_id }} className="hover:underline">{p.author_name}</Link>} {p.as_org ? <Badge variant="outline" className="ml-1 text-[10px]">{L ? "संगठन" : "organization"}</Badge> : null} {p.pinned ? <Badge className="ml-1">{L ? "पिन" : "pinned"}</Badge> : null}</p><p className="text-xs text-muted-foreground"><Link to="/community/$id" params={{ id: p.id }} className="hover:underline">{new Date(p.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</Link> · {p.visibility === "public" ? (L ? "सार्वजनिक" : "public") : (L ? "सदस्य" : "members")}</p></div>
        {(p.mine || p.can_moderate) ? <details className="relative"><summary className="cursor-pointer list-none px-2 text-muted-foreground">⋯</summary><div className="absolute right-0 z-10 mt-1 flex w-40 flex-col rounded-md border border-border bg-background p-1 text-sm shadow">{p.can_moderate ? <><button type="button" className="rounded px-2 py-1 text-left hover:bg-secondary" onClick={() => moderate(null, !p.pinned)}>{p.pinned ? (L ? "अनपिन" : "Unpin") : (L ? "पिन करें" : "Pin")}</button><button type="button" className="rounded px-2 py-1 text-left hover:bg-secondary" onClick={() => moderate("hidden", null)}>{L ? "छिपाएँ" : "Hide"}</button></> : null}{p.mine || p.can_moderate ? <button type="button" className="rounded px-2 py-1 text-left text-destructive hover:bg-secondary" onClick={remove}>{L ? "हटाएँ" : "Delete"}</button> : null}</div></details> : null}
      </header>
      {p.reach === "limited" ? <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">{L ? "⚠️ पहुँच सीमित: यह पोस्ट प्रचार/विज्ञापन जैसी लगी, इसलिए सिर्फ़ आपको और मॉडरेटर को दिख रही है। मॉडरेटर समीक्षा करेंगे।" : "⚠️ Limited reach: this post looks like promotion/advertising, so only you and moderators can see it. A moderator will review it."}{p.can_moderate ? <> · <Link to="/admin/community" className="underline">{L ? "समीक्षा" : "review"}</Link></> : null}{p.mine ? <> · <button type="button" className="underline" onClick={appeal}>{L ? "समीक्षा का अनुरोध करें" : "Request review"}</button></> : null}</p> : null}
      {p.body ? <Body text={p.body} onTag={onTag} /> : null}
      {p.media.length ? <div className={`mt-3 grid gap-1 ${p.media.length > 1 ? "grid-cols-2" : ""}`}>{p.media.map((m, i) => <a key={i} href={mediaUrl(m.path)} target="_blank" rel="noreferrer"><img src={mediaUrl(m.path)} alt="" className={`w-full rounded-lg object-cover ${p.media.length > 1 ? "aspect-square" : "max-h-[520px]"}`} loading="lazy" /></a>)}</div> : null}
      {p.link_url ? <div className="mt-3"><LinkEmbed url={p.link_url} kind={p.link_kind} /></div> : null}
      <footer className="mt-3 flex flex-wrap items-center gap-1 border-t border-border pt-2 text-sm">
        <Button size="sm" variant={liked ? "default" : "ghost"} onClick={like}>👍 {likes} {L ? "पसंद" : "Like"}</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>💬 {p.comment_count} {L ? "टिप्पणी" : "Comment"}</Button>
        <Button size="sm" variant="ghost" onClick={() => share("wa")}>WhatsApp</Button>
        <Button size="sm" variant="ghost" onClick={() => share(typeof navigator !== "undefined" && typeof navigator.share === "function" ? "native" : "copy")}>↗ {L ? "शेयर" : "Share"}{p.share_count ? ` (${p.share_count})` : ""}</Button>
        {signedIn && !p.mine ? <Button size="sm" variant="ghost" className="ml-auto text-xs text-muted-foreground" onClick={report}>{L ? "रिपोर्ट" : "Report"}</Button> : null}
      </footer>
      {open ? <Comments post={p} L={L} signedIn={signedIn} /> : null}
    </article>
  );
}

function Comments({ post, L, signedIn }: { post: Post; L: boolean; signedIn: boolean }) {
  const tenant = useTenant();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["comments", post.id], queryFn: () => rpc<Comment[]>("k1_post_comments", { p_post: post.id }) });
  async function send() {
    if (!body.trim()) return;
    const uid = (await supabase.auth.getUser()).data.user?.id;
    const root = (await rpc<string | null>("k1_root_org", { p_org: tenant.organization_id })) ?? tenant.organization_id;
    const { error } = await supabase.from("cm_post_comments").insert({ post_id: post.id, organization_id: root, author_id: uid, parent_id: replyTo, body: body.trim() } as never);
    if (error) { toast.error(error.message); return; }
    setBody(""); setReplyTo(null); qc.invalidateQueries({ queryKey: ["comments", post.id] }); qc.invalidateQueries({ queryKey: ["feed"] });
  }
  async function del(id: string) { const { error } = await supabase.from("cm_post_comments").delete().eq("id", id); if (error) toast.error(error.message); else { qc.invalidateQueries({ queryKey: ["comments", post.id] }); qc.invalidateQueries({ queryKey: ["feed"] }); } }
  const all = q.data ?? []; const roots = all.filter((c) => !c.parent_id);
  const C = ({ c, depth }: { c: Comment; depth: number }) => (
    <div className={`${depth ? "ml-8" : ""} mt-2 text-sm`}>
      <div className="rounded-lg bg-secondary/50 px-3 py-2"><p className="text-xs font-semibold">{c.author_name} <span className="font-normal text-muted-foreground">· {new Date(c.created_at).toLocaleDateString("en-IN")}</span></p><p className="whitespace-pre-wrap">{c.body}</p></div>
      <div className="flex gap-2 px-2 text-xs text-muted-foreground">{signedIn && !depth ? <button type="button" onClick={() => setReplyTo(c.id)}>{L ? "जवाब" : "Reply"}</button> : null}{c.mine || post.can_moderate ? <button type="button" onClick={() => del(c.id)}>{L ? "हटाएँ" : "Delete"}</button> : null}</div>
      {all.filter((x) => x.parent_id === c.id).map((x) => <C key={x.id} c={x} depth={1} />)}
    </div>
  );
  return (
    <div className="mt-2 border-t border-border pt-2">
      {roots.map((c) => <C key={c.id} c={c} depth={0} />)}
      {signedIn ? <div className="mt-2 flex gap-2">{replyTo ? <span className="self-center text-xs text-muted-foreground">↳ {L ? "जवाब" : "reply"} <button type="button" onClick={() => setReplyTo(null)}>×</button></span> : null}<Input placeholder={L ? "टिप्पणी लिखें…" : "Write a comment…"} value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} /><Button size="sm" onClick={send}>{L ? "भेजें" : "Send"}</Button></div> : null}
    </div>
  );
}

type Notif = { id: string; kind: string; text: string | null; post_id: string | null; comment_id: string | null; read_at: string | null; created_at: string; unread: number };
function NotificationsBell({ L }: { L: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const q = useQuery({ queryKey: ["cm_notifications"], refetchInterval: 60_000, queryFn: () => rpc<Notif[]>("k1_cm_notifications", { p_limit: 30 }) });
  const unread = q.data?.[0]?.unread ?? 0;
  async function markAll() { await rpc("k1_cm_notifications_read", { p_ids: null }); qc.invalidateQueries({ queryKey: ["cm_notifications"] }); }
  const icon: Record<string, string> = { mention: "@",  like: "👍", comment: "💬", reply: "↩️", moderation: "🛡️", appeal: "🙋" };
  return (
    <div className="relative ml-auto">
      <Button size="sm" variant="outline" onClick={() => { setOpen((v) => !v); if (!open && unread) void markAll(); }}>🔔 {L ? "सूचनाएँ" : "Notifications"}{unread ? <span className="ml-1 rounded-full bg-destructive px-1.5 text-[10px] text-destructive-foreground">{unread}</span> : null}</Button>
      {open ? <div className="absolute right-0 z-20 mt-1 max-h-96 w-80 overflow-y-auto rounded-md border border-border bg-background p-1 text-sm shadow-lg">
        {(q.data ?? []).map((n) => <Link key={n.id} to="/community/$id" params={{ id: n.post_id ?? "" }} disabled={!n.post_id} className={`block rounded px-2 py-1.5 hover:bg-secondary ${n.read_at ? "text-muted-foreground" : "font-medium"}`} onClick={() => setOpen(false)}>{icon[n.kind] ?? "•"} {n.text}<span className="block text-[11px] font-normal text-muted-foreground">{new Date(n.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span></Link>)}
        {q.isSuccess && !q.data.length ? <p className="p-2 text-muted-foreground">{L ? "अभी कोई सूचना नहीं।" : "No notifications yet."}</p> : null}
      </div> : null}
    </div>
  );
}
