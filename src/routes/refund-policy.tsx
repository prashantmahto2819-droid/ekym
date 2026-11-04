import { createFileRoute } from "@tanstack/react-router";
import { siteName } from "@/core/seo";

import { PageHeader } from "@/components/site/PageHeader";

export const Route = createFileRoute("/refund-policy")({
  head: ({ matches }) => ({
    meta: [
      { title: `Donation & refund policy — ${siteName(matches)}` },
      {
        name: "description",
        content:
          `How ${siteName(matches)} handles donations, receipts and refund requests for mistaken or duplicate contributions.`,
      },
      { property: "og:title", content: `Donation & refund policy — ${siteName(matches)}` },
      { property: "og:description", content: "Receipts, corrections and refund requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RefundPage,
});

function RefundPage() {
  return (
    <>
      <PageHeader title="Donation & refund policy" crumbs={[{ label: "Refund policy" }]} />
      <section className="section-y">
        <div className="container-page prose-content max-w-3xl">
          <h2>Donations</h2>
          <p>
            Donations are voluntary contributions used for the seva activities of the foundation. We
            record every contribution and issue a receipt on request.
          </p>
          <h2>Refunds</h2>
          <p>
            If you donated by mistake, sent a duplicate amount, or entered the wrong value, contact
            us within 7 days with the transaction details. Verified cases are refunded to the
            original payment method, usually within 10 working days.
          </p>
          <h2>Material donations</h2>
          <p>
            Donated material cannot be returned once collected and distributed. If items are
            unsuitable for distribution, we will tell you before collection.
          </p>
          <h2>Contact</h2>
          <p>
            For any donation question, reach us through the contact page and mention the date and
            amount of the contribution.
          </p>
        </div>
      </section>
    </>
  );
}
