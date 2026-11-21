// @ts-nocheck — शोकपत्र ऐप की js/hindi.js और js/similar.js (normName) की नक़ल; वहाँ बदले तो यहाँ भी बदलिए।
// Roman → Devanagari guess (offline dictionary + rules) and a spelling-tolerant key for comparing names.
export const hasLatin = (s: unknown): boolean => /[A-Za-z]/.test(String(s || ""));

// आम नाम, उपनाम और पते के शब्द: इन्हें सीधे सही रूप में लिखा जाता है
const DICT = Object.fromEntries(`
kumar कुमार|kumari कुमारी|singh सिंह|devi देवी|bai बाई|lal लाल|ram राम|ramlal रामलाल|prasad प्रसाद|chand चंद|chandra चंद्र|chandrashekhar चंद्रशेखर|
kashyap कश्यप|mahto महतो|sahu साहू|yadav यादव|verma वर्मा|sharma शर्मा|gupta गुप्ता|patel पटेल|das दास|nath नाथ|kishore किशोर|shankar शंकर|shiv शिव|
sunil सुनील|anil अनिल|ramesh रमेश|suresh सुरेश|mahesh महेश|dinesh दिनेश|mukesh मुकेश|rakesh राकेश|ashok अशोक|santosh संतोष|prashant प्रशांत|mohan मोहन|
rohit रोहित|rajesh राजेश|rajkumar राजकुमार|sunita सुनीता|geeta गीता|gita गीता|sita सीता|radha राधा|lakshmi लक्ष्मी|saraswati सरस्वती|parvati पार्वती|kamla कमला|
savitri सावित्री|ganga गंगा|jamuna जमुना|hari हरि|krishna कृष्ण|gopal गोपाल|ganesh गणेश|mangal मंगल|bhola भोला|budhram बुधराम|sukhlal सुखलाल|harilal हरिलाल|
sant संत|prakash प्रकाश|vishnu विष्णु|dilip दिलीप|gudiya गुड़िया|hemant हेमंत|chauhan चौहान|thakur ठाकुर|pandey पांडेय|tiwari तिवारी|mishra मिश्रा|dubey दुबे|jha झा|rathore राठौर|nishad निषाद|kewat केवट|
nagar नगर|pur पुर|para पारा|gaon गाँव|gram ग्राम|village गाँव|ward वार्ड|mohalla मोहल्ला|road रोड|chowk चौक|bazar बाजार|bazaar बाजार|colony कॉलोनी|post पोस्ट|
jila ज़िला|dist ज़िला|distt ज़िला|district ज़िला|tehsil तहसील|thana थाना|block ब्लॉक|near के पास|opposite सामने|behind पीछे|house मकान|no नं|number नंबर|
korba कोरबा|raipur रायपुर|bilaspur बिलासपुर|kusmunda कुसमुंडा|katghora कटघोरा|chhattisgarh छत्तीसगढ़|chattisgarh छत्तीसगढ़|cg छ.ग.|india भारत|
charameti चरामेटी|dipka दीपका|gevra गेवरा|baikunthpur बैकुंठपुर|janjgir जांजगीर|champa चांपा|durg दुर्ग|bhilai भिलाई|rajnandgaon राजनांदगाँव|
mandir मंदिर|school स्कूल|hospital अस्पताल|sector सेक्टर|gali गली|main मेन|shri श्री|sri श्री|smt श्रीमती|late स्व.|mr श्री|mrs श्रीमती|adarsh आदर्श|vikas विकास|
`.split("|").map(x => x.trim()).filter(Boolean).map(x => { const [k, ...v] = x.split(/\s+/); return [k, v.join(" ")]; }));

const DIGRAPHS = [
  ["ksh", "क्ष"], ["chh", "छ"], ["shr", "श्र"], ["gy", "ज्ञ"],
  ["kh", "ख"], ["gh", "घ"], ["ch", "च"], ["jh", "झ"], ["th", "थ"], ["dh", "ध"], ["ph", "फ"], ["bh", "भ"], ["sh", "श"],
];
const CONS = { k: "क", g: "ग", c: "क", j: "ज", t: "त", d: "द", n: "न", p: "प", b: "ब", m: "म", y: "य", r: "र", l: "ल", v: "व", w: "व", s: "स", h: "ह", f: "फ", z: "ज़", q: "क", x: "क्स" };
const VOW = [["aa", "आ", "ा"], ["ai", "ऐ", "ै"], ["au", "औ", "ौ"], ["ee", "ई", "ी"], ["oo", "ऊ", "ू"], ["ou", "औ", "ौ"], ["a", "अ", ""], ["i", "इ", "ि"], ["u", "उ", "ु"], ["e", "ए", "े"], ["o", "ओ", "ो"]];
// ये जोड़ी आधे अक्षर के साथ लिखी जाती हैं (जैसे प्र, स्त, न्द); बाकी जोड़ी में अक्षर अलग-अलग रहते हैं
const CLUSTER_SECOND = new Set(["r", "y", "l", "v", "w"]);
const CLUSTER_PAIRS = new Set(["st", "sk", "sm", "sn", "sp", "nt", "nd", "nk", "ng", "nj", "mb", "mp", "kt", "pt", "ty", "dy", "ny", "my", "ly", "ry", "vy", "sy", "hy", "tm", "dm", "gn", "ks", "lm", "lp", "lk", "ld", "lt", "rm", "rt", "rd", "rn", "rs", "rk", "rg", "rp", "rb", "rj", "rv", "rl", "dr", "tr", "pr", "br", "gr", "kr", "fr", "sr", "cr", "dv", "tv", "sv", "kv"]);

function wordToHindi(w: string): string {
  const low = w.toLowerCase();
  if (DICT[low]) return DICT[low];
  // जुड़े हुए शब्द (जैसे "ramkumar"): दो जाने-पहचाने हिस्सों में तोड़कर देखें
  for (let i = 2; i <= low.length - 2; i++) {
    const a = DICT[low.slice(0, i)], b = DICT[low.slice(i)];
    if (a && b) return a + b;
  }
  const toks = []; // {c: देवनागरी व्यंजन} या {v: [स्वर, मात्रा]}
  for (let i = 0; i < low.length;) {
    const rest = low.slice(i);
    let hit = DIGRAPHS.find(([r]) => rest.startsWith(r));
    if (hit) { toks.push({ c: hit[1], r: hit[0] }); i += hit[0].length; continue; }
    const v = VOW.find(([r]) => rest.startsWith(r));
    if (v) { toks.push({ v, r: v[0] }); i += v[0].length; continue; }
    const ch = low[i];
    if (CONS[ch]) { toks.push({ c: ch === "c" && /^c[ei]/.test(rest) ? "स" : CONS[ch], r: ch }); i++; continue; }
    toks.push({ o: ch }); i++; // अंक, चिह्न आदि जैसे के तैसे
  }
  let out = "";
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i], prev = toks[i - 1], next = toks[i + 1];
    if (t.o !== undefined) { out += t.o; continue; }
    if (t.c) {
      out += t.c;
      // अगला अक्षर भी व्यंजन हो और जोड़ी जानी-पहचानी या दोहरी हो, तो आधा अक्षर (हलंत) लगाएँ
      if (next && next.c) {
        const pair = t.r + next.r;
        if (t.r === next.r || CLUSTER_PAIRS.has(pair) || (CLUSTER_SECOND.has(next.r) && "kgptdbsc".includes(t.r))) out += "्";
      }
      continue;
    }
    // स्वर
    const [roman, full, matra] = t.v;
    const isLast = !next;
    if (!prev || !prev.c) { out += full; continue; }
    if (roman === "a") { if (isLast) out += "ा"; continue; } // बीच का 'a' = छोटा अ (कोई मात्रा नहीं), आख़िर का 'a' = ा
    if (roman === "i" && isLast) { out += "ी"; continue; }
    out += matra;
  }
  return out;
}

/** पाठ में जो शब्द अंग्रेज़ी में हैं, सिर्फ़ उन्हें देवनागरी में बदलता है। */
export function toHindi(text: unknown): string {
  return String(text || "").replace(/\bc\.\s?g\.?/gi, "छ.ग.").replace(/[A-Za-z]+/g, (w: string) => wordToHindi(w));
}

/** नाम की तुलना के लिए सामान्य रूप: अंग्रेज़ी → हिंदी, नुक़्ता / चंद्रबिंदु / आधा न-म / छोटी-बड़ी इ-उ का फ़र्क नहीं, खाली जगह-चिह्न हटें */
export function normName(s: unknown): string {
  let v = String(s ?? "");
  if (hasLatin(v)) { try { v = toHindi(v); } catch { /* वैसा ही */ } }
  return v.toLowerCase().normalize("NFC")
    .replace(/़/g, "").replace(/ँ/g, "ं")
    .replace(/[नमणङञ]्(?=[क-ह])/g, "ं")
    .replace(/ि/g, "ी").replace(/ु/g, "ू")
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "");
}
