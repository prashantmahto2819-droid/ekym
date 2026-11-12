// Kalchuri One · exam-qgen: AI question writer for the level programme (प्रश्न-बैंक).
// Takes queued rows from ex_qgen_jobs (subject, level 1–5, class range, count), asks Google Gemini to write ORIGINAL
// bilingual MCQs (Hindi + English, 4 options), then asks the model a second time to solve them without the key and keeps
// only questions whose solved answer matches. Survivors are inserted into ex_questions as status 'draft' (source 'ai')
// for an admin to approve. Secrets: GEMINI_API_KEY (required), QGEN_MODEL (optional, default gemini-2.5-flash).
// Called by cron ex-qgen-tick every 5 min ({action:'tick'}) with header x-cron-secret, or by an admin ({action:'run'} + JWT).
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const SUBJECT: Record<string, string> = {
  math: "Mathematics", evs: "Environmental studies", hindi: "Hindi language and grammar (questions about Hindi)", english: "English language and grammar (questions about English)",
  gk: "General knowledge (India and world, stable facts only)", science: "General science", social_science: "Social science (history, geography, civics)",
  physics: "Physics", chemistry: "Chemistry", biology: "Biology", history: "Indian history", geography: "Geography of India and the world", polity: "Indian polity and constitution",
  economy: "Indian economy", quant: "Quantitative aptitude", reasoning: "Logical and verbal reasoning", computer: "Computer awareness", chhattisgarh: "Chhattisgarh general knowledge",
  pedagogy: "Child development and pedagogy", kalchuri: "History of the Kalachuri (Haihaya) dynasties — Mahishmati, Tripuri (Chedi), Ratnapura/Ratanpur (Chhattisgarh), Kalyani, Sarayupara — and Kalchuri community culture",
};
const LEVEL = ["", "Level 1 (Foundation): basic, direct recall", "Level 2 (Bronze): easy application", "Level 3 (Silver): moderate, two-step thinking", "Level 4 (Gold): hard, competitive-exam standard", "Level 5 (Expert): toughest, top-rank competitive standard"];

type Job = { id: string; organization_id: string; subject: string; topic: string | null; level: number; class_from: number | null; class_to: number | null; count: number; made: number; rejected: number };
type Q = { question_hi: string; question_en: string; options_hi: string[]; options_en: string[]; correct: number; explanation_hi?: string; explanation_en?: string; topic?: string };

async function gemini(key: string, model: string, prompt: string): Promise<unknown> {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { response_mime_type: "application/json", temperature: 0.7 } }),
  });
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = await r.json();
  const txt = j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  return JSON.parse(txt);
}

function writePrompt(job: Job, n: number, avoid: string[]) {
  const cls = job.class_from ? `Students of class ${job.class_from}${job.class_to && job.class_to !== job.class_from ? `–${job.class_to}` : ""} (Indian school syllabus, NCERT/CG board).` : "Adults preparing for Indian competitive exams (SSC, banking, railway, state PSC, entrance exams).";
  return `You write exam questions for an Indian community education portal.
Write ${n} ORIGINAL multiple-choice questions.
Subject: ${SUBJECT[job.subject] ?? job.subject}${job.topic ? `; topic: ${job.topic}` : ""}.
Audience: ${cls}
Difficulty: ${LEVEL[job.level]}.
Rules:
- Original wording only. Do not copy questions from coaching websites, books or past papers.
- Only well-established facts that will not change with time (no current affairs, no "current" office holders, no recent statistics).
- Exactly 4 options, exactly one correct; distractors plausible but clearly wrong.
- Give every question in pure Hindi (Devanagari, no English words except unavoidable symbols/formulae) AND in pure English.
- options_hi and options_en must be in the SAME order; "correct" is the 0-based index.
- explanation_hi: one short sentence in Hindi.
- For history of the Kalachuris use only facts supported by inscriptions/standard histories; if unsure about a fact, do not use it.
- Vary sub-topics; do not repeat these existing questions: ${avoid.slice(0, 40).join(" | ") || "(none)"}
Reply with a JSON array only: [{"question_hi":"","question_en":"","options_hi":["","","",""],"options_en":["","","",""],"correct":0,"explanation_hi":"","topic":""}]`;
}

function checkPrompt(qs: Q[]) {
  return `Solve these multiple-choice questions. For each, reply with the 0-based index of the single correct option, or -1 if the question is ambiguous, wrong, or has no/more than one correct option.
${qs.map((q, i) => `${i}. ${q.question_en}\n${q.options_en.map((o, k) => `   ${k}) ${o}`).join("\n")}`).join("\n")}
Reply with JSON only: {"answers":[...]} in the same order.`;
}

async function md5(s: string) {
  const d = await crypto.subtle.digest("MD5", new TextEncoder().encode(s)).catch(() => null);
  if (d) return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(h)].slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!, service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(url, service, { auth: { persistSession: false } });
  const body = await req.json().catch(() => ({}));

  // auth: cron secret or a signed-in exam manager
  const cronHdr = req.headers.get("x-cron-secret");
  if (cronHdr) {
    const { data: s } = await db.from("server_secrets").select("value").eq("key", "cron_secret").maybeSingle();
    if (!s || s.value !== cronHdr) return json({ error: "forbidden" }, 403);
  } else {
    const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const user = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data: ok } = await user.rpc("ex_can_manage", { p_org: body.org ?? null });
    if (ok !== true) return json({ error: "forbidden" }, 403);
  }

  const key = Deno.env.get("GEMINI_API_KEY");
  const model = Deno.env.get("QGEN_MODEL") || "gemini-2.5-flash";
  if (!key) {
    await db.from("ex_qgen_jobs").update({ status: "failed", error: "GEMINI_API_KEY सेट नहीं है — Supabase → Edge Functions → Secrets में जोड़ें", finished_at: new Date().toISOString() }).in("status", ["queued", "running"]);
    return json({ error: "no GEMINI_API_KEY" }, 200);
  }

  const started = Date.now();
  let processed = 0;
  while (Date.now() - started < 110_000) {
    const { data: jobs } = await db.from("ex_qgen_jobs").select("*").in("status", ["queued", "running"]).order("created_at").limit(1);
    const job = (jobs?.[0] ?? null) as Job | null;
    if (!job) break;
    await db.from("ex_qgen_jobs").update({ status: "running" }).eq("id", job.id);
    const need = job.count - job.made;
    if (need <= 0) { await db.from("ex_qgen_jobs").update({ status: "done", finished_at: new Date().toISOString() }).eq("id", job.id); continue; }
    try {
      const { data: existing } = await db.from("ex_questions").select("question").eq("subject", job.subject).eq("level", job.level).order("created_at", { ascending: false }).limit(40);
      const batch = Math.min(need, 15);
      const raw = await gemini(key, model, writePrompt(job, batch, (existing ?? []).map((e: { question: string }) => e.question)));
      const qs = (Array.isArray(raw) ? raw : []).filter((q: Q) =>
        q && typeof q.question_en === "string" && typeof q.question_hi === "string" && Array.isArray(q.options_en) && Array.isArray(q.options_hi) &&
        q.options_en.length === 4 && q.options_hi.length === 4 && Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4 &&
        new Set(q.options_en.map((o) => String(o).trim().toLowerCase())).size === 4) as Q[];
      let keep: Q[] = [];
      if (qs.length) {
        const chk = (await gemini(key, model, checkPrompt(qs))) as { answers?: number[] };
        keep = qs.filter((q, i) => chk?.answers?.[i] === q.correct);
      }
      let made = 0;
      for (const q of keep) {
        const qhash = await md5(`${job.subject}|${q.question_en.trim()}`);
        const { error } = await db.from("ex_questions").insert({
          organization_id: job.organization_id, subject: job.subject, topic: q.topic?.slice(0, 80) ?? job.topic, class_from: job.class_from, class_to: job.class_to,
          difficulty: job.level <= 2 ? "easy" : job.level === 3 ? "medium" : "hard", level: job.level, lang: "hi", qtype: "mcq",
          question: q.question_en.trim(), question_hi: q.question_hi.trim(), options: q.options_en.map(String), options_hi: q.options_hi.map(String), correct: [q.correct],
          explanation_hi: q.explanation_hi ?? null, explanation: q.explanation_en ?? null, status: "draft", source: "ai", qhash, ai_meta: { model, job: job.id, verified: true },
        });
        if (!error) made++;
      }
      const rejected = job.rejected + (batch - made);
      const totalMade = job.made + made;
      const done = totalMade >= job.count || (made === 0 && rejected > job.count * 3);
      await db.from("ex_qgen_jobs").update({ made: totalMade, rejected, status: done ? "done" : "running", error: done && totalMade < job.count ? "AI से पर्याप्त सही प्रश्न नहीं बने" : null, finished_at: done ? new Date().toISOString() : null }).eq("id", job.id);
      processed += made;
    } catch (e) {
      await db.from("ex_qgen_jobs").update({ status: "failed", error: String((e as Error).message ?? e).slice(0, 400), finished_at: new Date().toISOString() }).eq("id", job.id);
    }
  }
  return json({ ok: true, processed });
});
