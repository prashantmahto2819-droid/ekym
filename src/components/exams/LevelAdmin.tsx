// Admin → परीक्षा → "स्तर कार्यक्रम व AI": question-bank size per subject × level, automatic maths/reasoning questions,
// AI question jobs (Gemini via the exam-qgen function; output lands as drafts), draft review, and the programme list.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CrudPage } from "@/components/admin/CrudPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sb } from "@/components/exams/db";
import { supabase } from "@/integrations/supabase/client";

export const SUBJECTS: [string, string][] = [
  ["math", "गणित"], ["evs", "पर्यावरण अध्ययन"], ["hindi", "हिंदी"], ["english", "अंग्रेज़ी"], ["gk", "सामान्य ज्ञान"], ["science", "विज्ञान"],
  ["social_science", "सामाजिक विज्ञान"], ["physics", "भौतिकी"], ["chemistry", "रसायन"], ["biology", "जीव विज्ञान"], ["history", "इतिहास"],
  ["geography", "भूगोल"], ["polity", "राजव्यवस्था"], ["economy", "अर्थव्यवस्था"], ["quant", "संख्यात्मक अभियोग्यता"], ["reasoning", "तर्कशक्ति"],
  ["computer", "कंप्यूटर"], ["chhattisgarh", "छत्तीसगढ़ सामान्य ज्ञान"], ["pedagogy", "बाल विकास व शिक्षाशास्त्र"], ["kalchuri", "कलचुरि इतिहास व समाज"],
];
const SUBJ = Object.fromEntries(SUBJECTS);
const LEVEL_HI = ["", "प्रारंभिक", "कांस्य", "रजत", "स्वर्ण", "विशेषज्ञ"];
const JOB_HI: Record<string, string> = { queued: "कतार में", running: "चल रहा है", done: "पूरा", failed: "विफल" };

type Stat = { subject: string; level: number | null; status: string; source: string | null; n: number };
type Job = { id: string; subject: string; topic: string | null; level: number; class_from: number | null; class_to: number | null; count: number; status: string; made: number; rejected: number; error: string | null; created_at: string };
type Draft = { id: string; subject: string; level: number | null; question: string; question_hi: string | null; options: string[]; options_hi: string[] | null; correct: number[]; explanation_hi: string | null };

export function LevelAdmin({ org }: { org: string }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState({ subject: "kalchuri", level: "1", count: "30", class_from: "", class_to: "", topic: "" });
  const [sel, setSel] = useState<Set<string>>(new Set());

  const stats = useQuery({ queryKey: ["ex_bank_stats", org], queryFn: async () => { const { data, error } = await sb.rpc("ex_bank_stats", { p_org: org }); if (error) throw error; return (data ?? []) as unknown as Stat[]; } });
  const jobs = useQuery({ queryKey: ["ex_qgen_jobs", org], refetchInterval: 15000, queryFn: async () => { const { data, error } = await sb.from("ex_qgen_jobs").select("*").order("created_at", { ascending: false }).limit(30); if (error) throw error; return (data ?? []) as unknown as Job[]; } });
  const drafts = useQuery({ queryKey: ["ex_drafts", org], queryFn: async () => { const { data, error } = await sb.from("ex_questions").select("id,subject,level,question,question_hi,options,options_hi,correct,explanation_hi").eq("status", "draft").order("created_at", { ascending: false }).limit(60); if (error) throw error; return (data ?? []) as unknown as Draft[]; } });

  const table = useMemo(() => {
    const m: Record<string, { act: number[]; draft: number; ai: number }> = {};
    for (const r of stats.data ?? []) {
      const row = (m[r.subject] ??= { act: [0, 0, 0, 0, 0, 0], draft: 0, ai: 0 });
      if (r.status === "active") row.act[r.level ?? 0] = (row.act[r.level ?? 0] ?? 0) + r.n;
      if (r.status === "draft") row.draft += r.n;
      if (r.source === "ai") row.ai += r.n;
    }
    return Object.entries(m).sort((a, b) => (SUBJ[a[0]] ?? a[0]).localeCompare(SUBJ[b[0]] ?? b[0], "hi"));
  }, [stats.data]);
  const total = table.reduce((s, [, r]) => s + r.act.reduce((x, y) => x + y, 0), 0);

  const refresh = () => { void qc.invalidateQueries({ queryKey: ["ex_bank_stats", org] }); void qc.invalidateQueries({ queryKey: ["ex_drafts", org] }); void qc.invalidateQueries({ queryKey: ["ex_qgen_jobs", org] }); };

  async function genComputed() {
    if (!confirm("गणित व तर्कशक्ति के नए प्रश्न (सभी कक्षा-समूह और पाँचों स्तर) अपने-आप बनाएँ? पहले से मौजूद प्रश्न दोबारा नहीं बनेंगे।")) return;
    setBusy(true);
    try { const { data, error } = await sb.rpc("ex_gen_computed", { p_org: org, p_per: 20 }); if (error) throw error; toast.success(`${data as unknown as number} नए प्रश्न जुड़े`); refresh(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function enqueue() {
    setBusy(true);
    try {
      const { error } = await sb.rpc("ex_qgen_enqueue", { p_org: org, p_subject: job.subject, p_level: Number(job.level), p_count: Number(job.count) || 30, p_class_from: job.class_from ? Number(job.class_from) : null, p_class_to: job.class_to ? Number(job.class_to) : null, p_topic: job.topic || null });
      if (error) throw error;
      toast.success("काम कतार में जुड़ गया — हर 5 मिनट में अपने-आप चलता है");
      void supabase.functions.invoke("exam-qgen", { body: { action: "run", org } }).then(() => refresh());
      refresh();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function runNow() {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("exam-qgen", { body: { action: "run", org } });
    setBusy(false);
    if (error) toast.error(error.message);
    else if ((data as { error?: string })?.error) toast.error("AI कुंजी (GEMINI_API_KEY) सेट नहीं है — मालिक को सेटिंग करनी होगी");
    else toast.success(`${(data as { processed?: number })?.processed ?? 0} नए मसौदा प्रश्न बने`);
    refresh();
  }
  async function setStatus(ids: string[], status: "active" | "retired") {
    if (!ids.length) return;
    setBusy(true);
    try { const { data, error } = await sb.rpc("ex_questions_set_status", { p_org: org, p_ids: ids, p_status: status }); if (error) throw error; toast.success(`${data as unknown as number} प्रश्न ${status === "active" ? "मंज़ूर" : "हटाए"}`); setSel(new Set()); refresh(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="space-y-6">
      <div className="surface-card p-4 text-sm">
        <p className="text-muted-foreground">विद्यार्थी हर स्तर पर 30 प्रश्नों की परीक्षा देते हैं; हर प्रयास में प्रश्न-बैंक से नया प्रश्न-पत्र बनता है (पहले न देखे प्रश्न पहले)। इसलिए जितना बड़ा प्रश्न-बैंक, उतने अलग प्रश्न-पत्र। सार्वजनिक पेज: <a className="underline" href="/exams/levels" target="_blank" rel="noreferrer">/exams/levels</a></p>
      </div>

      {/* bank size */}
      <div className="surface-card p-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <p className="flex-1 font-semibold">प्रश्न-बैंक — सक्रिय प्रश्न: {total}</p>
          <Button size="sm" variant="outline" onClick={genComputed} disabled={busy}>🧮 गणित/तर्क के प्रश्न अपने-आप बनाएँ</Button>
        </div>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-xs">
            <thead className="text-left text-muted-foreground"><tr><th className="p-1">विषय</th>{[1, 2, 3, 4, 5].map((l) => <th key={l} className="p-1 text-right">{l} · {LEVEL_HI[l]}</th>)}<th className="p-1 text-right">कुल</th><th className="p-1 text-right">मसौदा</th></tr></thead>
            <tbody>{table.map(([s, r]) => { const sum = r.act.reduce((x, y) => x + y, 0); return (
              <tr key={s} className="border-t border-border"><td className="p-1 font-medium">{SUBJ[s] ?? s}</td>{[1, 2, 3, 4, 5].map((l) => <td key={l} className={`p-1 text-right ${(r.act[l] ?? 0) < 30 ? "text-amber-700" : ""}`}>{r.act[l] ?? 0}</td>)}<td className="p-1 text-right font-semibold">{sum}</td><td className="p-1 text-right">{r.draft || ""}</td></tr>
            ); })}</tbody>
          </table>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">पीले अंक = उस स्तर पर 30 से कम प्रश्न (प्रश्न-पत्र पास के स्तरों से पूरा होगा)। बिना स्तर वाले पुराने प्रश्न इस कार्यक्रम में नहीं आते।</p>
      </div>

      {/* AI generator */}
      <div className="surface-card p-4 text-sm">
        <p className="font-semibold">🤖 AI से नए प्रश्न बनवाएँ</p>
        <p className="text-xs text-muted-foreground">AI मौलिक प्रश्न हिंदी व अंग्रेज़ी दोनों में लिखता है, फिर दूसरी बार खुद हल करके जाँचता है — केवल सही निकले प्रश्न "मसौदा" बनकर नीचे समीक्षा के लिए आते हैं। मंज़ूरी के बाद ही परीक्षा में आते हैं।</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <select className="h-9 rounded-md border border-input bg-background px-2" value={job.subject} onChange={(e) => setJob({ ...job, subject: e.target.value })}>{SUBJECTS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <select className="h-9 rounded-md border border-input bg-background px-2" value={job.level} onChange={(e) => setJob({ ...job, level: e.target.value })}>{[1, 2, 3, 4, 5].map((l) => <option key={l} value={l}>स्तर {l} · {LEVEL_HI[l]}</option>)}</select>
          <Input type="number" placeholder="कितने प्रश्न" value={job.count} onChange={(e) => setJob({ ...job, count: e.target.value })} />
          <Input type="number" placeholder="कक्षा से (वैकल्पिक)" value={job.class_from} onChange={(e) => setJob({ ...job, class_from: e.target.value })} />
          <Input type="number" placeholder="कक्षा तक" value={job.class_to} onChange={(e) => setJob({ ...job, class_to: e.target.value })} />
          <Input placeholder="टॉपिक (वैकल्पिक)" value={job.topic} onChange={(e) => setJob({ ...job, topic: e.target.value })} />
        </div>
        <div className="mt-2 flex flex-wrap gap-2"><Button size="sm" onClick={enqueue} disabled={busy}>कतार में जोड़ें</Button><Button size="sm" variant="outline" onClick={runNow} disabled={busy}>अभी चलाएँ</Button></div>
        {(jobs.data ?? []).length ? (
          <ul className="mt-3 divide-y divide-border text-xs">
            {(jobs.data ?? []).map((j) => (
              <li key={j.id} className="flex flex-wrap items-center gap-2 py-1.5">
                <span className="flex-1">{SUBJ[j.subject] ?? j.subject} · स्तर {j.level}{j.class_from ? ` · कक्षा ${j.class_from}–${j.class_to ?? j.class_from}` : ""}{j.topic ? ` · ${j.topic}` : ""}</span>
                <span>{j.made}/{j.count} बने{j.rejected ? ` · ${j.rejected} छाँटे` : ""}</span>
                <span className={`rounded-full px-2 py-0.5 ${j.status === "failed" ? "bg-destructive/10 text-destructive" : j.status === "done" ? "bg-green-100 text-green-800" : "bg-secondary"}`}>{JOB_HI[j.status] ?? j.status}</span>
                {j.error ? <span className="w-full text-destructive">{j.error}</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* draft review */}
      <div className="surface-card p-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <p className="flex-1 font-semibold">मसौदा प्रश्नों की समीक्षा ({drafts.data?.length ?? 0})</p>
          <Button size="sm" variant="ghost" onClick={() => setSel(new Set((drafts.data ?? []).map((d) => d.id)))}>सभी चुनें</Button>
          <Button size="sm" onClick={() => setStatus([...sel], "active")} disabled={busy || !sel.size}>✓ चुने हुए मंज़ूर ({sel.size})</Button>
          <Button size="sm" variant="outline" onClick={() => setStatus([...sel], "retired")} disabled={busy || !sel.size}>✕ हटाएँ</Button>
        </div>
        {!drafts.data?.length ? <p className="mt-2 text-xs text-muted-foreground">अभी कोई मसौदा प्रश्न नहीं है।</p> : (
          <ul className="mt-2 space-y-2">
            {drafts.data.map((d) => {
              const o = d.options_hi ?? d.options;
              return (
                <li key={d.id} className={`rounded-md border p-2 ${sel.has(d.id) ? "border-primary bg-primary/5" : "border-border"}`}>
                  <label className="flex cursor-pointer gap-2">
                    <input type="checkbox" checked={sel.has(d.id)} onChange={() => toggle(d.id)} className="mt-1" />
                    <span className="min-w-0 flex-1">
                      <span className="text-xs text-muted-foreground">{SUBJ[d.subject] ?? d.subject} · स्तर {d.level ?? "—"}</span>
                      <span className="block font-medium">{d.question_hi || d.question}</span>
                      <span className="block text-xs text-muted-foreground">{d.question}</span>
                      <span className="mt-1 grid gap-x-4 sm:grid-cols-2">{o.map((x, i) => <span key={i} className={d.correct.includes(i) ? "font-semibold text-green-700" : ""}>{String.fromCharCode(65 + i)}. {x}{d.options_hi ? ` / ${d.options[i]}` : ""}</span>)}</span>
                      {d.explanation_hi ? <span className="block text-xs text-muted-foreground">{d.explanation_hi}</span> : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* programmes */}
      <CrudPage table="ex_tracks" title="कार्यक्रम (कक्षा / परीक्षा)" description="हर कार्यक्रम के पाँच स्तर होते हैं। विषय उन्हीं कुंजियों में लिखें जो प्रश्न-बैंक में हैं (जैसे math, gk, kalchuri)। 'कलचुरि इतिहास %' = हर प्रश्न-पत्र में कितने प्रतिशत प्रश्न कलचुरि इतिहास व समाज से आएँ।"
        orderBy="display_order" slugFrom="name"
        defaults={{ organization_id: org, status: "active", grp: "school", questions_per_paper: 30, duration_minutes: 30, pass_percent: 60, social_share: 10, strict_class: false, subjects: ["gk"] }}
        columns={[{ key: "name_hi", label: "कार्यक्रम", render: (r) => r.name_hi || r.name }, { key: "grp", label: "समूह", render: (r) => ({ school: "स्कूल", govt: "सरकारी नौकरी", entrance: "प्रवेश परीक्षा", social: "सामाजिक" } as Record<string, string>)[r.grp] ?? r.grp }, { key: "subjects", label: "विषय", render: (r) => (r.subjects ?? []).map((s: string) => SUBJ[s] ?? s).join(", ") }, { key: "social_share", label: "कलचुरि %" }, { key: "status", label: "स्थिति" }]}
        fields={[
          { key: "name_hi", label: "नाम (हिंदी में)", required: true }, { key: "name", label: "नाम (अंग्रेज़ी में)", required: true }, { key: "slug", label: "वेब पता (slug)", hint: "अपने-आप" },
          { key: "grp", label: "समूह", type: "select", options: [{ value: "school", label: "स्कूल — कक्षा-वार" }, { value: "govt", label: "सरकारी नौकरी परीक्षाएँ" }, { value: "entrance", label: "प्रवेश परीक्षाएँ" }, { value: "social", label: "सामाजिक — कलचुरि इतिहास" }] },
          { key: "class_from", label: "कक्षा से", type: "number" }, { key: "class_to", label: "कक्षा तक", type: "number" },
          { key: "strict_class", label: "केवल इन्हीं कक्षाओं के प्रश्न", type: "checkbox" },
          { key: "subjects", label: "विषय (JSON array)", type: "json", full: true, hint: '["math","science","gk"]' },
          { key: "social_share", label: "कलचुरि इतिहास % (0–50)", type: "number" }, { key: "questions_per_paper", label: "प्रश्न प्रति प्रश्न-पत्र", type: "number" },
          { key: "duration_minutes", label: "समय (मिनट)", type: "number" }, { key: "pass_percent", label: "उत्तीर्णांक %", type: "number" }, { key: "display_order", label: "क्रम", type: "number" },
          { key: "status", label: "स्थिति", type: "select", options: [{ value: "active", label: "सक्रिय" }, { value: "hidden", label: "छिपा" }] },
          { key: "description_hi", label: "विवरण (हिंदी में)", type: "textarea", full: true }, { key: "description", label: "विवरण (अंग्रेज़ी में)", type: "textarea", full: true },
        ]}
      />
    </div>
  );
}
