// One place to read state / district names right, whatever way they were typed: English or Hindi, old names
// (Orissa, Pondicherry), India Post spellings (Chattisgarh), short forms (CG, MP), any case or spacing.
// Stored values are always the English names of lib/locations + lib/districts; Hindi is only for showing.
// The database does the same on save (migration k1_places: public.k1_canon_state / k1_canon_district).
import { PLACE_HI } from "@/core/formText";
import { ALL_DISTRICTS, DISTRICT_HI, DISTRICTS } from "@/lib/districts";
import { INDIAN_STATES } from "@/lib/locations";

const key = (s: string) => s.toLowerCase().normalize("NFC").replace(/&/g, "and").replace(/[^a-zऀ-ॿ]/g, "");

const STATE_ALIASES: Record<string, string> = {
  chattisgarh: "Chhattisgarh", chhatisgarh: "Chhattisgarh", chattishgarh: "Chhattisgarh", cg: "Chhattisgarh",
  orissa: "Odisha", pondicherry: "Puducherry", uttaranchal: "Uttarakhand", uk: "Uttarakhand",
  newdelhi: "Delhi", nctofdelhi: "Delhi", jandk: "Jammu and Kashmir", jk: "Jammu and Kashmir", jammukashmir: "Jammu and Kashmir",
  dadraandnagarhaveli: "Dadra and Nagar Haveli and Daman and Diu", damananddiu: "Dadra and Nagar Haveli and Daman and Diu",
  andamanandnicobar: "Andaman and Nicobar Islands", andamannicobar: "Andaman and Nicobar Islands",
  up: "Uttar Pradesh", mp: "Madhya Pradesh", ap: "Andhra Pradesh", wb: "West Bengal", tn: "Tamil Nadu", hp: "Himachal Pradesh",
  "पुदुच्चेरी": "Puducherry", "उड़ीसा": "Odisha", "उडीसा": "Odisha", "छत्तीसगढ": "Chhattisgarh",
};
const STATE_BY_KEY = new Map<string, string>();
for (const s of INDIAN_STATES) { STATE_BY_KEY.set(key(s), s); if (PLACE_HI[s]) STATE_BY_KEY.set(key(PLACE_HI[s]), s); }
for (const [k, s] of Object.entries(STATE_ALIASES)) STATE_BY_KEY.set(key(k), s);

/** The official English state name for any spelling; "" when it is not an Indian state / UT. */
export function canonState(input: string | null | undefined): string {
  const t = String(input ?? "").trim();
  return t ? STATE_BY_KEY.get(key(t)) ?? "" : "";
}

const hiOf = (d: string) => PLACE_HI[d] ?? DISTRICT_HI[d];
const DIST_BY_KEY = new Map<string, { d: string; s: string }[]>();
for (const x of ALL_DISTRICTS) {
  for (const k of [key(x.d), hiOf(x.d) ? key(hiOf(x.d)!) : "", key(x.d.replace(/\s*\(.*\)\s*/g, ""))]) {
    if (!k) continue;
    const list = DIST_BY_KEY.get(k) ?? [];
    if (!list.some((y) => y.d === x.d && y.s === x.s)) list.push(x);
    DIST_BY_KEY.set(k, list);
  }
}
// Old / other names people still use
const DIST_ALIASES: Record<string, [string, string]> = {
  kawardha: ["Kabirdham (Kawardha)", "Chhattisgarh"], kabirdham: ["Kabirdham (Kawardha)", "Chhattisgarh"],
  janjgir: ["Janjgir-Champa", "Chhattisgarh"], gpm: ["Gaurela-Pendra-Marwahi", "Chhattisgarh"],
  gurgaon: ["Gurugram", "Haryana"], allahabad: ["Prayagraj", "Uttar Pradesh"], faizabad: ["Ayodhya", "Uttar Pradesh"],
  bangalore: ["Bengaluru Urban", "Karnataka"], bombay: ["Mumbai City", "Maharashtra"], calcutta: ["Kolkata", "West Bengal"],
  aurangabad: ["Chhatrapati Sambhajinagar", "Maharashtra"], osmanabad: ["Dharashiv", "Maharashtra"], ahmednagar: ["Ahilyanagar", "Maharashtra"],
};

/** The official district (and its state) for any spelling; the typed text back, trimmed, when it is not in the list. */
export function canonDistrict(input: string | null | undefined, state?: string | null): { district: string; state: string; known: boolean } {
  const t = String(input ?? "").trim().replace(/\s+/g, " ");
  const st = canonState(state);
  if (!t) return { district: "", state: st, known: false };
  const k = key(t.replace(/\s*(district|distt\.?|dist\.?|ज़िला|जिला)\s*$/i, ""));
  const al = DIST_ALIASES[k];
  if (al && DISTRICTS[al[1]]?.includes(al[0]) && (!st || st === al[1])) return { district: al[0], state: al[1], known: true };
  const hits = DIST_BY_KEY.get(k) ?? [];
  const inState = st ? hits.filter((h) => h.s === st) : hits;
  if (inState.length === 1) return { district: inState[0]!.d, state: inState[0]!.s, known: true };
  return { district: t, state: st, known: false };
}

/** Name to show: the official spelling, in Hindi when asked and known; else as stored. */
export function placeLabel(name: string | null | undefined, hi: boolean): string {
  const n = String(name ?? "").trim();
  if (!n) return n;
  const st = canonState(n);
  if (st) return hi ? PLACE_HI[st] ?? st : st;
  const d = canonDistrict(n);
  const nm = d.known ? d.district : n;
  return hi ? hiOf(nm) ?? nm : nm;
}

/** "Village, City, District, State" without blanks or repeats, in Hindi when asked. */
export function placeLine(parts: (string | null | undefined)[], hi: boolean): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const l = placeLabel(p, hi);
    if (!l || seen.has(key(l))) continue;
    seen.add(key(l)); out.push(l);
  }
  return out.join(", ");
}

/** States first, then union territories, each with its Hindi name. */
export const STATE_OPTIONS = INDIAN_STATES.map((s) => ({ value: s, hi: PLACE_HI[s] ?? s }));
