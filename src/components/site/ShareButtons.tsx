import { Check, Copy, Facebook, Linkedin, MessageCircle, Send, Share2, Twitter } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useLang } from "@/core/i18n";

type Props = { path: string; title: string; text?: string | undefined };

/** Share row: phone share sheet (when the browser has one), WhatsApp first and green, then Facebook, X, Telegram, LinkedIn, copy link. */
export function ShareButtons({ path, title, text: extra }: Props) {
  const { lang } = useLang(); const L = lang === "hi";
  const [copied, setCopied] = useState(false);
  const [native, setNative] = useState(false);
  useEffect(() => { setNative(typeof navigator !== "undefined" && typeof navigator.share === "function"); }, []);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const url = `${origin}${path}`;
  const text = `${title}${extra ? `\n${extra}` : ""}\n${url}`;

  const links = [
    { label: "Facebook", icon: Facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { label: "X", icon: Twitter, href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}` },
    { label: "Telegram", icon: Send, href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}` },
    { label: "LinkedIn", icon: Linkedin, href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(L ? "लिंक कॉपी हुआ" : "Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(L ? "लिंक कॉपी नहीं हुआ — ऊपर पते वाली पट्टी से कॉपी कीजिए।" : "Could not copy the link. Please copy it from the address bar.");
    }
  }
  async function share() {
    try { await navigator.share({ title, text: extra ? `${title}\n${extra}` : title, url }); } catch { /* closed */ }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">{L ? "शेयर करें" : "Share"}</span>
      <Button asChild size="sm" className="bg-[#25D366] text-white hover:bg-[#1ebe5b]">
        <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer noopener"><MessageCircle className="size-4" /> WhatsApp</a>
      </Button>
      {native ? <Button size="sm" variant="outline" onClick={() => void share()}><Share2 className="size-4" /> {L ? "और ऐप" : "More"}</Button> : null}
      {links.map(({ label, icon: Icon, href }) => (
        <Button key={label} asChild variant="outline" size="icon" aria-label={`${L ? "शेयर करें:" : "Share on"} ${label}`} title={label}>
          <a href={href} target="_blank" rel="noreferrer noopener"><Icon className="size-4" /></a>
        </Button>
      ))}
      <Button variant="outline" size="icon" aria-label={L ? "लिंक कॉपी करें" : "Copy link"} title={L ? "लिंक कॉपी करें" : "Copy link"} onClick={copy}>
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </Button>
    </div>
  );
}
