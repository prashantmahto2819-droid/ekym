// श्रद्धांजलि पेज (सार्वजनिक, बिना लॉगिन): दिवंगत का परिचय + लोगों के श्रद्धांजलि संदेश।
// बिना लॉगिन वालों के संदेश बनाने वाले / एडमिन की मंज़ूरी के बाद दिखते हैं।
import type { SupabaseClient } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLang } from "@/core/i18n";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as unknown as SupabaseClient;

export const Route = createFileRoute("/shradhanjali/$slug")({
  head: () => ({ meta: [{ title: "श्रद्धांजलि" }, { name: "robots", content: "noindex" }] }),
  component: TributePage,
});

type Msg = { name: string; place: string | null; message: string; at: string };
type Tribute = { name: string; photo: string | null; birth_date: string | null; death_date: string | null; place: string | null; about: string | null; ceremony: string | null; family_line: string | null; messages: Msg[] };

function TributePage() {
  const { slug } = Route.useParams();
  const L = useLang().lang === "hi";
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [message, setMessage] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const q = useQuery({
    queryKey: ["tribute_public", slug],
    queryFn: async () => { const { data } = await sb.rpc("shok_tribute_public", { p_slug: slug }); return (data ?? null) as Tribute | null; },
  });
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString(L ? "hi-IN" : "en-IN", { day: "numeric", month: "long", year: "numeric" }) : "");

  async function post() {
    if (!name.trim() || !message.trim()) { setNote({ ok: false, text: L ? "अपना नाम और संदेश लिखिए।" : "Please write your name and message." }); return; }
    setBusy(true);
    const { data, error } = await sb.rpc("shok_tribute_post", { p_slug: slug, p_name: name, p_place: place, p_message: message });
    setBusy(false);
    if (error) { setNote({ ok: false, text: error.message }); return; }
    setMessage("");
    setNote({ ok: true, text: data === "visible" ? (L ? "आपका श्रद्धांजलि संदेश जुड़ गया। 🙏" : "Your tribute has been added. 🙏") : (L ? "आपका संदेश मिल गया। परिवार की मंज़ूरी के बाद यह यहाँ दिखेगा। 🙏" : "Your message was received. It will appear here once the family approves it. 🙏") });
    void q.refetch();
  }

  const t = q.data;
  if (q.isLoading) return <section className="container-page py-10 text-center text-muted-foreground">…</section>;
  if (!t) return (
    <section className="container-page py-16 text-center">
      <p className="text-3xl">🪔</p>
      <p className="mt-3 font-semibold">{L ? "यह श्रद्धांजलि पेज उपलब्ध नहीं है।" : "This tribute page is not available."}</p>
      <p className="text-sm text-muted-foreground">{L ? "लिंक गलत हो सकता है, या पेज हटा दिया गया है।" : "The link may be wrong, or the page was removed."}</p>
    </section>
  );
  const card = "rounded-2xl border border-border bg-card p-5 shadow-sm";
  return (
    <section className="container-page max-w-2xl space-y-4 py-8">
      <div className={`${card} text-center`}>
        <p className="text-sm text-muted-foreground">{L ? "विनम्र श्रद्धांजलि" : "In loving memory"}</p>
        {t.photo ? <img src={t.photo} alt={t.name} className="mx-auto mt-3 h-48 w-40 rounded-xl object-cover ring-2 ring-amber-600/50" /> : <p className="mt-3 text-3xl">🪔</p>}
        <h1 className="mt-3 font-display text-2xl font-semibold">{t.name}</h1>
        <p className="text-sm text-muted-foreground">{[t.birth_date && `${L ? "जन्म" : "Born"}: ${fmt(t.birth_date)}`, t.death_date && `${L ? "निधन" : "Passed away"}: ${fmt(t.death_date)}`].filter(Boolean).join("  ·  ")}</p>
        {t.place ? <p className="text-sm text-muted-foreground">{t.place}</p> : null}
      </div>
      {t.family_line ? <div className={card}><h2 className="mb-1 font-semibold">{L ? "शोकाकुल परिवार" : "Bereaved family"}</h2><p className="whitespace-pre-wrap">{t.family_line}</p></div> : null}
      {t.about ? <div className={card}><h2 className="mb-1 font-semibold">{L ? "जीवन परिचय" : "Life"}</h2><p className="whitespace-pre-wrap">{t.about}</p></div> : null}
      {t.ceremony ? <div className={card}><h2 className="mb-1 font-semibold">{L ? "कार्यक्रम" : "Ceremonies"}</h2><p className="whitespace-pre-wrap">{t.ceremony}</p></div> : null}
      <div className={`${card} space-y-2`}>
        <h2 className="font-semibold">{L ? "अपनी श्रद्धांजलि लिखिए" : "Write your tribute"}</h2>
        <Input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder={L ? "आपका नाम" : "Your name"} />
        <Input value={place} maxLength={80} onChange={(e) => setPlace(e.target.value)} placeholder={L ? "गाँव / शहर (ज़रूरी नहीं)" : "Village / city (optional)"} />
        <Textarea value={message} maxLength={600} rows={4} onChange={(e) => setMessage(e.target.value)} placeholder={L ? "अपने श्रद्धांजलि शब्द लिखिए…" : "Your words of tribute…"} />
        <Button onClick={() => void post()} disabled={busy}>{L ? "श्रद्धांजलि अर्पित करें" : "Offer tribute"}</Button>
        {note ? <p className={`rounded-md p-2 text-sm ${note.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{note.text}</p> : null}
      </div>
      <div className={card}>
        <h2 className="mb-1 font-semibold">{L ? "श्रद्धांजलि संदेश" : "Tributes"} ({t.messages.length})</h2>
        {t.messages.length ? (
          <ul className="divide-y divide-border">
            {t.messages.map((m, i) => (
              <li key={i} className="py-2.5">
                <b>{m.name}</b>{m.place ? <span className="text-muted-foreground"> · {m.place}</span> : null}
                <p className="whitespace-pre-wrap">{m.message}</p>
                <span className="text-xs text-muted-foreground">{fmt(m.at)}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-muted-foreground">{L ? "सबसे पहले आप अपने श्रद्धा-सुमन अर्पित कीजिए।" : "Be the first to offer a tribute."}</p>}
      </div>
    </section>
  );
}
