import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/site/PageHeader";
import { useLang } from "@/core/i18n";
import { siteName } from "@/core/seo";
import { useTenant } from "@/core/tenant-context";

export const Route = createFileRoute("/terms")({
  head: ({ matches }) => ({ meta: [{ title: `Terms of use — ${siteName(matches)}` }, { name: "description", content: `Terms of use of ${siteName(matches)} on the Kalchuri One platform.` }] }),
  component: TermsPage,
});

function TermsPage() {
  const { lang } = useLang();
  const hi = lang === "hi";
  const tenant = useTenant();
  const name = (hi && tenant.name_hi) || tenant.name;
  return (
    <>
      <PageHeader title={hi ? "उपयोग की शर्तें" : "Terms of use"} crumbs={[{ label: hi ? "शर्तें" : "Terms" }]} />
      <section className="section-y"><div className="container-page prose-content max-w-3xl">
        {hi ? (
          <>
            <h2>मंच</h2><p>यह वेबसाइट <b>{name}</b> की है और <b>Kalchuri One</b> मंच पर चलती है। Kalchuri One समाज की समितियों/संस्थाओं को वेबसाइट, सदस्य, वंश वृक्ष, पत्राचार, आयोजन और लेखा की सुविधा देता है; हर संस्था अपनी सामग्री और सदस्यों के लिए स्वयं ज़िम्मेदार है।</p>
            <h2>खाता और सदस्यता</h2><p>लॉगिन मोबाइल (WhatsApp OTP) या ईमेल से होता है; एक व्यक्ति एक ही खाता रखे। सदस्यता आवेदन संबंधित संस्था का एडमिन (या मंच का एडमिन) स्वीकृत/अस्वीकृत करता है; गलत जानकारी पर सदस्यता रद्द हो सकती है।</p>
            <h2>सामग्री और आचरण</h2><p>Kalchuri One feed, टिप्पणियाँ, directory, वैवाहिक परिचय आदि में आप जो डालते हैं उसकी ज़िम्मेदारी आपकी है। विज्ञापन/व्यापारिक या चुनावी प्रचार, अपमानजनक, भ्रामक या किसी की निजता भंग करने वाली सामग्री की पहुँच सीमित की जा सकती है या उसे हटाया जा सकता है; बार-बार उल्लंघन पर खाता बंद हो सकता है। paid विज्ञापन सिर्फ़ "प्रायोजित" सेक्शन में, संस्था की अनुमति से।</p>
            <h2>वंश वृक्ष और शोक संदेश</h2><p>वंश वृक्ष में दूसरों के नाम/नंबर जोड़ते समय उनकी सहमति आपकी ज़िम्मेदारी है। शोक संदेश संस्था के एडमिन की मंज़ूरी के बाद ही भेजे जाते हैं।</p>
            <h2>दान और भुगतान</h2><p>जहाँ दान चालू हो, वह संबंधित संस्था को जाता है और रसीद उसी के नाम से बनती है; रिफ़ंड नीति अलग पेज पर है।</p>
            <h2>सीमाएँ</h2><p>सेवा "जैसी है" उपलब्ध है; तकनीकी कारणों से कभी बाधित हो सकती है। Kalchuri One और {name} उपयोगकर्ताओं द्वारा डाली गई सामग्री के लिए उत्तरदायी नहीं हैं। विवाद भारतीय कानून के अधीन होंगे।</p>
          </>
        ) : (
          <>
            <h2>The platform</h2><p>This website belongs to <b>{name}</b> and runs on <b>Kalchuri One</b>, which gives community samitis and sansthas their website, members, family trees, documents, events and accounts; each organization is responsible for its own content and members.</p>
            <h2>Accounts and membership</h2><p>Sign-in is by mobile (WhatsApp OTP) or email; keep one account per person. Membership applications are approved or declined by the organization's admin (or the platform admin); false details may lead to cancellation.</p>
            <h2>Content and conduct</h2><p>You are responsible for what you post on the Kalchuri One feed, comments, directory and matrimony. Advertising, business or political promotion, abusive, misleading or privacy-violating content may get limited reach or be removed; repeated violations may close the account. Paid promotion appears only in the Sponsored section with the organization's consent.</p>
            <h2>Family trees and condolence messages</h2><p>When you add others' names or numbers to a family tree, their consent is your responsibility. Condolence messages are sent only after the organization's admin approves.</p>
            <h2>Donations and payments</h2><p>Where donations are enabled they go to the respective organization and the receipt is issued in its name; see the refund policy.</p>
            <h2>Limits</h2><p>The service is provided as is and may be interrupted for technical reasons. Kalchuri One and {name} are not liable for user-submitted content. Disputes are subject to Indian law.</p>
          </>
        )}
      </div></section>
    </>
  );
}
