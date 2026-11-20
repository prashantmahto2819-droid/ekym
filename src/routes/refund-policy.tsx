import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/site/PageHeader";
import { useLang } from "@/core/i18n";
import { siteName } from "@/core/seo";
import { useTenant } from "@/core/tenant-context";

export const Route = createFileRoute("/refund-policy")({
  head: ({ matches }) => ({ meta: [{ title: `Refund policy — ${siteName(matches)}` }, { name: "description", content: `Refund policy for donations and fees paid to ${siteName(matches)}.` }] }),
  component: RefundPage,
});

function RefundPage() {
  const { lang } = useLang();
  const hi = lang === "hi";
  const tenant = useTenant();
  const name = (hi && tenant.name_hi) || tenant.name;
  return (
    <>
      <PageHeader title={hi ? "रिफ़ंड नीति" : "Refund policy"} crumbs={[{ label: hi ? "रिफ़ंड" : "Refund" }]} />
      <section className="section-y"><div className="container-page prose-content max-w-3xl">
        {hi ? (
          <>
            <p><b>{name}</b> को किया गया दान स्वैच्छिक है और सामान्यतः वापस नहीं होता। सदस्यता शुल्क, आयोजन/कार्यक्रम शुल्क भी, जब तक नीचे न लिखा हो, वापस नहीं होते।</p>
            <p className="text-sm text-muted-foreground">आख़िरी बदलाव: 20 नवंबर 2026</p>
            <h2>कब रिफ़ंड होता है</h2>
            <p>एक ही भुगतान दो बार कट जाए, राशि गलती से अधिक चली जाए, या भुगतान सफल हो पर रसीद न बने — ऐसे मामलों में 7 दिनों के भीतर संपर्क पेज से रसीद/लेन-देन संख्या के साथ लिखें। जाँच के बाद अतिरिक्त राशि उसी माध्यम से 7–10 कार्यदिवस में लौटाई जाती है।</p>
            <h2>आयोजन रद्द होने पर</h2>
            <p>संस्था द्वारा आयोजन/कार्यक्रम रद्द होने पर शुल्क पूरा वापस या अगले आयोजन में समायोजित किया जाएगा — संस्था की सूचना के अनुसार।</p>
            <h2>रसीद</h2>
            <p>हर भुगतान की रसीद WhatsApp/ईमेल पर मिलती है और वेबसाइट पर QR से सत्यापित की जा सकती है। 80G जैसी कर छूट संस्था के पंजीकरण पर निर्भर करती है — रसीद पर लिखी जानकारी देखें।</p>
          </>
        ) : (
          <>
            <p>Donations to <b>{name}</b> are voluntary and normally not refundable. Membership and event/programme fees are also non-refundable unless stated below.</p>
            <p className="text-sm text-muted-foreground">Last updated: 20 November 2026</p>
            <h2>When a refund is made</h2>
            <p>If the same payment is charged twice, an amount is paid by mistake, or a successful payment has no receipt, write through the contact page within 7 days with the receipt/transaction number. After verification the excess is returned to the same payment method within 7–10 working days.</p>
            <h2>Cancelled events</h2>
            <p>If the organization cancels an event or programme, the fee is refunded in full or adjusted against the next one, as the organization announces.</p>
            <h2>Receipts</h2>
            <p>Every payment gets a receipt on WhatsApp/email that can be verified by QR on the website. Tax exemptions such as 80G depend on the organization's registration — see the receipt.</p>
          </>
        )}
      </div></section>
    </>
  );
}
