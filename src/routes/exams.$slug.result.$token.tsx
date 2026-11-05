// Public result + printable certificate (by token; no login). Also the verification page for a certificate number.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

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
  if (q.isSuccess && !r) return <div className="container-page section-y text-sm">{hi ? "परिणाम अभी उपलब्ध नहीं है या लिंक गलत है।" : "Result not available yet or invalid link."}</div>;
  if (!r) return null;
  const merit = r.result === "merit";
  const verifyUrl = typeof window !== "undefined" ? `${window.location.origin}/exams/${slug}/result/${token}` : "";
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
        <div className="cert relative mx-auto aspect-[1.414/1] w-full overflow-hidden rounded-xl border-[10px] border-double border-amber-700/70 bg-[#fffdf5] p-8 text-center shadow-xl md:p-12" style={{ fontFamily: "'Tiro Devanagari Hindi', 'Noto Serif Devanagari', Georgia, serif" }}>
          <div className="pointer-events-none absolute inset-3 rounded-lg border border-amber-700/40" />
          {r.org_logo ? <img src={r.org_logo} alt="" className="mx-auto h-16 object-contain md:h-20" /> : null}
          <p className="mt-2 text-lg font-semibold tracking-wide text-amber-900 md:text-2xl">{r.org_name}</p>
          <p className="mt-4 text-xs uppercase tracking-[0.35em] text-amber-800/70 md:text-sm">{merit ? (hi ? "मेरिट प्रमाण-पत्र" : "Certificate of Merit") : (hi ? "सहभागिता प्रमाण-पत्र" : "Certificate of Participation")}</p>
          <p className="mt-5 text-sm text-stone-600 md:text-base">{hi ? "यह प्रमाणित किया जाता है कि" : "This is to certify that"}</p>
          <p className="mt-1 text-3xl font-bold text-stone-900 md:text-5xl">{(hi && r.student_name_hi) || r.student_name}</p>
          <p className="mt-1 text-sm text-stone-600 md:text-base">{[r.class_level && `${hi ? "कक्षा" : "Class"} ${r.class_level}`, r.school, r.city].filter(Boolean).join(" · ")}</p>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-stone-700 md:text-lg">
            {hi ? <>ने <b>{r.exam.title_hi || r.exam.title}</b>{r.category.name_hi || r.category.name ? <> ({r.category.name_hi || r.category.name})</> : null} में भाग लेकर <b>{r.percent}%</b> अंक प्राप्त किए{merit ? <> और <b>{r.rank === 1 ? "प्रथम" : r.rank === 2 ? "द्वितीय" : r.rank === 3 ? "तृतीय" : `${r.rank}वाँ`} स्थान</b> प्राप्त किया</> : null}।</>
              : <>participated in <b>{r.exam.title}</b>{r.category.name ? <> ({r.category.name})</> : null} and scored <b>{r.percent}%</b>{merit ? <>, securing <b>rank {r.rank}</b></> : null}.</>}
          </p>
          <div className="mt-8 flex items-end justify-between text-xs text-stone-600 md:text-sm">
            <div className="text-left"><p>{hi ? "प्रमाण-पत्र क्रमांक" : "Certificate no."}: <b>{r.cert_no}</b></p><p>{hi ? "दिनांक" : "Date"}: {r.cert_issued_at ? new Date(r.cert_issued_at).toLocaleDateString("en-IN") : ""}</p><p className="mt-1 break-all opacity-70">{hi ? "सत्यापन" : "Verify"}: {verifyUrl}</p></div>
            <div className="text-right"><div className="mx-auto mb-1 h-10 w-36 border-b border-stone-500" /><p>{hi ? "अध्यक्ष / सचिव" : "President / Secretary"}</p><p className="opacity-70">{r.org_name}</p></div>
          </div>
        </div>
      ) : null}
      <p className="no-print text-xs text-muted-foreground">{hi ? "यह पेज प्रमाण-पत्र का सत्यापन पेज भी है — प्रमाण-पत्र पर छपे लिंक से कोई भी इसकी सत्यता जाँच सकता है।" : "This page also verifies the certificate — anyone can check it via the link printed on it."}</p>
    </div>
  );
}
