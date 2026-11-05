// परीक्षा / प्रतियोगिता — list of platform-wide (Kalchuri One) and this organization's exams; my registrations for signed-in users.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/site/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLang } from "@/core/i18n";
import { pageMeta } from "@/core/seo";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/exams/")({
  head: ({ matches }) => pageMeta(matches, { en: "Exams & competitions", hi: "परीक्षा व प्रतियोगिताएँ" }, { en: "Online tests and competitions for students of the community — register, appear, see results and certificates.", hi: "समाज के विद्यार्थियों के लिए ऑनलाइन परीक्षा व प्रतियोगिताएँ — पंजीयन, परीक्षा, परिणाम और प्रमाण-पत्र।" }),
  component: ExamsPage,
});

export type ExamRow = { id: string; organization_id: string; org_name: string; slug: string; title: string; title_hi: string | null; summary: string | null; summary_hi: string | null; cover_image: string | null; kind: string; status: string; reg_opens_at: string | null; reg_closes_at: string | null; starts_at: string | null; ends_at: string | null; duration_minutes: number; registrations: number };
export type MyReg = { id: string; reg_no: string; exam_id: string; exam_slug: string; exam_title: string; exam_title_hi: string | null; exam_status: string; starts_at: string | null; ends_at: string | null; duration_minutes: number; category_name: string | null; student_name: string; status: string; attempted: boolean; score: number | null; max_score: number | null; percent: number | null; rank: number | null; result: string | null; cert_no: string | null; public_token: string };

export const STATUS_HI: Record<string, [string, string]> = { open: ["Registration open", "पंजीयन खुला"], running: ["Exam running", "परीक्षा चल रही है"], closed: ["Closed", "बंद"], results: ["Results out", "परिणाम घोषित"] };
export const dt = (iso: string | null | undefined, hi: boolean) => (iso ? new Date(iso).toLocaleString(hi ? "hi-IN" : "en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");

export function useExamList(org: string) {
  return useQuery({ queryKey: ["ex_list", org], queryFn: async () => { const { data, error } = await supabase.rpc("ex_list", { p_org: org } as never); if (error) throw error; return (data ?? []) as unknown as ExamRow[]; } });
}
export function useMyRegs(enabled: boolean) {
  return useQuery({ queryKey: ["ex_my"], enabled, queryFn: async () => { const { data, error } = await supabase.rpc("ex_my_registrations"); if (error) throw error; return (data ?? []) as unknown as MyReg[]; } });
}

function ExamsPage() {
  const tenant = useTenant();
  const { lang } = useLang();
  const hi = lang === "hi";
  const { user } = useAuth();
  const list = useExamList(tenant.organization_id);
  const mine = useMyRegs(!!user);
  return (
    <>
      <PageHeader title={hi ? "परीक्षा व प्रतियोगिताएँ" : "Exams & competitions"} description={hi ? "समाज के विद्यार्थियों के लिए — स्कूल/कॉलेज कोई भी हो। 18 वर्ष से कम आयु के विद्यार्थी अभिभावक के साथ पंजीयन करें।" : "For students of the community — any school or college. Students under 18 register with a parent/guardian."} crumbs={[{ label: hi ? "परीक्षा" : "Exams" }]} />
      <section className="section-y">
        <div className="container-page space-y-8">
          {user && mine.data?.length ? (
            <div className="surface-card p-4">
              <h2 className="font-display text-lg font-semibold">{hi ? "मेरे पंजीयन" : "My registrations"}</h2>
              <ul className="mt-2 divide-y divide-border text-sm">
                {mine.data.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 py-2">
                    <div className="min-w-0 flex-1"><p className="font-medium">{r.student_name} — {(hi && r.exam_title_hi) || r.exam_title}</p><p className="text-xs text-muted-foreground">{r.reg_no}{r.category_name ? ` · ${r.category_name}` : ""} · {dt(r.starts_at, hi)}</p></div>
                    {r.exam_status === "results" && r.rank ? <Badge>{hi ? `स्थान ${r.rank} · ${r.percent}%` : `Rank ${r.rank} · ${r.percent}%`}</Badge> : r.attempted ? <Badge variant="secondary">{hi ? "परीक्षा दी" : "Attempted"}</Badge> : null}
                    {r.exam_status === "results" ? <Button asChild size="sm" variant="outline"><Link to="/exams/$slug/result/$token" params={{ slug: r.exam_slug, token: r.public_token }}>{hi ? "परिणाम / प्रमाण-पत्र" : "Result / certificate"}</Link></Button>
                      : !r.attempted && (r.exam_status === "running" || r.exam_status === "open") ? <Button asChild size="sm"><Link to="/exams/$slug/attempt" params={{ slug: r.exam_slug }} search={{ reg: r.id }}>{hi ? "परीक्षा शुरू करें" : "Start exam"}</Link></Button> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(list.data ?? []).map((e) => (
              <Link key={e.id} to="/exams/$slug" params={{ slug: e.slug }} className="surface-card lift-on-hover overflow-hidden">
                {e.cover_image ? <img src={e.cover_image} alt="" className="aspect-[16/9] w-full object-cover" /> : <div className="gradient-teal grid aspect-[16/9] place-items-center text-5xl">📝</div>}
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2"><p className="text-xs uppercase tracking-wide text-primary">{e.org_name}</p><Badge variant={e.status === "running" ? "default" : "secondary"}>{(STATUS_HI[e.status] ?? ["", ""])[hi ? 1 : 0]}</Badge></div>
                  <h3 className="mt-1 font-display text-lg font-semibold leading-tight">{(hi && e.title_hi) || e.title}</h3>
                  {(hi && e.summary_hi) || e.summary ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{(hi && e.summary_hi) || e.summary}</p> : null}
                  <p className="mt-2 text-xs text-muted-foreground">{hi ? "परीक्षा" : "Exam"}: {dt(e.starts_at, hi)} · {e.duration_minutes} {hi ? "मिनट" : "min"} · {e.registrations} {hi ? "पंजीकृत" : "registered"}</p>
                </div>
              </Link>
            ))}
          </div>
          {list.isSuccess && !list.data.length ? <p className="text-muted-foreground">{hi ? "अभी कोई परीक्षा घोषित नहीं है।" : "No exam announced yet."}</p> : null}
        </div>
      </section>
    </>
  );
}
