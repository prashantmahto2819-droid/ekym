import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Download } from "lucide-react";
import { pageMeta } from "@/core/seo";

import { Field } from "@/components/site/Field";
import { PageHeader } from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { donationStatus } from "@/lib/donations.functions";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { useFt } from "@/core/formText";

export const Route = createFileRoute("/donation-status")({
  head: ({ matches }) => pageMeta(matches, { en: "Donation status", hi: "दान की स्थिति" }, { en: "Look up a donation by its ID and download the receipt.", hi: "दान ID से दान खोजें और रसीद डाउनलोड करें।" }, [{ name: "robots", content: "noindex" }]),
  component: DonationStatusPage,
});

function DonationStatusPage() {
  const t = useFt();
  const [id, setId] = useState("");
  const lookup = useServerFn(donationStatus);
  const m = useMutation({
    mutationFn: (donationId: string) => lookup({ data: { donationId } }),
  });

  return (
    <>
      <PageHeader
        title={t("Donation status")}
        description={t("Enter the donation ID you received to see the payment status and download your receipt.")}
        crumbs={[{ label: "Donation status" }]}
      />
      <section className="section-y">
        <div className="container-page max-w-xl">
          <form
            className="surface-card flex flex-col gap-4 p-6 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              if (id.trim()) m.mutate(id.trim());
            }}
          >
            <Field label={t("Donation ID")} className="flex-1" required>
              <Input
                placeholder="DON-2026-000123"
                value={id}
                onChange={(e) => setId(e.target.value)}
              />
            </Field>
            <Button type="submit" disabled={m.isPending}>
              {m.isPending ? "Checking…" : "Check"}
            </Button>
          </form>

          {m.isSuccess ? (
            m.data ? (
              <div className="surface-card mt-6 p-6">
                <p className="font-display text-xl font-semibold">
                  {formatCurrency(m.data.amount)} — {m.data.status}
                </p>
                <dl className="mt-4 grid gap-2 text-sm">
                  <Row label={t("Donation ID")} value={m.data.donationId} />
                  <Row label={t("Donor")} value={m.data.donorName} />
                  <Row label={t("Purpose")} value={m.data.purpose ?? "Donation"} />
                  <Row label={t("Paid at")} value={formatDateTime(m.data.paidAt) || "—"} />
                  <Row label={t("Receipt number")} value={m.data.receiptNumber ?? "—"} />
                </dl>
                {m.data.receiptUrl ? (
                  <Button asChild className="mt-5">
                    <a href={m.data.receiptUrl} target="_blank" rel="noreferrer">
                      <Download className="size-4" /> {t("Download receipt")}
                    </a>
                  </Button>
                ) : null}
              </div>
            ) : (
              <p className="mt-6 text-sm text-muted-foreground">
                {t("No donation found with that ID. Please check and try again.")}
              </p>
            )
          ) : null}
          {m.isError ? (
            <p className="mt-6 text-sm text-destructive">
              {m.error instanceof Error ? m.error.message : t("Something went wrong")}
            </p>
          ) : null}
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
