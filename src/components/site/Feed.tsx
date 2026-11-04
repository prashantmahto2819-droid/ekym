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

export type Post = { id: string; author_id: string; author_name: string; author_photo: string | null; body: string | null; media: { type: string; path: string }[]; link_url: string | null; link_kind: string | null; visibility: string; pinned: boolean; like_count: number; comment_count: number; share_count: number; created_at: string; liked: boolean; mine: boolean; can_moderate: boolean };
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
  const member = useQuery({ queryKey: ["is_member", org], enabled: !!user, queryFn: () => rpc<boolean>("k1_is_member", { p_org: org }) });
  const feed = useInfiniteQuery({
    queryKey: ["feed", org, postId ?? null],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => rpc<Post[]>("k1_feed", { p_org: org, p_before: pageParam, p_limit: 15, p_post: postId ?? null }),
    getNextPageParam: (last) => (last.length === 15 ? last[last.length - 1]!.created_at : undefined),
  });
  const posts = feed.data?.pages.flat() ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ["feed", org] });
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {!postId ? (user ? (member.data ? <Composer org={org} onPosted={refresh} L={L} /> : member.isSuccess ? <p className="rounded-lg border border-border bg-secondary/40 p-3 text-sm">{L ? "पोस्ट करने के लिए संगठन का सदस्य बनें: " : "Become a member to post: "}<Link to="/join" className="underline">{L ? "सदस्यता फ़ॉर्म" : "membership form"}</Link></p> : null) : <p className="rounded-lg border border-border bg-secondary/40 p-3 text-sm"><Link to="/auth" className="underline">{L ? "लॉगिन करें" : "Sign in"}</Link>{L ? " — फिर पोस्ट, लाइक और टिप्पणी कर सकेंगे।" : " to post, like and comment."}</p>) : null}
      {posts.map((p, i) => <div key={p.id}><PostCard p={p} L={L} signedIn={!!user} onChange={refresh} />{i === 2 ? <AdSlot slot="feed" className="mt-4 surface-card p-3" /> : null}</div>)}
      {feed.isSuccess && !posts.length ? <p className="text-center text-sm text-muted-foreground">{L ? "अभी कोई पोस्ट नहीं — पहली पोस्ट आप करें!" : "No posts yet — be the first!"}</p> : null}
      {feed.hasNextPage ? <div className="text-center"><Button variant="outline" onClick={() => feed.fetchNextPage()} disabled={feed.isFetchingNextPage}>{L ? "और देखें" : "Load more"}</Button></div> : null}
    </div>
  );
}

function Composer({ org, onPosted, L }: { org: string; onPosted: () => void; L: boolean }) {
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [vis, setVis] = useState<"members" | "public">("members");
  const [busy, setBusy] = useState(false);
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
      const { error } = await supabase.from("cm_posts").insert({ organization_id: org, author_id: uid, body: body.trim() || null, media, link_url: link.trim() || null, link_kind: link.trim() ? linkKind(link.trim()) : null, visibility: vis } as never);
      if (error) throw error;
      setBody(""); setLink(""); setFiles([]); onPosted();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="surface-card space-y-2 p-4">
      <Textarea rows={3} placeholder={L ? "क्या साझा करना चाहते हैं?" : "What would you like to share?"} value={body} onChange={(e) => setBody(e.target.value)} />
      <Input placeholder={L ? "YouTube / Instagram / Facebook वीडियो या कोई link (वैकल्पिक)" : "YouTube / Instagram / Facebook video or any link (optional)"} value={link} onChange={(e) => setLink(e.target.value)} />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="cursor-pointer rounded-md border border-border px-3 py-1.5">📷 {L ? "फोटो" : "Photos"}{files.length ? ` (${files.length})` : ""}<input type="file" accept="image/*" multiple hidden onChange={(e) => setFiles([...(e.target.files ?? [])])} /></label>
        <select className="h-9 rounded-md border border-input bg-background px-2" value={vis} onChange={(e) => setVis(e.target.value as typeof vis)}><option value="members">{L ? "सिर्फ़ सदस्य" : "Members only"}</option><option value="public">{L ? "सार्वजनिक" : "Public"}</option></select>
        <Button className="ml-auto" onClick={post} disabled={busy}>{L ? "पोस्ट करें" : "Post"}</Button>
      </div>
      {files.length ? <div className="flex flex-wrap gap-2">{files.map((f, i) => <img key={i} src={URL.createObjectURL(f)} alt="" className="h-16 w-16 rounded object-cover" />)}</div> : null}
    </div>
  );
}

function PostCard({ p, L, signedIn, onChange }: { p: Post; L: boolean; signedIn: boolean; onChange: () => void }) {
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
  async function moderate(status: string | null, pinned: boolean | null) { try { await rpc("k1_post_moderate", { p_post: p.id, p_status: status, p_pinned: pinned }); onChange(); } catch (e) { toast.error((e as Error).message); } }
  async function remove() { if (!confirm(L ? "पोस्ट हटाएँ?" : "Delete this post?")) return; const { error } = await supabase.from("cm_posts").delete().eq("id", p.id); if (error) toast.error(error.message); else onChange(); }
  async function report() { const r = prompt(L ? "क्या गलत है? (एडमिन देखेगा)" : "What's wrong? (sent to moderators)"); if (!r) return; const uid = (await supabase.auth.getUser()).data.user?.id; const { error } = await supabase.from("cm_post_reports").insert({ post_id: p.id, organization_id: (await supabase.from("cm_posts").select("organization_id").eq("id", p.id).single()).data?.organization_id, reporter_id: uid, reason: r } as never); if (error) toast.error(error.message); else toast.success(L ? "रिपोर्ट भेजी" : "Reported"); }
  return (
    <article className="surface-card p-4">
      <header className="flex items-center gap-3">
        {p.author_photo ? <img src={p.author_photo} alt="" className="size-10 rounded-full object-cover" /> : <span className="grid size-10 place-items-center rounded-full bg-primary/10 font-display font-semibold text-primary">{p.author_name.slice(0, 1)}</span>}
        <div className="min-w-0 flex-1"><p className="font-semibold">{p.author_name} {p.pinned ? <Badge className="ml-1">{L ? "पिन" : "pinned"}</Badge> : null}</p><p className="text-xs text-muted-foreground"><Link to="/community/$id" params={{ id: p.id }} className="hover:underline">{new Date(p.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</Link> · {p.visibility === "public" ? (L ? "सार्वजनिक" : "public") : (L ? "सदस्य" : "members")}</p></div>
        {(p.mine || p.can_moderate) ? <details className="relative"><summary className="cursor-pointer list-none px-2 text-muted-foreground">⋯</summary><div className="absolute right-0 z-10 mt-1 flex w-40 flex-col rounded-md border border-border bg-background p-1 text-sm shadow">{p.can_moderate ? <><button type="button" className="rounded px-2 py-1 text-left hover:bg-secondary" onClick={() => moderate(null, !p.pinned)}>{p.pinned ? (L ? "अनपिन" : "Unpin") : (L ? "पिन करें" : "Pin")}</button><button type="button" className="rounded px-2 py-1 text-left hover:bg-secondary" onClick={() => moderate("hidden", null)}>{L ? "छिपाएँ" : "Hide"}</button></> : null}{p.mine || p.can_moderate ? <button type="button" className="rounded px-2 py-1 text-left text-destructive hover:bg-secondary" onClick={remove}>{L ? "हटाएँ" : "Delete"}</button> : null}</div></details> : null}
      </header>
      {p.body ? <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">{p.body}</p> : null}
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
    const { error } = await supabase.from("cm_post_comments").insert({ post_id: post.id, organization_id: tenant.organization_id, author_id: uid, parent_id: replyTo, body: body.trim() } as never);
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
