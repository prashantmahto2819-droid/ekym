// "ऐप की तरह जोड़ें": registers the service worker (production only) and shows a small card on phones offering to add
// the site to the home screen — Android/Chrome via the browser's install prompt, iPhone with "Share → Add to Home Screen"
// steps. Hidden once installed, or for 30 days after "अभी नहीं".
import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useLang } from "@/core/i18n";

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
const KEY = "k1_install_dismissed";

export function InstallPrompt({ appName }: { appName: string }) {
  const L = useLang().lang === "hi";
  const [evt, setEvt] = useState<BIP | null>(null);
  const [ios, setIos] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    if (standalone) return;
    let snoozed = false;
    try { const t = Number(localStorage.getItem(KEY) || 0); snoozed = Date.now() - t < 30 * 86400000; } catch { /* private window */ }
    if (snoozed || window.innerWidth >= 1024) return;
    const onBip = (e: Event) => { e.preventDefault(); setEvt(e as BIP); setShow(true); };
    window.addEventListener("beforeinstallprompt", onBip);
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && /safari/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
    let t: ReturnType<typeof setTimeout> | undefined;
    if (isIos) { setIos(true); t = setTimeout(() => setShow(true), 4000); }
    const onInstalled = () => setShow(false);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onBip); window.removeEventListener("appinstalled", onInstalled); if (t) clearTimeout(t); };
  }, []);

  function later() { setShow(false); try { localStorage.setItem(KEY, String(Date.now())); } catch { /* ignore */ } }
  async function install() {
    if (!evt) return;
    await evt.prompt();
    const r = await evt.userChoice.catch(() => null);
    if (r?.outcome !== "accepted") later(); else setShow(false);
    setEvt(null);
  }
  if (!show) return null;
  return (
    <div className="fixed inset-x-3 bottom-20 z-50 rounded-2xl border border-border bg-card p-3 shadow-2xl lg:hidden" role="dialog" aria-label={L ? "ऐप जोड़ें" : "Install app"}>
      <div className="flex items-start gap-3">
        <img src="/pwa-192.png" alt="" className="size-11 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-tight">{L ? `${appName} को ऐप की तरह जोड़ें` : `Add ${appName} as an app`}</p>
          {ios
            ? <p className="mt-1 text-xs text-muted-foreground">{L ? <>नीचे <Share className="inline size-3.5" /> (शेयर) दबाइए → "Add to Home Screen" / "होम स्क्रीन में जोड़ें"।</> : <>Tap <Share className="inline size-3.5" /> (Share) → "Add to Home Screen".</>}</p>
            : <p className="mt-1 text-xs text-muted-foreground">{L ? "होम स्क्रीन पर आइकन, तेज़ खुलना, और बिना इंटरनेट भी पुराने पेज।" : "Home-screen icon, faster opening, recent pages offline."}</p>}
        </div>
        <button type="button" onClick={later} className="text-muted-foreground" aria-label={L ? "बंद करें" : "Close"}><X className="size-4" /></button>
      </div>
      {!ios ? (
        <div className="mt-2 flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={later}>{L ? "अभी नहीं" : "Not now"}</Button>
          <Button size="sm" onClick={() => void install()}><Download className="size-4" /> {L ? "जोड़ें" : "Install"}</Button>
        </div>
      ) : null}
    </div>
  );
}
