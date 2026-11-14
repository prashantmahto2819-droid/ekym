// हमारी टीम — committee chips, search, the top post-holder of each committee as a wide card, call / WhatsApp / e-mail
// buttons, and a profile popup with the full introduction.
import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, MessageCircle, Phone, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLang } from "@/core/i18n";
import { pageMeta } from "@/core/seo";
import { getTeam } from "@/lib/public.functions";
import { telHref, whatsappHref } from "@/lib/format";

export const Route = createFileRoute("/team")({
  loader: () => getTeam(),
  head: ({ matches }) => pageMeta(matches, { en: "Our team", hi: "हमारी टीम" }, { en: "Committees and office bearers.", hi: "समितियाँ और पदाधिकारी।" }),
  component: TeamPage,
});

type Pos = { id: string; committee_id: string; person_name: string; person_name_hi: string | null; designation: string; designation_hi: string | null; rank: number; phone: string | null; photo_path: string | null; city: string | null; about?: string | null; about_hi?: string | null; email?: string | null };

function TeamPage() {
  const data = Route.useLoaderData();
  const { lang, loc } = useLang();
  const hi = lang === "hi";
  const [tab, setTab] = useState<string>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Pos | null>(null);
  const positions = data.positions as Pos[];
  const committees = data.committees.filter((c) => positions.some((p) => p.committee_id === c.id));
  const k = q.trim().toLowerCase();
  const match = useMemo(() => (p: Pos) => !k || [p.person_name, p.person_name_hi, p.designation, p.designation_hi, p.city].some((x) => (x ?? "").toLowerCase().includes(k)), [k]);
  const shown = committees.filter((c) => tab === "all" || c.id === tab);
  const total = positions.length;

  return (
    <>
      <PageHeader title={hi ? "हमारी टीम" : "Our team"} description={hi ? `${committees.length} समितियाँ · ${total} पदाधिकारी` : `${committees.length} committees · ${total} office bearers`} crumbs={[{ label: hi ? "टीम" : "Team" }]} />
      <section className="section-y">
        <div className="container-page">
          {committees.length === 0 ? <p className="text-muted-foreground">{hi ? "अभी कोई समिति प्रकाशित नहीं है।" : "No committee has been published yet."}</p> : (
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="-mx-1 flex flex-1 gap-2 overflow-x-auto px-1 pb-1">
                <TabBtn active={tab === "all"} onClick={() => setTab("all")} label={hi ? "सभी" : "All"} n={total} />
                {committees.map((c) => <TabBtn key={c.id} active={tab === c.id} onClick={() => setTab(c.id)} label={loc(c, "name")} n={positions.filter((p) => p.committee_id === c.id).length} />)}
              </div>
              <div className="relative sm:w-64"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={hi ? "नाम, पद या शहर खोजें" : "Search name, post or city"} className="rounded-full pl-9" /></div>
            </div>
          )}
          <div className="space-y-12">
            {shown.map((c) => {
              const people = positions.filter((p) => p.committee_id === c.id).sort((a, b) => a.rank - b.rank).filter(match);
              if (!people.length) return k ? null : (
                <div key={c.id}><h2 className="font-display text-2xl font-semibold">{loc(c, "name")}</h2><p className="mt-2 text-sm text-muted-foreground">—</p></div>
              );
              const [lead, ...rest] = people;
              return (
                <div key={c.id}>
                  <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 className="font-display text-2xl font-semibold">{loc(c, "name")}</h2>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground"><Users className="size-4" /> {people.length}</span>
                    {c.tenure_from || c.tenure_to ? <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">{hi ? "कार्यकाल" : "Tenure"}: {c.tenure_from ?? "…"} – {c.tenure_to ?? "…"}</span> : null}
                  </div>
                  {lead && !k ? <LeadCard p={lead} hi={hi} loc={loc} onOpen={() => setOpen(lead)} /> : null}
                  <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${lead && !k ? "mt-4" : ""}`}>
                    {(k ? people : rest).map((p) => <PersonCard key={p.id} p={p} hi={hi} loc={loc} onOpen={() => setOpen(p)} />)}
                  </div>
                </div>
              );
            })}
            {k && !shown.some((c) => positions.some((p) => p.committee_id === c.id && match(p))) ? <p className="text-center text-sm text-muted-foreground">{hi ? "कोई नहीं मिला।" : "No one found."}</p> : null}
          </div>
        </div>
      </section>
      <Dialog open={!!open} onOpenChange={(o) => { if (!o) setOpen(null); }}>
        <DialogContent className="max-w-md">
          {open ? <>
            <div className="flex flex-col items-center gap-3 text-center">
              <Photo p={open} size="size-32" />
              <div>
                <DialogTitle className="font-display text-2xl">{loc(open, "person_name")}</DialogTitle>
                <p className="font-medium text-primary">{loc(open, "designation")}</p>
                <p className="text-sm text-muted-foreground">{loc(data.committees.find((c) => c.id === open.committee_id) ?? null, "name")}</p>
                {open.city ? <p className="mt-1 flex items-center justify-center gap-1 text-sm text-muted-foreground"><MapPin className="size-3.5" /> {open.city}</p> : null}
              </div>
            </div>
            {(hi && open.about_hi) || open.about ? <p className="whitespace-pre-line text-sm leading-relaxed">{(hi && open.about_hi) || open.about}</p> : null}
            <Contacts p={open} hi={hi} full />
          </> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

type Loc = <T extends Record<string, unknown>>(row: T | null | undefined, field: string) => string;

function TabBtn({ active, onClick, label, n }: { active: boolean; onClick: () => void; label: string; n: number }) {
  return <button type="button" onClick={onClick} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-secondary"}`}>{label} <span className={active ? "opacity-80" : "text-muted-foreground"}>{n}</span></button>;
}

function Photo({ p, size }: { p: Pos; size: string }) {
  return p.photo_path
    ? <img src={p.photo_path} alt="" loading="lazy" className={`${size} shrink-0 rounded-full object-cover ring-4 ring-primary/10`} />
    : <div className={`gradient-teal ${size} grid shrink-0 place-items-center rounded-full text-3xl font-semibold text-primary-foreground`}>{p.person_name.slice(0, 1)}</div>;
}

function Contacts({ p, hi, full, start }: { p: Pos; hi: boolean; full?: boolean; start?: boolean }) {
  if (!p.phone && !p.email) return null;
  const sz = full ? "sm" : "icon";
  return (
    <div className={`flex flex-wrap justify-center gap-2 ${start ? "sm:justify-start" : ""} ${full ? "" : "mt-1"}`} onClick={(e) => e.stopPropagation()}>
      {p.phone ? <Button asChild size={sz} variant="outline" className={full ? "" : "size-9 rounded-full"} title={hi ? "कॉल करें" : "Call"}><a href={telHref(p.phone)}><Phone className="size-4" />{full ? (hi ? " कॉल" : " Call") : null}</a></Button> : null}
      {p.phone ? <Button asChild size={sz} variant="outline" className={`${full ? "" : "size-9 rounded-full"} text-[#128C7E]`} title="WhatsApp"><a href={whatsappHref(p.phone, hi ? "नमस्ते," : "Hello,")} target="_blank" rel="noreferrer"><MessageCircle className="size-4" />{full ? " WhatsApp" : null}</a></Button> : null}
      {p.email ? <Button asChild size={sz} variant="outline" className={full ? "" : "size-9 rounded-full"} title={hi ? "ईमेल" : "E-mail"}><a href={`mailto:${p.email}`}><Mail className="size-4" />{full ? (hi ? " ईमेल" : " E-mail") : null}</a></Button> : null}
    </div>
  );
}

function LeadCard({ p, hi, loc, onOpen }: { p: Pos; hi: boolean; loc: Loc; onOpen: () => void }) {
  const about = (hi && p.about_hi) || p.about;
  return (
    <div role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => { if (e.key === "Enter") onOpen(); }} className="surface-card flex cursor-pointer flex-col items-center gap-5 bg-gradient-to-br from-primary/5 to-amber-100/40 p-6 text-center transition hover:shadow-md sm:flex-row sm:text-left dark:to-amber-950/20">
      <Photo p={p} size="size-32" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{loc(p, "designation")}</p>
        <p className="font-display text-2xl font-semibold leading-tight">{loc(p, "person_name")}</p>
        {p.city ? <p className="mt-0.5 flex items-center justify-center gap-1 text-sm text-muted-foreground sm:justify-start"><MapPin className="size-3.5" /> {p.city}</p> : null}
        {about ? <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{about}</p> : null}
        <div className="mt-3"><Contacts p={p} hi={hi} start /></div>
      </div>
    </div>
  );
}

function PersonCard({ p, hi, loc, onOpen }: { p: Pos; hi: boolean; loc: Loc; onOpen: () => void }) {
  const about = (hi && p.about_hi) || p.about;
  return (
    <div role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => { if (e.key === "Enter") onOpen(); }} className="surface-card flex cursor-pointer flex-col items-center gap-3 p-5 text-center transition hover:-translate-y-0.5 hover:shadow-md">
      <Photo p={p} size="size-24" />
      <div className="w-full min-w-0">
        <p className="font-display text-lg font-semibold leading-tight">{loc(p, "person_name")}</p>
        <p className="text-sm font-medium text-primary">{loc(p, "designation")}</p>
        {p.city ? <p className="text-xs text-muted-foreground">{p.city}</p> : null}
        {about ? <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{about}</p> : null}
      </div>
      <Contacts p={p} hi={hi} />
    </div>
  );
}
