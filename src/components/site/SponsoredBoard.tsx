// "Sponsored" board: every active paid campaign shown as an equal card, in fair rotation (fewest views first).
// Paid promotion lives here, never in the community feed.
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { useLang } from "@/core/i18n";
import { useTenant } from "@/core/tenant-context";
import { supabase } from "@/integrations/supabase/client";

export type BoardAd = { id: string; title: string; sponsor: string; image: string | null; text_en: string | null; text_hi: string | null; link: string | null; ends_on: string | null };

export function useBoard() {
  const tenant = useTenant();
  return useQuery({ queryKey: ["ad_board", tenant.organization_id], staleTime: 60_000, queryFn: async () => { const { data } = await supabase.rpc("k1_ad_board", { p_org: tenant.organization_id } as never); return (data ?? []) as unknown as BoardAd[]; } });
}

function hit(org: string, id: string, click: boolean) { supabase.rpc("k1_ad_hit", { p_org: org, p_slot: "board", p_campaign: id, p_click: click } as never).then(() => undefined, () => undefined); }

export function SponsoredCard({ ad, org }: { ad: BoardAd; org: string }) {
  const { lang } = useLang();
  const text = lang === "hi" ? (ad.text_hi || ad.text_en) : (ad.text_en || ad.text_hi);
  const inner = (
    <>
      {ad.image ? <img src={ad.image} alt={ad.title} className="aspect-[16/9] w-full rounded-t-lg object-cover" loading="lazy" /> : <div className="grid aspect-[16/9] place-items-center rounded-t-lg bg-primary/10 px-4 text-center font-display text-lg text-primary">{ad.title}</div>}
      <div className="p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">{lang === "hi" ? "प्रायोजक" : "Sponsor"} · {ad.sponsor}</p>{text ? <p className="mt-1 line-clamp-3 text-sm">{text}</p> : null}</div>
    </>
  );
  const cls = "block overflow-hidden rounded-lg border border-border bg-background transition hover:shadow-md";
  return ad.link ? <a href={ad.link} target="_blank" rel="noreferrer sponsored" className={cls} onClick={() => hit(org, ad.id, true)}>{inner}</a> : <div className={cls}>{inner}</div>;
}

/** Compact strip for the community page: up to `limit` cards + link to the full board. */
export function SponsoredStrip({ limit = 3 }: { limit?: number }) {
  const tenant = useTenant();
  const { lang } = useLang();
  const q = useBoard();
  const ads = (q.data ?? []).slice(0, limit);
  useEffect(() => { for (const a of ads) hit(tenant.organization_id, a.id, false); }, [ads.map((a) => a.id).join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ads.length) return null;
  return (
    <section className="mx-auto max-w-2xl rounded-lg border border-dashed border-border bg-secondary/30 p-3">
      <div className="mb-2 flex items-center justify-between text-xs"><span className="font-medium uppercase tracking-wide text-muted-foreground">{lang === "hi" ? "प्रायोजित" : "Sponsored"}</span><Link to="/sponsored" className="underline">{lang === "hi" ? "सभी देखें" : "See all"}</Link></div>
      <div className={`grid gap-3 ${ads.length > 1 ? "sm:grid-cols-3" : ""}`}>{ads.map((a) => <SponsoredCard key={a.id} ad={a} org={tenant.organization_id} />)}</div>
    </section>
  );
}

export function SponsoredBoard() {
  const tenant = useTenant();
  const { lang } = useLang();
  const q = useBoard();
  const ads = q.data ?? [];
  useEffect(() => { for (const a of ads) hit(tenant.organization_id, a.id, false); }, [ads.map((a) => a.id).join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  if (q.isSuccess && !ads.length) return <p className="text-center text-sm text-muted-foreground">{lang === "hi" ? "अभी कोई प्रायोजक नहीं।" : "No sponsors yet."}</p>;
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{ads.map((a) => <SponsoredCard key={a.id} ad={a} org={tenant.organization_id} />)}</div>;
}
