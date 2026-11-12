// Merge fields: {{org.name}}, {{doc.ref_no}}, {{recipient.name}}, {{member.father}} …
export type MergeData = Record<string, unknown>;

export function lookup(data: MergeData, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, k) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[k] : undefined), data);
}

const TOKEN = /\{\{\s*([a-zA-Z0-9_.]+)\s*(?:\|\s*([a-z_]+))?\s*\}\}/g;

function format(v: unknown, fmt?: string): string {
  if (v === null || v === undefined) return "";
  if (fmt === "date" && typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    const [y, m, d] = v.slice(0, 10).split("-");
    return `${d}-${m}-${y}`;
  }
  if (fmt === "upper") return String(v).toUpperCase();
  if (fmt === "inr" && (typeof v === "number" || /^[\d.]+$/.test(String(v)))) {
    return "₹ " + Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (fmt === "words" && !Number.isNaN(Number(v))) return amountInWords(Number(v));
  if (fmt === "words_hi" && !Number.isNaN(Number(v))) return amountInWordsHi(Number(v));
  return String(v);
}

const OPTIONAL = /\[\[([\s\S]*?)\]\]/g;
const SEP = /[·•]/;
const DROP = "\u0000";

/** Fill {{tokens}}. `[[ … ]]` marks an optional segment that is dropped when any token inside it is empty
 *  (e.g. "[[Mob: {{member.mobile}}]]"). Separators (· •) left dangling by empty values are tidied away. */
export function mergeText(text: string, data: MergeData): string {
  const fill = (s: string) => s.replace(TOKEN, (_m, path: string, fmt?: string) => format(lookup(data, path), fmt));
  const withOptional = text.replace(OPTIONAL, (_m, inner: string) => {
    let empty = false;
    const out = inner.replace(TOKEN, (_t, path: string, fmt?: string) => { const v = format(lookup(data, path), fmt); if (!v.trim()) empty = true; return v; });
    return empty ? DROP : out;
  });
  // a line that held only dropped optional segments disappears completely (no blank gap in address blocks)
  const merged = fill(withOptional).split("\n").filter((ln) => !(ln.includes(DROP) && !ln.split(DROP).join("").trim())).join("\n").split(DROP).join("");
  if (!SEP.test(merged)) return merged;
  return merged.split("\n").map((ln) => ln
    .replace(/([ \t]*[·•][ \t]*){2,}/g, " · ")
    .replace(/^[ \t]*[·•][ \t]*/, "")
    .replace(/[ \t]*[·•][ \t]*$/, "")).join("\n");
}

/** Indian-system amount in words (rupees). */
export function amountInWords(n: number): string {
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = (x: number) => (x < 20 ? a[x]! : b[Math.floor(x / 10)]! + (x % 10 ? " " + a[x % 10] : ""));
  const three = (x: number) => (x >= 100 ? a[Math.floor(x / 100)] + " Hundred" + (x % 100 ? " " + two(x % 100) : "") : two(x));
  const rupees = Math.floor(n);
  const paise = Math.round((n - rupees) * 100);
  if (rupees === 0 && paise === 0) return "Zero Rupees Only";
  const parts: string[] = [];
  const crore = Math.floor(rupees / 1e7), lakh = Math.floor((rupees % 1e7) / 1e5), thou = Math.floor((rupees % 1e5) / 1000), rest = rupees % 1000;
  if (crore) parts.push(three(crore) + " Crore");
  if (lakh) parts.push(two(lakh) + " Lakh");
  if (thou) parts.push(two(thou) + " Thousand");
  if (rest) parts.push(three(rest));
  let out = (parts.join(" ") || "Zero") + " Rupees";
  if (paise) out += " and " + two(paise) + " Paise";
  return out + " Only";
}

const HI_0_99 = "शून्य एक दो तीन चार पाँच छह सात आठ नौ दस ग्यारह बारह तेरह चौदह पंद्रह सोलह सत्रह अठारह उन्नीस बीस इक्कीस बाईस तेईस चौबीस पच्चीस छब्बीस सत्ताईस अट्ठाईस उनतीस तीस इकतीस बत्तीस तैंतीस चौंतीस पैंतीस छत्तीस सैंतीस अड़तीस उनतालीस चालीस इकतालीस बयालीस तैंतालीस चवालीस पैंतालीस छियालीस सैंतालीस अड़तालीस उनचास पचास इक्यावन बावन तिरपन चौवन पचपन छप्पन सत्तावन अट्ठावन उनसठ साठ इकसठ बासठ तिरसठ चौंसठ पैंसठ छियासठ सड़सठ अड़सठ उनहत्तर सत्तर इकहत्तर बहत्तर तिहत्तर चौहत्तर पचहत्तर छिहत्तर सतहत्तर अठहत्तर उन्यासी अस्सी इक्यासी बयासी तिरासी चौरासी पचासी छियासी सत्तासी अट्ठासी नवासी नब्बे इक्यानबे बानबे तिरानबे चौरानबे पंचानबे छियानबे सत्तानबे अट्ठानबे निन्यानबे".split(" ");

/** Amount in Hindi words, Indian system: 11000 → "ग्यारह हज़ार रुपये मात्र". */
export function amountInWordsHi(n: number): string {
  const w = (x: number) => HI_0_99[x] ?? String(x);
  const three = (x: number) => (x >= 100 ? `${w(Math.floor(x / 100))} सौ${x % 100 ? " " + w(x % 100) : ""}` : w(x));
  const rupees = Math.floor(n);
  const paise = Math.round((n - rupees) * 100);
  const parts: string[] = [];
  const crore = Math.floor(rupees / 1e7), lakh = Math.floor((rupees % 1e7) / 1e5), thou = Math.floor((rupees % 1e5) / 1000), rest = rupees % 1000;
  if (crore) parts.push(three(crore) + " करोड़");
  if (lakh) parts.push(w(lakh) + " लाख");
  if (thou) parts.push(w(thou) + " हज़ार");
  if (rest) parts.push(three(rest));
  let out = (parts.join(" ") || "शून्य") + " रुपये";
  if (paise) out += " " + w(paise) + " पैसे";
  return out + " मात्र";
}
