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
