// Owner-written, point-wise details on a matrimony profile (stored in cm_matrimony_profiles.extra_fields).
export type ExtraGroup = "family" | "birth" | "personal" | "other";
export type ExtraField = { g: ExtraGroup; k: string; v: string };

export const EXTRA_GROUPS: { id: ExtraGroup; hi: string; en: string; icon: string; suggest: [string, string][] }[] = [
  { id: "family", hi: "पारिवारिक विवरण", en: "Family details", icon: "👨‍👩‍👧", suggest: [
    ["पिता का नाम", "Father's name"], ["पिता का व्यवसाय", "Father's occupation"], ["माता का नाम", "Mother's name"], ["माता का व्यवसाय", "Mother's occupation"],
    ["भाई", "Brothers"], ["बहन", "Sisters"], ["भाई-बहन (विवाहित / अविवाहित)", "Siblings (married / unmarried)"], ["परिवार में सदस्य संख्या", "Family members"], ["दादा", "Grandfather"], ["मामा (ननिहाल)", "Maternal uncle"], ["परिवार का प्रकार", "Family type"], ["पारिवारिक पता (ग्राम, तहसील, ज़िला, पिन)", "Family address (village, tehsil, district, PIN)"],
  ] },
  { id: "birth", hi: "जन्म व कुंडली", en: "Birth & horoscope", icon: "🪔", suggest: [
    ["जन्म तिथि", "Date of birth"], ["जन्म समय", "Time of birth"], ["जन्म स्थान", "Place of birth"], ["राशि", "Rashi"], ["नक्षत्र", "Nakshatra"], ["मांगलिक", "Manglik"], ["नाड़ी", "Nadi"], ["गण", "Gana"],
  ] },
  { id: "personal", hi: "व्यक्तिगत", en: "Personal", icon: "🙂", suggest: [
    ["जाति / उपजाति", "Caste / sub-caste"], ["कंपनी / संस्था", "Company / employer"], ["मासिक आय", "Monthly income"], ["रंग", "Complexion"], ["वज़न", "Weight"], ["रक्त समूह", "Blood group"], ["खान-पान", "Diet"], ["भाषाएँ", "Languages"], ["कार्यस्थल", "Work place"], ["वैवाहिक स्थिति", "Marital status"],
  ] },
  { id: "other", hi: "अन्य जानकारी", en: "Other details", icon: "📝", suggest: [["संपत्ति", "Property"], ["स्वयं का मकान", "Own house"], ["वाहन", "Vehicle"], ["कुलदेवी / कुलदेवता", "Family deity"], ["उपलब्धियाँ", "Achievements"], ["शुभेच्छु / संदर्भ", "Referred by"], ["विशेष", "Note"]] },
];

/** Clean rows from the database (drops empty / malformed rows). */
export function readExtra(x: unknown): ExtraField[] {
  if (!Array.isArray(x)) return [];
  return x.flatMap((r) => {
    const o = r as Partial<ExtraField>;
    const g = (["family", "birth", "personal", "other"] as const).includes(o.g as ExtraGroup) ? (o.g as ExtraGroup) : "other";
    const k = String(o.k ?? "").trim().slice(0, 60), v = String(o.v ?? "").trim().slice(0, 300);
    return k && v ? [{ g, k, v }] : [];
  }).slice(0, 40);
}

/** Splits free text into points when it is written point-wise (new lines, "-", "•", "*", "1." …). Returns null for a plain paragraph. */
export function points(text: string | null | undefined): string[] | null {
  if (!text) return null;
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const marked = lines.filter((l) => /^([-•*▪✓✔➤]|\d{1,2}[.)])\s*/.test(l)).length;
  if (lines.length < 2 && !marked) return null;
  return lines.map((l) => l.replace(/^([-•*▪✓✔➤]|\d{1,2}[.)])\s*/, ""));
}

// ---- सही क्रम: जाने-पहचाने शीर्षक बायोडाटा के सामान्य क्रम में; बाकी अपनी जगह के क्रम में सबसे बाद ----
const ORDER: RegExp[] = [
  /जाति|caste/i, /गोत्र|gotra/i, /जन्म\s*(तिथि|तारीख)|date of birth|dob/i, /जन्म\s*समय|time of birth/i, /जन्म\s*स्थान|place of birth/i,
  /आयु|\bage\b/i, /ऊँचाई|ऊंचाई|कद|height/i, /रंग|complexion/i, /वज़न|वजन|weight/i, /रक्त|blood/i,
  /शिक्षा|education|qualification/i, /व्यवसाय|profession|occupation|job/i, /कंपनी|संस्था|company|employer/i, /कार्यस्थल|work ?place/i, /आय|income|salary/i,
  /निवास|lives|residence/i, /मूल|native/i, /वैवाहिक स्थिति|marital/i, /खान|diet/i, /भाषा|language/i, /रुचि|interest|hobb/i,
  // परिवार
  /पिता का नाम|father'?s name/i, /पिता का व्यवसाय|father'?s occ/i, /माता का नाम|mother'?s name/i, /माता का व्यवसाय|mother'?s occ/i,
  /^भाई-बहन|sibling/i, /^भाई|brother/i, /^बहन|sister/i, /सदस्य संख्या|family members/i, /परिवार का प्रकार|family type/i,
  /दादा|grandfather/i, /नाना|मामा|maternal/i, /पता|address/i,
  // कुंडली
  /राशि|rashi/i, /नक्षत्र|nakshatra/i, /मांगलिक|मंगल|manglik/i, /नाड़ी|nadi/i, /गण|gana/i,
  // अन्य
  /स्वयं का मकान|own house/i, /संपत्ति|property/i, /वाहन|vehicle/i, /कुलदेव|deity/i, /उपलब्धि|achievement/i, /शुभेच्छु|संदर्भ|referred/i, /संपर्क|contact/i,
];
export const rankOf = (label: string) => { const i = ORDER.findIndex((r) => r.test(label)); return i < 0 ? 999 : i; };
/** Stable sort by the usual biodata order (unknown labels keep their order, at the end). */
export function inOrder<T extends { k: string }>(rows: T[]): T[] {
  return rows.map((r, i) => [r, i] as const).sort((a, b) => rankOf(a[0].k) - rankOf(b[0].k) || a[1] - b[1]).map(([r]) => r);
}
/** Birth rows that belong in the personal section (date / time / place of birth); the rest stay under कुंडली. */
export const isBirthBasic = (label: string) => /जन्म\s*(तिथि|तारीख|समय|स्थान)|date of birth|time of birth|place of birth|dob/i.test(label);
