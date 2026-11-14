// Small pieces shared by the detail pages (event, news, blog, campaign): add to calendar, map card, reading progress,
// reading time, countdown and a "more like this" grid. No server calls of their own.
import { Link } from "@tanstack/react-router";
import { CalendarPlus, Clock, Download, MapPin, Navigation } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

const pad = (n: number) => String(n).padStart(2, "0");
const utc = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
const icsEsc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (m) => `\\${m}`);

export type CalEvent = { title: string; start: string; end?: string | null | undefined; location?: string | null | undefined; details?: string | null | undefined; url?: string | undefined };

/** Google Calendar link + a .ics file (Apple / Outlook / phone calendars). Default length 2 hours. */
export function AddToCalendar({ ev, L }: { ev: CalEvent; L: boolean }) {
  const s = new Date(ev.start);
  const e = ev.end ? new Date(ev.end) : new Date(s.getTime() + 2 * 3600000);
  const details = [ev.details ?? "", ev.url ?? ""].filter(Boolean).join("\n\n").slice(0, 1500);
  const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev.title)}&dates=${utc(s)}/${utc(e)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(ev.location ?? "")}`;
  function ics() {
    const body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Kalchuri One//EN", "BEGIN:VEVENT", `UID:${utc(s)}-${Math.random().toString(36).slice(2)}@kalchuri.org`, `DTSTAMP:${utc(new Date())}`,
      `DTSTART:${utc(s)}`, `DTEND:${utc(e)}`, `SUMMARY:${icsEsc(ev.title)}`, ev.location ? `LOCATION:${icsEsc(ev.location)}` : "", details ? `DESCRIPTION:${icsEsc(details)}` : "",
      "BEGIN:VALARM", "TRIGGER:-PT2H", "ACTION:DISPLAY", `DESCRIPTION:${icsEsc(ev.title)}`, "END:VALARM", "END:VEVENT", "END:VCALENDAR"].filter(Boolean).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([body], { type: "text/calendar;charset=utf-8" }));
    a.download = `${ev.title.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 40) || "event"}.ics`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline" size="sm"><a href={google} target="_blank" rel="noreferrer"><CalendarPlus className="size-4" /> {L ? "Google कैलेंडर में जोड़ें" : "Add to Google Calendar"}</a></Button>
      <Button variant="outline" size="sm" onClick={ics}><Download className="size-4" /> {L ? "फोन कैलेंडर (.ics)" : "Phone calendar (.ics)"}</Button>
    </div>
  );
}

/** Map from a place name (or a saved map link) with a "directions" button. */
export function MapCard({ place, mapUrl, L }: { place: string | null | undefined; mapUrl?: string | null | undefined; L: boolean }) {
  const q = (place ?? "").trim();
  if (!q && !mapUrl) return null;
  const embed = q ? `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed` : null;
  const dir = mapUrl || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {embed ? <iframe title={L ? "नक्शा" : "Map"} src={embed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-48 w-full border-0" /> : null}
      <div className="flex items-center gap-2 p-3 text-sm">
        <MapPin className="size-4 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate">{q || (L ? "स्थान" : "Venue")}</span>
        <Button asChild size="sm"><a href={dir} target="_blank" rel="noreferrer"><Navigation className="size-4" /> {L ? "रास्ता" : "Directions"}</a></Button>
      </div>
    </div>
  );
}

/** Thin bar at the top that fills while the article is read. */
export function ReadingProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const on = () => { const h = document.documentElement; const max = h.scrollHeight - h.clientHeight; setP(max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0); };
    on(); window.addEventListener("scroll", on, { passive: true }); window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, []);
  return <div aria-hidden className="fixed inset-x-0 top-0 z-[60] h-1 bg-transparent"><div className="h-full bg-primary transition-[width] duration-150" style={{ width: `${p}%` }} /></div>;
}

/** "5 मिनट पढ़ें" — about 200 words a minute (Hindi and English alike). */
export function ReadTime({ text, L }: { text: string | null | undefined; L: boolean }) {
  const words = (text ?? "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  if (!words) return null;
  const m = Math.max(1, Math.round(words / 200));
  return <span className="flex items-center gap-1"><Clock className="size-4" /> {L ? `${m} मिनट पढ़ें` : `${m} min read`}</span>;
}

/** Days / hours / minutes until a time; "आज" / "चल रहा है" / "हो चुका" around it. */
export function Countdown({ start, end, L }: { start: string; end?: string | null | undefined; L: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  const s = Date.parse(start); const e = end ? Date.parse(end) : s + 3 * 3600000;
  if (now > e) return <p className="rounded-lg bg-secondary px-3 py-2 text-center text-sm text-muted-foreground">{L ? "यह आयोजन हो चुका है" : "This event is over"}</p>;
  if (now >= s) return <p className="rounded-lg bg-emerald-100 px-3 py-2 text-center text-sm font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">🔴 {L ? "अभी चल रहा है" : "Happening now"}</p>;
  const d = Math.floor((s - now) / 86400000); const h = Math.floor(((s - now) % 86400000) / 3600000); const m = Math.floor(((s - now) % 3600000) / 60000);
  const box = (n: number, l: string) => <div className="flex-1 rounded-lg bg-primary/10 py-2 text-center"><p className="font-display text-2xl font-semibold tabular-nums text-primary">{n}</p><p className="text-[11px] text-muted-foreground">{l}</p></div>;
  return <div className="flex gap-2">{box(d, L ? "दिन" : "days")}{box(h, L ? "घंटे" : "hours")}{box(m, L ? "मिनट" : "min")}</div>;
}

export type RelatedItem = { key: string; to: string; params: Record<string, string>; title: string; image?: string | null | undefined; meta?: string | null | undefined };

/** "और देखें" — up to 3 cards under a detail page. */
export function RelatedGrid({ title, items, all }: { title: string; items: RelatedItem[]; all?: { to: string; label: string } | undefined }) {
  if (!items.length) return null;
  return (
    <section className="border-t border-border bg-secondary/40 py-10">
      <div className="container-page">
        <div className="mb-4 flex items-end justify-between gap-2">
          <h2 className="font-display text-xl font-semibold sm:text-2xl">{title}</h2>
          {all ? <Link to={all.to as never} className="text-sm font-medium text-primary hover:underline">{all.label} →</Link> : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.slice(0, 3).map((x) => (
            <Link key={x.key} to={x.to as never} params={x.params as never} className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary/20 to-amber-200/40">
                {x.image ? <img src={x.image} alt="" loading="lazy" className="size-full object-cover transition duration-300 group-hover:scale-105" /> : null}
              </div>
              <div className="p-3">
                <p className="line-clamp-2 font-medium leading-snug group-hover:text-primary">{x.title}</p>
                {x.meta ? <p className="mt-1 text-xs text-muted-foreground">{x.meta}</p> : null}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
