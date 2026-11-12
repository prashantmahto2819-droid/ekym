// Level certificate (public by token; also the verification page printed as a QR code on it).
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { CornerArt, Flourish, Mandala, Seal } from "@/components/exams/CertArt";
import { Button } from "@/components/ui/button";
import { useLang } from "@/core/i18n";
import { toDevanagari, toLatin } from "@/design-engine/script";
import { sb } from "@/components/exams/db";

export const Route = createFileRoute("/exams/levels/cert/$token")({
  head: () => ({ meta: [{ title: "स्तर प्रमाण-पत्र · Level certificate" }, { name: "robots", content: "noindex" }] }),
  component: CertPage,
});

type C = { name: string; track: string; track_hi: string | null; grp: string; level: number; level_name: string; level_name_en: string; percent: number; cert_no: string; date: string; org_name: string; org_name_hi: string | null; org_logo: string | null };

const RIBBON: Record<number, string> = { 1: "#3a7ca5", 2: "#a0622d", 3: "#7d8691", 4: "#b8924a", 5: "#6b4fa0" };

function CertPage() {
  const { token } = Route.useParams();
  const { lang } = useLang();
  const hi = lang === "hi";
  const q = useQuery({ queryKey: ["ex_level_cert", token], queryFn: async () => { const { data, error } = await sb.rpc("ex_level_cert", { p_token: token }); if (error) throw error; return data as unknown as C | null; } });
  const c = q.data;
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    if (!c || typeof window === "undefined") return;
    void QRCode.toDataURL(`${window.location.origin}/exams/levels/cert/${token}`, { margin: 0, width: 240, color: { dark: "#1b3a5c", light: "#00000000" } }).then(setQr).catch(() => setQr(null));
  }, [c, token]);
  if (q.isLoading) return <div className="container-page section-y text-sm text-muted-foreground">{hi ? "लोड हो रहा है…" : "Loading…"}</div>;
  if (!c) return <div className="container-page section-y text-sm">{hi ? "यह प्रमाण-पत्र नहीं मिला या लिंक गलत है।" : "Certificate not found or invalid link."}</div>;
  const sc = (v: string | null | undefined) => (v ? (hi ? toDevanagari(v) : toLatin(v)) : "");
  const org = hi ? c.org_name_hi || sc(c.org_name) : sc(c.org_name);
  const track = hi ? c.track_hi || sc(c.track) : sc(c.track);
  const ribbon = RIBBON[c.level] ?? "#b8924a";
  const date = new Date(c.date).toLocaleDateString(hi ? "hi-IN" : "en-IN", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="container-page section-y mx-auto max-w-4xl space-y-4">
      <style>{`@media print { .no-print{display:none!important} body{background:#fff} .cert{box-shadow:none!important;border-width:6px!important} @page{size:A4 landscape;margin:8mm} }`}</style>
      <div className="no-print flex flex-wrap items-center gap-2 text-sm">
        <Link to="/exams/levels" className="underline">‹ {hi ? "स्तर कार्यक्रम" : "Level programme"}</Link>
        <Button className="ml-auto" onClick={() => window.print()}>🖨️ {hi ? "प्रिंट / PDF सहेजें" : "Print / save as PDF"}</Button>
      </div>

      <div className="cert relative mx-auto aspect-[1.414/1] w-full overflow-hidden rounded-md border-[10px] border-[#1b3a5c] bg-[#fffcf3] text-center shadow-xl" style={{ fontFamily: "'Tiro Devanagari Hindi', 'Noto Serif Devanagari', Georgia, serif" }}>
        <div className="pointer-events-none absolute inset-2 border-2 border-[#b8924a] md:inset-3" />
        <div className="pointer-events-none absolute inset-3 border border-[#b8924a]/60 md:inset-[18px]" />
        {(["left-5 top-5", "right-5 top-5 rotate-90", "right-5 bottom-5 rotate-180", "left-5 bottom-5 -rotate-90"] as const).map((pos) => <CornerArt key={pos} className={`pointer-events-none absolute size-10 md:size-16 ${pos}`} />)}
        <Mandala className="pointer-events-none absolute left-1/2 top-1/2 size-[70%] -translate-x-1/2 -translate-y-1/2 opacity-[0.07]" />
        {/* level ribbon */}
        <div className="pointer-events-none absolute right-[6%] top-0 flex h-[22%] w-[9%] flex-col items-center justify-end pb-[1.5%] text-white" style={{ background: ribbon, clipPath: "polygon(0 0,100% 0,100% 100%,50% 86%,0 100%)" }}>
          <span className="text-[8px] leading-none md:text-xs">{hi ? "स्तर" : "LEVEL"}</span>
          <span className="font-sans text-lg font-bold leading-none md:text-4xl">{c.level}</span>
        </div>
        <div className="relative flex h-full flex-col items-center px-8 pb-5 pt-5 md:px-16 md:pb-8 md:pt-9">
          {c.org_logo ? <img src={c.org_logo} alt="" className="h-10 object-contain md:h-16" /> : <span className="grid size-10 place-items-center rounded-full bg-[#1b3a5c] text-lg font-bold text-white ring-4 ring-[#b8924a] md:size-16 md:text-3xl">{[...(org || "K")][0]}</span>}
          <p className="mt-1 text-sm font-semibold text-[#1b3a5c] md:mt-2 md:text-2xl">{org}</p>
          <p className={`mt-1 text-2xl font-bold leading-tight text-[#b8924a] md:mt-3 md:text-5xl ${hi ? "" : "tracking-[0.2em]"}`}>{hi ? "प्रमाण-पत्र" : "CERTIFICATE"}</p>
          {hi ? <p className="mt-0.5 text-sm font-semibold md:text-xl" style={{ color: ribbon }}>{c.level_name} स्तर उपलब्धि</p>
            : <p className="mt-0.5 font-sans text-[9px] font-semibold uppercase tracking-[0.35em] md:text-sm" style={{ color: ribbon }}>{c.level_name_en} level achievement</p>}
          <Flourish className="mt-1 h-3 w-40 text-[#b8924a] md:mt-2 md:h-4 md:w-64" />
          <p className="mt-1 text-xs text-stone-600 md:mt-3 md:text-base">{hi ? "यह प्रमाणित किया जाता है कि" : "This is to certify that"}</p>
          <p className="mt-0.5 border-b border-[#b8924a] px-6 pb-1 text-2xl font-bold text-stone-900 md:px-10 md:text-5xl">{sc(c.name)}</p>
          <p className="mx-auto mt-2 max-w-2xl text-xs leading-relaxed text-stone-700 md:mt-4 md:text-lg">
            {hi ? <>ने <b>{track}</b> कार्यक्रम की <b>स्तर {c.level} ({c.level_name})</b> परीक्षा <b>{c.percent}%</b> अंकों के साथ उत्तीर्ण की है।</>
              : <>has passed the <b>Level {c.level} ({c.level_name_en})</b> test of the <b>{track}</b> programme with <b>{c.percent}%</b> marks.</>}
          </p>
          <div className="mt-auto grid w-full grid-cols-3 items-end text-[9px] text-stone-600 md:text-sm">
            <div className="flex items-end gap-2 text-left">{qr ? <img src={qr} alt="" className="size-10 md:size-20" /> : null}<div><p>{hi ? "क्रमांक" : "No."}: <b>{c.cert_no}</b></p><p>{hi ? "दिनांक" : "Date"}: {date}</p><p className="opacity-70">{hi ? "स्कैन कर सत्यापित करें" : "Scan to verify"}</p></div></div>
            <div className="flex justify-center"><Seal className="h-14 w-11 md:h-28 md:w-24" /></div>
            <div className="text-right"><div className="mb-1 ml-auto h-6 w-24 border-b border-stone-500 md:h-10 md:w-44" /><p className="font-semibold text-[#1b3a5c]">{hi ? "परीक्षा नियंत्रक" : "Controller of Examinations"}</p><p className="opacity-70">{org}</p></div>
          </div>
        </div>
      </div>
      <p className="no-print text-xs text-muted-foreground">{hi ? "यह पेज प्रमाण-पत्र का सत्यापन पेज भी है — प्रमाण-पत्र पर छपे QR कोड से कोई भी इसकी सत्यता जाँच सकता है।" : "This page also verifies the certificate — anyone can check it with the QR code printed on it."}</p>
    </div>
  );
}
