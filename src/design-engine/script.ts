// Script conversion for names and places, so a Hindi document prints everything in Devanagari and an English
// document everything in Latin letters. This is transliteration (sound for sound), not translation; a small
// dictionary covers common names, titles, designations and places so they come out the way people write them.

const PAIRS = `
kumar कुमार|kumari कुमारी|singh सिंह|devi देवी|bai बाई|lal लाल|ram राम|prasad प्रसाद|chand चंद|chandra चंद्र|
kashyap कश्यप|mahto महतो|sahu साहू|yadav यादव|verma वर्मा|sharma शर्मा|gupta गुप्ता|patel पटेल|das दास|nath नाथ|kishore किशोर|shankar शंकर|shiv शिव|
sunil सुनील|anil अनिल|ramesh रमेश|suresh सुरेश|mahesh महेश|dinesh दिनेश|mukesh मुकेश|rakesh राकेश|ashok अशोक|santosh संतोष|prashant प्रशांत|mohan मोहन|
rohit रोहित|rajesh राजेश|rajkumar राजकुमार|sunita सुनीता|geeta गीता|sita सीता|radha राधा|lakshmi लक्ष्मी|saraswati सरस्वती|parvati पार्वती|kamla कमला|
savitri सावित्री|ganga गंगा|hari हरि|krishna कृष्ण|gopal गोपाल|ganesh गणेश|mangal मंगल|prakash प्रकाश|vishnu विष्णु|dilip दिलीप|hemant हेमंत|
chauhan चौहान|thakur ठाकुर|pandey पांडेय|tiwari तिवारी|mishra मिश्रा|dubey दुबे|jha झा|rathore राठौर|nishad निषाद|kewat केवट|ananya अनन्या|priya प्रिया|amit अमित|
jaiswal जायसवाल|kannaujiya कन्नौजिया|kalar कलार|kalchuri कलचुरी|samaj समाज|pragatisheel प्रगतिशील|pragatishil प्रगतिशील|ekatm एकात्म|yuva युवा|manch मंच|sangh संघ|samiti समिति|parishad परिषद|
nagar नगर|pur पुर|para पारा|gaon गाँव|gram ग्राम|ward वार्ड|mohalla मोहल्ला|road रोड|chowk चौक|bazar बाजार|colony कॉलोनी|post पोस्ट|
district ज़िला|main मेन|tehsil तहसील|block ब्लॉक|near पास|house मकान|municipal नगर पालिका|community सामुदायिक|hall भवन|bhawan भवन|bhavan भवन|
korba कोरबा|raipur रायपुर|bilaspur बिलासपुर|kusmunda कुसमुण्डा|katghora कटघोरा|chhattisgarh छत्तीसगढ़|india भारत|adarsh आदर्श|vikas विकास|
durg दुर्ग|bhilai भिलाई|janjgir जांजगीर|champa चांपा|dipka दीपका|gevra गेवरा|mandir मंदिर|school विद्यालय|
shri श्री|smt श्रीमती|late स्व.|mr श्री|mrs श्रीमती|ms सुश्री|dr डॉ.|
volunteer स्वयंसेवक|seva सेवा|member सदस्य|life आजीवन|general सामान्य|ordinary सामान्य|patron संरक्षक|president अध्यक्ष|vice उपाध्यक्ष|
secretary सचिव|joint संयुक्त|treasurer कोषाध्यक्ष|coordinator समन्वयक|convener संयोजक|chairman अध्यक्ष|founder संस्थापक|executive कार्यकारिणी|
youth युवा|cash नकद|cheque चेक|online ऑनलाइन|bank बैंक|transfer ट्रांसफ़र|january जनवरी|february फ़रवरी|march मार्च|april अप्रैल|may मई|june जून|july जुलाई|august अगस्त|september सितम्बर|october अक्टूबर|november नवम्बर|december दिसम्बर|morning सुबह|evening शाम|afternoon दोपहर|night रात|women महिला|wing प्रकोष्ठ|unit इकाई|state प्रदेश|national राष्ट्रीय|honorary मानद|associate सहयोगी|senior वरिष्ठ|junior कनिष्ठ|
`.split("|").map((x) => x.trim()).filter(Boolean).map((x) => { const [k, ...v] = x.split(/\s+/); return [k!, v.join(" ")] as const; });

const TO_HI: Record<string, string> = Object.fromEntries(PAIRS);
// reverse: first English word wins for each Hindi word ("chairman"/"president" → President)
const TO_EN: Record<string, string> = {};
for (const [en, hi] of PAIRS) if (!TO_EN[hi]) TO_EN[hi] = en;
TO_EN["अध्यक्ष"] = "president"; TO_EN["दिसंबर"] = "december"; TO_EN["नवंबर"] = "november"; TO_EN["सितंबर"] = "september"; TO_EN["बजे"] = "o'clock"; TO_EN["उपाध्यक्ष"] = "vice president"; TO_EN["सामान्य"] = "general"; TO_EN["भवन"] = "bhawan"; TO_EN["ज़िला"] = "district"; TO_EN["जिला"] = "district";

const cap = (s: string) => s.replace(/(^|[\s(/-])([a-z])/g, (_m, a: string, b: string) => a + b.toUpperCase());

/* ---------- Devanagari → Latin ---------- */
const CONS: Record<string, string> = {
  "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "n", "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "n",
  "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n", "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
  "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m", "य": "y", "र": "r", "ल": "l", "व": "v", "श": "sh",
  "ष": "sh", "स": "s", "ह": "h", "ळ": "l",
};
const NUKTA: Record<string, string> = { "क": "q", "ख": "kh", "ग": "g", "ज": "z", "ड": "r", "ढ": "rh", "फ": "f" };
const VOW: Record<string, string> = { "अ": "a", "आ": "a", "इ": "i", "ई": "i", "उ": "u", "ऊ": "u", "ऋ": "ri", "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au", "ऑ": "o" };
const MAT: Record<string, string> = { "ा": "a", "ि": "i", "ी": "i", "ु": "u", "ू": "u", "ृ": "ri", "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ॉ": "o" };
const DIGIT = "०१२३४५६७८९";

function wordToLatin(w: string): string {
  const known = TO_EN[w] ?? TO_EN[w.replace(/\.$/, "")];
  if (known) return known;
  type Syl = { c: string; v: string; inherent: boolean };
  const out: (Syl | string)[] = [];
  const chars = [...w];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    if (CONS[ch]) {
      let c = CONS[ch]!;
      if (chars[i + 1] === "़") { c = NUKTA[ch] ?? c; i++; }
      const nx = chars[i + 1];
      if (nx === "्") { out.push({ c, v: "", inherent: false }); i++; }
      else if (nx && MAT[nx]) { out.push({ c, v: MAT[nx]!, inherent: false }); i++; }
      else out.push({ c, v: "a", inherent: true });
    } else if (VOW[ch]) out.push(VOW[ch]!);
    else if (ch === "ं" || ch === "ँ") out.push(chars[i + 1] && "पफबभम".includes(chars[i + 1]!) ? "m" : "n");
    else if (ch === "ः") out.push("h");
    else if (DIGIT.includes(ch)) out.push(String(DIGIT.indexOf(ch)));
    else if (ch === "।") out.push(".");
    else out.push(ch);
  }
  // schwa deletion: word-final inherent "a", and a medial one between a vowelled syllable and a vowelled consonant
  const syl = out.map((s) => (typeof s === "string" ? null : s));
  for (let i = syl.length - 1; i >= 0; i--) {
    const s = syl[i];
    if (!s || !s.inherent) continue;
    if (i === syl.length - 1) { if (i > 0) s.v = ""; continue; }
    const prev = syl[i - 1], next = syl[i + 1];
    if (i > 0 && prev && prev.v && next && next.v && !(i + 2 === syl.length && next.inherent)) s.v = "";
  }
  return out.map((s) => (typeof s === "string" ? s : s.c + s.v)).join("");
}

/** Devanagari words → Latin letters ("रमेश कुमार जायसवाल" → "Ramesh Kumar Jaiswal"); Latin text is left as it is. */
export function toLatin(text: string): string {
  if (!/[ऀ-ॿ]/.test(text)) return text;
  return cap(text.replace(/[ऀ-ॿ]+/g, (w) => wordToLatin(w)).replace(/।/g, "."));
}

/* ---------- Latin → Devanagari ---------- */
const DIGRAPHS: [string, string][] = [
  ["ksh", "क्ष"], ["chh", "छ"], ["shr", "श्र"], ["gy", "ज्ञ"],
  ["kh", "ख"], ["gh", "घ"], ["ch", "च"], ["jh", "झ"], ["th", "थ"], ["dh", "ध"], ["ph", "फ"], ["bh", "भ"], ["sh", "श"],
];
const LCONS: Record<string, string> = { k: "क", g: "ग", c: "क", j: "ज", t: "त", d: "द", n: "न", p: "प", b: "ब", m: "म", y: "य", r: "र", l: "ल", v: "व", w: "व", s: "स", h: "ह", f: "फ", z: "ज़", q: "क", x: "क्स" };
const LVOW: [string, string, string][] = [["aa", "आ", "ा"], ["ai", "ऐ", "ै"], ["au", "औ", "ौ"], ["ee", "ई", "ी"], ["oo", "ऊ", "ू"], ["ou", "औ", "ौ"], ["a", "अ", ""], ["i", "इ", "ि"], ["u", "उ", "ु"], ["e", "ए", "े"], ["o", "ओ", "ो"]];
const CLUSTER_SECOND = new Set(["r", "y", "l", "v", "w"]);
const CLUSTER_PAIRS = new Set(["st", "sk", "sm", "sn", "sp", "nt", "nd", "nk", "ng", "nj", "mb", "mp", "kt", "pt", "ty", "dy", "ny", "my", "ly", "ry", "vy", "sy", "hy", "tm", "dm", "gn", "ks", "lm", "lp", "lk", "ld", "lt", "rm", "rt", "rd", "rn", "rs", "rk", "rg", "rp", "rb", "rj", "rv", "rl", "dr", "tr", "pr", "br", "gr", "kr", "fr", "sr", "cr", "dv", "tv", "sv", "kv"]);

function wordToHindi(w: string): string {
  const low = w.toLowerCase();
  if (TO_HI[low]) return TO_HI[low]!;
  for (let i = 2; i <= low.length - 2; i++) {
    const a = TO_HI[low.slice(0, i)], b = TO_HI[low.slice(i)];
    if (a && b) return a + b;
  }
  type Tok = { c?: string; r?: string; v?: [string, string, string]; o?: string };
  const toks: Tok[] = [];
  for (let i = 0; i < low.length;) {
    const rest = low.slice(i);
    const hit = DIGRAPHS.find(([r]) => rest.startsWith(r));
    if (hit) { toks.push({ c: hit[1], r: hit[0] }); i += hit[0].length; continue; }
    const v = LVOW.find(([r]) => rest.startsWith(r));
    if (v) { toks.push({ v, r: v[0] }); i += v[0].length; continue; }
    const ch = low[i]!;
    if (LCONS[ch]) { toks.push({ c: ch === "c" && /^c[ei]/.test(rest) ? "स" : LCONS[ch]!, r: ch }); i++; continue; }
    toks.push({ o: ch }); i++;
  }
  let out = "";
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]!, prev = toks[i - 1], next = toks[i + 1];
    if (t.o !== undefined) { out += t.o; continue; }
    if (t.c) {
      out += t.c;
      if (next?.c) {
        const pair = (t.r ?? "") + (next.r ?? "");
        if (t.r === next.r || CLUSTER_PAIRS.has(pair) || (CLUSTER_SECOND.has(next.r ?? "") && "kgptdbsc".includes(t.r ?? "-"))) out += "्";
      }
      continue;
    }
    const [roman, full, matra] = t.v!;
    const isLast = !next;
    if (!prev || !prev.c) { out += full; continue; }
    if (roman === "a") { if (isLast) out += "ा"; continue; }
    if (roman === "i" && isLast) { out += "ी"; continue; }
    out += matra;
  }
  return out;
}

/** Latin words → Devanagari ("Ramesh Kumar" → "रमेश कुमार"); words already in Devanagari are left as they are.
 *  Tokens that look like codes (contain digits, or are all capitals like "PJKKS", "UPI") are kept as typed. */
export function toDevanagari(text: string): string {
  if (!/[A-Za-z]/.test(text)) return text;
  return text.replace(/\bc\.\s?g\.?/gi, "छ.ग.").replace(/[A-Za-z][A-Za-z.]*/g, (w) => {
    if (/^[A-Z]{2,}$/.test(w.replace(/\./g, ""))) return w;
    const dot = w.endsWith(".") ? "." : "";
    const core = w.replace(/\.+$/, "");
    const hi = wordToHindi(core);
    return hi.endsWith(".") ? hi : hi + dot;
  });
}
