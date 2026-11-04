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
  return String(v);
}

export function mergeText(text: string, data: MergeData): string {
  return text.replace(TOKEN, (_m, path: string, fmt?: string) => format(lookup(data, path), fmt));
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
