// Web magazine built from an issue's composed articles (blogs, news, achievements, announcements, custom pieces).
// The organization chooses the look per issue (theme): layout, colours, font, columns, cover style. Print → PDF.
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { RichText } from "@/components/site/Blocks";
import { Button } from "@/components/ui/button";
import { useLang } from "@/core/i18n";
import { supabase } from "@/integrations/supabase/client";

export type MagTheme = { layout?: "classic" | "modern" | "newspaper"; accent?: string; paper?: string; ink?: string; font?: "serif" | "sans" | "devanagari"; columns?: 1 | 2; cover?: "image" | "band" | "minimal" };
export type Article = { id: string; type: string; ref?: string | null; section?: string | null; title?: string; title_hi?: string | null; body?: string | null; body_hi?: string | null; image?: string | null; author?: string | null; date?: string | null; org_name?: string | null; link?: string | null; category?: string | null };
export type IssueLike = { id: string; title: string; title_hi?: string | null; issue_no?: string | null; issue_date: string; description?: string | null; cover_path?: string | null; editorial?: string | null; editorial_hi?: string | null; editor_name?: string | null; theme?: MagTheme | null; articles?: unknown };

export const THEME_PRESETS: { key: string; label: string; theme: MagTheme }[] = [
  { key: "classic", label: "क्लासिक (कागज़ी, serif)", theme: { layout: "classic", accent: "#8a5a1b", paper: "#fbf7ef", ink: "#2b2217", font: "serif", columns: 1, cover: "image" } },
  { key: "modern", label: "आधुनिक (साफ़, रंगीन पट्टी)", theme: { layout: "modern", accent: "#1c6e6c", paper: "#ffffff", ink: "#14213d", font: "sans", columns: 1, cover: "band" } },
  { key: "newspaper", label: "समाचार-पत्र (2 कॉलम)", theme: { layout: "newspaper", accent: "#9b1c1c", paper: "#f7f5f0", ink: "#1a1a1a", font: "devanagari", columns: 2, cover: "minimal" } },
];
const FONT: Record<string, string> = { serif: "'Noto Serif Devanagari', 'Tiro Devanagari Hindi', Georgia, serif", sans: "Mukta, Manrope, system-ui, sans-serif", devanagari: "'Tiro Devanagari Hindi', 'Noto Serif Devanagari', serif" };

export const pubUrl = (path: string | null | undefined) => (!path ? "" : path.startsWith("http") || path.startsWith("/") ? path : supabase.storage.from("publications").getPublicUrl(path).data.publicUrl);
const img = (p: string | null | undefined) => (!p ? "" : p.startsWith("http") || p.startsWith("/") ? p : pubUrl(p));

export function useIssueArticles(issueId: string | undefined, enabled = true) {
  return useQuery({ queryKey: ["issue_articles", issueId], enabled: !!issueId && enabled, staleTime: 60_000, queryFn: async () => { const { data, error } = await supabase.rpc("k1_issue_articles", { p_issue: issueId! } as never); if (error) throw error; return ((data ?? []) as unknown as Article[]); } });
}

export function MagazineReader({ issue, orgName, articles, preview = false }: { issue: IssueLike; orgName: string; articles: Article[]; preview?: boolean }) {
  const { lang } = useLang();
  const hi = lang === "hi";
  const t: MagTheme = { ...THEME_PRESETS[0]!.theme, ...(issue.theme ?? {}) };
  const pick = (a: { title?: string | null; title_hi?: string | null }, k: "title" | "body" | "editorial") => {
    const o = a as Record<string, string | null | undefined>;
    return (hi && o[`${k}_hi`]) || o[k] || "";
  };
  const sections = useMemo(() => {
    const m = new Map<string, Article[]>();
    for (const a of articles) { const s = a.section || (a.type === "achievement" ? (hi ? "उपलब्धियाँ" : "Achievements") : a.type === "news" ? (hi ? "समाचार" : "News") : a.type === "announcement" ? (hi ? "सूचनाएँ" : "Announcements") : (hi ? "लेख" : "Articles")); (m.get(s) ?? m.set(s, []).get(s)!).push(a); }
    return [...m.entries()];
  }, [articles, hi]);
  const style = { "--mag-accent": t.accent, "--mag-paper": t.paper, "--mag-ink": t.ink, fontFamily: FONT[t.font ?? "serif"], background: t.paper, color: t.ink } as React.CSSProperties;
  const cover = img(issue.cover_path);
  const dateStr = new Date(issue.issue_date).toLocaleDateString(hi ? "hi-IN" : "en-IN", { dateStyle: "long" });

  return (
    <div className={`mag mag-${t.layout ?? "classic"} ${preview ? "" : "rounded-xl border border-border shadow-sm"} overflow-hidden`} style={style}>
      <style>{`
        .mag h1,.mag h2,.mag h3{color:var(--mag-ink)} .mag .acc{color:var(--mag-accent)} .mag .accbg{background:var(--mag-accent)} .mag .rule{border-color:var(--mag-accent)}
        .mag .cols-2 .body{column-count:2;column-gap:2rem} @media (max-width:720px){.mag .cols-2 .body{column-count:1}}
        .mag .article{break-inside:avoid-page} .mag .page-break{break-before:page}
        .mag .body p{margin:0 0 .9em} .mag .body h2,.mag .body h3{margin:1.2em 0 .4em;color:var(--mag-accent)} .mag .body img{max-width:100%;border-radius:.5rem}
        @media print{ .mag{border:0;box-shadow:none;border-radius:0} .no-print{display:none!important} .mag .cover{min-height:95vh} body{background:#fff} }
      `}</style>

      {/* ---------- cover ---------- */}
      <section className="cover relative flex min-h-[60vh] flex-col justify-end" style={t.cover === "image" && cover ? { backgroundImage: `url(${cover})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
        {t.cover === "image" && cover ? <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" /> : null}
        {t.cover === "band" ? <div className="accbg absolute inset-x-0 top-0 h-28" /> : null}
        <div className={`relative p-8 md:p-12 ${t.cover === "image" && cover ? "text-white" : ""}`}>
          {t.cover === "band" && cover ? <img src={cover} alt="" className="mb-6 max-h-[50vh] w-full rounded-lg object-cover shadow-lg" /> : null}
          <p className={`text-sm font-semibold uppercase tracking-[0.25em] ${t.cover === "image" && cover ? "text-amber-200" : "acc"}`}>{orgName}</p>
          <h1 className="mt-2 text-4xl font-bold leading-tight md:text-6xl">{(hi && issue.title_hi) || issue.title}</h1>
          <p className="mt-3 text-base opacity-90 md:text-lg">{[issue.issue_no, dateStr].filter(Boolean).join(" · ")}</p>
          {issue.description ? <p className="mt-3 max-w-2xl opacity-90">{issue.description}</p> : null}
        </div>
      </section>

      {/* ---------- editorial + contents ---------- */}
      <section className="grid gap-8 p-8 md:grid-cols-[1.4fr_1fr] md:p-12">
        {pick(issue as never, "editorial") ? (
          <div>
            <h2 className="acc text-sm font-semibold uppercase tracking-widest">{hi ? "संपादकीय" : "Editorial"}</h2>
            <div className="body mt-3 text-[17px] leading-relaxed"><RichText text={pick(issue as never, "editorial")} /></div>
            {issue.editor_name ? <p className="mt-2 text-sm opacity-70">— {issue.editor_name}</p> : null}
          </div>
        ) : <div />}
        <div className="rule border-l-4 pl-5">
          <h2 className="acc text-sm font-semibold uppercase tracking-widest">{hi ? "इस अंक में" : "In this issue"}</h2>
          <ol className="mt-3 space-y-2 text-sm">
            {sections.map(([s, list]) => (
              <li key={s}><p className="font-semibold">{s}</p><ul className="ml-3 mt-1 space-y-1 opacity-80">{list.map((a) => <li key={a.id}><a href={`#a-${a.id}`} className="hover:underline">{pick(a, "title")}</a>{a.org_name ? <span className="opacity-60"> · {a.org_name}</span> : null}</li>)}</ul></li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- sections & articles ---------- */}
      {sections.map(([s, list], si) => (
        <section key={s} className={`px-8 pb-10 md:px-12 ${si ? "page-break" : ""}`}>
          <div className="rule mb-6 flex items-center gap-3 border-t-2 pt-3"><span className="accbg h-2 w-10 rounded-full" /><h2 className="text-2xl font-bold">{s}</h2></div>
          <div className={`grid gap-10 ${t.layout === "modern" ? "md:grid-cols-2" : ""}`}>
            {list.map((a) => (
              <article key={a.id} id={`a-${a.id}`} className={`article ${t.columns === 2 ? "cols-2" : ""} ${t.layout === "modern" && (list.length === 1 || a.type === "blog") ? "md:col-span-2" : ""}`}>
                {img(a.image) ? <img src={img(a.image)} alt="" className={`mb-4 w-full rounded-lg object-cover ${a.type === "achievement" ? "max-h-80 w-auto" : "max-h-[26rem]"}`} /> : null}
                {a.type === "achievement" ? <p className="acc text-xs font-semibold uppercase tracking-widest">🏅 {hi ? "उपलब्धि" : "Achievement"}{a.category ? ` · ${a.category}` : ""}</p> : null}
                <h3 className="text-2xl font-bold leading-snug md:text-3xl">{pick(a, "title")}</h3>
                <p className="mt-1 text-sm opacity-70">{[a.author, a.org_name, a.date ? new Date(a.date).toLocaleDateString(hi ? "hi-IN" : "en-IN", { dateStyle: "medium" }) : null].filter(Boolean).join(" · ")}</p>
                <div className="body mt-4 text-[17px] leading-relaxed"><RichText text={pick(a, "body")} /></div>
              </article>
            ))}
          </div>
        </section>
      ))}

      <footer className="rule border-t px-8 py-6 text-center text-sm opacity-70 md:px-12">{orgName} · {(hi && issue.title_hi) || issue.title} {issue.issue_no ? `· ${issue.issue_no}` : ""} · Kalchuri One</footer>
    </div>
  );
}

export function PrintButton({ label }: { label: string }) {
  return <Button variant="outline" className="no-print" onClick={() => window.print()}>{label}</Button>;
}
