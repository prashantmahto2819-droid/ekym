import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { RichText } from "@/components/site/Blocks";
import { PageHeader } from "@/components/site/PageHeader";
import { ShareButtons } from "@/components/site/ShareButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLang } from "@/core/i18n";
import { siteName } from "@/core/seo";
import { supabase } from "@/integrations/supabase/client";
import { eventQuery } from "@/lib/queries";

export const Route = createFileRoute("/events/$slug")({
  loader: async ({ context, params }) => { const e = await context.queryClient.ensureQueryData(eventQuery(params.slug)); if (!e) throw notFound(); return e; },
  head: ({ loaderData, matches }) => ({ meta: loaderData ? [{ title: `${loaderData.title} — ${siteName(matches)}` }, { name: "description", content: loaderData.description ?? loaderData.title }, ...(loaderData.cover_image ? [{ property: "og:image", content: loaderData.cover_image }] : [])] : [{ title: "Not found" }] }),
  component: EventPage,
});

function EventPage() {
  const { slug } = Route.useParams();
  const { data: e } = useSuspenseQuery(eventQuery(slug));
  const { lang, loc } = useLang();
  const L = lang === "hi";
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [seats, setSeats] = useState(1); const [done, setDone] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  if (!e) return null;
  async function register() {
    if (!name.trim() || phone.replace(/\D/g, "").length < 10) { toast.error(L ? "नाम और 10 अंकों का मोबाइल लिखिए।" : "Enter your name and a 10-digit mobile."); return; }
    setBusy(true);
    try { const { data, error } = await supabase.rpc("k1_event_register", { p_event: e!.id, p_name: name.trim(), p_phone: phone, p_seats: seats } as never); if (error) throw error; setDone(data as string); } catch (er) { toast.error((er as Error).message); } finally { setBusy(false); }
  }
  const when = new Date(e.starts_at).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" });
  return (
    <>
      <PageHeader title={loc(e, "title")} description={when} crumbs={[{ label: L ? "आयोजन" : "Events", to: "/events" }, { label: loc(e, "title") }]} />
      <section className="section-y"><div className="container-page grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {e.cover_image ? <img src={e.cover_image} alt="" className="w-full rounded-xl object-cover" /> : null}
          {loc(e, "description") ? <RichText text={loc(e, "description")} /> : null}
          <ShareButtons path={`/events/${e.slug}`} title={e.title} />
        </div>
        <aside className="space-y-3 rounded-xl border border-border bg-background p-4 text-sm">
          <p><b>{L ? "कब" : "When"}:</b> {when}{e.ends_at ? ` – ${new Date(e.ends_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}` : ""}</p>
          {e.venue ? <p><b>{L ? "कहाँ" : "Where"}:</b> {loc(e, "venue")} {e.map_url ? <a href={e.map_url} target="_blank" rel="noreferrer" className="underline">{L ? "नक्शा" : "map"}</a> : null}</p> : null}
          {e.organizer ? <p><b>{L ? "आयोजक" : "Organizer"}:</b> {e.organizer}{e.contact_phone ? ` · ${e.contact_phone}` : ""}</p> : null}
          {e.registration_open && e.status === "published" ? (
            done ? <p className="rounded-md bg-primary/10 p-3">{L ? "पंजीकरण हो गया! आपका प्रवेश कोड:" : "Registered! Your entry code:"} <b>{done}</b><br /><a className="underline" href={`/rsvp/${done}`}>{L ? "QR / विवरण देखें" : "View QR / details"}</a></p> : (
              <div className="space-y-2 rounded-md bg-secondary/50 p-3">
                <p className="font-medium">{L ? "पंजीकरण करें" : "Register"}</p>
                <Input placeholder={L ? "आपका नाम" : "Your name"} value={name} onChange={(x) => setName(x.target.value)} />
                <Input placeholder={L ? "मोबाइल (WhatsApp)" : "Mobile (WhatsApp)"} inputMode="numeric" value={phone} onChange={(x) => setPhone(x.target.value)} />
                <label className="flex items-center gap-2 text-xs">{L ? "कितने लोग" : "How many people"} <Input type="number" min={1} max={20} value={seats} onChange={(x) => setSeats(Number(x.target.value))} className="w-20" /></label>
                <Button onClick={register} disabled={busy} className="w-full">{L ? "पंजीकरण" : "Register"}</Button>
              </div>
            )
          ) : null}
        </aside>
      </div></section>
    </>
  );
}
