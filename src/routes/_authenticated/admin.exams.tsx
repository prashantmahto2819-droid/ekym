// परीक्षा व प्रतियोगिता admin: exams (CrudPage) → selected exam: categories, paper pool (fill from the bank by filter),
// registrations (with attempts), results/ranks/certificates; question bank with CSV / JSON import.
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { CrudPage } from "@/components/admin/CrudPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/exams")({ component: Page });

type Exam = { id: string; slug: string; title: string; title_hi: string | null; status: string; starts_at: string | null; duration_minutes: number };
type Reg = { id: string; reg_no: string; student_name: string; class_level: string | null; school: string | null; city: string | null; is_minor: boolean; parent_name: string | null; parent_mobile: string | null; mobile: string | null; status: string; score: number | null; max_score: number | null; percent: number | null; rank: number | null; result: string | null; cert_no: string | null; category_id: string | null; created_at: string };

function Page() {
  const tenant = useTenant();
  const { isPlatformAdmin, can } = useAuth();
  const [exam, setExam] = useState<Exam | null>(null);
  const [tab, setTab] = useState<"exams" | "bank">("exams");
  if (!isPlatformAdmin && !can("exam.manage")) return <p className="text-sm text-muted-foreground">सिर्फ़ platform admin या exam.manage वाली भूमिका।</p>;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">परीक्षा व प्रतियोगिताएँ</h1>
        <p className="mt-1 text-sm text-muted-foreground">Kalchuri One पर बनी परीक्षा सभी संस्थाओं के विद्यार्थियों को दिखती है; संस्था की अपनी परीक्षा उसकी साइट पर। प्रश्न-बैंक → परीक्षा के प्रश्न-पूल में भरें → पंजीयन → परीक्षा → परिणाम/प्रमाण-पत्र।</p>
      </div>
      <div className="flex gap-2 text-sm">{(["exams", "bank"] as const).map((k) => <button key={k} type="button" className={`rounded-full px-3 py-1 ${tab === k ? "bg-primary text-primary-foreground" : "bg-secondary"}`} onClick={() => setTab(k)}>{k === "exams" ? "परीक्षाएँ" : "प्रश्न-बैंक"}</button>)}</div>
      {tab === "bank" ? <QuestionBank org={tenant.organization_id} /> : (
        <>
          <CrudPage
            table="ex_exams" title="परीक्षाएँ" description="पंक्ति पर क्लिक करके श्रेणियाँ, प्रश्न-पूल, पंजीयन और परिणाम देखें। status: draft → open (पंजीयन) → running (परीक्षा) → closed → results (compute results बटन से)।"
            orderBy="created_at" createdBy slugFrom="title"
            onRowClick={(r) => setExam(r as Exam)}
            defaults={{ status: "draft", duration_minutes: 30, languages: ["hi", "en"], organization_id: tenant.organization_id }}
            columns={[{ key: "title", label: "परीक्षा", render: (r) => r.title_hi || r.title }, { key: "status", label: "स्थिति" }, { key: "starts_at", label: "परीक्षा", render: (r) => (r.starts_at ? new Date(r.starts_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—") }, { key: "duration_minutes", label: "मिनट" }]}
            fields={[
              { key: "title", label: "Title (English)", required: true }, { key: "title_hi", label: "शीर्षक (हिंदी)" }, { key: "slug", label: "Slug", hint: "auto" },
              { key: "kind", label: "प्रकार", type: "select", options: [{ value: "competition", label: "प्रतियोगिता" }, { value: "practice", label: "अभ्यास" }] },
              { key: "status", label: "स्थिति", type: "select", options: ["draft", "open", "running", "closed", "results"] },
              { key: "reg_opens_at", label: "पंजीयन खुलेगा", type: "datetime" }, { key: "reg_closes_at", label: "पंजीयन बंद", type: "datetime" },
              { key: "starts_at", label: "परीक्षा शुरू", type: "datetime" }, { key: "ends_at", label: "परीक्षा समाप्त (window)", type: "datetime" },
              { key: "duration_minutes", label: "अवधि (मिनट)", type: "number" }, { key: "negative_mark", label: "ऋणात्मक अंक (गलत पर)", type: "number" },
              { key: "pass_percent", label: "उत्तीर्ण %", type: "number" }, { key: "winners", label: "मेरिट में कितने (प्रति श्रेणी)", type: "number" },
              { key: "max_tab_switches", label: "अधिकतम टैब बदलाव", type: "number" },
              { key: "shuffle", label: "विकल्प/प्रश्न shuffle", type: "checkbox" }, { key: "show_answers_after", label: "जमा करने के बाद उत्तर दिखाएँ", type: "checkbox" },
              { key: "cert_participation", label: "सहभागिता प्रमाण-पत्र", type: "checkbox" }, { key: "cert_merit", label: "मेरिट प्रमाण-पत्र", type: "checkbox" },
              { key: "cover_image", label: "कवर चित्र", type: "image" },
              { key: "summary", label: "सार (English)", type: "textarea", full: true }, { key: "summary_hi", label: "सार (हिंदी)", type: "textarea", full: true },
              { key: "rules", label: "नियम (English)", type: "markup", full: true }, { key: "rules_hi", label: "नियम (हिंदी)", type: "markup", full: true },
            ]}
          />
          {exam ? <ExamDetail exam={exam} onClose={() => setExam(null)} /> : <p className="text-sm text-muted-foreground">ऊपर किसी परीक्षा पर क्लिक करें।</p>}
        </>
      )}
    </div>
  );
}

function ExamDetail({ exam, onClose }: { exam: Exam; onClose: () => void }) {
  const qc = useQueryClient();
  const [fill, setFill] = useState({ category: "", subject: "", class_from: "", class_to: "", difficulty: "", lang: "", limit: "100", marks: "1" });
  const [busy, setBusy] = useState(false);
  const cats = useQuery({ queryKey: ["admin", "ex_categories", exam.id], queryFn: async () => { const { data } = await supabase.from("ex_categories").select("*").eq("exam_id", exam.id).order("display_order"); return (data ?? []) as { id: string; name: string; name_hi: string | null }[]; } });
  const pool = useQuery({ queryKey: ["ex_pool", exam.id], queryFn: async () => { const { data } = await supabase.from("ex_paper_questions").select("category_id").eq("exam_id", exam.id); const m: Record<string, number> = {}; (data ?? []).forEach((r: { category_id: string | null }) => { const k = r.category_id ?? "all"; m[k] = (m[k] ?? 0) + 1; }); return m; } });
  const regs = useQuery({ queryKey: ["ex_regs", exam.id], queryFn: async () => { const { data, error } = await supabase.from("ex_registrations").select("id,reg_no,student_name,class_level,school,city,is_minor,parent_name,parent_mobile,mobile,status,score,max_score,percent,rank,result,cert_no,category_id,created_at").eq("exam_id", exam.id).order("created_at", { ascending: false }).limit(1000); if (error) throw error; return (data ?? []) as Reg[]; } });
  async function doFill() {
    setBusy(true);
    try { const { data, error } = await supabase.rpc("ex_paper_fill", { p_exam: exam.id, p_category: fill.category || null, p_subject: fill.subject || null, p_class_from: fill.class_from ? Number(fill.class_from) : null, p_class_to: fill.class_to ? Number(fill.class_to) : null, p_difficulty: fill.difficulty || null, p_lang: fill.lang || null, p_limit: Number(fill.limit) || 100, p_marks: Number(fill.marks) || 1 } as never); if (error) throw error; toast.success(`${data} प्रश्न पूल में जुड़े`); qc.invalidateQueries({ queryKey: ["ex_pool", exam.id] }); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function clearPool(cat: string | null) {
    if (!confirm("इस श्रेणी का प्रश्न-पूल खाली करें?")) return;
    let q = supabase.from("ex_paper_questions").delete().eq("exam_id", exam.id); q = cat ? q.eq("category_id", cat) : q.is("category_id", null);
    const { error } = await q; if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["ex_pool", exam.id] });
  }
  async function results() {
    if (!confirm("परिणाम घोषित करें? रैंक, प्रमाण-पत्र क्रमांक बनेंगे और सभी विद्यार्थियों को WhatsApp/ईमेल जाएगा।")) return;
    setBusy(true);
    try { const { data, error } = await supabase.rpc("ex_compute_results", { p_exam: exam.id } as never); if (error) throw error; toast.success(`${data} परिणाम तैयार`); qc.invalidateQueries({ queryKey: ["ex_regs", exam.id] }); qc.invalidateQueries({ queryKey: ["admin", "ex_exams"] }); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function setStatus(r: Reg, status: string) { const { error } = await supabase.from("ex_registrations").update({ status } as never).eq("id", r.id); if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["ex_regs", exam.id] }); }
  const catName = (id: string | null) => { const c = cats.data?.find((x) => x.id === id); return c ? (c.name_hi || c.name) : "—"; };
  function exportCsv() {
    const rows = regs.data ?? []; const head = ["reg_no", "student_name", "category", "class", "school", "city", "mobile", "parent_name", "parent_mobile", "status", "score", "max_score", "percent", "rank", "result", "cert_no"];
    const csv = [head.join(","), ...rows.map((r) => [r.reg_no, r.student_name, catName(r.category_id), r.class_level, r.school, r.city, r.mobile, r.parent_name, r.parent_mobile, r.status, r.score, r.max_score, r.percent, r.rank, r.result, r.cert_no].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" })); a.download = `${exam.slug}-registrations.csv`; a.click();
  }
  return (
    <div className="space-y-6 rounded-lg border border-border p-4 sm:p-6">
      <div className="flex items-center justify-between"><h2 className="font-display text-xl font-semibold">{exam.title_hi || exam.title} <span className="text-sm font-normal text-muted-foreground">· {exam.status}</span></h2><Button size="sm" variant="ghost" onClick={onClose}>बंद</Button></div>
      <CrudPage key={exam.id} table="ex_categories" title="श्रेणियाँ / कक्षा-समूह" description="हर श्रेणी का अपना प्रश्न-पूल और अपनी मेरिट सूची। questions_per_paper = हर विद्यार्थी को पूल से इतने प्रश्न मिलेंगे (random)।" orderBy="display_order" ascending filter={{ exam_id: exam.id }}
        columns={[{ key: "name", label: "श्रेणी", render: (r) => r.name_hi || r.name }, { key: "class_from", label: "कक्षा से" }, { key: "class_to", label: "तक" }, { key: "questions_per_paper", label: "प्रश्न/पेपर" }, { key: "id", label: "पूल में प्रश्न", render: (r) => pool.data?.[r.id] ?? 0 }]}
        fields={[{ key: "name", label: "Name (English)", required: true }, { key: "name_hi", label: "नाम (हिंदी)" }, { key: "class_from", label: "कक्षा से", type: "number" }, { key: "class_to", label: "कक्षा तक", type: "number" }, { key: "questions_per_paper", label: "प्रश्न प्रति पेपर", type: "number", required: true }, { key: "display_order", label: "क्रम", type: "number" }]}
        extraActions={(r) => <Button size="sm" variant="ghost" onClick={() => clearPool(r.id)}>पूल खाली</Button>}
      />
      <div className="surface-card p-4 text-sm">
        <p className="font-semibold">प्रश्न-बैंक से पूल भरें</p>
        <p className="text-xs text-muted-foreground">फ़िल्टर के अनुसार random प्रश्न इस परीक्षा की चुनी श्रेणी के पूल में जुड़ते हैं (बैंक: इस संस्था + Kalchuri One का)। पूल में प्रश्न/पेपर से ज़्यादा प्रश्न रखें ताकि हर विद्यार्थी को अलग पेपर मिले। {pool.data?.["all"] ? `सभी श्रेणियों के साझा पूल में: ${pool.data["all"]}` : ""}</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-4">
          <select className="h-9 rounded-md border border-input bg-background px-2" value={fill.category} onChange={(e) => setFill({ ...fill, category: e.target.value })}><option value="">सभी श्रेणियों के लिए (साझा)</option>{(cats.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name_hi || c.name}</option>)}</select>
          <Input placeholder="विषय (जैसे गणित)" value={fill.subject} onChange={(e) => setFill({ ...fill, subject: e.target.value })} />
          <Input placeholder="कक्षा से" type="number" value={fill.class_from} onChange={(e) => setFill({ ...fill, class_from: e.target.value })} />
          <Input placeholder="कक्षा तक" type="number" value={fill.class_to} onChange={(e) => setFill({ ...fill, class_to: e.target.value })} />
          <select className="h-9 rounded-md border border-input bg-background px-2" value={fill.difficulty} onChange={(e) => setFill({ ...fill, difficulty: e.target.value })}><option value="">कोई भी कठिनाई</option><option value="easy">easy</option><option value="medium">medium</option><option value="hard">hard</option></select>
          <select className="h-9 rounded-md border border-input bg-background px-2" value={fill.lang} onChange={(e) => setFill({ ...fill, lang: e.target.value })}><option value="">कोई भी भाषा</option><option value="hi">हिंदी</option><option value="en">English</option></select>
          <Input placeholder="कितने (limit)" type="number" value={fill.limit} onChange={(e) => setFill({ ...fill, limit: e.target.value })} />
          <Input placeholder="अंक प्रति प्रश्न" type="number" value={fill.marks} onChange={(e) => setFill({ ...fill, marks: e.target.value })} />
        </div>
        <div className="mt-2 flex gap-2"><Button size="sm" onClick={doFill} disabled={busy}>पूल में जोड़ें</Button><Button size="sm" variant="ghost" onClick={() => clearPool(null)}>साझा पूल खाली</Button></div>
      </div>
      <div className="surface-card p-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">पंजीयन ({regs.data?.length ?? 0}) · परीक्षा दी: {(regs.data ?? []).filter((r) => r.percent != null).length}</p><div className="flex gap-2"><Button size="sm" variant="outline" onClick={exportCsv}>CSV</Button><Button size="sm" onClick={results} disabled={busy}>🏆 परिणाम घोषित करें</Button></div></div>
        <div className="mt-2 max-h-[60vh] overflow-auto">
          <table className="w-full text-xs"><thead className="text-left text-muted-foreground"><tr><th className="p-1">क्रमांक</th><th className="p-1">विद्यार्थी</th><th className="p-1">श्रेणी</th><th className="p-1">स्कूल / शहर</th><th className="p-1">संपर्क</th><th className="p-1">अंक</th><th className="p-1">रैंक</th><th className="p-1">प्रमाण-पत्र</th><th className="p-1"></th></tr></thead>
            <tbody>{(regs.data ?? []).map((r) => <tr key={r.id} className={`border-t border-border ${r.status !== "registered" ? "opacity-50" : ""}`}><td className="p-1">{r.reg_no}</td><td className="p-1 font-medium">{r.student_name}{r.is_minor ? " 🧒" : ""}<span className="block text-muted-foreground">{r.class_level ? `कक्षा ${r.class_level}` : ""}</span></td><td className="p-1">{catName(r.category_id)}</td><td className="p-1">{[r.school, r.city].filter(Boolean).join(", ")}</td><td className="p-1">{r.mobile}{r.parent_name ? <span className="block text-muted-foreground">{r.parent_name} · {r.parent_mobile}</span> : null}</td><td className="p-1">{r.percent != null ? `${r.score}/${r.max_score} (${r.percent}%)` : "—"}</td><td className="p-1">{r.rank ?? "—"} {r.result === "merit" ? "🏅" : ""}</td><td className="p-1">{r.cert_no ?? "—"}</td><td className="p-1">{r.status === "registered" ? <button type="button" className="text-destructive underline" onClick={() => setStatus(r, "disqualified")}>अयोग्य</button> : <button type="button" className="underline" onClick={() => setStatus(r, "registered")}>बहाल</button>}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">परीक्षा का सार्वजनिक पेज: <a className="underline" href={`/exams/${exam.slug}`} target="_blank" rel="noreferrer">/exams/{exam.slug}</a></p>
    </div>
  );
}

function QuestionBank({ org }: { org: string }) {
  const qc = useQueryClient();
  const [txt, setTxt] = useState("");
  const [busy, setBusy] = useState(false);
  function parse(): Record<string, unknown>[] {
    const t = txt.trim(); if (!t) return [];
    if (t.startsWith("[")) return JSON.parse(t);
    // CSV: subject,topic,class_from,class_to,difficulty,lang,question,optionA,optionB,optionC,optionD,correct(A/B/C/D or 1-4),explanation
    const lines = t.split(/\r?\n/).filter((l) => l.trim()); const out: Record<string, unknown>[] = [];
    const split = (l: string) => { const r: string[] = []; let cur = "", q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === "," && !q) { r.push(cur); cur = ""; } else cur += ch; } r.push(cur); return r.map((x) => x.trim()); };
    for (const l of lines) { const c = split(l); if (c[0]?.toLowerCase() === "subject") continue; const opts = [c[7], c[8], c[9], c[10]].filter((x) => x); const corrRaw = (c[11] ?? "A").toUpperCase(); const idx = /^[A-D]$/.test(corrRaw) ? corrRaw.charCodeAt(0) - 65 : Number(corrRaw) - 1; out.push({ subject: c[0], topic: c[1] || null, class_from: c[2] ? Number(c[2]) : null, class_to: c[3] ? Number(c[3]) : null, difficulty: c[4] || "medium", lang: c[5] || "hi", question: c[6], options: opts, correct: [Math.max(0, idx)], explanation: c[12] || null }); }
    return out;
  }
  async function imp() {
    setBusy(true);
    try { const rows = parse(); if (!rows.length) throw new Error("कुछ नहीं मिला"); const { data, error } = await supabase.rpc("ex_questions_import", { p_org: org, p_rows: rows } as never); if (error) throw error; toast.success(`${data} प्रश्न जुड़े`); setTxt(""); qc.invalidateQueries({ queryKey: ["admin", "ex_questions"] }); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-6">
      <div className="surface-card p-4 text-sm">
        <p className="font-semibold">बहुत से प्रश्न एक साथ जोड़ें (CSV या JSON)</p>
        <p className="text-xs text-muted-foreground">CSV कॉलम: subject, topic, class_from, class_to, difficulty(easy/medium/hard), lang(hi/en), question, optionA, optionB, optionC, optionD, correct(A/B/C/D), explanation। Excel से copy-paste चलेगा (comma वाले text को "…" में रखें)। JSON: [{"{"}subject, question, options[], correct[index]{"}"}]।</p>
        <Textarea className="mt-2 font-mono text-xs" rows={6} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={'गणित,भिन्न,6,8,easy,hi,"1/2 + 1/4 = ?",1/6,3/4,2/6,1/8,B,"समान हर बनाकर जोड़ें"'} />
        <Button size="sm" className="mt-2" onClick={imp} disabled={busy}>जोड़ें</Button>
      </div>
      <CrudPage table="ex_questions" title="प्रश्न-बैंक" description="विकल्प JSON array में (जैसे [\"3\",\"4\",\"5\"]) और correct में सही विकल्प का index (0 से; जैसे [1])। retired प्रश्न पेपर में नहीं आते।" orderBy="created_at" createdBy
        defaults={{ status: "active", difficulty: "medium", lang: "hi", qtype: "mcq", options: ["", "", "", ""], correct: [0] }}
        columns={[{ key: "subject", label: "विषय" }, { key: "question", label: "प्रश्न", render: (r) => <span className="line-clamp-1">{r.question_hi || r.question}</span> }, { key: "class_from", label: "कक्षा", render: (r) => (r.class_from ? `${r.class_from}–${r.class_to ?? r.class_from}` : "—") }, { key: "difficulty", label: "कठिनाई" }, { key: "lang", label: "भाषा" }, { key: "status", label: "स्थिति" }]}
        fields={[
          { key: "subject", label: "विषय", required: true }, { key: "topic", label: "टॉपिक" },
          { key: "class_from", label: "कक्षा से", type: "number" }, { key: "class_to", label: "कक्षा तक", type: "number" },
          { key: "difficulty", label: "कठिनाई", type: "select", options: ["easy", "medium", "hard"] }, { key: "lang", label: "भाषा", type: "select", options: ["hi", "en"] },
          { key: "qtype", label: "प्रकार", type: "select", options: [{ value: "mcq", label: "एक सही" }, { value: "multi", label: "एक से अधिक सही" }, { value: "truefalse", label: "सही/गलत" }] },
          { key: "question", label: "प्रश्न", type: "textarea", full: true, required: true }, { key: "question_hi", label: "प्रश्न (हिंदी, वैकल्पिक)", type: "textarea", full: true },
          { key: "image", label: "चित्र", type: "image" },
          { key: "options", label: "विकल्प (JSON array)", type: "json", full: true, hint: '["3","4","5","6"]' }, { key: "correct", label: "सही (JSON index array)", type: "json", hint: "[1]" },
          { key: "explanation", label: "व्याख्या", type: "textarea", full: true }, { key: "status", label: "स्थिति", type: "select", options: ["active", "draft", "retired"] },
        ]}
      />
    </div>
  );
}
