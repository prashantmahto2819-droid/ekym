import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLang } from "@/core/i18n";
import { renderAll, newDoc, mm } from "@/design-engine";
import { supabase } from "@/integrations/supabase/client";
import { rsvpQuery } from "@/lib/queries";

export const Route = createFileRoute("/rsvp/$token")({
  head: () => ({ meta: [{ title: "Invitation" }, { name: "robots", content: "noindex" }] }),
  component: RsvpPage,
});

function RsvpPage() {
  const { token } = Route.useParams();
  const { lang } = useLang();
  const L = lang === "hi";
  const qc = useQueryClient();
  const q = useQuery(rsvpQuery(token));
  const [seats, setSeats] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const qrRef = useRef<HTMLCanvasElement>(null);
  const info = q.data;
  useEffect(() => {
    // QR for the gate: draw with the design engine's QR layer
    if (!qrRef.current || !info) return;
    const d = newDoc("idcard", "#ffffff"); d.pages[0]!.layers = [{ id: "q", type: "qr", data: window.location.href, x: mm(2), y: mm(2), w: mm(50), h: mm(50), color: "#111" }];
    renderAll(d, {}, 3).then(([c]) => { if (!c || !qrRef.current) return; qrRef.current.width = c.width; qrRef.current.height = c.height; qrRef.current.getContext("2d")!.drawImage(c, 0, 0); });
  }, [info]);
  async function answer(a: "yes" | "no" | "maybe") {
    setBusy(true);
    try { const { error } = await supabase.rpc("k1_rsvp", { p_token: token, p_answer: a, p_seats: seats ?? info?.guest.seats ?? 1, p_note: note || null } as never); if (error) throw error; toast.success(L ? "धन्यवाद! जवाब दर्ज हुआ।" : "Thank you! Your answer is recorded."); qc.invalidateQueries({ queryKey: ["rsvp", token] }); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  if (q.isLoading) return <p className="container-page section-y text-muted-foreground">…</p>;
  if (!info) return <p className="container-page section-y text-muted-foreground">{L ? "यह निमंत्रण नहीं मिला।" : "Invitation not found."}</p>;
  const e = info.event, g = info.guest;
  const when = new Date(e.starts_at).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" });
  return (
    <section className="section-y"><div className="container-page max-w-xl space-y-4">
      {e.cover_image ? <img src={e.cover_image} alt="" className="w-full rounded-xl object-cover" /> : null}
      <div className="rounded-xl border border-border bg-background p-5 text-center">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{L && info.org.name_hi ? info.org.name_hi : info.org.name}</p>
        <h1 className="mt-1 font-display text-2xl font-semibold">{L && e.title_hi ? e.title_hi : e.title}</h1>
        <p className="mt-2 text-sm">{when}</p>
        {e.venue ? <p className="text-sm text-muted-foreground">{L && e.venue_hi ? e.venue_hi : e.venue} {e.map_url ? <a className="underline" href={e.map_url} target="_blank" rel="noreferrer">{L ? "नक्शा" : "map"}</a> : null}</p> : null}
        <p className="mt-4 text-lg">{L ? "सादर आमंत्रित" : "Invited"}: <b>{g.name}</b></p>
        {g.checked_in ? <p className="mt-2 rounded bg-primary/10 p-2 text-sm">{L ? "आपका चेक-इन हो चुका है। स्वागत है!" : "You are checked in. Welcome!"}</p> : null}
      </div>
      {e.status === "published" ? (
        <div className="rounded-xl border border-border bg-background p-5 text-sm">
          <p className="font-medium">{L ? "क्या आप आ रहे हैं?" : "Will you attend?"} {g.rsvp !== "none" ? <span className="text-xs text-muted-foreground">({L ? "अभी" : "currently"}: {g.rsvp})</span> : null}</p>
          <label className="mt-2 flex items-center gap-2">{L ? "कितने लोग" : "How many people"} <Input type="number" min={1} max={50} value={seats ?? g.seats} onChange={(x) => setSeats(Number(x.target.value))} className="w-20" /></label>
          <Textarea className="mt-2" rows={2} placeholder={L ? "कोई संदेश (वैकल्पिक)" : "Any note (optional)"} value={note} onChange={(x) => setNote(x.target.value)} />
          <div className="mt-3 flex flex-wrap gap-2"><Button onClick={() => answer("yes")} disabled={busy}>{L ? "हाँ, आऊँगा/आऊँगी" : "Yes, I'll come"}</Button><Button variant="outline" onClick={() => answer("maybe")} disabled={busy}>{L ? "शायद" : "Maybe"}</Button><Button variant="ghost" onClick={() => answer("no")} disabled={busy}>{L ? "नहीं आ पाऊँगा/पाऊँगी" : "Can't make it"}</Button></div>
        </div>
      ) : null}
      <div className="rounded-xl border border-border bg-background p-5 text-center text-sm">
        <p className="font-medium">{L ? "प्रवेश QR (गेट पर दिखाएँ)" : "Entry QR (show at the gate)"}</p>
        <canvas ref={qrRef} className="mx-auto mt-2 w-48" />
        <p className="mt-1 font-mono text-xs text-muted-foreground">{token}</p>
      </div>
    </div></section>
  );
}
