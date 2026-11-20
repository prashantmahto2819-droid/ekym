// साझा किया हुआ वंश वृक्ष (सार्वजनिक लिंक, बिना लॉगिन): सिर्फ़ नाम, रिश्ते और गाँव।
import type { SupabaseClient } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { TreeImage, type SharedTree } from "@/components/family/TreeShare";
import { useLang } from "@/core/i18n";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as unknown as SupabaseClient;

export const Route = createFileRoute("/vansh/$token")({
  head: () => ({ meta: [{ title: "वंश वृक्ष" }, { name: "robots", content: "noindex" }] }),
  component: SharedTreePage,
});

function SharedTreePage() {
  const { token } = Route.useParams();
  const L = useLang().lang === "hi";
  const q = useQuery({ queryKey: ["tree_shared", token], queryFn: async () => { const { data } = await sb.rpc("shok_tree_shared", { p_token: token }); return (data ?? null) as SharedTree | null; }, staleTime: 600000 });
  if (q.isLoading) return <section className="container-page py-10 text-center text-muted-foreground">…</section>;
  if (!q.data) return (
    <section className="container-page py-16 text-center">
      <p className="font-semibold">{L ? "यह लिंक अब काम नहीं करता।" : "This link no longer works."}</p>
      <p className="text-sm text-muted-foreground">{L ? "लिंक की समय-सीमा पूरी हो गई है या परिवार ने इसे बंद कर दिया है। उनसे नया लिंक माँगिए।" : "It has expired or the family closed it. Please ask them for a new link."}</p>
    </section>
  );
  return (
    <section className="container-page space-y-3 py-6">
      <h1 className="font-display text-2xl font-semibold">{q.data.family_name} — {L ? "वंश वृक्ष" : "Family tree"}</h1>
      <p className="text-sm text-muted-foreground">{L ? "यह वंश वृक्ष परिवार ने आपसे साझा किया है। इसमें मोबाइल नंबर और जन्म तिथि नहीं होती।" : "This family tree was shared with you by the family. It carries no phone numbers or dates of birth."}</p>
      <TreeImage tree={q.data} L={L} />
    </section>
  );
}
