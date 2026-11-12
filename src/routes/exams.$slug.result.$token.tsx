// Public result + printable certificate (by token; no login). Also the verification page for a certificate number.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useLang } from "@/core/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/exams/$slug/result/$token")({
  head: () => ({ meta: [{ title: "परिणाम व प्रमाण-पत्र · Result & certificate" }, { name: "robots", content: "noindex" }] }),
  component: ResultPage,
});

type R = { student_name: string; student_name_hi: string | null; school: string | null; city: string | null; class_level: string | null; reg_no: string; score: number; max_score: number; percent: number; rank: number; result: string; cert_no: string | null; cert_issued_at: string | null; exam: { title: string; title_hi: string | null; slug: string; starts_at: string | null; results_at: string | null }; category: { name: string | null; name_hi: string | null }; org_name: string; org_logo: string | null };

function ResultPage() {
  const { slug, token } = Route.useParams();
  const { lang } = useLang();
  const hi = lang === "hi";
  const q = useQuery({ queryKey: ["ex_result", token], queryFn: async () => { const { data, error } = await supabase.rpc("ex_result_public", { p_token: token } as never); if (error) throw error; return data as unknown as R | null; } });
  const r = q.data;
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    if (!r?.cert_no || typeof window === "undefined") return;
    void QRCode.toDataURL(`${window.location.origin}/exams/${slug}/result/${token}`, { margin: 0, width: 240, color: { dark: "#1b3a5c", light: "#00000000" } }).then(setQr).catch(() => setQr(null));
  }, [r?.cert_no, slug, token]);
  if (q.isSuccess && !r) return <div className="container-page section-y text-sm">{hi ? "परिणाम अभी उपलब्ध नहीं है या लिंक गलत है।" : "Result not available yet or invalid link."}</div>;
  if (!r) return null;
  const merit = r.result === "merit";
  return (
    <div className="container-page section-y mx-auto max-w-4xl space-y-4">
      <style>{`@media print { .no-print{display:none!important} body{background:#fff} .cert{box-shadow:none!important;border-width:6px!important} }`}</style>
      <div className="no-print flex flex-wrap items-center gap-2 text-sm">
        <Link to="/exams/$slug" params={{ slug }} className="underline">‹ {(hi && r.exam.title_hi) || r.exam.title}</Link>
        <span className="ml-auto flex gap-2">{r.cert_no ? <Button onClick={() => window.print()}>🖨️ {hi ? "प्रमाण-पत्र प्रिंट / PDF" : "Print / save certificate"}</Button> : null}</span>
      </div>
      <div className="surface-card grid gap-2 p-5 text-sm sm:grid-cols-2">
        <p><b>{hi ? "विद्यार्थी" : "Student"}:</b> {(hi && r.student_name_hi) || r.student_name}</p>
        <p><b>{hi ? "पंजीयन क्रमांक" : "Reg. no."}:</b> {r.reg_no}</p>
        <p><b>{hi ? "श्रेणी" : "Category"}:</b> {(hi && r.category.name_hi) || r.category.name || "—"}</p>
        <p><b>{hi ? "अंक" : "Score"}:</b> {r.score} / {r.max_score} ({r.percent}%)</p>
        <p><b>{hi ? "स्थान" : "Rank"}:</b> {r.rank}</p>
        <p><b>{hi ? "परिणाम" : "Result"}:</b> {r.result === "merit" ? (hi ? "मेरिट 🎉" : "Merit 🎉") : r.result === "pass" ? (hi ? "उत्तीर्ण" : "Pass") : (hi ? "अनुत्तीर्ण" : "Not passed")}</p>
      </div>

      {r.cert_no ? (
        <div className="cert relative mx-auto aspect-[1.414/1] w-full overflow-hidden rounded-md border-[10px] border-[#1b3a5c] bg-[#fffcf3] text-center shadow-xl" style={{ fontFamily: "'Tiro Devanagari Hindi', 'Noto Serif Devanagari', Georgia, serif" }}>
          <div className="pointer-events-none absolute inset-2 border-2 border-[#b8924a] md:inset-3" />
          <div className="pointer-events-none absolute inset-3 border border-[#b8924a]/60 md:inset-[18px]" />
          {(["left-5 top-5", "right-5 top-5 rotate-90", "right-5 bottom-5 rotate-180", "left-5 bottom-5 -rotate-90"] as const).map((pos) => <CornerArt key={pos} className={`pointer-events-none absolute size-10 md:size-16 ${pos}`} />)}
          <Mandala className="pointer-events-none absolute left-1/2 top-1/2 size-[70%] -translate-x-1/2 -translate-y-1/2 opacity-[0.07]" />
          <div className="relative flex h-full flex-col items-center px-8 pb-5 pt-5 md:px-16 md:pb-8 md:pt-9">
            {r.org_logo ? <img src={r.org_logo} alt="" className="h-10 object-contain md:h-16" /> : <span className="grid size-10 place-items-center rounded-full bg-[#1b3a5c] text-lg font-bold text-white ring-4 ring-[#b8924a] md:size-16 md:text-3xl">{[...(r.org_name || "क")][0]}</span>}
            <p className="mt-1 text-sm font-semibold text-[#1b3a5c] md:mt-2 md:text-2xl">{r.org_name}</p>
            <p className={`mt-1 text-2xl font-bold leading-tight text-[#b8924a] md:mt-3 md:text-5xl ${hi ? "" : "tracking-[0.2em]"}`}>{hi ? "प्रमाण-पत्र" : "CERTIFICATE"}</p>
            {hi ? <p className="mt-0.5 text-sm font-semibold text-[#1b3a5c] md:text-xl">{merit ? "मेरिट प्रमाण-पत्र" : "सहभागिता प्रमाण-पत्र"}</p>
              : <p className="mt-0.5 font-sans text-[9px] font-semibold uppercase tracking-[0.35em] text-[#1b3a5c] md:text-sm">{merit ? "of Merit" : "of Participation"}</p>}
            <Flourish className="mt-1 h-3 w-40 text-[#b8924a] md:mt-2 md:h-4 md:w-64" />
            <p className="mt-1 text-xs text-stone-600 md:mt-3 md:text-base">{hi ? "यह प्रमाणित किया जाता है कि" : "This is to certify that"}</p>
            <p className="mt-0.5 border-b border-[#b8924a] px-6 pb-1 text-2xl font-bold text-stone-900 md:px-10 md:text-5xl">{(hi && r.student_name_hi) || r.student_name}</p>
            <p className="mt-1 text-xs text-stone-600 md:text-base">{[r.class_level && `${hi ? "कक्षा" : "Class"} ${r.class_level}`, r.school, r.city].filter(Boolean).join(" · ")}</p>
            <p className="mx-auto mt-1 max-w-2xl text-xs leading-relaxed text-stone-700 md:mt-3 md:text-lg">
              {hi ? <>ने <b>{r.exam.title_hi || r.exam.title}</b>{r.category.name_hi || r.category.name ? <> ({r.category.name_hi || r.category.name})</> : null} में भाग लेकर <b>{r.percent}%</b> अंक प्राप्त किए{merit ? <> और <b>{r.rank === 1 ? "प्रथम" : r.rank === 2 ? "द्वितीय" : r.rank === 3 ? "तृतीय" : `${r.rank}वाँ`} स्थान</b> प्राप्त किया</> : null}।</>
                : <>participated in <b>{r.exam.title}</b>{r.category.name ? <> ({r.category.name})</> : null} and scored <b>{r.percent}%</b>{merit ? <>, securing <b>rank {r.rank}</b></> : null}.</>}
            </p>
            <div className="mt-auto grid w-full grid-cols-3 items-end text-[9px] text-stone-600 md:text-sm">
              <div className="flex items-end gap-2 text-left">{qr ? <img src={qr} alt="" className="size-10 md:size-20" /> : null}<div><p>{hi ? "क्रमांक" : "No."}: <b>{r.cert_no}</b></p><p>{hi ? "दिनांक" : "Date"}: {r.cert_issued_at ? new Date(r.cert_issued_at).toLocaleDateString("en-IN") : ""}</p><p className="opacity-70">{hi ? "स्कैन कर सत्यापित करें" : "Scan to verify"}</p></div></div>
              <div className="flex justify-center"><Seal className="h-14 w-11 md:h-28 md:w-24" /></div>
              <div className="text-right"><div className="mb-1 ml-auto h-6 w-24 border-b border-stone-500 md:h-10 md:w-44" /><p className="font-semibold text-[#1b3a5c]">{hi ? "अध्यक्ष / सचिव" : "President / Secretary"}</p><p className="opacity-70">{r.org_name}</p></div>
            </div>
          </div>
        </div>
      ) : null}
      <p className="no-print text-xs text-muted-foreground">{hi ? "यह पेज प्रमाण-पत्र का सत्यापन पेज भी है — प्रमाण-पत्र पर छपे लिंक से कोई भी इसकी सत्यता जाँच सकता है।" : "This page also verifies the certificate — anyone can check it via the link printed on it."}</p>
    </div>
  );
}

/* decorative SVGs for the printable certificate */
function CornerArt({ className }: { className: string }) {
  return <svg viewBox="0 0 60 60" className={className} fill="none" stroke="#b8924a" strokeLinecap="round"><path d="M60 1 H17 Q1 1 1 17 V60" strokeWidth="3" /><path d="M42 8 H19 Q8 8 8 19 V42" strokeWidth="1.6" /><circle cx="16" cy="16" r="3" fill="#b8924a" stroke="none" /></svg>;
}
function Flourish({ className }: { className: string }) {
  return <svg viewBox="0 0 200 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M92 8 C70 0 58 16 36 8 H2 M108 8 C130 0 142 16 164 8 H198" /><circle cx="36" cy="5" r="2.5" /><circle cx="164" cy="5" r="2.5" /><path d="M100 2 L106 8 L100 14 L94 8 Z" fill="currentColor" stroke="none" /></svg>;
}
function Seal({ className }: { className: string }) {
  const n = 28, pts = Array.from({ length: n * 2 }, (_, i) => { const a = (i / (n * 2)) * Math.PI * 2, r = i % 2 ? 36 : 40; return `${50 + Math.cos(a) * r},${45 + Math.sin(a) * r}`; }).join(" ");
  const star = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 6 : 14; return `${50 + Math.cos(a) * r},${45 + Math.sin(a) * r}`; }).join(" ");
  return <svg viewBox="0 0 100 120" className={className}><path d="M38 70 L30 118 L40 110 L48 118 L50 72 Z M62 70 L70 118 L60 110 L52 118 L50 72 Z" fill="#a8823e" /><polygon points={pts} fill="#b8924a" /><circle cx="50" cy="45" r="30" fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth="1.5" /><circle cx="50" cy="45" r="26" fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth="1.5" /><polygon points={star} fill="#fff" fillOpacity=".92" /></svg>;
}
function Mandala({ className }: { className: string }) {
  const rings: [number, number, number][] = [[48, 32, 8], [37, 24, 9], [26, 16, 10], [15, 12, 8]];
  return <svg viewBox="-50 -50 100 100" className={className} fill="none" stroke="#b8924a" strokeWidth=".35">{rings.map(([k, cnt, len]) => <g key={k}>{Array.from({ length: cnt }, (_, i) => <ellipse key={i} cx="0" cy={-(k - len / 2)} rx={len * 0.32} ry={len / 2} transform={`rotate(${(i / cnt) * 360})`} />)}<circle r={k - len} /></g>)}</svg>;
}
