# Gap Analysis — मौजूदा काम बनाम Kalchuri One

आधार: 4 नवंबर 2026 को कोड और लाइव डेटाबेस (Supabase प्रोजेक्ट EKYM, `udxdxkyfrqlgdwwqaucu`) की जाँच।

## 1. अभी क्या-क्या बना हुआ है

### A. शोकपत्र सेवा (repo `shokpatra`), लाइव और असली डेटा के साथ
- **Stack**: बिना build वाली static साइट (HTML + ES modules), Cloudflare Pages पर, Supabase backend.
- **असली डेटा**: 13 यूज़र, 22 परिवार, 120 सदस्य, 18 गाँव, 20 सामाजिक क्षेत्र, 79 मूल ग्राम, 1 पत्र। **इसे किसी भी हाल में खोना नहीं है।**
- **बहुत परिपक्व वंश वृक्ष**: पिता → पुत्र, पत्नी/पुत्री, पूर्वज ऊपर जोड़ना, स्वर्गीय/नाम अज्ञात, मुखिया, भाइयों का क्रम, परिवार जोड़ना (family links → पूरा वंश), परिवार merge, सदस्य move, नाम सुझाव, डुप्लिकेट फ़ोन रोक, "यही व्यक्ति है" अनुरोध, कचरा/वापसी।
- **समाज का ढाँचा**: सामाजिक क्षेत्र → मूल ग्राम, निवास गाँव अलग; एडमिन क्षेत्र-वार और गाँव-वार; super admin, admin_scope।
- **स्वीकृति**: नए यूज़र, परिवार, सुझाव, लिंक और पत्र सब पर "पहला फ़ैसला ही मान्य" वाला नियम।
- **Design Studio**: layer-based canvas इंजन (text, frame, rect, line, clip-art, image, name-field), आसान फ़ॉर्म + खुला editor (drag, resize, snap, undo)।
- **WhatsApp**: Vivid Relay से personalised image + text, एडमिन alert, दिन में दो बार digest (pg_cron), WhatsApp OTP login hook.
- **सीमा**: भेजना browser tab पर निर्भर है। कोई build/test व्यवस्था नहीं। सब कुछ एक ही समाज के लिए है, multi-org नहीं।

### B. EKYM वेबसाइट (repo `ekym`, Charameti से बनी), डेटाबेस तैयार पर अभी लाइव नहीं
- **Stack**: React 19 + TanStack Start (SSR) + Tailwind 4 + shadcn/ui, Cloudflare Workers target, Lovable से जुड़ा।
- **Public पेज**: होम (स्लाइडर, त्योहार, सेक्शन), सेवा प्रकल्प, ब्लॉग, समाचार, अभियान, गैलरी, वीडियो/रील, रक्तदान, लाइब्रेरी, इंटर्नशिप, वॉलंटियर, संपर्क, दान, रसीद/वॉलंटियर verify, नीतियाँ।
- **Admin**: ऊपर के हर हिस्से का CRUD (`CrudPage`, `ReviewPage`), यूज़र-रोल, भुगतान सेटिंग।
- **दान**: Razorpay order, webhook, receipt नंबर, PDF रसीद (pdf-lib), verify code।
- **सीमा**: एक ही संगठन के लिए (`organization_settings` में एक पंक्ति)। PDF सिर्फ़ Helvetica में बनती है, इसलिए **हिंदी नहीं छपती**। ब्लॉग में कोई editorial workflow नहीं। Rich-text editor नहीं।

### C. एक साझा Supabase प्रोजेक्ट (EKYM)
- दोनों ऐप एक ही auth (एक ही लॉगिन) इस्तेमाल करते हैं, पर दोनों के यूज़र रिकॉर्ड और रोल अलग हैं:
  - शोकपत्र: `profiles` (role, status, super_admin, admin_scope)
  - वेबसाइट: `site_profiles` + `user_roles` (app_role enum)
- 52 टेबल, सब `public` schema में।

## 2. Master Prompt बनाम मौजूदा: मॉड्यूल-वार

चिह्न: ✅ = बना है, दोबारा इस्तेमाल होगा · 🔁 = बना है पर restructure चाहिए · 🆕 = नया बनाना है

| # | मॉड्यूल | स्थिति | क्या दोबारा इस्तेमाल होगा | क्या करना है |
|---|---|---|---|---|
| 3 | Multi-org / tenancy / hierarchy | 🆕 | — | `organizations` (parent, level), domains, org-वार रोल, closure table |
| 4 | Organization Management (समिति, पद, बैठक, प्रस्ताव, कार्य) | 🆕 | ekym `user_roles` का विचार | पूरा नया `gov` domain |
| 4 | सदस्यता (आवेदन, कार्ड, verification) | 🔁 | shokpatra signup + स्वीकृति flow, profile details | org-वार membership + कार्ड (Design Engine से) |
| 5 | Letterhead / Document Studio | 🔁 | `studio-engine.js` + `studio-free.js` (layer model, editor) | TypeScript में port, multi-page, mm page sizes, QR, seal, merge fields, PDF |
| 5D | पत्र प्रबंधन (dispatch, रजिस्टर) | 🔁 | शोकपत्र का letters → recipients → send flow | सामान्य `documents` + `dispatches` + आवक/जावक रजिस्टर |
| 6 | Billing, रसीद, वाउचर | 🔁 | ekym donations, receipts, Razorpay, verify page | रसीद को Design Engine पर लाना (हिंदी), cash/UPI/cheque, cancel/refund |
| 6 | Accounting | 🆕 | — | double-entry ledger, chart of accounts, FY, रिपोर्ट, Excel export |
| 7 | Website Builder + CMS | 🔁 | ekym की पूरी public साइट + admin CRUD + homepage sections | हर टेबल में `organization_id`, host से संगठन पहचानना, block-based page builder, menu, revisions, SEO, sitemap |
| 8 | पत्रिका / e-publication | 🆕 | ekym media library | publications → issues → pages, flipbook reader |
| 9 | ब्लॉग + editorial workflow | 🔁 | ekym `blogs` | multi-author, draft→review→publish, categories per org, comments, central feed |
| 10 | समाचार / मीडिया | 🔁 | ekym `news`, galleries, videos, reels | org-वार, regional, breaking, central feed |
| 11 | विज्ञापन / AdSense | 🆕 | — | slots, sponsor campaigns, ads.txt, consent, revenue (actual ≠ estimate) |
| 12 | Event + Invitation Studio | 🆕 (engine 🔁) | Design Engine, send flow | events, guests, RSVP, attendance, reminders |
| 13 | शोक संदेश | ✅ | शोकपत्र सेवा पूरी (स्वीकृति, no-repeat, village/family/lineage picker) | org branding, संगठन की ओर से संदेश, "परिवार की सहमति ली गई" पुष्टि step, archive पेज |
| 14 | Family Tree | ✅ | पूरा shokpatra tree + RPCs | React UI में port, mother/spouse लाइन, visualization; डेटा जहाँ है वहीं रहेगा |
| 15 | रक्तदाता | ✅ | ekym blood donors + requirements | org_id, WhatsApp emergency alert |
| 15 | वॉलंटियर, दान, लाइब्रेरी, इंटर्नशिप | ✅ | ekym | org_id |
| 15 | वैवाहिक, व्यापार निर्देशिका, रोज़गार, छात्रवृत्ति, professional, युवा, वरिष्ठ, ज्ञान केंद्र | 🆕 | profiles, family tree (वैवाहिक में वंश/गोत्र) | एक-एक करके, privacy पहले |
| 15 | चुनाव / मतदान | 🆕 | — | secret ballot design; शुरू में "आंतरिक मतदान" |
| 16 | WhatsApp Engine | 🔁 | Vivid Relay integration, send-letters function, digest, OTP hook | provider abstraction (Relay + Meta Cloud), server-side queue (browser tab पर निर्भर नहीं), templates, consent, cost |
| 17 | Super/Org/Dept Admin dashboards | 🔁 | दोनों ऐप के dashboards | permission-driven navigation |
| 18 | Audit logs | 🔁 | ekym `audit_logs` | सब domains पर generic trigger |
| 19 | हिंदी/Devanagari | 🔁 | shokpatra `hindi.js` (Roman→देवनागरी), fonts | पूरे app में i18n (hi/en), PDF में हिंदी |

## 3. सबसे बड़े जोखिम (और उनका हल)

1. **दो अलग codebase, दो अलग रोल-सिस्टम**: Kalchuri One को **एक** React app बनाना होगा। शोकपत्र को उसमें धीरे-धीरे port करेंगे। तब तक पुराना शोकपत्र ऐप चलता रहेगा, क्योंकि डेटा वही रहेगा और दोनों एक साथ चल सकते हैं।
2. **Live data**: शोकपत्र की टेबल में सिर्फ़ जोड़ने वाले बदलाव होंगे (नया column, नई टेबल)। rename, drop या schema move तभी होगा जब पुराना frontend बंद हो जाए, और उससे पहले backup और rollback script तैयार होगी।
3. **Build/test**: इस sandbox से npm install नहीं होता। समाधान: **GitHub Actions CI**, जो हर push पर typecheck + build + test चलाए, और मैं `gh` से नतीजा पढ़ूँ। Cloudflare deploy भी वहीं से होगा।
4. **PDF में हिंदी**: pdf-lib Devanagari की संयुक्ताक्षर shaping नहीं करता। v1 में canvas पर बनाकर high-res image-PDF बनेगी (हर जगह सही दिखेगी)। print-quality vector PDF के लिए बाद में Cloudflare Browser Rendering।
5. **WhatsApp नीति**: हर संगठन का अपना official नंबर हो, तो हर एक को Meta Business verification और WABA चाहिए (या आप Meta Tech Provider बनें)। template message का खर्च भी लगता है। Vivid Relay (unofficial) सस्ता है पर number ban का जोखिम है। इसलिए दोनों provider रखेंगे और संगठन तय करेगा।
6. **AdSense**: approval domain-वार मिलता है, और हर custom domain को अलग approval चाहिए। शोक संदेश, वंश वृक्ष और वैवाहिक पेजों पर विज्ञापन नहीं लगेंगे (सम्मान और नीति, दोनों कारणों से)।
7. **निजता (DPDP Act 2023)**: वंश वृक्ष और वैवाहिक में ऐसे लोगों का डेटा भी होता है जिन्होंने खुद signup नहीं किया। इसलिए दिखने के स्तर (public / समाज / परिवार / निजी), सहमति रिकॉर्ड और हटाने का अनुरोध ज़रूरी हैं। फ़ोन नंबर छिपाने का मौजूदा नियम बना रहेगा।
