// Ad slots (sponsor creatives first, AdSense fallback) and the cookie-consent banner. Never shown on excluded paths
// (shok, family tree, matrimony, RSVP, admin, donation…).
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useLang } from "@/core/i18n";
import { useTenant } from "@/core/tenant-context";
import { supabase } from "@/integrations/supabase/client";

type AdsConf = { enabled: boolean; excluded_paths: string[]; adsense_client: string | null; adsense_slot: string | null; consent_banner: boolean; consent_text: string | null; consent_text_hi: string | null; campaigns: { id: string; image: string | null; text: string | null; text_hi: string | null; link: string | null; sponsor: string; weight: number }[] };
export type SlotKey = "header" | "sidebar" | "feed" | "footer" | "post_bottom";

export function useAds(slot: SlotKey) {
  const tenant = useTenant();
  return useQuery({ queryKey: ["ads", tenant.organization_id, slot], staleTime: 300_000, queryFn: async () => { const { data } = await supabase.rpc("k1_ads_for", { p_org: tenant.organization_id, p_slot: slot } as never); return data as unknown as AdsConf; } });
}

const CONSENT_KEY = "k1_consent";
function readConsent(): "yes" | "no" | null { try { return (localStorage.getItem(CONSENT_KEY) as "yes" | "no" | null) ?? null; } catch { return null; } }

export function AdSlot({ slot, className = "" }: { slot: SlotKey; className?: string }) {
  const tenant = useTenant();
  const { lang } = useLang();
  const loc = useLocation();
  const ads = useAds(slot);
  const conf = ads.data;
  const pick = useMemo(() => {
    if (!conf?.campaigns.length) return null;
    const total = conf.campaigns.reduce((s, c) => s + c.weight, 0); let r = Math.random() * total;
    for (const c of conf.campaigns) { r -= c.weight; if (r <= 0) return c; } return conf.campaigns[0]!;
  }, [conf]);
  const counted = useRef<string | null>(null);
  const excluded = !conf || !conf.enabled || conf.excluded_paths.some((p) => loc.pathname.startsWith(p));
  useEffect(() => {
    if (excluded || !pick || counted.current === pick.id) return;
    counted.current = pick.id; supabase.rpc("k1_ad_hit", { p_org: tenant.organization_id, p_slot: slot, p_campaign: pick.id, p_click: false } as never).then(() => undefined, () => undefined);
  }, [excluded, pick, slot, tenant.organization_id]);
  if (excluded) return null;
  if (pick) {
    const text = lang === "hi" && pick.text_hi ? pick.text_hi : pick.text;
    const inner = <>{pick.image ? <img src={pick.image} alt={pick.sponsor} className="w-full rounded-md object-contain" loading="lazy" /> : null}{text ? <p className="mt-1 text-sm">{text}</p> : null}<p className="text-[10px] uppercase tracking-wide text-muted-foreground">{lang === "hi" ? "प्रायोजक" : "Sponsored"} · {pick.sponsor}</p></>;
    return <div className={`ad-slot ${className}`}>{pick.link ? <a href={pick.link} target="_blank" rel="noreferrer sponsored" onClick={() => supabase.rpc("k1_ad_hit", { p_org: tenant.organization_id, p_slot: slot, p_campaign: pick.id, p_click: true } as never)}>{inner}</a> : inner}</div>;
  }
  if (conf.adsense_client && conf.adsense_slot && readConsent() === "yes") return <AdSense client={conf.adsense_client} slotId={conf.adsense_slot} className={className} />;
  return null;
}

function AdSense({ client, slotId, className }: { client: string; slotId: string; className: string }) {
  const ref = useRef<HTMLModElement>(null);
  useEffect(() => {
    const w = window as unknown as { adsbygoogle?: unknown[] };
    if (!document.querySelector(`script[data-adsense="${client}"]`)) { const s = document.createElement("script"); s.async = true; s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`; s.crossOrigin = "anonymous"; s.dataset["adsense"] = client; document.head.appendChild(s); }
    try { (w.adsbygoogle = w.adsbygoogle || []).push({}); } catch { /* blocked */ }
  }, [client, slotId]);
  return <div className={`ad-slot ${className}`}><ins ref={ref} className="adsbygoogle" style={{ display: "block" }} data-ad-client={client} data-ad-slot={slotId} data-ad-format="auto" data-full-width-responsive="true" /></div>;
}

/** Cookie / ads consent banner (only when ads are enabled for the organization). */
export function ConsentBanner() {
  const ads = useAds("footer");
  const { lang } = useLang();
  const [state, setState] = useState<"yes" | "no" | null>("no");
  useEffect(() => { setState(readConsent()); }, []);
  const conf = ads.data;
  if (!conf?.enabled || !conf.consent_banner || state) return null;
  const text = lang === "hi" ? (conf.consent_text_hi || "यह साइट विज्ञापन और आँकड़ों के लिए cookies का उपयोग करती है।") : (conf.consent_text || "This site uses cookies for advertising and analytics.");
  const set = (v: "yes" | "no") => { try { localStorage.setItem(CONSENT_KEY, v); } catch { /* ignore */ } setState(v); if (v === "yes") window.location.reload(); };
  return (
    <div className="fixed inset-x-0 bottom-16 z-50 border-t border-border bg-background/95 p-3 text-sm shadow-lg backdrop-blur lg:bottom-0">
      <div className="container-page flex flex-wrap items-center justify-between gap-2">
        <p>{text}</p>
        <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => set("no")}>{lang === "hi" ? "नहीं" : "No thanks"}</Button><Button size="sm" onClick={() => set("yes")}>{lang === "hi" ? "ठीक है" : "Accept"}</Button></div>
      </div>
    </div>
  );
}
