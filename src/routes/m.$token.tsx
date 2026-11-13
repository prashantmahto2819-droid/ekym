// Shared matrimony biodata (the QR on the card points here). Shows the card image + safe fields; never the phone.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { ExtraList, Points } from "@/components/matrimony/ExtraList";
import { readExtra } from "@/components/matrimony/extraFields";
import { Button } from "@/components/ui/button";
import { useLang } from "@/core/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/m/$token")({
  head: () => ({ meta: [{ title: "वैवाहिक परिचय · Kalchuri One" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: SharedBiodata,
});

type Pub = { ok: boolean; reason?: string; org?: string; id?: string; image?: string | null; name?: string; gender?: string; age?: number; height_cm?: number | null; education?: string | null; profession?: string | null; city?: string | null; district?: string | null; gotra?: string | null; native_place?: string | null; about?: string | null; expectations?: string | null; interests?: string | null; special_note?: string | null; extra_fields?: unknown; signed_in?: boolean };

function SharedBiodata() {
  const { token } = Route.useParams();
  const { lang } = useLang(); const L = lang === "hi";
  const q = useQuery({ queryKey: ["matri_public", token], queryFn: async () => { const { data, error } = await supabase.rpc("k1_matrimony_public" as never, { p_token: token } as never); if (error) throw new Error(error.message); return data as unknown as Pub; } });
  const d = q.data;
  if (q.isLoading) return <section className="container-page py-16 text-center text-sm text-muted-foreground">…</section>;
  if (!d?.ok) return (
    <section className="container-page py-16"><div className="mx-auto max-w-md rounded-xl border border-border bg-card p-6 text-center text-sm">
      {d?.reason === "members" ? <><p className="font-semibold">{L ? "यह परिचय सिर्फ़ समाज के सदस्यों के लिए है" : "This profile is for community members only"}</p><p className="mt-1 text-muted-foreground">{d.org}</p><Button asChild className="mt-4"><Link to="/auth">{L ? "लॉगिन करके देखें" : "Sign in to view"}</Link></Button></>
        : <p>{L ? "यह परिचय अभी उपलब्ध नहीं है (शेयर बंद है या प्रोफ़ाइल हट चुका है)।" : "This profile is not available (sharing is off or the profile was removed)."}</p>}
    </div></section>
  );
  const ft = (cm: number) => { const i = Math.round(cm / 2.54); return `${Math.floor(i / 12)}'${i % 12}"`; };
  const rows: [string, string | null | undefined][] = [
    [L ? "आयु" : "Age", d.age ? `${d.age} ${L ? "वर्ष" : "yrs"}` : null], [L ? "कद" : "Height", d.height_cm ? `${ft(d.height_cm)} (${d.height_cm} cm)` : null],
    [L ? "शिक्षा" : "Education", d.education], [L ? "व्यवसाय" : "Profession", d.profession], [L ? "निवास" : "Lives in", [d.city, d.district].filter(Boolean).join(", ")],
    [L ? "गोत्र" : "Gotra", d.gotra], [L ? "मूल ग्राम" : "Native place", d.native_place], [L ? "रुचियाँ" : "Interests", d.interests],
  ];
  return (
    <section className="container-page py-6">
      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[minmax(0,420px)_1fr]">
        {d.image ? <img src={d.image} alt={d.name} className="w-full rounded-xl border border-border shadow" /> : null}
        <div className="space-y-4">
          <div><p className="text-xs uppercase tracking-wide text-muted-foreground">{L ? "वैवाहिक परिचय" : "Marriage biodata"} · {d.org}</p><h1 className="font-display text-3xl font-semibold">{d.name}</h1><p className="text-muted-foreground">{d.gender === "female" ? (L ? "वधू" : "Bride") : (L ? "वर" : "Groom")}{d.age ? ` · ${d.age} ${L ? "वर्ष" : "yrs"}` : ""}</p></div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">{rows.filter(([, v]) => v).map(([k, v]) => <div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd>{v}</dd></div>)}</dl>
          {d.about ? <div><p className="text-xs font-semibold uppercase text-muted-foreground">{L ? "परिचय" : "About"}</p><Points text={d.about} className="text-sm" /></div> : null}
          {d.expectations ? <div><p className="text-xs font-semibold uppercase text-muted-foreground">{L ? "अपेक्षाएँ" : "Looking for"}</p><Points text={d.expectations} className="text-sm" /></div> : null}
          {d.special_note ? <div><p className="text-xs font-semibold uppercase text-muted-foreground">{L ? "विशेष" : "Note"}</p><Points text={d.special_note} className="text-sm" /></div> : null}
          <div className="text-sm"><ExtraList rows={readExtra(d.extra_fields)} L={L} /></div>
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            <p>{L ? "रुचि भेजने और संपर्क के लिए समाज के सदस्य के रूप में लॉगिन करें। दोनों ओर से स्वीकृति के बाद ही नंबर साझा होता है।" : "Sign in as a community member to send interest. Numbers are shared only after both sides accept."}</p>
            <div className="mt-2 flex flex-wrap gap-2"><Button asChild size="sm"><Link to={d.signed_in ? "/matrimony" : "/auth"}>{L ? "रुचि भेजें" : "Send interest"}</Link></Button><Button asChild size="sm" variant="outline"><Link to="/join">{L ? "सदस्य बनें" : "Become a member"}</Link></Button></div>
          </div>
          <p className="text-xs text-muted-foreground">{L ? "यह परिचय " : "Shared via "}<a href="https://kalchuri.org" className="underline">Kalchuri One</a>{L ? " पर सत्यापित है।" : " — verified by the organization."}</p>
        </div>
      </div>
    </section>
  );
}
