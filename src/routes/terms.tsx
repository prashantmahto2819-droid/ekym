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
            <p className="text-sm text-muted-foreground">आख़िरी बदलाव: 20 नवंबर 2026</p>
            <h2>मंच</h2><p>यह वेबसाइट <b>{name}</b> की है और <b>Kalchuri One</b> मंच पर चलती है। Kalchuri One समाज की समितियों/संस्थाओं को वेबसाइट, सदस्य, वंश वृक्ष, पत्राचार, आयोजन और लेखा की सुविधा देता है; हर संस्था अपनी सामग्री और सदस्यों के लिए स्वयं ज़िम्मेदार है।</p>
            <h2>खाता और सदस्यता</h2><p>लॉगिन मोबाइल (WhatsApp OTP) या ईमेल से होता है; एक व्यक्ति एक ही खाता रखे। सदस्यता आवेदन संबंधित संस्था का एडमिन (या मंच का एडमिन) स्वीकृत/अस्वीकृत करता है; गलत जानकारी पर सदस्यता रद्द हो सकती है।</p>
            <h2>सामग्री और आचरण</h2><p>Kalchuri One feed, टिप्पणियाँ, directory, वैवाहिक परिचय आदि में आप जो डालते हैं उसकी ज़िम्मेदारी आपकी है। विज्ञापन/व्यापारिक या चुनावी प्रचार, अपमानजनक, भ्रामक या किसी की निजता भंग करने वाली सामग्री की पहुँच सीमित की जा सकती है या उसे हटाया जा सकता है; बार-बार उल्लंघन पर खाता बंद हो सकता है। paid विज्ञापन सिर्फ़ "प्रायोजित" सेक्शन में, संस्था की अनुमति से।</p>
            <h2>सामुदायिक सुविधाएँ: चैट, प्रोफ़ाइल, स्टोरी, मित्र</h2>
            <p>समुदाय चैट, सदस्य प्रोफ़ाइल (कवर/फोटो/परिचय), 24-घंटे की स्टोरी, मित्र-सूची और जन्मदिन/वर्षगाँठ की शुभकामनाएँ सिर्फ़ मंज़ूर सदस्यों के लिए हैं। इनका पहली बार उपयोग करने से पहले आपकी सहमति ली जाती है।</p>
            <ul>
              <li><b>आपकी सामग्री आपकी है:</b> जो फोटो, GIF, टेक्स्ट या वीडियो आप डालते हैं, उसका कॉपीराइट आपका रहता है। आप {name} और Kalchuri One को उसे साइट पर दिखाने, छोटा/संकुचित करने और सदस्यों तक पहुँचाने की सीमित, निःशुल्क अनुमति देते हैं — बस उतनी जितनी सेवा चलाने के लिए ज़रूरी है।</li>
              <li><b>वही डालें जिसका अधिकार आपके पास हो:</b> दूसरों की फोटो, फ़िल्म/गानों के क्लिप, ब्रांड के लोगो या किसी का निजी चित्र उसकी अनुमति के बिना न डालें। कॉपीराइट या निजता की शिकायत पर सामग्री हटा दी जाएगी और बार-बार होने पर खाता बंद हो सकता है।</li>
              <li><b>सबके सामने क्या दिखे, आप तय करते हैं:</b> पोस्ट/स्टोरी पर "सार्वजनिक / समुदाय के सदस्य / सिर्फ़ मित्र" चुनिए; प्रोफ़ाइल में मोबाइल/ईमेल/जन्मदिन दिखाने के विकल्प आपके हाथ में हैं। "सार्वजनिक" सामग्री बिना लॉगिन भी दिख सकती है।</li>
              <li><b>स्टोरी 24 घंटे में अपने आप मिट जाती है</b> (फोटो समेत); हटाने तक दूसरे सदस्य उसे देख/स्क्रीनशॉट ले सकते हैं, यह ध्यान रखें।</li>
              <li><b>ऑनलाइन स्थिति:</b> चैट में आपके "ऑनलाइन / आख़िरी बार" की जानकारी दूसरे सदस्यों को दिखती है।</li>
              <li><b>राजनीतिक, व्यापारिक या प्रचार सामग्री</b> की पहुँच अपने आप सीमित होकर एडमिन की मंज़ूरी के लिए जाती है; गाली, धमकी, अश्लीलता, झूठी खबर, किसी की निजी जानकारी या नफ़रत फैलाने वाली सामग्री नहीं चलेगी — एडमिन उसे हटा सकता है और सदस्य को ब्लॉक कर सकता है। आप किसी को ब्लॉक/रिपोर्ट भी कर सकते हैं।</li>
              <li><b>शुभकामनाएँ और पोस्ट</b> जो संगठन आपके जन्मदिन/वर्षगाँठ पर करता है, उन्हें आप प्रोफ़ाइल की गोपनीयता सेटिंग से बंद कर सकते हैं।</li>
            </ul>
            <h2>वंश वृक्ष और शोक संदेश</h2><p>वंश वृक्ष में दूसरों के नाम/नंबर जोड़ते समय उनकी सहमति आपकी ज़िम्मेदारी है; एक परिवार एक ही बार बनाइए। शोक संदेश संस्था के एडमिन की मंज़ूरी के बाद ही भेजे जाते हैं और संस्था के अपने WhatsApp गेटवे से जाते हैं। यह सुविधा सिर्फ़ शोक संदेश और संस्था की सूचना / आमंत्रण के लिए है — व्यापार, विज्ञापन या चुनावी प्रचार के लिए नहीं। भेजा हुआ संदेश वापस नहीं लिया जा सकता, और WhatsApp की रुकावट से संदेश देर से या न भी पहुँच सकता है। सूची या नंबर निकालकर किसी और काम में लगाना मना है; एडमिन को दिखने वाले नंबर सिर्फ़ संस्था के काम के लिए हैं।</p>
            <h2>श्रद्धांजलि पेज और साझा कड़ी</h2><p>श्रद्धांजलि पेज दिवंगत के परिवार की भावना का ध्यान रखकर बनाइए; परिवार के कहने पर पेज छिपाया या हटाया जाएगा। पेज पर आए संदेश बनाने वाला या एडमिन मंज़ूर करता है; अपमानजनक, झूठी या प्रचार वाली बात स्वीकार नहीं होती। वंश वृक्ष की साझा कड़ी जिसे आप भेजते हैं वह उसे आगे भी भेज सकता है — सोच-समझकर साझा कीजिए और काम होने पर बंद कर दीजिए।</p>
            <h2>वैवाहिक परिचय</h2><p>परिचय सिर्फ़ 18 वर्ष या अधिक के व्यक्ति का, उसकी सहमति से और सही जानकारी के साथ बनाइए। परिचय पूरे मंच के सदस्यों को दिखता है और आपकी अपनी संस्था उसकी जाँच करती है; मंच या संस्था किसी रिश्ते या दी गई जानकारी की गारंटी नहीं देते — अपनी जाँच स्वयं कीजिए। गलत परिचय, परेशान करने या दुरुपयोग की शिकायत पर परिचय हटाया और खाता बंद किया जा सकता है।</p>
            <h2>दान और भुगतान</h2><p>जहाँ दान चालू हो, वह संबंधित संस्था को जाता है और रसीद उसी के नाम से बनती है; रिफ़ंड नीति अलग पेज पर है।</p>
            <h2>सीमाएँ</h2><p>सेवा "जैसी है" उपलब्ध है; तकनीकी कारणों से कभी बाधित हो सकती है। Kalchuri One और {name} उपयोगकर्ताओं द्वारा डाली गई सामग्री के लिए उत्तरदायी नहीं हैं। विवाद भारतीय कानून के अधीन होंगे।</p>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Last updated: 20 November 2026</p>
            <h2>The platform</h2><p>This website belongs to <b>{name}</b> and runs on <b>Kalchuri One</b>, which gives community samitis and sansthas their website, members, family trees, documents, events and accounts; each organization is responsible for its own content and members.</p>
            <h2>Accounts and membership</h2><p>Sign-in is by mobile (WhatsApp OTP) or email; keep one account per person. Membership applications are approved or declined by the organization's admin (or the platform admin); false details may lead to cancellation.</p>
            <h2>Content and conduct</h2><p>You are responsible for what you post on the Kalchuri One feed, comments, directory and matrimony. Advertising, business or political promotion, abusive, misleading or privacy-violating content may get limited reach or be removed; repeated violations may close the account. Paid promotion appears only in the Sponsored section with the organization's consent.</p>
            <h2>Community features: chat, profiles, stories, friends</h2>
            <p>Community chat, member profiles (cover/photo/bio), 24-hour stories, friend lists and birthday/anniversary wishes are for approved members only; your consent is taken before first use.</p>
            <ul>
              <li><b>Your content stays yours:</b> you keep the copyright of photos, GIFs, text or videos you post, and grant {name} and Kalchuri One a limited, royalty-free licence to display, resize and deliver it to members — only as needed to run the service.</li>
              <li><b>Post only what you have the right to:</b> no photos of others, film/song clips, brand logos or private pictures without permission. Content is removed on a copyright or privacy complaint; repeat offenders may lose their account.</li>
              <li><b>You decide who sees it:</b> pick "public / community members / friends only" on posts and stories; profile privacy controls mobile, email and birthday visibility. Public content may be visible without sign-in.</li>
              <li><b>Stories delete themselves after 24 hours</b> (including the photo); until then other members can view or screenshot them.</li>
              <li><b>Presence:</b> your online / last-seen status is visible to members in chat.</li>
              <li><b>Political, commercial or promotional content</b> gets limited reach automatically and waits for admin approval; abuse, threats, obscenity, false news, others' private data or hate speech are removed and the member may be blocked. You can block or report anyone.</li>
              <li>Birthday/anniversary greetings and wall posts by the organization can be switched off in your profile privacy settings.</li>
            </ul>
            <h2>Family trees and condolence messages</h2><p>When you add others' names or numbers to a family tree, their consent is your responsibility; create each family only once. Condolence messages are sent only after the organization's admin approves, through the organization's own WhatsApp gateway. The feature is only for condolence messages and the organization's notices or invitations — not for business, advertising or political promotion. A sent message cannot be recalled, and WhatsApp may delay or fail to deliver it. Extracting lists or numbers for any other purpose is not allowed; numbers visible to admins are for the organization's work only.</p>
            <h2>Tribute pages and shared links</h2><p>Create tribute pages with respect for the family of the departed; a page is hidden or removed at the family's request. Messages on a page are approved by its creator or an admin; abusive, false or promotional messages are not accepted. Anyone you send a family-tree link to can pass it on — share with care and switch the link off when it is no longer needed.</p>
            <h2>Matrimony profiles</h2><p>Create a profile only for a person aged 18 or over, with their consent and with true details. Profiles are visible to members across the platform and are verified by your own organization; neither the platform nor the organization guarantees any match or the details given — make your own enquiries. A profile may be removed and the account closed on a report of false details, harassment or misuse.</p>
            <h2>Donations and payments</h2><p>Where donations are enabled they go to the respective organization and the receipt is issued in its name; see the refund policy.</p>
            <h2>Limits</h2><p>The service is provided as is and may be interrupted for technical reasons. Kalchuri One and {name} are not liable for user-submitted content. Disputes are subject to Indian law.</p>
          </>
        )}
      </div></section>
    </>
  );
}
