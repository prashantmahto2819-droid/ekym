import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, XCircle } from "lucide-react";
import { siteName } from "@/core/seo";

import { PageHeader } from "@/components/site/PageHeader";
import { verifyReceiptCode } from "@/lib/donations.functions";
import { formatCurrency, formatDate } from "@/lib/format";

export const Route = createFileRoute("/verify/receipt/$code")({
  head: ({ matches }) => ({
    meta: [
      { title: `Verify donation receipt — ${siteName(matches)}` },
      {
        name: "description",
        content: `Check whether a ${siteName(matches)} donation receipt is genuine.`,
      },
      { property: "og:title", content: "Verify donation receipt" },
      { property: "og:description", content: `Receipt verification for ${siteName(matches)}.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerifyReceipt,
});

function VerifyReceipt() {
  const { code } = Route.useParams();
  const verify = useServerFn(verifyReceiptCode);
  const q = useQuery({
    queryKey: ["verify-receipt", code],
    queryFn: () => verify({ data: { code } }),
  });

  return (
    <>
      <PageHeader
        title="Receipt verification"
        description="Only the minimum details needed to confirm a receipt are shown here."
        crumbs={[{ label: "Verify receipt" }]}
      />
      <section className="section-y">
        <div className="container-page max-w-xl">
          {q.isLoading ? (
            <p className="text-sm text-muted-foreground">Checking…</p>
          ) : q.data?.valid ? (
            <div className="surface-card p-6">
              <p className="text-success flex items-center gap-2 font-medium">
                <BadgeCheck className="size-5" /> Genuine receipt
              </p>
              <dl className="mt-4 grid gap-2 text-sm">
                <Row label="Receipt number" value={q.data.receiptNumber} />
                <Row label="Issued on" value={formatDate(q.data.issuedOn)} />
                <Row label="Amount" value={formatCurrency(q.data.amount)} />
                <Row label="Donor" value={q.data.donorName} />
                <Row label="Purpose" value={q.data.purpose ?? "Donation"} />
                <Row label="Financial year" value={q.data.financialYear ?? "—"} />
                <Row label="Payment" value={q.data.paid ? "Confirmed" : "Not confirmed"} />
              </dl>
            </div>
          ) : (
            <div className="surface-card p-6">
              <p className="text-destructive flex items-center gap-2 font-medium">
                <XCircle className="size-5" /> No receipt found for this code
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Please check the code on the receipt, or contact the foundation office.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-1.5 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
