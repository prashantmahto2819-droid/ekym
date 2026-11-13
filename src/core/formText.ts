// One-language text for the public forms (blood seva, donation, library, location fields …).
// Source strings are written in English; `ft(s, hi)` returns the Hindi phrase in Hindi mode. Unknown strings fall back
// to the admin word list (`tx`) and are otherwise shown as written.
import { tx } from "@/components/admin/adminText";

import { useLang } from "./i18n";

const HI: Record<string, string> = {
  // common fields
  Home: "होम", "Full name": "पूरा नाम", "Your name": "आपका नाम", Mobile: "मोबाइल", "Your mobile": "आपका मोबाइल", WhatsApp: "व्हाट्सऐप", "Your WhatsApp": "आपका व्हाट्सऐप",
  Email: "ईमेल", "Date of birth": "जन्म तिथि", Gender: "लिंग", Male: "पुरुष", Female: "महिला", Other: "अन्य", "Select…": "चुनें…", "— choose —": "— चुनें —",
  Address: "पता", "Area / locality": "मोहल्ला / क्षेत्र", Pincode: "पिन कोड", Notes: "टिप्पणी", "Message (optional)": "संदेश (वैकल्पिक)", Education: "शिक्षा",
  State: "राज्य", "Select state": "राज्य चुनें", District: "ज़िला", "Select district": "ज़िला चुनें", "Type your district name": "अपने ज़िले का नाम लिखें",
  "City / town / village": "शहर / कस्बा / गाँव", "Preferred date": "सुविधाजनक तारीख", "I need pickup from my address": "सामान मेरे पते से ले जाएँ",
  "Pickup address": "सामान लेने का पता", Quantity: "मात्रा", Unit: "इकाई", All: "सभी", Search: "खोजें",
  // validation & status
  Required: "ज़रूरी है", "Please enter your name": "अपना नाम लिखें", "Mobile number is required": "मोबाइल नंबर ज़रूरी है", "Enter a valid email": "सही ईमेल लिखें",
  "Enter a valid 10-digit mobile number": "10 अंकों का सही मोबाइल नंबर लिखें", "Please select your state": "राज्य चुनें", "Please select your district": "ज़िला चुनें",
  "Please enter your district": "ज़िला लिखें", "Please enter your city": "शहर / गाँव लिखें",
  "Please fill the required fields highlighted above and try again.": "ऊपर लाल रंग में दिखे ज़रूरी खाने भरकर फिर से भेजें।",
  "Something went wrong": "कुछ गड़बड़ हुई", "Consent is required": "सहमति ज़रूरी है",
  // blood seva
  "Blood seva": "रक्त सेवा", "A verified network of donors that responds within hours, not days.": "सत्यापित रक्तदाताओं का नेटवर्क, जो दिनों में नहीं, घंटों में मदद करता है।",
  Blood: "रक्त सेवा", "Register as donor": "रक्तदाता के रूप में पंजीयन", "Raise a requirement": "रक्त की आवश्यकता दर्ज करें", "Current requirements": "वर्तमान आवश्यकताएँ",
  "Verified by our blood seva team. Contact the requester directly if you can help.": "हमारी रक्त सेवा टीम द्वारा सत्यापित। मदद कर सकें तो सीधे संपर्क करें।",
  "Blood group": "रक्त समूह", "Blood group needed": "किस रक्त समूह की ज़रूरत है", "Last donation date": "पिछली बार रक्तदान की तारीख",
  "Leave blank if you have never donated": "कभी रक्तदान नहीं किया हो तो खाली छोड़ें", "I am willing to be called for emergencies": "आपात स्थिति में मुझे फ़ोन किया जा सकता है",
  "Registering…": "पंजीयन हो रहा है…", "You are on the donor list": "आप रक्तदाता सूची में जुड़ गए हैं",
  "We will contact you only when a patient near you needs your blood group. You can say no any time.": "आपके पास किसी मरीज़ को आपके रक्त समूह की ज़रूरत होने पर ही संपर्क करेंगे। आप कभी भी मना कर सकते हैं।",
  "You are registered as a donor. Thank you.": "रक्तदाता के रूप में पंजीयन हो गया। धन्यवाद।", "Could not register you": "पंजीयन नहीं हो सका",
  "Please select your blood group": "अपना रक्त समूह चुनें", "Please accept the donor consent": "रक्तदाता सहमति पर टिक करें",
  "Patient name": "मरीज़ का नाम", "Patient name is required": "मरीज़ का नाम ज़रूरी है", "Patient age": "मरीज़ की आयु", Hospital: "अस्पताल", "Hospital name is required": "अस्पताल का नाम ज़रूरी है",
  "Hospital contact": "अस्पताल का संपर्क नंबर", Component: "रक्त घटक", "Units required": "कितने यूनिट चाहिए", "Needed by": "कब तक चाहिए", Urgency: "कितना ज़रूरी",
  "Whole Blood": "संपूर्ण रक्त (Whole Blood)", "RDP (random donor platelets)": "प्लेटलेट्स — आरडीपी", "SDP (single donor platelets)": "प्लेटलेट्स — एसडीपी (एफ़ेरेसिस)", Plasma: "प्लाज़्मा",
  normal: "सामान्य", urgent: "जल्दी (24 घंटे में)", critical: "अत्यंत आवश्यक (तुरंत)", "Hospital requisition slip": "अस्पताल की रक्त माँग पर्ची",
  "Upload requisition slip": "माँग पर्ची अपलोड करें",
  "Photo or PDF of the doctor's blood requisition slip. Large photos are reduced automatically. Only our blood team can see it.": "डॉक्टर की रक्त माँग पर्ची की फोटो या PDF। बड़ी फोटो अपने-आप छोटी हो जाती है। इसे केवल हमारी रक्त सेवा टीम देख सकती है।",
  "Submitting…": "भेजा जा रहा है…", "Submit requirement": "आवश्यकता भेजें", "Requirement submitted": "आवश्यकता दर्ज हो गई", "Requirement submitted for verification.": "आवश्यकता सत्यापन के लिए भेज दी गई।",
  "Our blood seva team will verify the details and start contacting matching donors. We will call you shortly.": "हमारी रक्त सेवा टीम जानकारी जाँचकर मिलते रक्तदाताओं से संपर्क शुरू करेगी। हम जल्द ही आपको फ़ोन करेंगे।",
  "Could not submit the requirement": "आवश्यकता दर्ज नहीं हो सकी", "Please select the blood group needed": "ज़रूरी रक्त समूह चुनें",
  "Please upload the hospital requisition slip": "अस्पताल की माँग पर्ची अपलोड करें", "The hospital requisition slip is required": "अस्पताल की माँग पर्ची ज़रूरी है",
  "Enter a valid patient age": "मरीज़ की सही आयु लिखें", "Enter the number of units needed": "कितने यूनिट चाहिए, लिखें", "Select your blood group": "अपना रक्त समूह चुनें", "Select the blood group": "रक्त समूह चुनें",
  // donation
  Donate: "दान करें", "Choose how you want to help": "मदद का तरीका चुनें", "Give securely by UPI, card or net banking": "यूपीआई, कार्ड या नेट बैंकिंग से सुरक्षित दान",
  "Your receipt is generated the moment the payment is confirmed on our server.": "भुगतान की पुष्टि होते ही आपकी रसीद बन जाती है।",
  "Offer food, clothes, medicines or supplies": "अनाज, कपड़े, दवाइयाँ या अन्य सामान दें", "Tell us what you have. We will arrange collection or share a drop-off point.": "बताइए आपके पास क्या है — हम सामान लेने आएँगे या जमा करने की जगह बताएँगे।",
  "Your support keeps the seva running, every single day.": "आपके सहयोग से सेवा हर दिन चलती रहती है।", "Message us": "हमें संदेश भेजें", "Check your donation status or download a receipt": "दान की स्थिति देखें या रसीद डाउनलोड करें",
  "Choose an amount": "राशि चुनें", "Amount (INR)": "राशि (₹)", "Enter an amount": "राशि लिखें", "Donation for": "दान का उद्देश्य", "General donation": "सामान्य दान", "Seva project": "सेवा प्रकल्प",
  "Bhojan Sewa (food)": "भोजन सेवा", "Medical help": "चिकित्सा सहायता", "Ambulance seva": "एम्बुलेंस सेवा", PAN: "पैन नंबर", "Needed for tax exemption receipts": "आयकर छूट रसीद के लिए ज़रूरी",
  "Receipt is also shown on screen": "रसीद स्क्रीन पर भी दिखेगी", "Do not show my name publicly": "मेरा नाम सार्वजनिक न दिखाएँ", "Opening payment…": "भुगतान खुल रहा है…",
  "Payment is confirmed on our server before a receipt is issued.": "रसीद देने से पहले भुगतान की पुष्टि हमारे सर्वर पर होती है।", "Thank you. Your receipt is ready.": "धन्यवाद। आपकी रसीद तैयार है।",
  "Could not load the payment window": "भुगतान विंडो नहीं खुल सकी", "Could not start the payment": "भुगतान शुरू नहीं हो सका", "Payment window closed. Your donation was not completed.": "भुगतान विंडो बंद हो गई — दान पूरा नहीं हुआ।",
  "Payment was not successful. Please try again.": "भुगतान सफल नहीं हुआ। फिर से प्रयास करें।", "Payment received but verification failed. Please contact the office.": "भुगतान मिल गया, पर पुष्टि नहीं हो सकी। कृपया कार्यालय से संपर्क करें।",
  "Download receipt": "रसीद डाउनलोड करें", "Verify receipt": "रसीद सत्यापित करें", "Receipt No:": "रसीद क्रमांक:", "Donation ID:": "दान क्रमांक:",
  "What are you donating?": "आप क्या दान कर रहे हैं?", "Please describe the material": "सामान का विवरण लिखें", "e.g. 50 kg wheat, winter blankets": "जैसे: 50 किलो गेहूँ, सर्दी के कंबल", "kg / pieces / boxes": "किलो / नग / डिब्बे",
  "Offer received": "आपका प्रस्ताव मिल गया", "Our collection team will contact you to confirm the items and pickup details.": "हमारी टीम सामान और लेने का समय तय करने के लिए आपसे संपर्क करेगी।",
  "Thank you. Our team will contact you about collection.": "धन्यवाद। हमारी टीम सामान लेने के लिए संपर्क करेगी।", "Could not submit your offer": "प्रस्ताव नहीं भेजा जा सका", "Send offer": "प्रस्ताव भेजें", "Sending…": "भेजा जा रहा है…",
  "Donation status": "दान की स्थिति", "Enter the donation ID you received to see the payment status and download your receipt.": "भुगतान की स्थिति देखने और रसीद डाउनलोड करने के लिए अपना दान क्रमांक लिखें।",
  "Donation ID": "दान क्रमांक", Donor: "दानदाता", "Paid at": "भुगतान का समय", Purpose: "उद्देश्य", "Receipt number": "रसीद क्रमांक", "Check status": "स्थिति देखें", "Checking…": "देख रहे हैं…",
  "No donation found with that ID. Please check and try again.": "इस क्रमांक से कोई दान नहीं मिला। जाँचकर फिर से लिखें।",
  // library
  Library: "पुस्तकालय", "Community library": "सामुदायिक पुस्तकालय", "A free reading room and lending library for students in our area.": "हमारे क्षेत्र के विद्यार्थियों के लिए निःशुल्क वाचनालय व पुस्तकालय।",
  "Browse the catalogue": "पुस्तकों की सूची देखें", "Search by title, author, subject or language. Come to the library to borrow.": "नाम, लेखक, विषय या भाषा से खोजें। पुस्तक लेने के लिए पुस्तकालय आएँ।",
  "Search books": "पुस्तक खोजें", "No books match this search yet. Our catalogue is growing every week.": "इस खोज से अभी कोई पुस्तक नहीं मिली। सूची हर सप्ताह बढ़ रही है।",
  "Donate books to the library": "पुस्तकालय को पुस्तकें दान करें", "Textbooks, competitive exam guides, children's books and general reading are all welcome.": "पाठ्यपुस्तकें, प्रतियोगी परीक्षा की किताबें, बच्चों की किताबें और सामान्य पठन — सबका स्वागत है।",
  "What kind of books?": "किस तरह की पुस्तकें?", "Approximate number of books": "लगभग कितनी पुस्तकें", Condition: "स्थिति", "new, good, usable": "नई, अच्छी, उपयोग योग्य",
  "Book donation received": "पुस्तक दान का प्रस्ताव मिल गया", "Our library team will contact you to arrange collection or a drop-off point.": "हमारी पुस्तकालय टीम पुस्तकें लेने या जमा करने की जगह के लिए संपर्क करेगी।",
  "Thank you. We will contact you about collection.": "धन्यवाद। पुस्तकें लेने के लिए हम संपर्क करेंगे।", "College / University": "कॉलेज / विश्वविद्यालय", Course: "पाठ्यक्रम", "Preferred department": "पसंदीदा विभाग", "Preferred duration": "पसंदीदा अवधि",
  "Skills and interests": "कौशल व रुचियाँ", "Year of study": "अध्ययन का वर्ष", Subject: "विषय", Message: "संदेश", "Please write at least 10 characters": "कम से कम 10 अक्षर लिखें",
  "Please write your message": "अपना संदेश लिखें", "Please accept the declaration": "घोषणा पर टिक करें", "Please add your photo": "अपनी फोटो लगाएँ",
  Available: "उपलब्ध", Issued: "किसी के पास", "{n} available": "{n} उपलब्ध", "On loan": "अभी किसी के पास", "Submit book donation": "पुस्तक दान भेजें",
  "No verified requirement is open right now. Registering as a donor means we can reach you the moment one appears.": "अभी कोई सत्यापित आवश्यकता खुली नहीं है। रक्तदाता के रूप में पंजीयन करने से ज़रूरत पड़ते ही हम आप तक पहुँच सकेंगे।",
  "Submit donation offer": "दान का प्रस्ताव भेजें", "Donate online": "ऑनलाइन दान", "Material donation": "सामान का दान", "Book donation": "पुस्तक दान",
  Money: "राशि", "Sponsor a meal round, a medical camp or a month of library running costs.": "एक समय का भोजन, एक चिकित्सा शिविर या पुस्तकालय का एक महीने का खर्च उठाएँ।",
  Material: "सामान", "Grain, vegetables, groceries, clothes, blankets, stationery and medicines.": "अनाज, सब्ज़ियाँ, राशन, कपड़े, कंबल, स्टेशनरी और दवाइयाँ।",
  Books: "पुस्तकें", "Donate books to our free community library.": "हमारे निःशुल्क सामुदायिक पुस्तकालय को पुस्तकें दें।",
  "Register as a blood donor and respond when we call.": "रक्तदाता के रूप में पंजीयन करें और बुलाने पर मदद करें।"
};

const EN = new Map(Object.entries(HI).map(([e, h]) => [h, e]));
const DEV = /[ऀ-ॿ]/;

/** Text in the chosen language. */
export function ft(s: string | null | undefined, hi: boolean): string {
  if (!s) return "";
  if (hi) { if (DEV.test(s)) return s; return HI[s] ?? HI[s.trim()] ?? tx(s, true); }
  if (!DEV.test(s)) return s;
  return EN.get(s) ?? tx(s, false);
}

/** Hook: `const t = useFt(); t("Full name")`. */
export function useFt() {
  const { lang } = useLang();
  const hi = lang === "hi";
  return (s: string | null | undefined) => ft(s, hi);
}

/** Hindi names for states / union territories and Chhattisgarh districts (stored values stay in English). */
export const PLACE_HI: Record<string, string> = {
  "Andhra Pradesh": "आंध्र प्रदेश", "Arunachal Pradesh": "अरुणाचल प्रदेश", Assam: "असम", Bihar: "बिहार", Chhattisgarh: "छत्तीसगढ़", Goa: "गोवा", Gujarat: "गुजरात", Haryana: "हरियाणा",
  "Himachal Pradesh": "हिमाचल प्रदेश", Jharkhand: "झारखंड", Karnataka: "कर्नाटक", Kerala: "केरल", "Madhya Pradesh": "मध्य प्रदेश", Maharashtra: "महाराष्ट्र", Manipur: "मणिपुर",
  Meghalaya: "मेघालय", Mizoram: "मिज़ोरम", Nagaland: "नागालैंड", Odisha: "ओडिशा", Punjab: "पंजाब", Rajasthan: "राजस्थान", Sikkim: "सिक्किम", "Tamil Nadu": "तमिलनाडु",
  Telangana: "तेलंगाना", Tripura: "त्रिपुरा", "Uttar Pradesh": "उत्तर प्रदेश", Uttarakhand: "उत्तराखंड", "West Bengal": "पश्चिम बंगाल", "Andaman and Nicobar Islands": "अंडमान और निकोबार द्वीपसमूह",
  Chandigarh: "चंडीगढ़", "Dadra and Nagar Haveli and Daman and Diu": "दादरा और नगर हवेली तथा दमन और दीव", Delhi: "दिल्ली", "Jammu and Kashmir": "जम्मू और कश्मीर", Ladakh: "लद्दाख",
  Lakshadweep: "लक्षद्वीप", Puducherry: "पुदुच्चेरी",
  Balod: "बालोद", "Baloda Bazar": "बलौदाबाज़ार", "Balrampur-Ramanujganj": "बलरामपुर-रामानुजगंज", Bastar: "बस्तर", Bemetara: "बेमेतरा", Bijapur: "बीजापुर", Bilaspur: "बिलासपुर",
  Dantewada: "दंतेवाड़ा", Dhamtari: "धमतरी", Durg: "दुर्ग", Gariaband: "गरियाबंद", "Gaurela-Pendra-Marwahi": "गौरेला-पेंड्रा-मरवाही", "Janjgir-Champa": "जांजगीर-चांपा", Jashpur: "जशपुर",
  "Kabirdham (Kawardha)": "कबीरधाम (कवर्धा)", Kanker: "कांकेर", "Khairagarh-Chhuikhadan-Gandai": "खैरागढ़-छुईखदान-गंडई", Kondagaon: "कोंडागांव", Korba: "कोरबा", Koriya: "कोरिया",
  Mahasamund: "महासमुंद", "Manendragarh-Chirmiri-Bharatpur": "मनेंद्रगढ़-चिरमिरी-भरतपुर", "Mohla-Manpur-Ambagarh Chowki": "मोहला-मानपुर-अंबागढ़ चौकी", Mungeli: "मुंगेली",
  Narayanpur: "नारायणपुर", Raigarh: "रायगढ़", Raipur: "रायपुर", Rajnandgaon: "राजनांदगांव", Sakti: "सक्ती", "Sarangarh-Bilaigarh": "सारंगढ़-बिलाईगढ़", Sukma: "सुकमा", Surajpur: "सूरजपुर", Surguja: "सरगुजा",
};
export const placeName = (p: string, hi: boolean) => (hi ? PLACE_HI[p] ?? p : p);
