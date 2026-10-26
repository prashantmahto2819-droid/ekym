import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/site/PageHeader";
import { formatDate } from "@/lib/format";
import { verifyVolunteerReference } from "@/lib/volunteer-docs.functions";

export const Route = createFileRoute("/verify/volunteer/$ref")({
  loader: ({ params }) => verifyVolunteerReference({ data: { ref: params.ref } }),
  head: () => ({
    meta: [
      { title: "Verify volunteer ID — Ekatm Kalar Yuva Manch" },
      {
        name: "description",
        content:
          "Check whether a Ekatm Kalar Yuva Manch volunteer ID card or service certificate is genuine.",
      },
      { property: "og:title", content: "Verify a volunteer ID" },
      { property: "og:description", content: "Confirm a Ekatm Kalar Yuva Manch volunteer record." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: () => (
    <div className="container-page section-y">Could not check this reference right now.</div>
  ),
  notFoundComponent: () => <div className="container-page section-y">Reference not found.</div>,
  component: VerifyVolunteer,
});

function VerifyVolunteer() {
  const result = Route.useLoaderData();
  const { ref } = Route.useParams();

  return (
    <>
      <PageHeader
        title="Volunteer verification"
        description={`Reference ${ref}`}
        crumbs={[{ label: "Verify volunteer" }]}
      />
      <section className="section-y">
        <div className="container-page max-w-xl">
          {result.valid ? (
            <div className="surface-card border-success/40 bg-success/10 p-6">
              <h2 className="font-display text-xl font-semibold">Genuine volunteer record</h2>
              <dl className="mt-4 grid gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Name</dt>
                  <dd className="font-medium">{result.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Role</dt>
                  <dd className="font-medium">{result.designation}</dd>
                </div>
                {result.place ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Place</dt>
                    <dd className="font-medium">{result.place}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Volunteering since</dt>
                  <dd className="font-medium">{formatDate(result.since)}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="surface-card border-destructive/40 bg-destructive/10 p-6">
              <h2 className="font-display text-xl font-semibold">No approved record found</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This reference does not match an approved volunteer. Please contact the office.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
