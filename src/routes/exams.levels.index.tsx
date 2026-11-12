// स्तर प्रमाण-पत्र कार्यक्रम — tracks grouped by school / government jobs / entrance / social, five levels each.
// Every attempt draws its own random 30-question paper from the bank (unseen questions first); passing a level
// unlocks the next one and issues a certificate.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award, CheckCircle2, Lock, PlayCircle } from "lucide-react";
import { useState } from "react";

import { LEVELS, type MyLevel, type Track, useTracks } from "@/components/exams/levels";
import { PageHeader } from "@/components/site/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLang } from "@/core/i18n";
import { pageMeta } from "@/core/seo";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import { sb } from "@/components/exams/db";

export const Route = createFileRoute("/exams/levels/")({
  head: ({ matches }) => pageMeta(matches, { en: "Level certificate programme", hi: "स्तर प्रमाण-पत्र कार्यक्रम" }, { en: "Five-level online tests for school classes, government job exams, entrance exams and Kalchuri history — pass each level to earn a certificate.", hi: "स्कूल कक्षाओं, सरकारी नौकरी, प्रवेश परीक्षाओं और कलचुरि इतिहास की पाँच स्तर वाली ऑनलाइन परीक्षाएँ — हर स्तर पास करने पर प्रमाण-पत्र।" }),
  component: LevelsPage,
});

const GROUPS: { id: string; hi: string; en: string; icon: string }[] = [
  { id: "school", hi: "स्कूल — कक्षा-वार", en: "School — by class", icon: "🎒" },
  { id: "govt", hi: "सरकारी नौकरी परीक्षाएँ", en: "Government job exams", icon: "🏛️" },
  { id: "entrance", hi: "प्रवेश परीक्षाएँ", en: "Entrance exams", icon: "🎓" },
  { id: "social", hi: "सामाजिक — कलचुरि इतिहास", en: "Community — Kalchuri history", icon: "🪔" },
];

function LevelsPage() {
  const tenant = useTenant();
  const { lang } = useLang();
  const hi = lang === "hi";
  const { user } = useAuth();
  const tracks = useTracks(tenant.organization_id);
  const mine = useQuery({ queryKey: ["ex_level_my"], enabled: !!user, queryFn: async () => { const { data, error } = await sb.rpc("ex_level_my"); if (error) throw error; return (data ?? []) as unknown as MyLevel[]; } });
  const [grp, setGrp] = useState("school");
  const list = (tracks.data ?? []).filter((t) => t.grp === grp);
  const certs = (mine.data ?? []).filter((a) => a.passed && a.token);

  return (
    <>
      <PageHeader title={hi ? "स्तर प्रमाण-पत्र कार्यक्रम" : "Level certificate programme"}
        description={hi ? "अपनी कक्षा या परीक्षा चुनें, स्तर 1 से शुरू करें। हर प्रश्न-पत्र में 30 प्रश्न, हर बार नया प्रश्न-पत्र। उत्तीर्ण होने पर प्रमाण-पत्र मिलेगा और अगला स्तर खुलेगा।" : "Pick your class or exam and start at level 1. Each paper has 30 questions and every attempt gets a fresh paper. Pass to earn a certificate and unlock the next level."}
        crumbs={[{ label: hi ? "परीक्षा" : "Exams", to: "/exams" }, { label: hi ? "स्तर कार्यक्रम" : "Level programme" }]} />
      <section className="section-y">
        <div className="container-page space-y-6">
          <div className="grid gap-3 sm:grid-cols-5">
            {LEVELS.map((l, i) => (
              <div key={l.en} className={`rounded-lg border p-3 text-center text-sm ${l.color}`}>
                <p className="text-xs opacity-70">{hi ? `स्तर ${i + 1}` : `Level ${i + 1}`}</p>
                <p className="font-display text-base font-semibold">{hi ? l.hi : l.en}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {GROUPS.map((g) => (
              <button key={g.id} type="button" onClick={() => setGrp(g.id)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm ${grp === g.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-secondary"}`}>
                {g.icon} {hi ? g.hi : g.en}
              </button>
            ))}
          </div>

          {!user ? (
            <div className="surface-card flex flex-wrap items-center gap-3 p-4 text-sm">
              <p className="flex-1">{hi ? "परीक्षा देने और प्रमाण-पत्र पाने के लिए लॉगिन करें।" : "Sign in to take tests and earn certificates."}</p>
              <Button asChild size="sm"><Link to="/auth" search={{ redirect: "/exams/levels" }}>{hi ? "लॉगिन / खाता बनाएँ" : "Sign in / sign up"}</Link></Button>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            {list.map((t) => <TrackCard key={t.id} t={t} hi={hi} signedIn={!!user} />)}
          </div>
          {tracks.isLoading ? <p className="text-sm text-muted-foreground">{hi ? "लोड हो रहा है…" : "Loading…"}</p> : null}
          {tracks.isSuccess && !list.length ? <p className="text-sm text-muted-foreground">{hi ? "इस श्रेणी में अभी कोई कार्यक्रम नहीं है।" : "No programme in this group yet."}</p> : null}

          {user && (mine.data?.length ?? 0) > 0 ? (
            <div className="surface-card p-4">
              <h2 className="font-display text-lg font-semibold">{hi ? "मेरे प्रयास व प्रमाण-पत्र" : "My attempts & certificates"}</h2>
              {certs.length ? <p className="mt-1 text-sm text-muted-foreground">{hi ? `${certs.length} प्रमाण-पत्र अर्जित` : `${certs.length} certificate(s) earned`}</p> : null}
              <ul className="mt-2 divide-y divide-border text-sm">
                {(mine.data ?? []).slice(0, 30).map((a) => {
                  const L = LEVELS[a.level - 1];
                  return (
                    <li key={a.id} className="flex flex-wrap items-center gap-2 py-2">
                      <span className="min-w-0 flex-1"><b>{(hi && a.track_hi) || a.track}</b> · {hi ? `स्तर ${a.level}` : `Level ${a.level}`} ({L ? (hi ? L.hi : L.en) : ""}) · {hi ? "प्रश्न-पत्र" : "Paper"} {a.paper_no}</span>
                      {a.submitted_at ? <Badge variant={a.passed ? "default" : "secondary"}>{a.percent}% · {a.passed ? (hi ? "उत्तीर्ण" : "Passed") : (hi ? "अनुत्तीर्ण" : "Not passed")}</Badge> : <Badge variant="outline">{hi ? "अधूरा" : "In progress"}</Badge>}
                      {a.passed && a.token ? <Button asChild size="sm" variant="outline"><Link to="/exams/levels/cert/$token" params={{ token: a.token }}><Award className="size-4" /> {hi ? "प्रमाण-पत्र" : "Certificate"}</Link></Button> : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <p className="text-xs text-muted-foreground">{hi ? "प्रश्न हमारे विषय-विशेषज्ञों द्वारा मौलिक रूप से लिखे गए हैं; नए प्रश्न लगातार जुड़ते रहते हैं। सामान्य कार्यक्रमों में कुछ प्रश्न कलचुरि इतिहास व समाज से भी आते हैं।" : "Questions are written originally for this programme and new ones are added regularly. General programmes also include a few questions on Kalchuri history and the community."}</p>
        </div>
      </section>
    </>
  );
}

function TrackCard({ t, hi, signedIn }: { t: Track; hi: boolean; signedIn: boolean }) {
  const cls = t.class_from ? (hi ? `कक्षा ${t.class_from}${t.class_to && t.class_to !== t.class_from ? `–${t.class_to}` : ""}` : `Class ${t.class_from}${t.class_to && t.class_to !== t.class_from ? `–${t.class_to}` : ""}`) : null;
  const total = Object.values(t.bank ?? {}).reduce((s, n) => s + n, 0);
  return (
    <div className="surface-card p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-semibold leading-tight">{(hi && t.name_hi) || t.name}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{[cls, `${t.questions_per_paper} ${hi ? "प्रश्न" : "questions"}`, `${t.duration_minutes} ${hi ? "मिनट" : "min"}`, `${hi ? "उत्तीर्णांक" : "pass"} ${t.pass_percent}%`].filter(Boolean).join(" · ")}</p>
          {(hi && t.description_hi) || t.description ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{(hi && t.description_hi) || t.description}</p> : null}
        </div>
        {t.passed_level > 0 ? <Badge className="shrink-0">🏅 {hi ? `स्तर ${t.passed_level}` : `Level ${t.passed_level}`}</Badge> : null}
      </div>
      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {LEVELS.map((l, i) => {
          const lv = i + 1;
          const done = t.passed_level >= lv;
          const open = lv <= t.passed_level + 1;
          const inner = (
            <>
              {done ? <CheckCircle2 className="size-4" /> : open ? <PlayCircle className="size-4" /> : <Lock className="size-4 opacity-50" />}
              <span className="text-[11px] font-semibold leading-tight">{hi ? l.hi : l.en}</span>
            </>
          );
          const cls2 = `flex flex-col items-center gap-0.5 rounded-md border px-1 py-2 text-center ${open ? l.color : "border-border bg-muted/40 text-muted-foreground"}`;
          return signedIn && open ? (
            <Link key={lv} to="/exams/levels/$track" params={{ track: t.slug }} search={{ level: lv }} className={`${cls2} transition hover:shadow`} title={hi ? `स्तर ${lv} शुरू करें` : `Start level ${lv}`}>{inner}</Link>
          ) : <div key={lv} className={cls2}>{inner}</div>;
        })}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">{hi ? `प्रश्न-बैंक: ${total} प्रश्न` : `Question bank: ${total} questions`}{t.social_share > 0 && t.grp !== "social" ? ` · ${hi ? `लगभग ${t.social_share}% प्रश्न कलचुरि इतिहास से` : `about ${t.social_share}% from Kalchuri history`}` : ""}</p>
    </div>
  );
}
