// Exam hall: server-built paper (no answers in the browser), countdown, question palette, autosave every 20 s,
// tab-switch counter (auto-submit past the limit), auto-submit at deadline, review after submit when allowed.
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useLang } from "@/core/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/exams/$slug/attempt")({
  validateSearch: (s: Record<string, unknown>): { reg?: string; practice?: boolean } => ({ reg: typeof s["reg"] === "string" ? s["reg"] : undefined, practice: s["practice"] === true || s["practice"] === "1" }),
  head: () => ({ meta: [{ title: "परीक्षा · Exam" }, { name: "robots", content: "noindex" }] }),
  component: AttemptPage,
});

type Q = { id: string; qtype: string; question: string; question_hi: string | null; image: string | null; marks: number; options: string[] };
type Paper = { attempt: string; deadline_at: string; duration_minutes: number; negative_mark: number; max_tab_switches: number; answers: Record<string, number[]>; tab_switches: number; questions: Q[]; practice: boolean };
type Result = { score: number; max_score: number; correct: number; wrong: number; skipped: number; review: { q: string; chosen: number[] | null; correct: number[]; got: number; marks: number; explanation: string | null }[] | null };

function AttemptPage() {
  const { slug } = Route.useParams();
  const { reg, practice } = Route.useSearch();
  const navigate = useNavigate();
  const { lang } = useLang();
  const hi = lang === "hi";
  const [paper, setPaper] = useState<Paper | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [cur, setCur] = useState(0);
  const [left, setLeft] = useState(0);
  const [tabs, setTabs] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = useRef(false);
  const submitting = useRef(false);

  useEffect(() => {
    if (!reg) { setErr(hi ? "पंजीयन नहीं चुना गया" : "No registration"); return; }
    supabase.rpc("ex_start", { p_registration: reg, p_practice: !!practice } as never).then(({ data, error }) => {
      if (error) { setErr(error.message); return; }
      const p = data as unknown as Paper; setPaper(p); setAnswers(p.answers ?? {}); setTabs(p.tab_switches ?? 0);
    });
  }, [reg, practice]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(auto = false) {
    if (!paper || submitting.current) return; submitting.current = true; setBusy(true);
    try {
      const { data, error } = await supabase.rpc("ex_submit", { p_attempt: paper.attempt, p_answers: answers, p_auto: auto } as never);
      if (error) throw error;
      setResult(data as unknown as Result);
      if (auto) toast(hi ? "समय समाप्त — उत्तर जमा हो गए" : "Time over — answers submitted");
    } catch (e) { toast.error((e as Error).message); submitting.current = false; } finally { setBusy(false); }
  }
  // countdown + autosave
  useEffect(() => {
    if (!paper || result) return;
    const tick = () => { const s = Math.max(0, Math.floor((new Date(paper.deadline_at).getTime() - Date.now()) / 1000)); setLeft(s); if (s === 0) void submit(true); };
    tick(); const t = setInterval(tick, 1000);
    const save = setInterval(() => { if (dirty.current) { dirty.current = false; void supabase.rpc("ex_save", { p_attempt: paper.attempt, p_answers: answers, p_tab_switches: tabs } as never); } }, 20000);
    return () => { clearInterval(t); clearInterval(save); };
  }, [paper, answers, tabs, result]); // eslint-disable-line react-hooks/exhaustive-deps
  // tab switches
  useEffect(() => {
    if (!paper || result || paper.practice) return;
    const onVis = () => { if (document.hidden) { setTabs((n) => { const v = n + 1; void supabase.rpc("ex_save", { p_attempt: paper.attempt, p_answers: answers, p_tab_switches: v } as never); if (v > paper.max_tab_switches) { toast.error(hi ? "अधिकतम टैब बदलाव पार — परीक्षा जमा की जा रही है" : "Tab-switch limit exceeded — submitting"); void submit(true); } else toast.warning(hi ? `चेतावनी: टैब बदला (${v}/${paper.max_tab_switches})` : `Warning: tab switched (${v}/${paper.max_tab_switches})`); return v; }); } };
    document.addEventListener("visibilitychange", onVis); return () => document.removeEventListener("visibilitychange", onVis);
  }, [paper, result, answers]); // eslint-disable-line react-hooks/exhaustive-deps
  // block accidental leave
  useEffect(() => { if (!paper || result) return; const h = (e: BeforeUnloadEvent) => { e.preventDefault(); }; window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h); }, [paper, result]);

  if (err) return <div className="container-page section-y"><p className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">{err}</p><Button asChild variant="outline" className="mt-3"><Link to="/exams/$slug" params={{ slug }}>{hi ? "वापस" : "Back"}</Link></Button></div>;
  if (!paper) return <div className="container-page section-y text-sm text-muted-foreground">{hi ? "प्रश्न-पत्र तैयार हो रहा है…" : "Preparing your paper…"}</div>;

  if (result) {
    return (
      <div className="container-page section-y mx-auto max-w-3xl space-y-4">
        <div className="surface-card p-6 text-center">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">{paper.practice ? (hi ? "अभ्यास परीक्षा" : "Practice") : (hi ? "परीक्षा जमा हो गई" : "Exam submitted")}</p>
          <p className="mt-2 font-display text-4xl font-semibold">{result.score} / {result.max_score}</p>
          <p className="mt-1 text-sm text-muted-foreground">✅ {result.correct} · ❌ {result.wrong} · ⏭ {result.skipped}</p>
          {!paper.practice ? <p className="mt-3 text-sm">{hi ? "परिणाम, रैंक और प्रमाण-पत्र घोषणा के बाद WhatsApp/ईमेल पर मिलेंगे।" : "Rank and certificate arrive on WhatsApp/email after results are declared."}</p> : null}
          <Button asChild className="mt-4"><Link to="/exams/$slug" params={{ slug }}>{hi ? "परीक्षा पेज पर जाएँ" : "Back to exam"}</Link></Button>
        </div>
        {result.review ? (
          <div className="space-y-3">
            <h2 className="font-display text-lg font-semibold">{hi ? "उत्तर व व्याख्या" : "Answers & explanations"}</h2>
            {paper.questions.map((q, i) => { const r = result.review!.find((x) => x.q === q.id); const ok = r && r.got > 0; return (
              <div key={q.id} className={`rounded-lg border p-3 text-sm ${ok ? "border-green-300 bg-green-50" : r?.chosen?.length ? "border-red-300 bg-red-50" : "border-border"}`}>
                <p className="font-medium">{i + 1}. {(hi && q.question_hi) || q.question}</p>
                <ul className="mt-1 space-y-0.5">{q.options.map((o, j) => <li key={j} className={`${r?.correct?.includes(j) ? "font-semibold text-green-800" : ""} ${r?.chosen?.includes(j) && !r?.correct?.includes(j) ? "line-through text-red-700" : ""}`}>{String.fromCharCode(65 + j)}. {o}</li>)}</ul>
                {r?.explanation ? <p className="mt-1 text-xs text-muted-foreground">{r.explanation}</p> : null}
              </div>
            ); })}
          </div>
        ) : null}
      </div>
    );
  }

  const q = paper.questions[cur]!;
  const mm = String(Math.floor(left / 60)).padStart(2, "0"), ss = String(left % 60).padStart(2, "0");
  const answered = paper.questions.filter((x) => answers[x.id]?.length).length;
  const choose = (j: number) => { setAnswers((a) => { const prev = a[q.id] ?? []; const next = q.qtype === "multi" ? (prev.includes(j) ? prev.filter((x) => x !== j) : [...prev, j]) : [j]; return { ...a, [q.id]: next }; }); dirty.current = true; };
  return (
    <div className="container-page py-4">
      <div className="sticky top-0 z-10 mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background p-3 text-sm shadow-sm">
        <span className={`font-mono text-lg font-semibold ${left < 120 ? "text-destructive" : ""}`}>⏱ {mm}:{ss}</span>
        <span className="text-muted-foreground">{hi ? "उत्तर दिए" : "Answered"}: {answered}/{paper.questions.length}</span>
        {!paper.practice ? <span className="text-muted-foreground">{hi ? "टैब" : "Tabs"}: {tabs}/{paper.max_tab_switches}</span> : null}
        <Button size="sm" className="ml-auto" onClick={() => { if (confirm(hi ? "उत्तर जमा करें? इसके बाद बदलाव नहीं होगा।" : "Submit answers? No changes after this.")) void submit(false); }} disabled={busy}>{hi ? "जमा करें" : "Submit"}</Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
        <div className="surface-card p-5">
          <p className="text-xs text-muted-foreground">{hi ? "प्रश्न" : "Question"} {cur + 1} / {paper.questions.length} · {q.marks} {hi ? "अंक" : "marks"}{paper.negative_mark ? ` · ${hi ? "गलत पर" : "wrong"} −${paper.negative_mark}` : ""}{q.qtype === "multi" ? ` · ${hi ? "एक से अधिक सही" : "multiple correct"}` : ""}</p>
          <p className="mt-2 text-lg font-medium leading-relaxed">{(hi && q.question_hi) || q.question}</p>
          {q.image ? <img src={q.image} alt="" className="mt-3 max-h-80 rounded-md" /> : null}
          <div className="mt-4 grid gap-2">
            {q.options.map((o, j) => { const on = (answers[q.id] ?? []).includes(j); return (
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
          <div className="grid grid-cols-5 gap-1.5 lg:grid-cols-4">{paper.questions.map((x, i) => <button key={x.id} type="button" onClick={() => setCur(i)} className={`h-9 rounded-md border text-sm ${i === cur ? "ring-2 ring-primary" : ""} ${answers[x.id]?.length ? "border-green-400 bg-green-100 text-green-900" : "border-border"}`}>{i + 1}</button>)}</div>
          <p className="mt-3 text-xs text-muted-foreground">{hi ? "उत्तर हर 20 सेकंड में अपने-आप सहेजे जाते हैं। समय पूरा होने पर अपने-आप जमा।" : "Answers autosave every 20 s; auto-submit at time-up."}</p>
        </aside>
      </div>
    </div>
  );
}
