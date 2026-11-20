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
            <p><b>{name}</b> यह वेबसाइट <b>Kalchuri One</b> (कलचुरी समाज का साझा डिजिटल मंच) पर चलाता है। यह नीति बताती है कि आपकी कौन-सी जानकारी ली जाती है, किसे क्या दिखता है और आप उसे कैसे सुधार या हटवा सकते हैं।</p>
            <p className="text-sm text-muted-foreground">आख़िरी बदलाव: 20 नवंबर 2026</p>
            <h2>क्या जानकारी ली जाती है</h2>
            <ul>
              <li><b>खाता और सदस्यता:</b> नाम, पिता का नाम, मोबाइल / WhatsApp, ईमेल, पता, गाँव, ज़िला, विधानसभा क्षेत्र, फोटो, जन्म तिथि, रक्त समूह और फ़ॉर्म में माँगी गई अन्य बातें।</li>
              <li><b>वंश वृक्ष (शोकपत्र सेवा):</b> परिवार के सदस्यों के नाम, रिश्ते, निवास और मूल ग्राम, WhatsApp नंबर, दिवंगत होने का निशान और निधन की तारीख, गोत्र / कुलदेवी; चाहें तो फोटो, छोटा परिचय, जन्म तिथि या उम्र और पुत्री के विवाह की कड़ी।</li>
              <li><b>शोक संदेश और सूचनाएँ:</b> किसे क्या भेजा गया और हर संदेश की स्थिति (भेजा / पहुँचा / पढ़ा गया / असफल)।</li>
              <li><b>श्रद्धांजलि पेज:</b> दिवंगत का नाम, फोटो, तिथियाँ, परिचय और लोगों के लिखे संदेश।</li>
              <li><b>वैवाहिक परिचय:</b> आपके भरे विवरण, फोटो, वैवाहिक स्थिति, गोत्र, और वंश वृक्ष दिखाने की आपकी पसंद।</li>
              <li><b>दान:</b> रसीद के लिए ज़रूरी विवरण। कार्ड / बैंक की जानकारी हमारे पास नहीं आती — वह भुगतान सेवा के पास रहती है।</li>
              <li><b>अपने-आप:</b> लॉगिन का टोकन, भाषा की पसंद, और परिवार में हुए बदलावों का इतिहास (किसने, कब, क्या बदला — मोबाइल नंबर इसमें नहीं लिखा जाता)।</li>
            </ul>
            <h2>उपयोग</h2>
            <p>सदस्यता की मंज़ूरी, सदस्य पहचान-पत्र, आयोजनों के निमंत्रण, शोक संदेश, संगठन की सूचनाएँ और जिस काम के लिए आपने फ़ॉर्म भरा उसी के लिए संपर्क। WhatsApp / ईमेल पर सूचनाएँ तभी जाती हैं जब आपने सहमति दी हो; "STOP" लिखकर कभी भी बंद कर सकते हैं। पुण्यतिथि या जन्मदिन की याद WhatsApp पर अपने-आप नहीं भेजी जाती। जानकारी किसी को बेची या किराये पर नहीं दी जाती।</p>
            <h2>किसे क्या दिखता है</h2>
            <ul>
              <li><b>सार्वजनिक:</b> पदाधिकारियों के नाम / पद (उनकी सहमति से), प्रकाशित समाचार-लेख, आयोजन, चौपाल की "सार्वजनिक" पोस्ट, और वे श्रद्धांजलि पेज व वंश वृक्ष जिनकी कड़ी किसी ने खुद साझा की हो।</li>
              <li><b>वंश वृक्ष:</b> सिर्फ़ उसी संगठन के स्वीकृत सदस्यों और एडमिन को दिखता है। दूसरों के मोबाइल नंबर सदस्यों को नहीं दिखते; छपे चार्ट और साझा कड़ी में नंबर और जन्म तिथि कभी नहीं होते। साझा कड़ी बनाने वाला उसे कभी भी बंद कर सकता है।</li>
              <li><b>जन्म तिथि:</b> निजी रहती है — उस व्यक्ति, परिवार के मालिक और संगठन के एडमिन तक। बाकी सबको सिर्फ़ उम्र दिखती है।</li>
              <li><b>वैवाहिक परिचय:</b> पूरे मंच पर साझा है — किसी भी संस्था का सक्रिय सदस्य सभी संस्थाओं के जाँचे हुए परिचय देख सकता है। परिचय की जाँच आपकी अपनी संस्था करती है। मोबाइल नंबर सिर्फ़ तब खुलता है जब दोनों पक्ष स्वीकार करें। आपका वंश वृक्ष आपकी पसंद के अनुसार बंद, पूछने पर या खुला रहता है।</li>
              <li><b>श्रद्धांजलि पेज:</b> बिना लॉगिन लिखा गया संदेश बनाने वाले या एडमिन की मंज़ूरी के बाद ही दिखता है।</li>
            </ul>
            <h2>समुदाय की सुविधाएँ (चैट, प्रोफ़ाइल, स्टोरी, मित्र)</h2><p>सदस्य प्रोफ़ाइल (कवर/फोटो/परिचय/रुचियाँ/लिंक), चैट संदेश, स्टोरी, मित्र-सूची, जन्मदिन/वर्षगाँठ और शुभकामनाएँ — ये आप खुद डालते हैं और इनकी पहुँच (सार्वजनिक / समुदाय के सदस्य / सिर्फ़ मित्र) और मोबाइल/ईमेल/जन्मदिन दिखाने के विकल्प आपके हाथ में हैं। चौपाल पूरे मंच का साझा है। चैट में आपकी ऑनलाइन/आख़िरी-बार स्थिति सदस्यों को दिखती है। स्टोरी की फोटो 24 घंटे बाद सर्वर से स्वतः मिटा दी जाती है; चैट संदेश, पोस्ट और प्रोफ़ाइल तब तक रहते हैं जब तक आप हटाएँ या खाता बंद हो। सामग्री सिर्फ़ प्रचार/राजनीतिक/अनुचित सामग्री की जाँच (keyword और AI) और शिकायत पर मॉडरेटर देखते हैं। पहली बार उपयोग से पहले आपकी स्पष्ट सहमति ली जाती है और उसकी तिथि/संस्करण दर्ज रहता है।</p>
            <h2>भंडारण, अवधि और पहुँच</h2>
            <p>डेटा Supabase (भारत क्षेत्र) पर रखा जाता है; वेबसाइट और शोक संदेशों के चित्र Cloudflare पर। पहुँच भूमिका के अनुसार सीमित है — आपके संगठन के एडमिन और Kalchuri One के platform admin। सदस्यता, वंश वृक्ष और दान का डेटा हर संगठन अलग देखता है; वैवाहिक परिचय और चौपाल ऊपर बताए अनुसार साझा हैं। हर व्यक्ति के लिए बना शोक संदेश का चित्र भेजने के लगभग 30 दिन बाद हटा दिया जाता है; किसे क्या भेजा गया इसका लेखा रहता है ताकि दोबारा न जाए। नियमित बैकअप रखे जाते हैं।</p>
            <h2>दूसरों की जानकारी</h2>
            <p>वंश वृक्ष या संपर्क सूची में आप या एडमिन परिवार के लोगों के नाम और नंबर भरते हैं। जिसका नाम या नंबर भरा गया है वह उसे सुधरवा या हटवा सकता है, चाहे वृक्ष किसी और ने बनाया हो।</p>
            <h2>आपके अधिकार</h2>
            <p>अपनी जानकारी देखना, सुधारना, सहमति वापस लेना, सूचनाएँ बंद कराना या रिकॉर्ड हटवाना — संगठन से संपर्क करें{contact ? ` (${contact})` : ""} या संपर्क पेज से लिखें। गलत या अनुचित वैवाहिक परिचय और श्रद्धांजलि संदेश की शिकायत उसी पेज से की जा सकती है। 18 वर्ष से कम आयु के व्यक्ति का वैवाहिक परिचय नहीं बनाया जाता।</p>
            <h2>Cookies और विज्ञापन</h2>
            <p>लॉगिन और भाषा-पसंद के लिए ज़रूरी cookies ही उपयोग होती हैं। अगर साइट पर विज्ञापन चालू हों तो वे आपकी "स्वीकार" सहमति के बाद ही लोड होते हैं; शोक, वंश वृक्ष, वैवाहिक और दान के पेजों पर कभी विज्ञापन नहीं दिखते।</p>
            <h2>बदलाव</h2>
            <p>नई सुविधा जुड़ने पर यह नीति बदली जाती है और ऊपर की तारीख नई कर दी जाती है।</p>
          </>
        ) : (
          <>
            <p><b>{name}</b> runs this website on <b>Kalchuri One</b>, the shared digital platform of the Kalchuri community. This policy explains what we collect, who can see it, and how you can correct or remove it.</p>
            <p className="text-sm text-muted-foreground">Last updated: 20 November 2026</p>
            <h2>What we collect</h2>
            <ul>
              <li><b>Account and membership:</b> name, father's name, mobile / WhatsApp, email, address, village, district, assembly constituency, photo, date of birth, blood group and the other details a form asks for.</li>
              <li><b>Family tree (shokpatra seva):</b> family members' names, relations, residence and native village, WhatsApp numbers, a deceased mark and date of death, gotra / kuldevi; optionally a photo, a short bio, date of birth or age, and a daughter's marriage link.</li>
              <li><b>Condolence letters and notices:</b> who was sent what, and each message's status (sent / delivered / read / failed).</li>
              <li><b>Tribute pages:</b> the departed person's name, photo, dates, a short text, and messages people write.</li>
              <li><b>Matrimony profiles:</b> the details and photo you enter, marital status, gotra, and your choice about showing your family tree.</li>
              <li><b>Donations:</b> the details needed for a receipt. Card / bank details never reach us — they stay with the payment provider.</li>
              <li><b>Automatically:</b> a sign-in token, your language choice, and a change history for families (who changed what and when — phone numbers are never written into it).</li>
            </ul>
            <h2>How we use it</h2>
            <p>Membership approval and ID cards, event invitations, condolence messages, organization notices, and contact about the exact thing you signed up for. WhatsApp / email notices go out only with your consent; reply STOP at any time. Death-anniversary or birthday reminders are never sent automatically on WhatsApp. We never sell or rent personal information.</p>
            <h2>Who can see what</h2>
            <ul>
              <li><b>Public:</b> office bearers' names and designations (with their consent), published news and articles, events, "public" posts on the community feed, and those tribute pages and family trees whose link someone has chosen to share.</li>
              <li><b>Family trees:</b> visible only to approved members and admins of that organization. Members never see other people's phone numbers; printed charts and shared links never contain numbers or dates of birth. Whoever created a shared link can switch it off at any time.</li>
              <li><b>Date of birth:</b> private — limited to the person, the family's owner and the organization's admins. Everyone else sees only the age.</li>
              <li><b>Matrimony profiles:</b> shared across the whole platform — an active member of any organization can see verified profiles of every organization. Your own organization verifies your profile. A phone number is revealed only after both sides accept. Your family tree is off, on request or open, as you choose.</li>
              <li><b>Tribute pages:</b> a message written without signing in appears only after the page's creator or an admin approves it.</li>
            </ul>
            <h2>Community features (chat, profiles, stories, friends)</h2><p>Profiles (cover/photo/bio/interests/links), chat messages, stories, friend lists, birthdays/anniversaries and wishes are entered by you; you control their audience (public / community members / friends only) and whether mobile, email or birthday are shown. The community feed is shared across the platform. Your online / last-seen status is visible to members in chat. Story photos are deleted from the server automatically after 24 hours; chat messages, posts and profiles stay until you delete them or close the account. Content is checked only for promotional/political/inappropriate material (keywords and AI) and on reports by moderators. Explicit consent is taken before first use and its date/version is recorded.</p>
            <h2>Storage, retention and access</h2>
            <p>Data is stored on Supabase (India region); the website and condolence-letter images are served from Cloudflare. Access is limited by role to your organization's admins and the Kalchuri One platform admins. Membership, family-tree and donation data are seen separately by each organization; matrimony profiles and the community feed are shared as described above. The image made for each person of a condolence letter is deleted about 30 days after sending; the record of who was sent what is kept so nobody is sent the same letter twice. Regular backups are kept.</p>
            <h2>Other people's details</h2>
            <p>In a family tree or contact list, you or an admin enter the names and numbers of family members. Anyone whose name or number has been entered can have it corrected or removed, even if someone else built the tree.</p>
            <h2>Your rights</h2>
            <p>Ask to see, correct or delete your record, withdraw consent or stop notices by contacting the organization{contact ? ` (${contact})` : ""} or through the contact page. A false or inappropriate matrimony profile or tribute message can be reported from the page itself. No matrimony profile is created for anyone under 18.</p>
            <h2>Cookies and advertising</h2>
            <p>Only cookies needed for sign-in and language preference are used. If ads are enabled on a site they load only after you accept; ads never appear on condolence, family-tree, matrimony or donation pages.</p>
            <h2>Changes</h2>
            <p>This policy is updated when a new feature is added, and the date above is changed.</p>
          </>
        )}
      </div></section>
    </>
  );
}
