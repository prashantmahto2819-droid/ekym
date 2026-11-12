import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/site/PageHeader";
import { useLang } from "@/core/i18n";
import { siteName } from "@/core/seo";
import { useTenant } from "@/core/tenant-context";
import { organizationQuery } from "@/lib/queries";

export const Route = createFileRoute("/privacy-policy")({
  head: ({ matches }) => ({ meta: [{ title: `Privacy policy — ${siteName(matches)}` }, { name: "description", content: `How ${siteName(matches)} on the Kalchuri One platform collects, uses and protects members' personal information.` }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { lang } = useLang();
  const hi = lang === "hi";
  const tenant = useTenant();
  const { data: org } = useSuspenseQuery(organizationQuery());
  const name = (hi && tenant.name_hi) || tenant.name;
  const contact = org?.email || org?.whatsapp || org?.phone || "";
  return (
    <>
      <PageHeader title={hi ? "गोपनीयता नीति" : "Privacy policy"} crumbs={[{ label: hi ? "गोपनीयता नीति" : "Privacy policy" }]} />
      <section className="section-y"><div className="container-page prose-content max-w-3xl">
        {hi ? (
          <>
            <p><b>{name}</b> यह वेबसाइट <b>Kalchuri One</b> (कलचुरी समाज का साझा डिजिटल मंच) पर चलाता है। यह नीति बताती है कि आपकी जानकारी क्यों ली जाती है और उसकी सुरक्षा कैसे होती है।</p>
            <h2>क्या जानकारी ली जाती है</h2>
            <p>सदस्यता, स्वयंसेवा, आयोजन, शोध कार्यक्रम, वैवाहिक परिचय या संपर्क फ़ॉर्म भरते समय आपका नाम, मोबाइल/WhatsApp, ईमेल, पता, गाँव, फोटो और फ़ॉर्म में माँगी गई अन्य बातें। वंश वृक्ष (शोकपत्र सेवा) में परिवार के सदस्यों के नाम, रिश्ते, गाँव और WhatsApp नंबर। दान करने पर भुगतान की रसीद के लिए ज़रूरी विवरण (कार्ड/बैंक जानकारी हमारे पास नहीं आती — वह भुगतान सेवा के पास रहती है)।</p>
            <h2>उपयोग</h2>
            <p>सदस्यता की मंज़ूरी, सदस्य पहचान-पत्र, आयोजनों के निमंत्रण, शोक संदेश, संगठन की सूचनाएँ और जिस काम के लिए आपने फ़ॉर्म भरा उसी के लिए संपर्क। WhatsApp/ईमेल पर सूचनाएँ तभी जाती हैं जब आपने सहमति दी हो; "STOP" लिखकर कभी भी बंद कर सकते हैं। जानकारी किसी को बेची या किराये पर नहीं दी जाती।</p>
            <h2>क्या सार्वजनिक है</h2>
            <p>पदाधिकारियों के नाम/पद (उनकी सहमति से), प्रकाशित समाचार-लेख, आयोजन और Kalchuri One feed की "सार्वजनिक" पोस्ट। सदस्यों के मोबाइल नंबर, पते और वैवाहिक परिचय के संपर्क सार्वजनिक नहीं होते; वैवाहिक संपर्क सिर्फ़ दोनों पक्षों की स्वीकृति पर खुलता है। वंश वृक्ष सिर्फ़ संगठन के स्वीकृत सदस्यों/एडमिन को दिखता है।</p>
            <h2>समुदाय की सुविधाएँ (चैट, प्रोफ़ाइल, स्टोरी, मित्र)</h2><p>सदस्य प्रोफ़ाइल (कवर/फोटो/परिचय/रुचियाँ/लिंक), चैट संदेश, स्टोरी, मित्र-सूची, जन्मदिन/वर्षगाँठ और शुभकामनाएँ — ये आप खुद डालते हैं और इनकी पहुँच (सार्वजनिक / समुदाय के सदस्य / सिर्फ़ मित्र) और मोबाइल/ईमेल/जन्मदिन दिखाने के विकल्प आपके हाथ में हैं। चैट में आपकी ऑनलाइन/आख़िरी-बार स्थिति सदस्यों को दिखती है। स्टोरी की फोटो 24 घंटे बाद सर्वर से स्वतः मिटा दी जाती है; चैट संदेश, पोस्ट और प्रोफ़ाइल तब तक रहते हैं जब तक आप हटाएँ या खाता बंद हो। सामग्री सिर्फ़ प्रचार/राजनीतिक/अनुचित सामग्री की जाँच (keyword और AI) और शिकायत पर मॉडरेटर देखते हैं। पहली बार उपयोग से पहले आपकी स्पष्ट सहमति ली जाती है और उसकी तिथि/संस्करण दर्ज रहता है।</p>
            <h2>भंडारण और पहुँच</h2>
            <p>डेटा Supabase (भारत क्षेत्र) पर सुरक्षित रखा जाता है; पहुँच भूमिका के अनुसार सीमित है — आपके संगठन के एडमिन और Kalchuri One के platform admin। हर संगठन अपना डेटा अलग देखता है। नियमित बैकअप रखे जाते हैं।</p>
            <h2>आपके अधिकार</h2>
            <p>अपनी जानकारी देखना, सुधारना, सूचनाएँ बंद कराना या रिकॉर्ड हटवाना — संगठन से संपर्क करें{contact ? ` (${contact})` : ""} या संपर्क पेज से लिखें। 18 वर्ष से कम आयु के व्यक्ति का वैवाहिक परिचय नहीं बनाया जाता।</p>
            <h2>Cookies और विज्ञापन</h2>
            <p>लॉगिन और भाषा-पसंद के लिए ज़रूरी cookies ही उपयोग होती हैं। अगर साइट पर विज्ञापन चालू हों तो वे आपकी "स्वीकार" सहमति के बाद ही लोड होते हैं; शोक, वंश वृक्ष, वैवाहिक और दान के पेजों पर कभी विज्ञापन नहीं दिखते।</p>
          </>
        ) : (
          <>
            <p><b>{name}</b> runs this website on <b>Kalchuri One</b>, the shared digital platform of the Kalchuri community. This policy explains what we collect and how it is protected.</p>
            <h2>What we collect</h2>
            <p>When you apply for membership, volunteer, register for an event or research programme, create a matrimony profile or write to us: your name, mobile/WhatsApp, email, address, village, photo and the other details the form asks for. In the family tree (shokpatra seva): family members' names, relations, villages and WhatsApp numbers. For donations, the details needed for a receipt (card/bank details never reach us — they stay with the payment provider).</p>
            <h2>How we use it</h2>
            <p>Membership approval and ID cards, event invitations, condolence messages, organization notices, and contact about the exact thing you signed up for. WhatsApp/email notices go out only with your consent; reply STOP at any time. We never sell or rent personal information.</p>
            <h2>What is public</h2>
            <p>Office bearers' names and designations (with their consent), published news and articles, events, and "public" posts on the Kalchuri One feed. Members' numbers, addresses and matrimony contacts are never public; a matrimony contact is revealed only after both sides accept. Family trees are visible only to approved members and admins of the organization.</p>
            <h2>Community features (chat, profiles, stories, friends)</h2><p>Profiles (cover/photo/bio/interests/links), chat messages, stories, friend lists, birthdays/anniversaries and wishes are entered by you; you control their audience (public / community members / friends only) and whether mobile, email or birthday are shown. Your online / last-seen status is visible to members in chat. Story photos are deleted from the server automatically after 24 hours; chat messages, posts and profiles stay until you delete them or close the account. Content is checked only for promotional/political/inappropriate material (keywords and AI) and on reports by moderators. Explicit consent is taken before first use and its date/version is recorded.</p>
            <h2>Storage and access</h2>
            <p>Data is stored securely on Supabase (India region); access is limited by role to your organization's admins and the Kalchuri One platform admins. Each organization sees only its own data. Regular backups are kept.</p>
            <h2>Your rights</h2>
            <p>Ask to see, correct or delete your record, or stop notices, by contacting the organization{contact ? ` (${contact})` : ""} or through the contact page. No matrimony profile is created for anyone under 18.</p>
            <h2>Cookies and advertising</h2>
            <p>Only cookies needed for sign-in and language preference are used. If ads are enabled on a site they load only after you accept; ads never appear on condolence, family-tree, matrimony or donation pages.</p>
          </>
        )}
      </div></section>
    </>
  );
}
