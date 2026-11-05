// Page blocks: the model (types + defaults) and the renderer used by public pages and the builder preview.
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { useLang } from "@/core/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/core/tenant-context";

export type Block =
  | { id: string; type: "hero"; title: string; title_hi?: string; subtitle?: string; subtitle_hi?: string; image?: string; cta_label?: string; cta_to?: string; align?: "left" | "center"; dark?: boolean }
  | { id: string; type: "text"; heading?: string; heading_hi?: string; body: string; body_hi?: string; width?: "narrow" | "wide" }
  | { id: string; type: "image"; src: string; caption?: string; full?: boolean }
  | { id: string; type: "gallery"; images: { src: string; caption?: string }[]; cols?: 2 | 3 | 4 }
  | { id: string; type: "cards"; heading?: string; heading_hi?: string; items: { title: string; title_hi?: string; text?: string; text_hi?: string; image?: string; to?: string }[]; cols?: 2 | 3 | 4 }
  | { id: string; type: "cta"; text: string; text_hi?: string; label: string; label_hi?: string; to: string; style?: "primary" | "accent" }
  | { id: string; type: "stats"; items: { value: string; label: string; label_hi?: string }[] }
  | { id: string; type: "embed"; url: string; title?: string; ratio?: "16/9" | "4/3" | "1/1" }
  | { id: string; type: "posts"; heading?: string; heading_hi?: string; kind: "blog" | "news"; limit?: number }
  | { id: string; type: "contact"; heading?: string; heading_hi?: string; show_map?: boolean }
  | { id: string; type: "spacer"; size?: "s" | "m" | "l" }
  | { id: string; type: "divider" };

export type BlockType = Block["type"];

export const BLOCK_LABELS: Record<BlockType, { en: string; hi: string }> = {
  hero: { en: "Hero banner", hi: "मुख्य बैनर" }, text: { en: "Text", hi: "पाठ" }, image: { en: "Image", hi: "चित्र" }, gallery: { en: "Gallery", hi: "गैलरी" },
  cards: { en: "Cards", hi: "कार्ड" }, cta: { en: "Call to action", hi: "आह्वान बटन" }, stats: { en: "Numbers", hi: "आँकड़े" }, embed: { en: "Video / embed", hi: "वीडियो / embed" },
  posts: { en: "Latest posts", hi: "ताज़ा लेख" }, contact: { en: "Contact", hi: "संपर्क" }, spacer: { en: "Space", hi: "खाली जगह" }, divider: { en: "Divider", hi: "रेखा" },
};

export const uid = () => Math.random().toString(36).slice(2, 10);

export function newBlock(type: BlockType): Block {
  const id = uid();
  switch (type) {
    case "hero": return { id, type, title: "Welcome", subtitle: "A short line about this page", align: "center", dark: true, cta_label: "Learn more", cta_to: "/about" };
    case "text": return { id, type, heading: "Heading", body: "Write your paragraphs here.\n\nUse **bold** for emphasis and a blank line between paragraphs.", width: "narrow" };
    case "image": return { id, type, src: "", caption: "" };
    case "gallery": return { id, type, images: [], cols: 3 };
    case "cards": return { id, type, heading: "", items: [{ title: "Card one", text: "Description" }, { title: "Card two", text: "Description" }, { title: "Card three", text: "Description" }], cols: 3 };
    case "cta": return { id, type, text: "Join us in serving the community.", label: "Become a member", to: "/join", style: "primary" };
    case "stats": return { id, type, items: [{ value: "500+", label: "Members" }, { value: "20", label: "Villages" }, { value: "12", label: "Years" }] };
    case "embed": return { id, type, url: "", ratio: "16/9" };
    case "posts": return { id, type, kind: "news", limit: 3 };
    case "contact": return { id, type, heading: "Contact us" };
    case "spacer": return { id, type, size: "m" };
    case "divider": return { id, type };
  }
}

/** Safe lightweight markup → React (no HTML): paragraphs, ## / ### headings, **bold**, *italic*, - / 1. lists,
 *  > quotes, [text](url) links, ![caption](url) images. Bare URLs stay text. */
function Inline({ t }: { t: string }) {
  const parts = t.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*|\[[^\]]+\]\((?:https?:\/\/|\/)[^)\s]+\))/g);
  return <>{parts.map((seg, k) => {
    if (seg.startsWith("**") && seg.endsWith("**")) return <strong key={k}>{seg.slice(2, -2)}</strong>;
    if (seg.startsWith("*") && seg.endsWith("*") && seg.length > 2) return <em key={k}>{seg.slice(1, -1)}</em>;
    const m = seg.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (m) return m[2]!.startsWith("/") ? <a key={k} href={m[2]} className="underline">{m[1]}</a> : <a key={k} href={m[2]} target="_blank" rel="noreferrer" className="underline">{m[1]}</a>;
    return <span key={k}>{seg}</span>;
  })}</>;
}
export function RichText({ text, className = "" }: { text: string; className?: string }) {
  const blocks = (text ?? "").replace(/\r/g, "").split(/\n{2,}/);
  return (
    <div className={`prose-content ${className}`}>
      {blocks.map((blk, i) => {
        const lines = blk.split("\n");
        const img = blk.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
        if (img) return <figure key={i} className="my-4"><img src={img[2]} alt={img[1]} className="w-full rounded-lg" loading="lazy" />{img[1] ? <figcaption className="mt-1 text-center text-xs text-muted-foreground">{img[1]}</figcaption> : null}</figure>;
        if (/^###\s/.test(blk)) return <h3 key={i} className="mt-6 font-display text-lg font-semibold"><Inline t={blk.replace(/^###\s/, "")} /></h3>;
        if (/^##\s/.test(blk)) return <h2 key={i} className="mt-8 font-display text-xl font-semibold"><Inline t={blk.replace(/^##\s/, "")} /></h2>;
        if (lines.every((l) => /^\s*-\s/.test(l))) return <ul key={i} className="my-3 list-disc space-y-1 pl-6">{lines.map((l, j) => <li key={j}><Inline t={l.replace(/^\s*-\s/, "")} /></li>)}</ul>;
        if (lines.every((l) => /^\s*\d+[.)]\s/.test(l))) return <ol key={i} className="my-3 list-decimal space-y-1 pl-6">{lines.map((l, j) => <li key={j}><Inline t={l.replace(/^\s*\d+[.)]\s/, "")} /></li>)}</ol>;
        if (lines.every((l) => /^>\s?/.test(l))) return <blockquote key={i} className="my-4 border-l-4 border-primary/40 pl-4 italic text-muted-foreground">{lines.map((l, j) => <span key={j}><Inline t={l.replace(/^>\s?/, "")} />{j < lines.length - 1 ? <br /> : null}</span>)}</blockquote>;
        return <p key={i}>{lines.map((line, j) => <span key={j}><Inline t={line} />{j < lines.length - 1 ? <br /> : null}</span>)}</p>;
      })}
    </div>
  );
}

function embedUrl(url: string) {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const gm = url.match(/google\.[a-z.]+\/maps/);
  if (gm && !url.includes("/embed")) return url;
  return url;
}

export function Blocks({ blocks, preview }: { blocks: Block[]; preview?: boolean }) {
  const { lang } = useLang();
  const L = lang === "hi";
  const t = (en: string | undefined, hi: string | undefined) => (L && hi ? hi : en ?? "");
  return (
    <div className={preview ? "pointer-events-none" : ""}>
      {blocks.map((b) => {
        switch (b.type) {
          case "hero":
            return (
              <section key={b.id} className={`relative overflow-hidden ${b.dark ? "bg-primary text-primary-foreground" : "bg-secondary/60"}`}>
                {b.image ? <img src={b.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" /> : null}
                <div className={`container-page relative py-16 md:py-24 ${b.align === "left" ? "" : "text-center"}`}>
                  <h1 className="font-display text-3xl font-bold md:text-5xl">{t(b.title, b.title_hi)}</h1>
                  {b.subtitle ? <p className={`mt-4 max-w-2xl text-lg opacity-90 ${b.align === "left" ? "" : "mx-auto"}`}>{t(b.subtitle, b.subtitle_hi)}</p> : null}
                  {b.cta_label && b.cta_to ? <Button asChild size="lg" variant={b.dark ? "secondary" : "default"} className="mt-6"><Link to={b.cta_to as "/"}>{b.cta_label}</Link></Button> : null}
                </div>
              </section>
            );
          case "text":
            return <section key={b.id} className="section-y"><div className={`container-page ${b.width === "wide" ? "" : "max-w-3xl"}`}>{b.heading ? <h2 className="font-display text-2xl font-semibold md:text-3xl">{t(b.heading, b.heading_hi)}</h2> : null}<RichText text={t(b.body, b.body_hi)} className="mt-4" /></div></section>;
          case "image":
            return <section key={b.id} className={b.full ? "" : "section-y"}><div className={b.full ? "" : "container-page max-w-4xl"}>{b.src ? <img src={b.src} alt={b.caption ?? ""} className={`w-full object-cover ${b.full ? "max-h-[70vh]" : "rounded-xl"}`} loading="lazy" /> : <div className="grid h-40 place-items-center rounded-xl bg-secondary text-muted-foreground">image</div>}{b.caption ? <p className="mt-2 text-center text-sm text-muted-foreground">{b.caption}</p> : null}</div></section>;
          case "gallery":
            return <section key={b.id} className="section-y"><div className={`container-page grid gap-3 ${b.cols === 2 ? "sm:grid-cols-2" : b.cols === 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3"}`}>{b.images.map((im, i) => <figure key={i}><img src={im.src} alt={im.caption ?? ""} className="aspect-[4/3] w-full rounded-lg object-cover" loading="lazy" />{im.caption ? <figcaption className="mt-1 text-xs text-muted-foreground">{im.caption}</figcaption> : null}</figure>)}</div></section>;
          case "cards":
            return (
              <section key={b.id} className="section-y"><div className="container-page">{b.heading ? <h2 className="mb-6 font-display text-2xl font-semibold md:text-3xl">{t(b.heading, b.heading_hi)}</h2> : null}
                <div className={`grid gap-4 ${b.cols === 2 ? "sm:grid-cols-2" : b.cols === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
                  {b.items.map((it, i) => { const inner = <>{it.image ? <img src={it.image} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" /> : null}<div className="p-4"><h3 className="font-display text-lg font-semibold">{t(it.title, it.title_hi)}</h3>{it.text ? <p className="mt-1 text-sm text-muted-foreground">{t(it.text, it.text_hi)}</p> : null}</div></>; return it.to ? <Link key={i} to={it.to as "/"} className="surface-card overflow-hidden transition hover:shadow-md">{inner}</Link> : <div key={i} className="surface-card overflow-hidden">{inner}</div>; })}
                </div></div></section>
            );
          case "cta":
            return <section key={b.id} className={`${b.style === "accent" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"}`}><div className="container-page flex flex-wrap items-center justify-between gap-4 py-10"><p className="font-display text-xl font-semibold md:text-2xl">{t(b.text, b.text_hi)}</p><Button asChild size="lg" variant="secondary"><Link to={b.to as "/"}>{t(b.label, b.label_hi)}</Link></Button></div></section>;
          case "stats":
            return <section key={b.id} className="section-y"><div className="container-page grid grid-cols-2 gap-4 md:grid-cols-4">{b.items.map((s, i) => <div key={i} className="surface-card p-5 text-center"><p className="font-display text-3xl font-bold text-primary">{s.value}</p><p className="mt-1 text-sm text-muted-foreground">{t(s.label, s.label_hi)}</p></div>)}</div></section>;
          case "embed":
            return <section key={b.id} className="section-y"><div className="container-page max-w-4xl">{b.url ? <iframe src={embedUrl(b.url)} title={b.title ?? "embed"} className="w-full rounded-xl border border-border" style={{ aspectRatio: b.ratio ?? "16/9" }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" /> : null}</div></section>;
          case "posts":
            return <PostsBlock key={b.id} b={b} />;
          case "contact":
            return <ContactBlock key={b.id} b={b} />;
          case "spacer":
            return <div key={b.id} style={{ height: b.size === "s" ? 24 : b.size === "l" ? 96 : 48 }} />;
          case "divider":
            return <div key={b.id} className="container-page"><hr className="border-border" /></div>;
        }
      })}
    </div>
  );
}

function PostsBlock({ b }: { b: Extract<Block, { type: "posts" }> }) {
  const tenant = useTenant();
  const { lang } = useLang();
  const L = lang === "hi";
  const q = useQuery({
    queryKey: ["block-posts", tenant.organization_id, b.kind, b.limit],
    queryFn: async () => {
      if (b.kind === "blog") { const { data } = await supabase.from("blogs").select("id,title,slug,excerpt,featured_image,published_at").eq("organization_id", tenant.organization_id).eq("status", "published").order("published_at", { ascending: false }).limit(b.limit ?? 3); return (data ?? []).map((x) => ({ id: x.id, title: x.title, slug: x.slug, excerpt: x.excerpt, image: x.featured_image, date: x.published_at })); }
      const { data } = await supabase.from("news").select("id,title,slug,description,thumbnail,published_at").eq("organization_id", tenant.organization_id).eq("status", "published").order("published_at", { ascending: false }).limit(b.limit ?? 3); return (data ?? []).map((x) => ({ id: x.id, title: x.title, slug: x.slug, excerpt: x.description, image: x.thumbnail, date: x.published_at }));
    },
  });
  return (
    <section className="section-y"><div className="container-page">
      <h2 className="mb-6 font-display text-2xl font-semibold md:text-3xl">{L && b.heading_hi ? b.heading_hi : b.heading ?? (b.kind === "blog" ? (L ? "ताज़ा लेख" : "Latest blogs") : (L ? "ताज़ा समाचार" : "Latest news"))}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{(q.data ?? []).map((p) => <Link key={p.id} to={b.kind === "blog" ? "/blogs/$slug" : "/news/$slug"} params={{ slug: p.slug }} className="surface-card overflow-hidden transition hover:shadow-md">{p.image ? <img src={p.image} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" /> : null}<div className="p-4"><h3 className="font-display text-lg font-semibold">{p.title}</h3>{p.excerpt ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.excerpt}</p> : null}</div></Link>)}</div>
    </div></section>
  );
}

function ContactBlock({ b }: { b: Extract<Block, { type: "contact" }> }) {
  const { lang } = useLang();
  const L = lang === "hi";
  return <section className="section-y"><div className="container-page max-w-3xl text-center"><h2 className="font-display text-2xl font-semibold md:text-3xl">{L && b.heading_hi ? b.heading_hi : b.heading ?? (L ? "संपर्क करें" : "Contact us")}</h2><p className="mt-2 text-muted-foreground">{L ? "हमें संदेश भेजें — हम जल्द जवाब देंगे।" : "Send us a message — we reply soon."}</p><Button asChild className="mt-4"><Link to="/contact">{L ? "संपर्क फ़ॉर्म" : "Contact form"}</Link></Button></div></section>;
}
