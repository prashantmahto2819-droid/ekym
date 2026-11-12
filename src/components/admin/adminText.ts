// One-language admin text. Older admin screens pass labels like "सदस्य · Members", "Title (English)" or plain
// English words; `tx(label, hi)` turns any of these into the chosen language only.

const PAIRS: [string, string][] = [
  ["Title", "शीर्षक"], ["Subtitle", "उपशीर्षक"], ["Description", "विवरण"], ["Message", "संदेश"], ["Name", "नाम"], ["Full name", "पूरा नाम"],
  ["Slug", "वेब पता (slug)"], ["Status", "स्थिति"], ["Image", "चित्र"], ["Photo", "फोटो"], ["Cover image", "कवर चित्र"], ["Logo", "लोगो"],
  ["Date", "दिनांक"], ["Start", "शुरुआत"], ["End", "समाप्ति"], ["Starts", "शुरुआत"], ["Ends", "समाप्ति"], ["Start date", "शुरू होने की तारीख"], ["End date", "समाप्ति की तारीख"],
  ["Order", "क्रम"], ["Sort order", "क्रम"], ["Position", "स्थान क्रम"], ["Published", "प्रकाशित"], ["Publish", "प्रकाशित करें"], ["Active", "सक्रिय"], ["Visible", "दिखाएँ"],
  ["Link", "लिंक"], ["Link URL", "लिंक"], ["URL", "लिंक"], ["Button text", "बटन का पाठ"], ["Button link", "बटन का लिंक"],
  ["Category", "श्रेणी"], ["Body", "मुख्य पाठ"], ["Content", "सामग्री"], ["Summary", "सारांश"], ["Excerpt", "सारांश"], ["Author", "लेखक"],
  ["Location", "स्थान"], ["Venue", "स्थान"], ["Phone", "फ़ोन"], ["Email", "ईमेल"], ["Mobile", "मोबाइल"], ["WhatsApp", "व्हाट्सऐप"], ["Address", "पता"],
  ["City", "शहर"], ["Village", "गाँव"], ["District", "ज़िला"], ["State", "राज्य"], ["Pincode", "पिन कोड"], ["Country", "देश"],
  ["Amount", "राशि"], ["Notes", "टिप्पणी"], ["Note", "टिप्पणी"], ["Remarks", "टिप्पणी"], ["Type", "प्रकार"], ["Kind", "प्रकार"], ["Featured", "विशेष"], ["Pinned", "ऊपर टिका"],
  ["Question", "प्रश्न"], ["Options", "विकल्प"], ["Answer", "उत्तर"], ["Designation", "पद"], ["Role", "भूमिका"], ["About", "परिचय"], ["Bio", "परिचय"],
  ["Video URL", "वीडियो लिंक"], ["Video", "वीडियो"], ["Tags", "टैग"], ["Price", "मूल्य"], ["Year", "वर्ष"], ["Month", "माह"], ["Issue no", "अंक संख्या"],
  ["Goal", "लक्ष्य"], ["Target", "लक्ष्य"], ["Raised", "जमा राशि"], ["Created", "बनाया गया"], ["Updated", "बदला गया"], ["Created at", "बनाया गया"],
  ["Gender", "लिंग"], ["Age", "आयु"], ["Date of birth", "जन्म तिथि"], ["Blood group", "रक्त समूह"], ["Occupation", "व्यवसाय"], ["Education", "शिक्षा"],
  ["Committee", "समिति"], ["Member", "सदस्य"], ["Members", "सदस्य"], ["Organization", "संगठन"], ["Organisation", "संगठन"], ["Website", "वेबसाइट"],
  ["Question (English)", "प्रश्न (अंग्रेज़ी में)"], ["Seats", "सीटें"], ["Capacity", "क्षमता"], ["Deadline", "अंतिम तिथि"], ["Expires", "समाप्ति"], ["Expires at", "समाप्ति"],
  ["Headline", "शीर्षक"], ["Featured image URL", "मुख्य चित्र"], ["Image URL", "चित्र"], ["Author (byline)", "लेखक का नाम"], ["Publish date", "प्रकाशन तिथि"],
  ["Show on homepage", "होम पेज पर दिखाएँ"], ["Breaking", "ताज़ा खबर"], ["SEO title", "खोज इंजन के लिए शीर्षक"], ["SEO description", "खोज इंजन के लिए विवरण"],
  ["Source (if external)", "स्रोत (बाहरी हो तो)"], ["External link", "बाहरी लिंक"], ["Views", "देखा गया"], ["Full story", "पूरी खबर"], ["Excerpt", "सार"], ["Content", "मुख्य पाठ"],
  ["सार", "Summary"], ["लेख", "Article"], ["पूरी खबर", "Full story"], ["विज्ञापन पाठ", "Ad text"], ["Text ad", "विज्ञापन पाठ"],
  ["Save", "सहेजें"], ["Saved", "सहेज लिया"], ["Saving…", "सहेज रहे हैं…"], ["Delete", "हटाएँ"], ["Deleted", "हटा दिया"], ["Edit", "बदलें"], ["New", "नया"], ["Add", "जोड़ें"],
  ["Cancel", "रद्द करें"], ["Close", "बंद करें"], ["Search", "खोजें"], ["Approve", "मंज़ूर करें"], ["Reject", "अस्वीकार करें"], ["Approved", "मंज़ूर"], ["Rejected", "अस्वीकार"],
  ["Pending", "बाकी"], ["review", "समीक्षा"], ["published", "प्रकाशित"], ["archived", "संग्रहित"], ["draft", "मसौदा"], ["new", "नया"], ["contacted", "संपर्क किया"], ["approved", "मंज़ूर"], ["rejected", "अस्वीकार"], ["pending", "बाकी"], ["submitted", "जमा"], ["shortlisted", "चयन सूची में"], ["selected", "चयनित"], ["closed", "बंद"], ["resolved", "हल हुआ"], ["active", "सक्रिय"], ["inactive", "निष्क्रिय"], ["verified", "सत्यापित"], ["fulfilled", "पूरा हुआ"], ["cancelled", "रद्द"], ["completed", "पूरा"], ["ongoing", "जारी"], ["upcoming", "आगामी"], ["Draft", "मसौदा"], ["Yes", "हाँ"], ["No", "नहीं"], ["All", "सभी"], ["Show more", "और दिखाएँ"], ["Loading…", "लोड हो रहा है…"], ["Download", "डाउनलोड"],
  ["Export", "निर्यात"], ["Import", "आयात"], ["Upload", "अपलोड"], ["Preview", "झलक"], ["Send", "भेजें"], ["Sent", "भेजा गया"], ["Failed", "विफल"], ["Actions", "कार्य"],
  ["Hidden", "छिपा"], ["Open", "खुला"], ["Closed", "बंद"], ["Paid", "भुगतान हुआ"], ["Unpaid", "भुगतान बाकी"], ["Verified", "सत्यापित"], ["Submitted", "जमा"],
  ["Mode", "माध्यम"], ["Reference", "संदर्भ"], ["Receipt", "रसीद"], ["Purpose", "उद्देश्य"], ["Total", "कुल"], ["Balance", "शेष"], ["Account", "खाता"],
  ["Program", "कार्यक्रम"], ["Programme", "कार्यक्रम"], ["Event", "आयोजन"], ["Events", "आयोजन"], ["News", "समाचार"], ["Blog", "लेख"], ["Articles", "लेख"], ["Magazine", "पत्रिका"],
  ["Comments", "टिप्पणियाँ"], ["Achievements", "उपलब्धियाँ"], ["Thoughts", "विचार"], ["Announcements", "सूचनाएँ"], ["Campaigns", "अभियान"], ["Library", "पुस्तकालय"],
  ["Books", "पुस्तकें"], ["Ads", "विज्ञापन"], ["Advertisements", "विज्ञापन"], ["Polls", "मतदान"], ["Jobs", "रोज़गार"], ["Scholarships", "छात्रवृत्ति"], ["Volunteers", "स्वयंसेवक"],
];
const EN2HI = new Map(PAIRS.map(([e, h]) => [e.toLowerCase(), h]));
const HI2EN = new Map(PAIRS.map(([e, h]) => [h, e]));
HI2EN.set("शीर्षक", "Title"); HI2EN.set("नाम", "Name"); HI2EN.set("स्थान", "Place"); HI2EN.set("टिप्पणी", "Notes"); HI2EN.set("सदस्य", "Members"); HI2EN.set("प्रकार", "Type");

const DEV = /[ऀ-ॿ]/;
const LAT = /[A-Za-z]{2,}/;

function word(s: string, hi: boolean): string {
  const t = s.trim();
  if (hi) return EN2HI.get(t.toLowerCase()) ?? t;
  return HI2EN.get(t) ?? t;
}

/** Shows a label in one language. */
export function tx(label: string | null | undefined, hi: boolean): string {
  if (!label) return "";
  const s = String(label);
  // "हिंदी · English" / "English · हिंदी" / "हिंदी / English"
  for (const sep of [" · ", " / ", " — "]) {
    if (!s.includes(sep)) continue;
    const parts = s.split(sep);
    if (parts.length === 2) {
      const [a, b] = parts as [string, string];
      const aDev = DEV.test(a) && !LAT.test(a.replace(/\([^)]*\)/g, "")), bDev = DEV.test(b) && !LAT.test(b.replace(/\([^)]*\)/g, ""));
      const aLat = !DEV.test(a) && LAT.test(a), bLat = !DEV.test(b) && LAT.test(b);
      if (aDev && bLat) return tx(hi ? a.trim() : b.trim(), hi);
      if (aLat && bDev) return tx(hi ? b.trim() : a.trim(), hi);
    }
  }
  // "Title (English)" ↔ "शीर्षक (हिंदी)" — labels that say which language to type in
  const m = /^(.*?)\s*\((English|अंग्रेज़ी|हिंदी|Hindi)\)\s*$/.exec(s);
  if (m) {
    const base = m[1]!, lang = m[2]!;
    const isHiField = lang === "हिंदी" || lang === "Hindi";
    return hi ? `${word(base, true)} (${isHiField ? "हिंदी में" : "अंग्रेज़ी में"})` : `${word(base, false)} (${isHiField ? "Hindi" : "English"})`;
  }
  return word(s, hi);
}
