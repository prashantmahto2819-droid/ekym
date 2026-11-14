// Photo gallery: album chips, masonry grid, full-screen viewer (swipe, arrows, keys, slideshow, thumbnails, download, share).
// Deep links: /gallery?album=<slug>&photo=<id> opens the viewer on that photo.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight, Download, Images, MapPin, Pause, Play, Share2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PageHeader } from "@/components/site/PageHeader";
import { useLang } from "@/core/i18n";
import { pageMeta } from "@/core/seo";
import { formatDate } from "@/lib/format";
import { galleryQuery } from "@/lib/queries";

type Search = { album?: string; photo?: string };
export const Route = createFileRoute("/gallery")({
  validateSearch: (s: Record<string, unknown>): Search => ({ ...(typeof s["album"] === "string" ? { album: s["album"] } : {}), ...(typeof s["photo"] === "string" ? { photo: s["photo"] } : {}) }),
  loader: ({ context }) => context.queryClient.ensureQueryData(galleryQuery()),
  head: ({ matches }) => pageMeta(matches, { en: "Photo gallery", hi: "फोटो गैलरी" }, { en: "Photos from our events and programmes.", hi: "हमारे आयोजनों और कार्यक्रमों की तस्वीरें।" }),
  component: GalleryPage,
});

type Album = { id: string; slug: string; title: string; title_hi: string | null; description: string | null; description_hi: string | null; cover_image: string | null; event_date: string | null; location: string | null; category: string | null };
type Photo = { id: string; gallery_id: string; image: string; caption: string | null; display_order: number };

function GalleryPage() {
  const { data } = useSuspenseQuery(galleryQuery());
  const { lang, loc } = useLang(); const L = lang === "hi";
  const search = Route.useSearch();
  const navigate = useNavigate();
  const albums = (data.galleries ?? []) as Album[];
  const photos = (data.items ?? []) as Photo[];
  const counts = useMemo(() => { const m = new Map<string, number>(); for (const p of photos) m.set(p.gallery_id, (m.get(p.gallery_id) ?? 0) + 1); return m; }, [photos]);
  const withPhotos = albums.filter((a) => counts.get(a.id));
  const current = withPhotos.find((a) => a.slug === search.album) ?? null;
  const shown = current ? photos.filter((p) => p.gallery_id === current.id) : photos.filter((p) => counts.has(p.gallery_id) && withPhotos.some((a) => a.id === p.gallery_id));
  const albumOf = useMemo(() => new Map(albums.map((a) => [a.id, a])), [albums]);
  const openIdx = search.photo ? shown.findIndex((p) => p.id === search.photo) : -1;

  const go = (s: Search, replace = false) => void navigate({ to: "/gallery", search: s, replace, resetScroll: false });
  const setAlbum = (slug?: string) => go(slug ? { album: slug } : {});
  const open = (i: number) => { const p = shown[i]; if (p) go({ ...(search.album ? { album: search.album } : {}), photo: p.id }, search.photo !== undefined); };
  const close = () => go(search.album ? { album: search.album } : {}, true);

  return (
    <>
      <PageHeader title={L ? "फोटो गैलरी" : "Photo gallery"} description={L ? "हमारे आयोजनों, शिविरों और कार्यक्रमों की यादें।" : "Moments from our events, camps and programmes."} crumbs={[{ label: L ? "गैलरी" : "Gallery" }]} />
      <section className="section-y">
        <div className="container-page">
          {withPhotos.length ? (
            <>
              <div className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1">
                <Chip active={!current} onClick={() => setAlbum()} label={L ? "सभी फोटो" : "All photos"} n={shown.length && !current ? shown.length : photos.length} />
                {withPhotos.map((a) => <Chip key={a.id} active={current?.id === a.id} onClick={() => setAlbum(a.slug)} label={loc(a, "title") || a.title} n={counts.get(a.id) ?? 0} img={a.cover_image ?? photos.find((p) => p.gallery_id === a.id)?.image} />)}
              </div>
              {current ? (
                <div className="mb-5">
                  <h2 className="font-display text-2xl font-semibold">{loc(current, "title") || current.title}</h2>
                  <p className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Images className="size-4" /> {counts.get(current.id)} {L ? "फोटो" : "photos"}</span>
                    {current.event_date ? <span className="flex items-center gap-1"><CalendarDays className="size-4" /> {formatDate(current.event_date)}</span> : null}
                    {current.location ? <span className="flex items-center gap-1"><MapPin className="size-4" /> {current.location}</span> : null}
                  </p>
                  {loc(current, "description") ? <p className="mt-2 max-w-3xl text-sm">{loc(current, "description")}</p> : null}
                </div>
              ) : null}
              <div className="columns-2 gap-2 sm:columns-3 sm:gap-3 lg:columns-4">
                {shown.map((p, i) => (
                  <button key={p.id} type="button" onClick={() => open(i)} className="group relative mb-2 block w-full break-inside-avoid overflow-hidden rounded-lg bg-secondary sm:mb-3">
                    <img src={p.image} alt={p.caption ?? ""} loading="lazy" className="w-full transition duration-300 group-hover:scale-[1.03]" />
                    {p.caption || !current ? (
                      <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-8 text-left text-xs text-white opacity-0 transition group-hover:opacity-100">
                        {p.caption ?? ""}{!current ? <span className="block opacity-80">{loc(albumOf.get(p.gallery_id) ?? null, "title")}</span> : null}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </>
          ) : <p className="text-muted-foreground">{L ? "फोटो जल्द ही यहाँ दिखेंगी।" : "Photos will be published here soon."}</p>}
        </div>
      </section>
      {openIdx >= 0 ? <Viewer L={L} photos={shown} index={openIdx} albumTitle={(p) => loc(albumOf.get(p.gallery_id) ?? null, "title")} onIndex={open} onClose={close} shareUrl={(p) => `${typeof window === "undefined" ? "" : window.location.origin}/gallery?${new URLSearchParams({ ...(albumOf.get(p.gallery_id)?.slug ? { album: albumOf.get(p.gallery_id)!.slug } : {}), photo: p.id }).toString()}`} /> : null}
    </>
  );
}

function Chip({ active, onClick, label, n, img }: { active: boolean; onClick: () => void; label: string; n: number; img?: string | null | undefined }) {
  return (
    <button type="button" onClick={onClick} className={`flex shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-secondary"}`}>
      {img ? <img src={img} alt="" className="size-7 rounded-full object-cover" /> : <span className="grid size-7 place-items-center rounded-full bg-secondary text-foreground"><Images className="size-4" /></span>}
      <span className="max-w-[180px] truncate">{label}</span>
      <span className={`text-xs ${active ? "opacity-80" : "text-muted-foreground"}`}>{n}</span>
    </button>
  );
}

/** Full-screen photo viewer. */
function Viewer({ L, photos, index, onIndex, onClose, albumTitle, shareUrl }: { L: boolean; photos: Photo[]; index: number; onIndex: (i: number) => void; onClose: () => void; albumTitle: (p: Photo) => string; shareUrl: (p: Photo) => string }) {
  const p = photos[index]!;
  const n = photos.length;
  const [play, setPlay] = useState(false);
  const [ui, setUi] = useState(true);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const strip = useRef<HTMLDivElement>(null);
  const prev = useCallback(() => onIndex((index - 1 + n) % n), [index, n, onIndex]);
  const next = useCallback(() => onIndex((index + 1) % n), [index, n, onIndex]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); else if (e.key === "ArrowRight") next(); else if (e.key === "ArrowLeft") prev(); else if (e.key === " ") { e.preventDefault(); setPlay((v) => !v); } };
    document.addEventListener("keydown", k); const o = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = o; };
  }, [next, prev, onClose]);
  useEffect(() => { if (!play) return; const t = setTimeout(next, 3500); return () => clearTimeout(t); }, [play, index, next]);
  useEffect(() => { strip.current?.querySelector<HTMLElement>(`[data-i="${index}"]`)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }); }, [index]);
  // load the neighbours early so swiping feels instant
  useEffect(() => { for (const j of [index + 1, index - 1]) { const q = photos[(j + n) % n]; if (q) { const im = new Image(); im.src = q.image; } } }, [index, n, photos]);

  async function download() {
    try {
      const r = await fetch(p.image); const b = await r.blob();
      const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `photo-${index + 1}.${(b.type.split("/")[1] || "jpg").replace("jpeg", "jpg")}`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch { window.open(p.image, "_blank"); }
  }
  async function share() {
    const url = shareUrl(p); const title = p.caption || albumTitle(p) || (L ? "फोटो" : "Photo");
    if (typeof navigator.share === "function") { try { await navigator.share({ title, url }); return; } catch { return; } }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`, "_blank");
  }
  const btn = "grid size-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20";
  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black" role="dialog" aria-modal="true" aria-label={L ? "फोटो" : "Photo"}>
      <div className={`flex items-center gap-2 p-3 text-white transition-opacity ${ui ? "opacity-100" : "opacity-0"}`}>
        <p className="min-w-0 flex-1 truncate text-sm"><b>{index + 1}</b> / {n} <span className="opacity-70">· {albumTitle(p)}</span></p>
        <button type="button" className={btn} onClick={() => setPlay((v) => !v)} title={play ? (L ? "रोकें" : "Pause") : (L ? "स्लाइड शो" : "Slideshow")}>{play ? <Pause className="size-5" /> : <Play className="size-5" />}</button>
        <button type="button" className={btn} onClick={() => void share()} title={L ? "शेयर करें" : "Share"}><Share2 className="size-5" /></button>
        <button type="button" className={btn} onClick={() => void download()} title={L ? "डाउनलोड" : "Download"}><Download className="size-5" /></button>
        <button type="button" className={btn} onClick={onClose} title={L ? "बंद करें" : "Close"}><X className="size-5" /></button>
      </div>
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16"
        onClick={() => setUi((v) => !v)}
        onTouchStart={(e) => { const t = e.touches[0]; if (t) touch.current = { x: t.clientX, y: t.clientY }; }}
        onTouchEnd={(e) => {
          const s = touch.current; const t = e.changedTouches[0]; touch.current = null; if (!s || !t) return;
          const dx = t.clientX - s.x, dy = t.clientY - s.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { if (dx < 0) next(); else prev(); }
          else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) onClose();
        }}
      >
        <img key={p.id} src={p.image} alt={p.caption ?? ""} className="max-h-full max-w-full select-none rounded object-contain shadow-2xl animate-in fade-in duration-200" draggable={false} />
        {n > 1 ? <>
          <button type="button" onClick={(e) => { e.stopPropagation(); prev(); }} className={`absolute left-2 top-1/2 hidden -translate-y-1/2 sm:grid ${btn} size-12`} aria-label={L ? "पिछली" : "Previous"}><ChevronLeft className="size-7" /></button>
          <button type="button" onClick={(e) => { e.stopPropagation(); next(); }} className={`absolute right-2 top-1/2 hidden -translate-y-1/2 sm:grid ${btn} size-12`} aria-label={L ? "अगली" : "Next"}><ChevronRight className="size-7" /></button>
        </> : null}
      </div>
      <div className={`transition-opacity ${ui ? "opacity-100" : "opacity-0"}`}>
        {p.caption ? <p className="mx-auto max-w-3xl px-4 pb-2 text-center text-sm text-white/90">{p.caption}</p> : null}
        {n > 1 ? (
          <div ref={strip} className="flex gap-1.5 overflow-x-auto px-3 pb-3">
            {photos.map((q, i) => <button key={q.id} data-i={i} type="button" onClick={() => onIndex(i)} className={`shrink-0 overflow-hidden rounded transition ${i === index ? "ring-2 ring-white" : "opacity-50 hover:opacity-90"}`}><img src={q.image} alt="" loading="lazy" className="h-14 w-14 object-cover" /></button>)}
          </div>
        ) : null}
        <p className="pb-2 text-center text-[11px] text-white/40">{L ? "← → बदलें · स्पेस = स्लाइड शो · Esc = बंद · फोन पर स्वाइप करें" : "← → to move · Space = slideshow · Esc = close · swipe on phones"}</p>
      </div>
    </div>
  );
}

