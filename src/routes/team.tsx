import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/site/PageHeader";
import { useLang } from "@/core/i18n";
import { siteName } from "@/core/seo";
import { getTeam } from "@/lib/public.functions";

export const Route = createFileRoute("/team")({
  loader: () => getTeam(),
  head: ({ matches }) => ({
    meta: [
      { title: `Our team — ${siteName(matches)}` },
      { name: "description", content: `Committees and office bearers of ${siteName(matches)}.` },
    ],
  }),
  component: TeamPage,
});

function TeamPage() {
  const initial = Route.useLoaderData();
  const { data } = useQuery({ queryKey: ["team"], queryFn: () => getTeam(), initialData: initial });
  const { lang, loc } = useLang();
  const hi = lang === "hi";

  return (
    <>
      <PageHeader title={hi ? "हमारी टीम" : "Our team"} description={hi ? "समितियाँ और पदाधिकारी" : "Committees and office bearers"} crumbs={[{ label: hi ? "टीम" : "Team" }]} />
      <section className="section-y">
        <div className="container-page space-y-12">
          {data.committees.length === 0 ? (
            <p className="text-muted-foreground">{hi ? "अभी कोई समिति प्रकाशित नहीं है।" : "No committee has been published yet."}</p>
          ) : null}
          {data.committees.map((c) => {
            const people = data.positions.filter((p) => p.committee_id === c.id);
            return (
              <div key={c.id}>
                <h2 className="font-display text-2xl font-semibold">{loc(c, "name")}</h2>
                {c.tenure_from || c.tenure_to ? (
                  <p className="text-sm text-muted-foreground">
                    {hi ? "कार्यकाल" : "Tenure"}: {c.tenure_from ?? "…"} – {c.tenure_to ?? "…"}
                  </p>
                ) : null}
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {people.map((p) => (
                    <div key={p.id} className="surface-card flex items-center gap-4 p-4">
                      {p.photo_path ? (
                        <img src={p.photo_path} alt="" className="size-16 rounded-full object-cover" />
                      ) : (
                        <div className="gradient-teal flex size-16 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-primary-foreground">
                          {p.person_name.slice(0, 1)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{loc(p, "person_name")}</p>
                        <p className="text-sm text-primary">{loc(p, "designation")}</p>
                        {p.city ? <p className="text-xs text-muted-foreground">{p.city}</p> : null}
                        {p.phone ? <p className="text-xs text-muted-foreground">{p.phone}</p> : null}
                      </div>
                    </div>
                  ))}
                  {people.length === 0 ? <p className="text-sm text-muted-foreground">—</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
