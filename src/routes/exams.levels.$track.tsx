// Level exam hall: start screen (name on the certificate) → random paper from the server (no answers in the browser),
// countdown, palette, autosave every 20 s, auto-submit at time-up → score, pass/fail, certificate link, answer review.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Award } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLang } from "@/core/i18n";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import { LEVELS, useTracks } from "@/components/exams/levels";
import { sb } from "@/components/exams/db";

export const Route = createFileRoute("/exams/levels/$track")({
  validateSearch: (s: Record<string, unknown>): { level: number } => {
    const n = Number(s["level"]);
    return { level: Number.isInteger(n) && n >= 1 && n <= 5 ? n : 1 };
  },
  head: () => ({ meta: [{ title: "स्तर परीक्षा · Level test" }, { name: "robots", content: "noindex" }] }),
  component: LevelHall,
});

type Q = { id: string; subject: string; question: string; question_hi: string | null; image: string | null; options: string[]; options_hi: string[] | null };
type Paper = { attempt: string; paper_no: number; deadline: string; level: number; level_name: string; level_name_en: string; track: string; track_hi: string | null; pass_percent: number; answers: Record<string, number> | null; questions: Q[]; name: string };
type Result = { correct: number; wrong: number; skipped: number; percent: number; passed: boolean; late: boolean; pass_percent: number; cert_no: string | null; token: string | null; level: number; review: { id: string; chosen: number | null; correct: number; explanation: string | null; explanation_hi?: string | null }[] };

function LevelHall() {
  const { track: slug } = Route.useParams();
  const { level } = Route.useSearch();
  const { lang } = useLang();
  const hi = lang === "hi";
  const tenant = useTenant();
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const tracks = useTracks(tenant.organization_id);
  const t = tracks.data?.find((x) => x.slug === slug);
  const [name, setName] = useState("");
  const [blood, setBlood] = useState(() => { try { return localStorage.getItem("k1_blood") ?? ""; } catch { return ""; } });
  const [paper, setPaper] = useState<Paper | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [cur, setCur] = useState(0);
  const [left, setLeft] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = useRef(false);
  const submitting = useRef(false);
  const L = LEVELS[level - 1]!;

  async function start() {
    if (!t) return;
    if (!blood) { setErr("रक्त समूह चुनें (पता न हो तो \"पता नहीं\") · Choose the blood group (or \"Don't know\")"); return; }
    try { localStorage.setItem("k1_blood", blood); } catch { /* ignore */ }
    setBusy(true); setErr(null);
    const { data, error } = await sb.rpc("ex_level_start", { p_track: t.id, p_level: level, p_name: name.trim() || null, p_blood: blood });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    const p = data as unknown as Paper;
    setPaper(p); setAnswers(p.answers ?? {}); setCur(0);
  }

  async function submit(auto = false) {
    if (!paper || submitting.current) return;
    submitting.current = true; setBusy(true);
    try {
      const { data, error } = await sb.rpc("ex_level_submit", { p_attempt: paper.attempt, p_answers: answers });
      if (error) throw error;
      setResult(data as unknown as Result);
      void qc.invalidateQueries({ queryKey: ["ex_tracks"] }); void qc.invalidateQueries({ queryKey: ["ex_level_my"] });
      if (auto) toast(hi ? "समय समाप्त — उत्तर जमा हो गए" : "Time over — answers submitted");
      window.scrollTo({ top: 0 });
    } catch (e) { toast.error((e as Error).message); submitting.current = false; } finally { setBusy(false); }
  }

  useEffect(() => {
    if (!paper || result) return;
    const tick = () => { const s = Math.max(0, Math.floor((new Date(paper.deadline).getTime() - Date.now()) / 1000)); setLeft(s); if (s === 0) void submit(true); };
    tick();
    const iv = setInterval(tick, 1000);
    const save = setInterval(() => { if (dirty.current) { dirty.current = false; void sb.rpc("ex_level_save", { p_attempt: paper.attempt, p_answers: answers }); } }, 20000);
    return () => { clearInterval(iv); clearInterval(save); };
  }, [paper, answers, result]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!paper || result) return; const h = (e: BeforeUnloadEvent) => { e.preventDefault(); }; window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h); }, [paper, result]);

  const back = <Button asChild variant="outline"><Link to="/exams/levels">{hi ? "‹ सभी कार्यक्रम" : "‹ All programmes"}</Link></Button>;
  const qText = (q: Q) => (hi && q.question_hi) || q.question;
  const opts = (q: Q) => (hi && q.options_hi) || q.options;

  if (loading || tracks.isLoading) return <div className="container-page section-y text-sm text-muted-foreground">{hi ? "लोड हो रहा है…" : "Loading…"}</div>;
  if (!user) return <div className="container-page section-y space-y-3 text-sm"><p>{hi ? "परीक्षा देने के लिए लॉगिन करें।" : "Please sign in to take the test."}</p><Button asChild><Link to="/auth" search={{ redirect: `/exams/levels/${slug}?level=${level}` }}>{hi ? "लॉगिन / खाता बनाएँ" : "Sign in / sign up"}</Link></Button></div>;
  if (!t) return <div className="container-page section-y space-y-3 text-sm"><p>{hi ? "यह कार्यक्रम नहीं मिला।" : "Programme not found."}</p>{back}</div>;

  // ---------- result ----------
  if (result && paper) {
    return (
      <div className="container-page section-y mx-auto max-w-3xl space-y-4">
        <div className="surface-card p-6 text-center">
          <p className="text-sm text-muted-foreground">{(hi && t.name_hi) || t.name} · {hi ? `स्तर ${result.level} — ${L.hi}` : `Level ${result.level} — ${L.en}`}</p>
          <p className="mt-2 font-display text-5xl font-semibold">{result.percent}%</p>
          <p className="mt-1 text-sm text-muted-foreground">✅ {result.correct} · ❌ {result.wrong} · ⏭ {result.skipped} · {hi ? `उत्तीर्णांक ${result.pass_percent}%` : `pass mark ${result.pass_percent}%`}</p>
          {result.passed ? (
            <>
              <p className="mt-3 text-lg font-semibold text-green-700">🎉 {hi ? "बधाई! आप इस स्तर में उत्तीर्ण हुए।" : "Congratulations! You passed this level."}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {result.token ? <Button asChild><Link to="/exams/levels/cert/$token" params={{ token: result.token }}><Award className="size-4" /> {hi ? "प्रमाण-पत्र देखें" : "View certificate"}</Link></Button> : null}
                {result.level < 5 ? <Button asChild variant="outline"><Link to="/exams/levels/$track" params={{ track: slug }} search={{ level: result.level + 1 }} reloadDocument>{hi ? `स्तर ${result.level + 1} शुरू करें ›` : `Start level ${result.level + 1} ›`}</Link></Button> : null}
              </div>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm">{result.late ? (hi ? "समय-सीमा के बाद जमा हुआ, इसलिए यह प्रयास मान्य नहीं है।" : "Submitted after the time limit, so this attempt does not count.") : (hi ? "इस बार उत्तीर्णांक नहीं मिला। नीचे उत्तर देखें और फिर से प्रयास करें — अगली बार नया प्रश्न-पत्र मिलेगा।" : "Not passed this time. Review the answers below and try again — you will get a new paper.")}</p>
              <Button className="mt-4" onClick={() => { window.location.reload(); }}>{hi ? "फिर से प्रयास करें" : "Try again"}</Button>
            </>
          )}
          <div className="mt-3">{back}</div>
        </div>
        <div className="space-y-3">
          <h2 className="font-display text-lg font-semibold">{hi ? "उत्तर व व्याख्या" : "Answers & explanations"}</h2>
          {paper.questions.map((q, i) => {
            const r = result.review.find((x) => x.id === q.id);
            const ok = r && r.chosen === r.correct;
            const ex = (hi && r?.explanation_hi) || r?.explanation || (!hi ? null : r?.explanation_hi);
            return (
              <div key={q.id} className={`rounded-lg border p-3 text-sm ${ok ? "border-green-300 bg-green-50" : r?.chosen != null ? "border-red-300 bg-red-50" : "border-border"}`}>
                <p className="font-medium">{i + 1}. {qText(q)}</p>
                <ul className="mt-1 space-y-0.5">{opts(q).map((o, j) => <li key={j} className={`${r?.correct === j ? "font-semibold text-green-800" : ""} ${r?.chosen === j && r.correct !== j ? "text-red-700 line-through" : ""}`}>{String.fromCharCode(65 + j)}. {o}</li>)}</ul>
                {ex ? <p className="mt-1 text-xs text-muted-foreground">{ex}</p> : null}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------- start screen ----------
  if (!paper) {
    return (
      <div className="container-page section-y mx-auto max-w-xl space-y-4">
        <div className="surface-card space-y-4 p-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{hi ? "स्तर परीक्षा" : "Level test"}</p>
            <h1 className="font-display text-2xl font-semibold">{(hi && t.name_hi) || t.name}</h1>
            <span className={`mt-2 inline-block rounded-full border px-3 py-1 text-sm font-semibold ${L.color}`}>{hi ? `स्तर ${level} — ${L.hi}` : `Level ${level} — ${L.en}`}</span>
          </div>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>{hi ? `${t.questions_per_paper} बहुविकल्पीय प्रश्न, समय ${t.duration_minutes} मिनट।` : `${t.questions_per_paper} multiple-choice questions, ${t.duration_minutes} minutes.`}</li>
            <li>{hi ? `उत्तीर्ण होने के लिए ${t.pass_percent}% सही उत्तर चाहिए; गलत उत्तर पर अंक नहीं कटते।` : `You need ${t.pass_percent}% correct to pass; no negative marking.`}</li>
            <li>{hi ? "हर प्रयास में नया प्रश्न-पत्र बनता है। उत्तर हर 20 सेकंड में अपने-आप सहेजे जाते हैं।" : "Every attempt gets a new paper. Answers autosave every 20 seconds."}</li>
            <li>{hi ? "उत्तीर्ण होने पर प्रमाण-पत्र मिलेगा और अगला स्तर खुल जाएगा।" : "Passing gives you a certificate and unlocks the next level."}</li>
          </ul>
          <label className="block text-sm">
            <span className="font-medium">{hi ? "प्रमाण-पत्र पर नाम" : "Name on the certificate"}</span>
            <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={hi ? "खाली छोड़ें तो खाते का नाम लिखा जाएगा" : "Leave blank to use your account name"} />
          </label>
          <label className="block text-sm">
            <span className="font-medium">{hi ? "रक्त समूह (ज़रूरी)" : "Blood group (required)"}</span>
            <select className={`mt-1 h-9 w-full rounded-md border bg-background px-2 ${blood ? "border-input" : "border-amber-500"}`} value={blood} onChange={(e) => setBlood(e.target.value)}>
              <option value="">{hi ? "— रक्त समूह चुनें —" : "— choose blood group —"}</option>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => <option key={b} value={b}>{b}</option>)}
              <option value="unknown">{hi ? "पता नहीं" : "Don't know"}</option>
            </select>
          </label>
          {err ? <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">{hi ? err.split(" · ")[0] : (err.split(" · ")[1] ?? err)}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button onClick={start} disabled={busy}>{busy ? (hi ? "प्रश्न-पत्र बन रहा है…" : "Preparing paper…") : (hi ? "परीक्षा शुरू करें" : "Start test")}</Button>
            {back}
          </div>
        </div>
      </div>
    );
  }

  // ---------- exam ----------
  const q = paper.questions[cur]!;
  const mm = String(Math.floor(left / 60)).padStart(2, "0"), ss = String(left % 60).padStart(2, "0");
  const answered = paper.questions.filter((x) => answers[x.id] != null).length;
  const choose = (j: number) => { setAnswers((a) => ({ ...a, [q.id]: j })); dirty.current = true; };
  return (
    <div className="container-page py-4">
      <div className="sticky top-0 z-10 mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background p-3 text-sm shadow-sm">
        <span className={`font-mono text-lg font-semibold ${left < 120 ? "text-destructive" : ""}`}>⏱ {mm}:{ss}</span>
        <span className="text-muted-foreground">{hi ? "उत्तर दिए" : "Answered"}: {answered}/{paper.questions.length}</span>
        <span className="hidden text-muted-foreground sm:inline">{hi ? `स्तर ${paper.level} · प्रश्न-पत्र ${paper.paper_no}` : `Level ${paper.level} · paper ${paper.paper_no}`}</span>
        <Button size="sm" className="ml-auto" disabled={busy} onClick={() => { const un = paper.questions.length - answered; if (confirm(hi ? `उत्तर जमा करें?${un ? ` ${un} प्रश्न बाकी हैं।` : ""} इसके बाद बदलाव नहीं होगा।` : `Submit answers?${un ? ` ${un} unanswered.` : ""} No changes after this.`)) void submit(false); }}>{hi ? "जमा करें" : "Submit"}</Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
        <div className="surface-card p-5">
          <p className="text-xs text-muted-foreground">{hi ? "प्रश्न" : "Question"} {cur + 1} / {paper.questions.length}{q.subject === "kalchuri" ? ` · ${hi ? "कलचुरि इतिहास" : "Kalchuri history"}` : ""}</p>
          <p className="mt-2 text-lg font-medium leading-relaxed">{qText(q)}</p>
          {q.image ? <img src={q.image} alt="" className="mt-3 max-h-80 rounded-md" /> : null}
          <div className="mt-4 grid gap-2">
            {opts(q).map((o, j) => { const on = answers[q.id] === j; return (
              <button key={j} type="button" onClick={() => choose(j)} className={`flex items-start gap-3 rounded-lg border p-3 text-left transition ${on ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"}`}>
                <span className={`grid size-7 shrink-0 place-items-center rounded-full border text-sm font-semibold ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{String.fromCharCode(65 + j)}</span><span>{o}</span>
              </button>
            ); })}
          </div>
          <div className="mt-5 flex flex-wrap justify-between gap-2">
            <Button variant="outline" onClick={() => setCur((c) => Math.max(0, c - 1))} disabled={cur === 0}>‹ {hi ? "पिछला" : "Prev"}</Button>
            <Button variant="ghost" onClick={() => { setAnswers((a) => { const n = { ...a }; delete n[q.id]; return n; }); dirty.current = true; }}>{hi ? "उत्तर हटाएँ" : "Clear"}</Button>
            <Button onClick={() => setCur((c) => Math.min(paper.questions.length - 1, c + 1))} disabled={cur >= paper.questions.length - 1}>{hi ? "अगला" : "Next"} ›</Button>
          </div>
        </div>
        <aside className="surface-card p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{hi ? "प्रश्न सूची" : "Palette"}</p>
          <div className="grid grid-cols-6 gap-1.5 lg:grid-cols-5">{paper.questions.map((x, i) => <button key={x.id} type="button" onClick={() => setCur(i)} className={`h-9 rounded-md border text-sm ${i === cur ? "ring-2 ring-primary" : ""} ${answers[x.id] != null ? "border-green-400 bg-green-100 text-green-900" : "border-border"}`}>{i + 1}</button>)}</div>
          <p className="mt-3 text-xs text-muted-foreground">{hi ? "समय पूरा होने पर उत्तर अपने-आप जमा हो जाएँगे।" : "Answers are submitted automatically when time is up."}</p>
        </aside>
      </div>
    </div>
  );
}
