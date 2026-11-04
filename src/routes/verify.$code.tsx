import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, XCircle } from "lucide-react";

import { PageHeader } from "@/components/site/PageHeader";
import { siteName } from "@/core/seo";
import { verifyDocument } from "@/lib/public.functions";

export const Route = createFileRoute("/verify/$code")({
  loader: ({ params }) => verifyDocument({ data: { code: params.code } }),
  head: ({ matches }) => ({
    meta: [
      { title: `Verify document — ${siteName(matches)}` },
      { name: "description", content: `Check whether a letter, certificate or receipt issued through ${siteName(matches)} is genuine.` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerifyDocument,
});

function VerifyDocument() {
  const row = Route.useLoaderData();
  return (
    <>
      <PageHeader title="Document verification" description="Scan result for a document QR code." crumbs={[{ label: "Verify" }]} />
      <section className="section-y">
        <div className="container-page max-w-xl">
          {row ? (
            <div className="surface-card p-6">
              <p className={`flex items-center gap-2 font-display text-lg font-semibold ${row.status === "issued" ? "text-emerald-700" : "text-red-700"}`}>
                {row.status === "issued" ? <BadgeCheck className="size-6" /> : <XCircle className="size-6" />}
                {row.status === "issued" ? "Genuine document" : "This document was cancelled"}
              </p>
              <dl className="mt-4 grid grid-cols-[140px_1fr] gap-y-2 text-sm">
                <dt className="text-muted-foreground">Issued by</dt><dd>{row.organization}</dd>
                <dt className="text-muted-foreground">Type</dt><dd className="capitalize">{row.kind.replace(/_/g, " ")}</dd>
                <dt className="text-muted-foreground">Reference</dt><dd className="font-mono">{row.ref_no}</dd>
                <dt className="text-muted-foreground">Date</dt><dd>{row.doc_date}</dd>
                <dt className="text-muted-foreground">Title</dt><dd>{row.title}</dd>
                {row.recipient_name ? <><dt className="text-muted-foreground">Issued to</dt><dd>{row.recipient_name}</dd></> : null}
                <dt className="text-muted-foreground">Issued on</dt><dd>{row.issued_at ? new Date(row.issued_at).toLocaleString("en-IN") : "—"}</dd>
              </dl>
            </div>
          ) : (
            <div className="surface-card p-6">
              <p className="flex items-center gap-2 font-display text-lg font-semibold text-red-700"><XCircle className="size-6" /> No document found for this code</p>
              <p className="mt-2 text-sm text-muted-foreground">The code may be mistyped, or the document was never issued. Contact the organization to confirm.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
