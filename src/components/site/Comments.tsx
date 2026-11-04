// Public comments (moderated) + view counter for a blog / news post.
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLang } from "@/core/i18n";
import { useTenant } from "@/core/tenant-context";
import { supabase } from "@/integrations/supabase/client";

type C = { id: string; name: string; body: string; created_at: string };

export function Comments({ kind, postId }: { kind: "blog" | "news"; postId: string }) {
  const tenant = useTenant();
  const { lang } = useLang();
  const L = lang === "hi";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const list = useQuery({ queryKey: ["comments", kind, postId], queryFn: async () => { const { data } = await supabase.from("cms_comments").select("id,name,body,created_at").eq("post_kind", kind).eq("post_id", postId).eq("status", "approved").order("created_at"); return (data ?? []) as C[]; } });

  useEffect(() => { supabase.rpc("k1_post_view", { p_kind: kind, p_id: postId } as never).then(() => undefined, () => undefined); }, [kind, postId]);

  async function submit() {
    if (!name.trim() || body.trim().length < 2) { toast.error(L ? "नाम और टिप्पणी लिखिए।" : "Enter your name and a comment."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from("cms_comments").insert({ organization_id: tenant.organization_id, post_kind: kind, post_id: postId, name: name.trim(), email: email.trim() || null, body: body.trim(), user_id: (await supabase.auth.getUser()).data.user?.id ?? null } as never);
      if (error) throw error;
      setSent(true); setBody("");
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <section className="mt-10 border-t border-border pt-6">
      <h2 className="font-display text-xl font-semibold">{L ? "टिप्पणियाँ" : "Comments"} {list.data?.length ? <span className="text-sm font-normal text-muted-foreground">({list.data.length})</span> : null}</h2>
      <ul className="mt-3 space-y-3">
        {(list.data ?? []).map((c) => <li key={c.id} className="rounded-lg bg-secondary/50 p-3 text-sm"><p className="font-semibold">{c.name} <span className="text-xs font-normal text-muted-foreground">· {new Date(c.created_at).toLocaleDateString("en-IN")}</span></p><p className="mt-1 whitespace-pre-wrap">{c.body}</p></li>)}
      </ul>
      {sent ? <p className="mt-4 text-sm text-muted-foreground">{L ? "धन्यवाद! आपकी टिप्पणी समीक्षा के बाद दिखेगी।" : "Thank you! Your comment will appear after moderation."}</p> : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Input placeholder={L ? "आपका नाम" : "Your name"} value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder={L ? "ईमेल (वैकल्पिक, दिखेगा नहीं)" : "Email (optional, not shown)"} value={email} onChange={(e) => setEmail(e.target.value)} />
          <Textarea className="sm:col-span-2" rows={3} placeholder={L ? "अपनी बात लिखिए…" : "Write a comment…"} value={body} onChange={(e) => setBody(e.target.value)} />
          <div><Button onClick={submit} disabled={busy}>{L ? "टिप्पणी भेजें" : "Post comment"}</Button></div>
        </div>
      )}
    </section>
  );
}
