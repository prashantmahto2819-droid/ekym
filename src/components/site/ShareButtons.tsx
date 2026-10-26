import { Check, Copy, Facebook, Linkedin, MessageCircle, Send, Twitter } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type Props = { path: string; title: string };

export function ShareButtons({ path, title }: Props) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const url = `${origin}${path}`;
  const text = `${title} — ${url}`;

  const links = [
    { label: "WhatsApp", icon: MessageCircle, href: `https://wa.me/?text=${encodeURIComponent(text)}` },
    {
      label: "Facebook",
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      label: "LinkedIn",
      icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    },
    {
      label: "X",
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    },
    {
      label: "Telegram",
      icon: Send,
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the link. Please copy it from the address bar.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Share</span>
      {links.map(({ label, icon: Icon, href }) => (
        <Button key={label} asChild variant="outline" size="icon" aria-label={`Share on ${label}`}>
          <a href={href} target="_blank" rel="noreferrer noopener">
            <Icon className="size-4" />
          </a>
        </Button>
      ))}
      <Button variant="outline" size="icon" aria-label="Copy link" onClick={copy}>
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </Button>
    </div>
  );
}
