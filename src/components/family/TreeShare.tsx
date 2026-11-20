import type { SupabaseClient } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { treeSvg } from "@/components/family/treeSvg";
import { Button } from "@/components/ui/button";
import type { Person } from "@/family/layout";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as unknown as SupabaseClient;

export type SharedTree = { family_name: string; gotra: string | null; kuldevi: string | null; village: string | null; members: Person[] };

/** A family tree (as returned by the share / matrimony RPCs: names and relations only) drawn as one picture. */
export function TreeImage({ tree, L }: { tree: SharedTree; L: boolean }) {
  const sub = [tree.village && `${L ? "ग्राम" : "Village"}: ${tree.village}`, tree.gotra && `${L ? "गोत्र" : "Gotra"}: ${tree.gotra}`, tree.kuldevi && `${L ? "कुलदेवी / कुलदेवता" : "Kuldevi"}: ${tree.kuldevi}`].filter(Boolean).join("  ·  ");
  const { svg, W } = treeSvg(tree.members, `${tree.family_name} — ${L ? "वंश वृक्ष" : "Family tree"}`, sub, L);
  return (
    <div className="overflow-auto rounded-xl border border-border bg-white">
      <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt={tree.family_name} style={{ width: W, maxWidth: "none" }} />
    </div>
  );
}

/** Share links of one family tree: anyone with the link sees names and relations (never phone numbers or dates of birth). */
export function TreeShareLinks({ familyId, L }: { familyId: string; L: boolean }) {
  const list = useQuery({
    queryKey: ["tree_shares", familyId],
    queryFn: async () => { const { data, error } = await sb.rpc("shok_tree_share_list", { p_family: familyId }); if (error) throw new Error(error.message); return (data ?? []) as { token: string; expires_at: string | null; views: number }[]; },
    retry: false,
  });
  const url = (t: string) => `${window.location.origin}/vansh/${t}`;
  async function create(days: number | null) {
    const { data, error } = await sb.rpc("shok_tree_share_create", { p_family: familyId, p_days: days });
    if (error) { toast.error(error.message); return; }
    await navigator.clipboard.writeText(url(String(data))).catch(() => undefined);
    toast.success(L ? "लिंक बन गया और कॉपी हो गया" : "Link created and copied");
    void list.refetch();
  }
  async function revoke(t: string) {
    const { error } = await sb.rpc("shok_tree_share_revoke", { p_token: t });
    if (error) { toast.error(error.message); return; }
    void list.refetch();
  }
  if (list.error) return null; // not the owner / admin / a member of this tree
  return (
    <div>
      <p className="font-semibold">🔗 {L ? "वंश वृक्ष साझा करें" : "Share this family tree"}</p>
      <p className="text-xs text-muted-foreground">{L ? "रिश्ता तय करते समय दूसरे परिवार को (दूसरी संस्था के हों तब भी) यह लिंक भेज सकते हैं। लिंक से सिर्फ़ नाम, रिश्ते और गाँव दिखते हैं — मोबाइल नंबर और जन्म तिथि नहीं। जब चाहें लिंक बंद कर दीजिए।" : "When a match is being considered you can send this link to the other family (even of another organization). It shows names, relations and villages only — never phone numbers or dates of birth. Close the link whenever you like."}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => void create(30)}>{L ? "30 दिन का लिंक बनाएँ" : "Create a 30-day link"}</Button>
        <Button size="sm" variant="outline" onClick={() => void create(null)}>{L ? "बिना समय-सीमा का लिंक" : "Link with no end date"}</Button>
      </div>
      {list.data?.length ? (
        <ul className="mt-2 space-y-1">
          {list.data.map((s) => (
            <li key={s.token} className="flex flex-wrap items-center gap-2 rounded-md border border-border px-2 py-1">
              <a href={url(s.token)} target="_blank" rel="noopener noreferrer" className="truncate text-primary hover:underline">{url(s.token)}</a>
              <span className="text-xs text-muted-foreground">{s.expires_at ? `${L ? "तक" : "until"} ${new Date(s.expires_at).toLocaleDateString(L ? "hi-IN" : "en-IN")}` : (L ? "बिना समय-सीमा" : "no end date")} · {s.views} {L ? "बार खुला" : "views"}</span>
              <span className="ml-auto flex gap-1">
                <Button size="sm" variant="outline" onClick={() => void navigator.clipboard.writeText(url(s.token)).then(() => toast.success(L ? "कॉपी हो गया" : "Copied"))}>{L ? "कॉपी" : "Copy"}</Button>
                <Button size="sm" variant="outline" asChild><a target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`${L ? "हमारा वंश वृक्ष:" : "Our family tree:"}\n${url(s.token)}`)}`}>WhatsApp</a></Button>
                <Button size="sm" variant="outline" onClick={() => void revoke(s.token)}>{L ? "बंद करें" : "Close"}</Button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
