// Public member profile — cover photo, display photo, bio, organizations & roles, posts. Members only (signed in).
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, ProfileCard } from "@/components/community/ChatBits";
import { PostCard, type Post } from "@/components/site/Feed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { call, timeAgo, useProfile } from "@/community/chat";
import { useLang } from "@/core/i18n";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/u/$id")({
  head: () => ({ meta: [{ title: "सदस्य प्रोफ़ाइल · Member profile" }, { name: "robots", content: "noindex" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { id } = Route.useParams();
  const { lang } = useLang(); const L = lang === "hi";
  const tenant = useTenant();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const p = useProfile(user ? id : null);
  const [card, setCard] = useState(false);
  const posts = useQuery({ queryKey: ["user_posts", tenant.organization_id, id], enabled: !!user, queryFn: () => call<Post[]>("k1_user_posts_json", { p_org: tenant.organization_id, p_user: id, p_limit: 20 }) });
  const d = p.data;
  async function dm() { try { const rid = await call<string>("k1_chat_open_dm", { p_org: tenant.organization_id, p_user: id }); void navigate({ to: "/community/chat", search: { room: rid } }); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } }
  if (!loading && !user) return <section className="container-page py-10 text-center text-sm"><p>{L ? "प्रोफ़ाइल देखने के लिए साइन इन कीजिए।" : "Sign in to view member profiles."}</p><Button asChild className="mt-3"><Link to="/auth">{L ? "साइन इन" : "Sign in"}</Link></Button></section>;
  return (
    <section className="container-page py-4 sm:py-6">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="h-44 bg-gradient-to-r from-primary/30 via-primary/15 to-amber-200/40 bg-cover bg-center sm:h-60" style={d?.cover_url ? { backgroundImage: `url(${d.cover_url})` } : undefined} />
        <div className="px-4 pb-4 sm:px-6">
          <div className="-mt-12 flex flex-wrap items-end gap-4 sm:-mt-16">
            <span className="rounded-full border-4 border-card bg-card"><Avatar url={d?.photo_url} name={d?.name ?? "?"} size={28} online={!!d?.online} /></span>
            <div className="min-w-0 flex-1 pb-1">
              <h1 className="font-display text-2xl font-semibold">{d?.name ?? "…"}</h1>
              <p className="text-sm text-muted-foreground">{d?.online ? (L ? "🟢 ऑनलाइन" : "🟢 online") : d?.last_seen_at ? `${L ? "आख़िरी बार" : "last seen"} ${timeAgo(d.last_seen_at, L)}` : ""}{d?.joined_at ? ` · ${L ? "सदस्य" : "member since"} ${new Date(d.joined_at).getFullYear()}` : ""}</p>
            </div>
            <div className="flex gap-2 pb-1">
              {d?.mine ? <Button asChild size="sm"><Link to="/me/profile"><Pencil className="size-4" /> {L ? "प्रोफ़ाइल सुधारें" : "Edit profile"}</Link></Button>
                : <><Button size="sm" onClick={() => void dm()} disabled={!d || d.blocked}><Send className="size-4" /> {L ? "संदेश भेजें" : "Message"}</Button><Button size="sm" variant="outline" onClick={() => setCard(true)}>{L ? "और" : "More"}</Button></>}
            </div>
          </div>
          {d ? (
            <div className="mt-4 grid gap-6 lg:grid-cols-[320px_1fr]">
              <aside className="space-y-4 text-sm">
                {d.bio ? <p className="whitespace-pre-wrap">{d.bio}</p> : d.mine ? <p className="text-muted-foreground">{L ? "अपने बारे में कुछ लिखिए — \"प्रोफ़ाइल सुधारें\" से।" : "Tell people about yourself — Edit profile."}</p> : null}
                <dl className="space-y-1">
                  {d.occupation ? <div><dt className="text-xs text-muted-foreground">{L ? "कार्य" : "Work"}</dt><dd>{d.occupation}</dd></div> : null}
                  {d.village || d.district ? <div><dt className="text-xs text-muted-foreground">{L ? "निवास" : "Lives in"}</dt><dd>{[d.village, d.district, d.state].filter(Boolean).join(", ")}</dd></div> : null}
                  {d.phone ? <div><dt className="text-xs text-muted-foreground">{L ? "मोबाइल" : "Mobile"}</dt><dd><a href={`tel:${d.phone}`} className="hover:underline">{d.phone}</a></dd></div> : null}
                  {d.email ? <div><dt className="text-xs text-muted-foreground">ईमेल</dt><dd><a href={`mailto:${d.email}`} className="hover:underline">{d.email}</a></dd></div> : null}
                </dl>
                {d.interests.length ? <div className="flex flex-wrap gap-1">{d.interests.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}</div> : null}
                {Object.entries(d.links).filter(([, v]) => v).length ? <div className="flex flex-wrap gap-2 text-xs">{Object.entries(d.links).filter(([, v]) => v).map(([k, v]) => <a key={k} href={v} target="_blank" rel="noreferrer" className="rounded-full border border-border px-2 py-0.5 capitalize hover:bg-secondary">{k}</a>)}</div> : null}
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{L ? "संगठन" : "Organizations"}</p>
                  <ul className="space-y-1">{d.orgs.map((o) => <li key={o.id} className="flex items-center justify-between gap-2"><span>{L ? (o.name_hi || o.name) : o.name}</span>{o.member_no ? <Badge variant="secondary">{o.member_no}</Badge> : null}</li>)}{!d.orgs.length ? <li className="text-muted-foreground">—</li> : null}</ul>
                </div>
                {d.roles.length ? <div><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{L ? "जिम्मेदारियाँ" : "Roles"}</p><ul className="space-y-1">{d.roles.map((r, i) => <li key={i}>{L ? (r.role || r.role_en) : r.role_en} <span className="text-muted-foreground">· {L ? (r.org || r.org_en) : r.org_en}</span></li>)}</ul></div> : null}
                {d.orgs.some((o) => o.family_id) ? <Button asChild size="sm" variant="outline"><Link to="/admin/families/$id" params={{ id: d.orgs.find((o) => o.family_id)!.family_id! }}>{L ? "वंश वृक्ष देखें" : "Family tree"}</Link></Button> : null}
              </aside>
              <main>
                <h2 className="mb-2 font-display text-lg font-semibold">{L ? "पोस्ट" : "Posts"} <span className="text-sm font-normal text-muted-foreground">({d.posts})</span></h2>
                <div className="space-y-3">
                  {(posts.data ?? []).map((x) => <PostCard key={x.id} p={x} L={L} signedIn={!!user} onChange={() => void posts.refetch()} />)}
                  {posts.isSuccess && !posts.data?.length ? <p className="text-sm text-muted-foreground">{L ? "अभी कोई पोस्ट नहीं।" : "No posts yet."}</p> : null}
                </div>
              </main>
            </div>
          ) : <p className="py-6 text-sm text-muted-foreground">…</p>}
        </div>
      </div>
      {card ? <ProfileCard userId={id} L={L} online={!!d?.online} onClose={() => setCard(false)} onDm={() => void dm()} /> : null}
    </section>
  );
}
