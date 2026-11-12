// Built-in starter templates. Organizations copy these and edit them in the Studio.
// Every template comes in two complete language versions: "hi" (all labels, headings and amount-in-words in Hindi)
// and "en" (all in English). Names and other merge values are printed as entered.
import { pagePx } from "./model";
import { mm, newDoc, uid, type DesignDoc, type FontKey, type Layer } from "./model";

export type Brand = { name: string; name_hi?: string | null | undefined; tagline?: string | null | undefined; address?: string | null | undefined; phone?: string | null | undefined; email?: string | null | undefined; website?: string | null | undefined; logo?: string | null | undefined; color?: string | undefined };
export type Lang = "hi" | "en";

const ink = "#1b2a4a";
const muted = "#5b6474";
const gold = "#b8924a";

/** "#rrggbb" + alpha → "#rrggbbaa" (falls back to the colour itself for other formats). */
const tint = (hex: string, a: number) => (/^#[0-9a-f]{6}$/i.test(hex) ? hex + Math.round(a * 255).toString(16).padStart(2, "0") : hex);
/** Darker shade of a "#rrggbb" colour for gradients. */
const shade = (hex: string, f = 0.68) => {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const n = (i: number) => Math.round(parseInt(hex.slice(i, i + 2), 16) * f).toString(16).padStart(2, "0");
  return `#${n(1)}${n(3)}${n(5)}`;
};

/** Language kit: label picker, fonts and the organisation-name field for this language. */
function kit(lang: Lang) {
  const hi = lang === "hi";
  return {
    hi,
    t: (h: string, e: string) => (hi ? h : e),
    head: (hi ? "tiro" : "sora") as FontKey,
    body: (hi ? "mukta" : "manrope") as FontKey,
    serif: (hi ? "tiro" : "notoserif") as FontKey,
    org: hi ? "{{org.name_hi}}" : "{{org.name}}",
    words: hi ? "{{receipt.amount|words_hi}}" : "{{receipt.amount|words}}",
    // labels in capitals get letter spacing only in English (spacing breaks Devanagari joins)
    ls: (v: number) => (hi ? 0 : v),
  };
}
const logo = (x: number, y: number, size: number, color: string, extra: Partial<Extract<Layer, { type: "image" }>> = {}): Layer =>
  ({ id: uid(), type: "image", name: "Logo", src: "{{org.logo}}", x, y, w: size, h: size, fit: "contain", monogram: "{{org.name_hi}}{{org.name}}", color, ...extra });

/* ---------- letterhead: logo + name block left, contacts right, double rule; footer band ---------- */
function header(lang: Lang, W: number, accent: string): Layer[] {
  const k = kit(lang);
  const m = mm(16), top = mm(13), L = mm(25), tx = m + L + mm(5), cw = mm(58), tw = W - tx - m - cw - mm(4);
  return [
    { id: uid(), type: "rect", name: "Top band", x: 0, y: 0, w: W, h: mm(4), fill: accent, fill2: gold, grad: "h" },
    logo(m, top, L, accent),
    { id: uid(), type: "text", name: "Organization name", text: k.org, x: tx, y: top, w: tw, h: mm(10), size: k.hi ? 26 : 21, weight: 700, font: k.head, color: accent, lh: k.hi ? 36 : 30, fit: true },
    { id: uid(), type: "text", name: "Tagline", text: "{{org.tagline}}", x: tx, y: top + 40, w: tw, size: 11, font: k.body, italic: true, color: gold, lh: 16 },
    { id: uid(), type: "text", name: "Address line", text: "{{org.address}}", x: tx, y: top + 60, w: tw, size: 9.5, font: k.body, color: muted, lh: 13 },
    { id: uid(), type: "text", name: "Contacts", text: k.t("[[फ़ोन  **{{org.phone}}**]]\n[[व्हाट्सऐप  **{{org.whatsapp}}**]]\n[[{{org.email}}]]\n[[{{org.website}}]]\n[[पंजीयन क्र. {{org.registration_no}}]]", "[[Phone  **{{org.phone}}**]]\n[[WhatsApp  **{{org.whatsapp}}**]]\n[[{{org.email}}]]\n[[{{org.website}}]]\n[[Reg. No. {{org.registration_no}}]]"), x: W - m - cw, y: top + 4, w: cw, size: 9.5, font: k.body, color: ink, align: "right", lh: 15 },
    { id: uid(), type: "line", name: "Header rule", x: m, y: mm(41), w: W - 2 * m, lw: 2.2, color: accent },
    { id: uid(), type: "line", name: "Header rule (gold)", x: m, y: mm(41) + 4.5, w: W - 2 * m, lw: 0.8, color: gold },
  ];
}
function footer(lang: Lang, W: number, H: number, accent: string): Layer[] {
  const k = kit(lang);
  const m = mm(16);
  return [
    { id: uid(), type: "art", name: "Watermark", art: "mandala", x: W / 2 - mm(70), y: H / 2 - mm(60), w: mm(140), h: mm(140), color: accent, opacity: 0.045 },
    { id: uid(), type: "text", name: "Page credit", text: "Kalchuri One · kalchuri.org", x: m, y: H - mm(15.5), w: W - 2 * m, size: 7, font: "manrope", color: "#9ca3af", align: "right", lh: 9 },
    { id: uid(), type: "rect", name: "Footer band", x: 0, y: H - mm(11), w: W, h: mm(11), fill: accent, fill2: shade(accent), grad: "h" },
    { id: uid(), type: "text", name: "Footer", text: "{{org.address}} · {{org.phone}} · {{org.website}}", x: m, y: H - mm(8.6), w: W - 2 * m, h: mm(5), size: 9.5, font: k.body, color: "#ffffff", align: "center", lh: 15, fit: true },
  ];
}

export function letterheadTemplate(b: Brand, lang: Lang = "hi"): DesignDoc {
  const accent = b.color ?? "#0f766e";
  const doc = newDoc("a4p");
  const W = Math.round(mm(210)), H = Math.round(mm(297));
  doc.master = [...header(lang, W, accent), ...footer(lang, W, H, accent)];
  doc.fields = [];
  return doc;
}

export function letterTemplate(b: Brand, lang: Lang = "hi"): DesignDoc {
  const k = kit(lang);
  const accent = b.color ?? "#0f766e";
  const doc = letterheadTemplate(b, lang);
  const W = Math.round(mm(210)), H = Math.round(mm(297)), m = mm(18);
  const top = mm(48);
  const sigY = H - mm(66);
  doc.pages[0]!.layers = [
    { id: uid(), type: "text", name: "Ref no", text: k.t("पत्रांक:  **{{doc.ref_no}}**", "Ref. No.:  **{{doc.ref_no}}**"), x: m, y: top, w: mm(100), size: 11, font: k.body, color: ink, lh: 16 },
    { id: uid(), type: "text", name: "Date", text: k.t("दिनांक:  **{{doc.date|date}}**", "Date:  **{{doc.date|date}}**"), x: W - m - mm(70), y: top, w: mm(70), size: 11, font: k.body, color: ink, align: "right", lh: 16 },
    { id: uid(), type: "text", name: "Recipient", text: k.t("सेवा में,", "To,") + "\n**{{recipient.name}}**\n[[{{recipient.designation}}]]\n[[{{recipient.organization}}]]\n[[{{recipient.address}}]]", x: m, y: top + mm(9), w: mm(115), size: 11.5, font: k.body, color: ink, lh: 17 },
    { id: uid(), type: "rect", name: "Subject band", x: m, y: top + mm(38), w: W - 2 * m, h: mm(9), radius: 4, fill: tint(accent, 0.08) },
    { id: uid(), type: "rect", name: "Subject mark", x: m, y: top + mm(38), w: mm(1.2), h: mm(9), fill: accent },
    { id: uid(), type: "text", name: "Subject", text: k.t("विषय:  **{{doc.subject}}**", "Subject:  **{{doc.subject}}**"), x: m + mm(4), y: top + mm(39.4), w: W - 2 * m - mm(6), size: 11.5, font: k.body, color: ink, lh: 17 },
    { id: uid(), type: "text", name: "Salutation", text: "{{doc.salutation}}", x: m, y: top + mm(52), w: W - 2 * m, size: 11.5, font: k.body, color: ink, lh: 17 },
    { id: uid(), type: "flow", name: "Body", text: "{{doc.body}}", x: m, y: top + mm(60), w: W - 2 * m, h: sigY - mm(4) - (top + mm(60)), size: 11.5, font: k.body, color: ink, lh: 18, align: "justify" },
    { id: uid(), type: "text", name: "Closing", text: "{{doc.closing}}", x: W - m - mm(70), y: sigY, w: mm(70), size: 11, font: k.body, color: ink, align: "center", lh: 16, lastPageOnly: true },
    { id: uid(), type: "line", name: "Sign rule", x: W - m - mm(62), y: sigY + mm(22), w: mm(54), lw: 0.8, color: muted, lastPageOnly: true },
    { id: uid(), type: "text", name: "Signature", text: "**{{signatory.name}}**\n{{signatory.designation}}\n" + k.org, x: W - m - mm(70), y: sigY + mm(24), w: mm(70), size: 10.5, font: k.body, color: ink, align: "center", lh: 15, lastPageOnly: true },
    { id: uid(), type: "qr", name: "Verify QR", data: "{{doc.verify_url}}", x: m, y: sigY + mm(10), w: mm(19), h: mm(19), color: ink, lastPageOnly: true },
    { id: uid(), type: "text", name: "Verify hint", text: k.t("सत्यापन हेतु\nस्कैन करें", "Scan to\nverify"), x: m + mm(22), y: sigY + mm(13), w: mm(40), size: 8.5, font: k.body, color: muted, lh: 12, lastPageOnly: true },
  ];
  doc.fields = [
    { key: "recipient.name", label: "Recipient name", label_hi: "प्राप्तकर्ता का नाम" },
    { key: "recipient.designation", label: "Recipient designation", label_hi: "पद" },
    { key: "recipient.organization", label: "Recipient organization", label_hi: "संस्था" },
    { key: "recipient.address", label: "Recipient address", label_hi: "पता" },
    { key: "doc.salutation", label: "Salutation", label_hi: "संबोधन", sample: k.t("महोदय / महोदया,", "Respected Sir/Madam,") },
    { key: "doc.closing", label: "Closing", label_hi: "समापन", sample: k.t("भवदीय,", "Yours sincerely,") },
    { key: "signatory.name", label: "Signatory name", label_hi: "हस्ताक्षरकर्ता" },
    { key: "signatory.designation", label: "Signatory designation", label_hi: "हस्ताक्षरकर्ता का पद" },
  ];
  return doc;
}

/* ---------- certificate: cream paper, double gold frame, corner ornaments, mandala watermark, seal ---------- */
export function certificateTemplate(b: Brand, lang: Lang = "hi"): DesignDoc {
  const k = kit(lang);
  const accent = b.color && b.color !== "#0f766e" ? b.color : "#1b3a5c";
  const doc = newDoc("a4l", "#fffcf3");
  const W = Math.round(mm(297)), H = Math.round(mm(210)), m = mm(8), o = mm(16);
  const corner = (x: number, y: number, rot: number): Layer => ({ id: uid(), type: "art", name: "Corner", art: "ornament", x, y, w: mm(20), h: mm(20), color: gold, rot });
  doc.master = [
    { id: uid(), type: "rect", name: "Edge", x: 0, y: 0, w: W, h: H, lw: mm(4), color: accent },
    { id: uid(), type: "frame", name: "Border", style: "double", x: m, y: m, w: W - 2 * m, h: H - 2 * m, color: gold, lw: 2.6, radius: 4 },
    corner(o, o, 0), corner(W - o - mm(20), o, 90), corner(W - o - mm(20), H - o - mm(20), 180), corner(o, H - o - mm(20), 270),
    { id: uid(), type: "art", name: "Watermark", art: "mandala", x: W / 2 - mm(62), y: H / 2 - mm(52), w: mm(124), h: mm(124), color: gold, opacity: 0.07 },
  ];
  const cw = W - mm(90);
  doc.pages[0]!.layers = [
    logo(W / 2 - mm(11), mm(17), mm(22), accent),
    { id: uid(), type: "text", name: "Organization", text: k.org, x: mm(40), y: mm(41), w: W - mm(80), h: mm(9), size: k.hi ? 23 : 19, weight: 700, font: k.head, color: accent, align: "center", lh: 32, fit: true },
    { id: uid(), type: "text", name: "Address", text: "{{org.address}}", x: mm(50), y: mm(50.5), w: W - mm(100), h: mm(5), size: 10, font: k.body, color: muted, align: "center", lh: 15, fit: true },
    { id: uid(), type: "text", name: "Title", text: k.t("प्रमाण-पत्र", "CERTIFICATE"), x: mm(40), y: mm(58), w: W - mm(80), size: k.hi ? 48 : 42, weight: 700, font: k.serif, color: gold, align: "center", lh: 62, ls: k.ls(8) },
    { id: uid(), type: "text", name: "Subtitle", text: k.t("{{doc.certificate_type}}", "OF {{doc.certificate_type|upper}}"), x: mm(40), y: mm(76), w: W - mm(80), size: k.hi ? 17 : 13, weight: 600, font: k.hi ? "mukta" : "sora", color: accent, align: "center", lh: 22, ls: k.ls(5) },
    { id: uid(), type: "art", name: "Divider", art: "flourish", x: W / 2 - mm(40), y: mm(84.5), w: mm(80), h: mm(6), color: gold },
    { id: uid(), type: "text", name: "Lead", text: k.t("यह प्रमाण-पत्र सम्मानपूर्वक प्रदान किया जाता है", "This certificate is proudly presented to"), x: mm(45), y: mm(93), w: W - mm(90), size: 13.5, font: k.body, italic: !k.hi, color: muted, align: "center", lh: 19 },
    { id: uid(), type: "text", name: "Recipient", text: "{{recipient.name}}", x: mm(55), y: mm(101), w: W - mm(110), h: mm(17), size: 42, weight: 700, font: k.hi ? "tiro" : "notoserif", color: ink, align: "center", lh: 60, fit: true },
    { id: uid(), type: "line", name: "Name rule", x: W / 2 - mm(70), y: mm(119), w: mm(140), lw: 1.2, color: gold },
    { id: uid(), type: "text", name: "Body", text: "{{doc.body}}", x: (W - cw) / 2, y: mm(123), w: cw, size: 13.5, font: k.body, color: ink, align: "center", lh: 21 },
    { id: uid(), type: "qr", name: "Verify QR", data: "{{doc.verify_url}}", x: mm(30), y: H - mm(48), w: mm(20), h: mm(20), color: ink },
    { id: uid(), type: "text", name: "Date", text: k.t("दिनांक: **{{doc.date|date}}**\n[[क्रमांक: **{{doc.ref_no}}**]]\nस्कैन कर सत्यापित करें", "Date: **{{doc.date|date}}**\n[[No.: **{{doc.ref_no}}**]]\nScan to verify"), x: mm(53), y: H - mm(46.5), w: mm(70), size: 10, font: k.body, color: ink, lh: 15 },
    { id: uid(), type: "art", name: "Seal", art: "seal", x: W / 2 - mm(15), y: H - mm(56), w: mm(30), h: mm(38), color: gold },
    { id: uid(), type: "line", name: "Sign rule", x: W - mm(100), y: H - mm(36), w: mm(66), lw: 0.9, color: ink },
    { id: uid(), type: "text", name: "Signature", text: "**{{signatory.name}}**\n{{signatory.designation}}", x: W - mm(102), y: H - mm(34), w: mm(70), size: 11, font: k.body, color: ink, align: "center", lh: 16 },
  ];
  doc.fields = [
    { key: "doc.certificate_type", label: "Certificate type", label_hi: "प्रमाणपत्र प्रकार", sample: k.t("सम्मान पत्र", "Appreciation") },
    { key: "recipient.name", label: "Recipient name", label_hi: "नाम" },
    { key: "signatory.name", label: "Signatory name", label_hi: "हस्ताक्षरकर्ता" },
    { key: "signatory.designation", label: "Signatory designation", label_hi: "पद" },
  ];
  return doc;
}

/* ---------- receipt (A5 landscape): gradient header band with logo, labelled rows, amount panel ---------- */
export function receiptTemplate(b: Brand, lang: Lang = "hi"): DesignDoc {
  const k = kit(lang);
  const accent = b.color ?? "#0f766e";
  const doc = newDoc("a5l");
  const W = Math.round(mm(210)), H = Math.round(mm(148)), m = mm(10), band = mm(25);
  doc.master = [
    { id: uid(), type: "rect", name: "Header band", x: 0, y: 0, w: W, h: band, fill: accent, fill2: shade(accent), grad: "h" },
    logo(m, mm(4), mm(17), "#ffffff40", { shape: "circle", ring: 1.5 }),
    { id: uid(), type: "text", name: "Organization", text: k.org, x: m + mm(21), y: mm(4.6), w: W - m * 2 - mm(70), h: mm(8), size: k.hi ? 19 : 16, weight: 700, font: k.head, color: "#ffffff", lh: 27, fit: true },
    { id: uid(), type: "text", name: "Address", text: "{{org.address}}", x: m + mm(21), y: mm(13), w: W - m * 2 - mm(70), h: mm(4), size: 8.5, font: k.body, color: "#e6fffa", lh: 12, fit: true },
    { id: uid(), type: "text", name: "Contacts", text: "{{org.phone}} · {{org.email}}", x: m + mm(21), y: mm(17.4), w: W - m * 2 - mm(70), h: mm(4), size: 8.5, font: k.body, color: "#e6fffa", lh: 12, fit: true },
    { id: uid(), type: "text", name: "Receipt word", text: k.t("रसीद", "RECEIPT"), x: W - m - mm(50), y: mm(4.6), w: mm(50), size: k.hi ? 24 : 19, weight: 700, font: k.head, color: "#ffffff", align: "right", lh: 30, ls: k.ls(2) },
    { id: uid(), type: "text", name: "Title", text: "{{doc.title}}", x: W - m - mm(50), y: mm(14.6), w: mm(50), size: 9, weight: 600, font: k.body, color: "#e6fffa", align: "right", lh: 13 },
    { id: uid(), type: "rect", name: "Bottom bar", x: 0, y: H - mm(3), w: W, h: mm(3), fill: accent, fill2: gold, grad: "h" },
    { id: uid(), type: "art", name: "Watermark", art: "mandala", x: W / 2 - mm(40), y: mm(40), w: mm(80), h: mm(80), color: accent, opacity: 0.05 },
  ];
  const lw = W - 2 * m - mm(66);
  const lbl = (t: string, y: number): Layer => ({ id: uid(), type: "text", name: "Label", text: t, x: m, y, w: lw, size: k.hi ? 8.5 : 7.5, weight: 600, font: k.body, color: muted, lh: 12, ls: k.ls(0.8) });
  doc.pages[0]!.layers = [
    { id: uid(), type: "text", name: "Reg", text: k.t("[[पंजीयन क्र. {{org.registration_no}}]] · [[पैन {{org.pan}}]] · [[80G {{org.g80}}]]", "[[Reg. No. {{org.registration_no}}]] · [[PAN {{org.pan}}]] · [[80G {{org.g80}}]]"), x: m, y: band + mm(2), w: W - 2 * m, size: 8, font: k.body, color: muted, lh: 11 },
    { id: uid(), type: "text", name: "Meta", text: k.t("रसीद क्र.  **{{doc.ref_no}}**", "Receipt No.  **{{doc.ref_no}}**"), x: m, y: band + mm(7), w: mm(90), size: 10.5, font: k.body, color: ink, lh: 15 },
    { id: uid(), type: "text", name: "Date", text: k.t("दिनांक  **{{doc.date|date}}**", "Date  **{{doc.date|date}}**"), x: W - m - mm(80), y: band + mm(7), w: mm(80), size: 10.5, font: k.body, color: ink, align: "right", lh: 15 },
    { id: uid(), type: "line", name: "Rule", x: m, y: band + mm(13.5), w: W - 2 * m, lw: 0.7, color: tint(accent, 0.35) },
    lbl(k.t("सधन्यवाद प्राप्त", "RECEIVED WITH THANKS FROM"), band + mm(17)),
    { id: uid(), type: "text", name: "Received from", text: "{{receipt.payer_name}}", x: m, y: band + mm(21), w: lw, h: mm(8), size: 20, weight: 700, font: k.head, color: ink, lh: 28, fit: true },
    { id: uid(), type: "text", name: "Payer details", text: k.t("{{receipt.payer_address}}[[ · मो. {{receipt.payer_mobile}}]][[ · पैन {{receipt.payer_pan}}]]", "{{receipt.payer_address}}[[ · Mob. {{receipt.payer_mobile}}]][[ · PAN {{receipt.payer_pan}}]]"), x: m, y: band + mm(30), w: lw, size: 9.5, font: k.body, color: muted, lh: 13 },
    lbl(k.t("उद्देश्य", "TOWARDS"), band + mm(38)),
    { id: uid(), type: "text", name: "Purpose", text: "**{{receipt.purpose}}**", x: m, y: band + mm(42.5), w: lw, size: 13, font: k.body, color: ink, lh: 18 },
    lbl(k.t("भुगतान माध्यम", "PAYMENT MODE"), band + mm(52)),
    { id: uid(), type: "text", name: "Mode", text: "{{receipt.mode}}[[ · {{receipt.instrument}}]]", x: m, y: band + mm(56.5), w: lw, size: 12, font: k.body, color: ink, lh: 16 },
    { id: uid(), type: "rect", name: "Amount panel", x: W - m - mm(62), y: band + mm(17), w: mm(62), h: mm(47), radius: 8, fill: tint(accent, 0.07), lw: 1.2, color: accent },
    { id: uid(), type: "text", name: "Amount label", text: k.t("राशि", "AMOUNT"), x: W - m - mm(62), y: band + mm(20), w: mm(62), size: k.hi ? 10 : 8, weight: 700, font: k.body, color: accent, align: "center", lh: 13, ls: k.ls(1.4) },
    { id: uid(), type: "text", name: "Amount", text: "{{receipt.amount|inr}}", x: W - m - mm(60), y: band + mm(25.5), w: mm(58), h: mm(10), size: 24, weight: 700, font: "sora", color: accent, align: "center", lh: 34, fit: true },
    { id: uid(), type: "text", name: "Amount words", text: k.words, x: W - m - mm(58), y: band + mm(39), w: mm(54), size: k.hi ? 9.5 : 8.5, font: k.body, color: ink, align: "center", lh: 13 },
    { id: uid(), type: "text", name: "Thanks", text: k.t("आपके सहयोग के लिए हार्दिक आभार", "Thank you for your support"), x: W - m - mm(62), y: band + mm(55.5), w: mm(62), size: 11, font: k.hi ? "tiro" : "notoserif", italic: !k.hi, color: gold, align: "center", lh: 15 },
    { id: uid(), type: "qr", name: "Verify QR", data: "{{doc.verify_url}}", x: m, y: H - mm(24), w: mm(16), h: mm(16), color: ink },
    { id: uid(), type: "text", name: "Verify hint", text: k.t("स्कैन कर रसीद सत्यापित करें", "Scan to verify this receipt") + "\n{{receipt.footer_note}}", x: m + mm(19), y: H - mm(21.5), w: mm(85), size: 8.5, font: k.body, color: muted, lh: 12 },
    { id: uid(), type: "line", name: "Sign rule", x: W - m - mm(52), y: H - mm(15), w: mm(52), lw: 0.8, color: muted },
    { id: uid(), type: "text", name: "Signature", text: "**{{signatory.name}}**\n{{signatory.designation}}", x: W - m - mm(56), y: H - mm(13.8), w: mm(60), size: 9, font: k.body, color: ink, align: "center", lh: 12 },
  ];
  doc.fields = [
    { key: "receipt.payer_name", label: "Received from", label_hi: "प्राप्त किया" },
    { key: "receipt.amount", label: "Amount", label_hi: "राशि" },
    { key: "receipt.purpose", label: "Purpose", label_hi: "उद्देश्य" },
    { key: "receipt.mode", label: "Payment mode", label_hi: "भुगतान माध्यम" },
    { key: "receipt.instrument", label: "Cheque/UPI/Txn no.", label_hi: "चेक/UPI नंबर" },
    { key: "signatory.name", label: "Signatory", label_hi: "हस्ताक्षरकर्ता" },
    { key: "signatory.designation", label: "Signatory designation", label_hi: "पद" },
  ];
  return doc;
}

/* ---------- ID cards (CR80): shared shell + membership / volunteer bodies ---------- */
function cardShell(lang: Lang, accent: string, title: string): Layer[] {
  const k = kit(lang);
  const W = Math.round(mm(85.6)), H = Math.round(mm(54)), band = mm(12.5);
  return [
    { id: uid(), type: "art", name: "Watermark", art: "mandala", x: W - mm(40), y: mm(10), w: mm(50), h: mm(50), color: accent, opacity: 0.07 },
    { id: uid(), type: "rect", name: "Header band", x: 0, y: 0, w: W, h: band, fill: accent, fill2: shade(accent), grad: "h" },
    logo(mm(2.4), mm(1.7), mm(9), "#ffffff40", { shape: "circle", ring: 0.6 }),
    { id: uid(), type: "text", name: "Organization", text: k.org, x: mm(13), y: mm(2.2), w: W - mm(15), h: mm(5), size: k.hi ? 10.5 : 8.5, weight: 700, font: k.head, color: "#ffffff", lh: 14, fit: true },
    { id: uid(), type: "text", name: "Organization address", text: "{{org.address}}", x: mm(13), y: mm(7.4), w: W - mm(15), h: mm(3), size: 5, font: k.body, color: "#e6fffa", lh: 7.5, fit: true },
    { id: uid(), type: "rect", name: "Title strip", x: 0, y: band, w: W, h: mm(3.6), fill: gold },
    { id: uid(), type: "text", name: "Card type", text: title, x: 0, y: band + mm(0.45), w: W, size: k.hi ? 6 : 5.2, weight: 700, font: k.body, color: "#ffffff", align: "center", lh: 8, ls: k.ls(1) },
    { id: uid(), type: "rect", name: "Footer band", x: 0, y: H - mm(5), w: W, h: mm(5), fill: accent },
    { id: uid(), type: "text", name: "Footer", text: "{{org.phone}} · {{org.website}}", x: mm(3), y: H - mm(4.2), w: W - mm(6), h: mm(3.4), size: 5.4, font: k.body, color: "#ffffff", align: "center", lh: 8, fit: true },
  ];
}
function cardBody(lang: Lang, accent: string, f: { photo: string; nameMain: string; nameSub: string; details: string; validity: string }): Layer[] {
  const k = kit(lang);
  const W = Math.round(mm(85.6));
  const tx = mm(25.5), tw = W - tx - mm(18);
  return [
    { id: uid(), type: "image", name: "Photo", src: f.photo, x: mm(3), y: mm(19), w: mm(19), h: mm(24), shape: "rect", radius: 4, ring: 1.2, color: accent, monogram: f.nameMain },
    { id: uid(), type: "text", name: "Name", text: f.nameMain, x: tx, y: mm(18.6), w: tw, h: mm(5), size: k.hi ? 10.5 : 9.5, weight: 700, font: k.head, color: ink, lh: 14, fit: true },
    { id: uid(), type: "text", name: "Name line 2", text: f.nameSub, x: tx, y: mm(23.4), w: tw, h: mm(3), size: 5.8, weight: 700, font: k.body, color: accent, lh: 8, fit: true },
    { id: uid(), type: "text", name: "Details", text: f.details, x: tx, y: mm(27.2), w: tw, size: 5.6, font: k.body, color: ink, lh: 7.6 },
    { id: uid(), type: "qr", name: "Verify QR", data: "{{doc.verify_url}}", x: W - mm(16), y: mm(19), w: mm(13), h: mm(13), color: ink },
    { id: uid(), type: "text", name: "Verify hint", text: k.t("स्कैन कर सत्यापित करें", "Scan to verify"), x: W - mm(17.5), y: mm(32.6), w: mm(16), size: 3.9, font: k.body, color: muted, align: "center", lh: 5 },
    { id: uid(), type: "text", name: "Validity", text: f.validity, x: W - mm(20), y: mm(36.5), w: mm(18.5), size: 4.4, weight: 600, font: k.body, color: accent, align: "center", lh: 6 },
  ];
}

/** Membership card (CR80). Hindi version leads with the Hindi name. */
export function idCardTemplate(b: Brand, lang: Lang = "hi"): DesignDoc {
  const k = kit(lang);
  const accent = b.color ?? "#0f766e";
  const doc = newDoc("idcard", "#ffffff");
  doc.master = cardShell(lang, accent, k.t("सदस्यता पहचान पत्र", "MEMBERSHIP CARD"));
  doc.pages[0]!.layers = cardBody(lang, accent, {
    photo: "{{member.photo}}",
    nameMain: k.hi ? "{{member.name_hi}}" : "{{member.name}}",
    nameSub: "{{member.category}}",
    details: k.t(
      "सदस्य क्र.  **{{member.member_no}}**\n[[पिता  {{member.father_name}}]]\n[[निवास  {{member.village}}]][[, {{member.city}}]]\n[[मोबाइल  {{member.mobile}}]]\n[[रक्त समूह  **{{member.blood_group}}**]]",
      "Member No.  **{{member.member_no}}**\n[[S/o  {{member.father_name}}]]\n[[Address  {{member.village}}]][[, {{member.city}}]]\n[[Mobile  {{member.mobile}}]]\n[[Blood group  **{{member.blood_group}}**]]",
    ),
    validity: k.t("वैध: {{member.valid_from|date}}[[ से {{member.valid_to|date}}]]", "Valid: {{member.valid_from|date}}[[ to {{member.valid_to|date}}]]"),
  });
  doc.fields = [];
  return doc;
}

/** Volunteer ID card (CR80). Merge data: volunteer.{name, ref, designation, place, mobile, blood_group, issued_on, valid_until, photo}. */
export function volunteerIdTemplate(b: Brand, lang: Lang = "hi"): DesignDoc {
  const k = kit(lang);
  const accent = b.color ?? "#0f766e";
  const doc = newDoc("idcard", "#ffffff");
  doc.master = cardShell(lang, accent, k.t("स्वयंसेवक पहचान पत्र", "VOLUNTEER IDENTITY CARD"));
  doc.pages[0]!.layers = cardBody(lang, accent, {
    photo: "{{volunteer.photo}}",
    nameMain: "{{volunteer.name}}",
    nameSub: "{{volunteer.designation}}",
    details: k.t(
      "पहचान क्र.  **{{volunteer.ref}}**\n[[स्थान  {{volunteer.place}}]]\n[[मोबाइल  {{volunteer.mobile}}]]\n[[रक्त समूह  **{{volunteer.blood_group}}**]]\nजारी  {{volunteer.issued_on|date}}",
      "ID  **{{volunteer.ref}}**\n[[Place  {{volunteer.place}}]]\n[[Mobile  {{volunteer.mobile}}]]\n[[Blood group  **{{volunteer.blood_group}}**]]\nIssued  {{volunteer.issued_on|date}}",
    ),
    validity: k.t("[[वैध: {{volunteer.valid_until|date}} तक]]", "[[Valid till {{volunteer.valid_until|date}}]]"),
  });
  doc.fields = [];
  return doc;
}

/** Volunteer service certificate (A4 landscape) — the certificate design with a volunteer text block and photo. */
export function volunteerCertificateTemplate(b: Brand, lang: Lang = "hi"): DesignDoc {
  const k = kit(lang);
  const doc = certificateTemplate(b, lang);
  const W = Math.round(mm(297));
  const layers = doc.pages[0]!.layers;
  const set = (name: string, text: string) => { const l = layers.find((x) => x.name === name); if (l && l.type === "text") l.text = text; };
  set("Subtitle", k.t("स्वयंसेवा सम्मान", "OF VOLUNTEER SERVICE"));
  set("Recipient", "{{volunteer.name}}");
  set("Body", k.t(
    "**{{org.name_hi}}** में **{{volunteer.designation}}** के रूप में[[ ({{volunteer.place}})]] निष्ठा, सेवा-भाव और समर्पण के साथ दी गई उत्कृष्ट सेवाओं के लिए यह प्रमाण-पत्र सादर प्रदान किया जाता है।",
    "in grateful recognition of dedicated service as **{{volunteer.designation}}** with **{{org.name}}**[[, {{volunteer.place}}]], given with sincerity, compassion and commitment to seva.",
  ));
  set("Date", k.t("पहचान क्र.: **{{volunteer.ref}}**\nदिनांक: **{{volunteer.issued_on|date}}**\nस्कैन कर सत्यापित करें", "Volunteer ID: **{{volunteer.ref}}**\nDate: **{{volunteer.issued_on|date}}**\nScan to verify"));
  set("Signature", k.t("**अधिकृत हस्ताक्षरकर्ता**\n", "**Authorised Signatory**\n") + k.org);
  layers.push({ id: uid(), type: "image", name: "Photo", src: "{{volunteer.photo}}", x: W - mm(52), y: mm(20), w: mm(26), h: mm(32), radius: 4, ring: 1.4, color: gold });
  doc.fields = [];
  return doc;
}


/** शोकपत्र (condolence letter) — Hindi only; portrait, deep navy with diya; recipient name is merged per person. */
export function shokPatraTemplate(b: Brand, _lang: Lang = "hi"): DesignDoc {
  const accent = b.color && b.color !== "#0f766e" ? b.color : "#c9a35a";
  const doc = newDoc("shokp", "#101a33");
  const W = Math.round(mm(277.8)), H = Math.round(mm(394.5)), m = mm(16);
  doc.master = [
    { id: uid(), type: "rect", name: "Background", x: 0, y: 0, w: W, h: H, fill: "#17264a", fill2: "#0b1328", grad: "v" },
    { id: uid(), type: "art", name: "Watermark", art: "mandala", x: W / 2 - mm(110), y: mm(120), w: mm(220), h: mm(220), color: accent, opacity: 0.06 },
    { id: uid(), type: "frame", name: "Border", style: "ornate", x: m, y: m, w: W - 2 * m, h: H - 2 * m, color: accent, lw: 3, radius: 14 },
    { id: uid(), type: "art", name: "Diya", art: "diya", x: W / 2 - mm(17), y: mm(30), w: mm(34), h: mm(40), color: accent },
    { id: uid(), type: "art", name: "Divider", art: "flourish", x: W / 2 - mm(55), y: mm(73), w: mm(110), h: mm(8), color: accent },
  ];
  const cx = m + mm(18), cw = W - 2 * m - mm(36);
  doc.pages[0]!.layers = [
    { id: uid(), type: "text", name: "Shraddhanjali", text: "॥ भावपूर्ण श्रद्धांजलि ॥", x: m, y: mm(84), w: W - 2 * m, size: 32, weight: 700, font: "tiro", color: accent, align: "center", lh: 44 },
    { id: uid(), type: "text", name: "Deceased", text: "{{shok.deceased}}", x: cx, y: mm(100), w: cw, h: mm(24), size: 56, weight: 700, font: "tiro", color: "#ffffff", align: "center", lh: 80, fit: true },
    { id: uid(), type: "text", name: "Dates", text: "निधन: {{shok.death_date|date}}", x: m, y: mm(127), w: W - 2 * m, size: 19, font: "mukta", color: "#d8dde8", align: "center", lh: 28 },
    { id: uid(), type: "line", name: "Rule", x: W / 2 - mm(30), y: mm(138), w: mm(60), lw: 1, color: accent },
    { id: uid(), type: "text", name: "Body", text: "अत्यंत दुःख के साथ सूचित करना पड़ रहा है कि **{{shok.deceased}}** का निधन दिनांक {{shok.death_date|date}} को हो गया है। उनका दशगात्र एवं चन्दनपान कार्यक्रम दिनांक **{{shok.ceremony_date|date}}** को संपन्न होगा।\n\nआप सपरिवार पधारकर दिवंगत आत्मा को श्रद्धांजलि अर्पित करें एवं हमें अनुग्रहित करें।", x: cx + mm(4), y: mm(146), w: cw - mm(8), size: 19, font: "mukta", color: "#eef1f6", align: "center", lh: 31 },
    { id: uid(), type: "rect", name: "Venue panel", x: cx + mm(10), y: mm(196), w: cw - mm(20), h: mm(17), radius: 10, fill: "#ffffff10", lw: 1, color: tint(accent, 0.6) },
    { id: uid(), type: "text", name: "Venue", text: "स्थान: **{{shok.venue}}**", x: cx + mm(14), y: mm(200.5), w: cw - mm(28), h: mm(8), size: 18, font: "mukta", color: "#ffffff", align: "center", lh: 25 },
    { id: uid(), type: "rect", name: "Name box", x: cx + mm(6), y: mm(224), w: cw - mm(12), h: mm(34), radius: 12, lw: 1.6, color: accent, fill: "#1f3361", fill2: "#162650", grad: "v" },
    { id: uid(), type: "text", name: "Recipient label", text: "सेवा में,", x: cx + mm(12), y: mm(227.5), w: cw - mm(24), size: 14, font: "mukta", color: accent, lh: 20 },
    { id: uid(), type: "text", name: "Recipient", text: "**{{recipient.name}}** {{recipient.father_line}}\n{{recipient.village}}", x: cx + mm(12), y: mm(234.5), w: cw - mm(24), h: mm(21), size: 26, font: "tiro", color: "#ffffff", lh: 32, fit: true },
    { id: uid(), type: "text", name: "Family label", text: "शोकाकुल परिवार", x: m, y: mm(276), w: W - 2 * m, size: 14, font: "mukta", color: accent, align: "center", lh: 20 },
    { id: uid(), type: "text", name: "Family", text: "{{shok.family}}", x: m + mm(20), y: mm(283), w: W - 2 * m - mm(40), h: mm(10), size: 26, weight: 700, font: "tiro", color: "#ffffff", align: "center", lh: 36, fit: true },
    { id: uid(), type: "line", name: "Footer rule", x: m + mm(30), y: H - mm(56), w: W - 2 * m - mm(60), lw: 0.8, color: tint(accent, 0.5) },
    logo(W / 2 - mm(8), H - mm(52), mm(16), accent, { shape: "circle" }),
    { id: uid(), type: "text", name: "Organization", text: "{{org.name_hi}}", x: m, y: H - mm(34), w: W - 2 * m, size: 15, weight: 700, font: "tiro", color: accent, align: "center", lh: 22 },
    { id: uid(), type: "text", name: "Org line", text: "{{org.address}} · {{org.phone}}", x: m + mm(10), y: H - mm(27), w: W - 2 * m - mm(20), size: 11, font: "mukta", color: "#9aa6bd", align: "center", lh: 16 },
  ];
  doc.fields = [
    { key: "shok.deceased", label: "Deceased name", label_hi: "दिवंगत का नाम", sample: "स्व. श्री संतोष कुमार कश्यप" },
    { key: "shok.death_date", label: "Date of death", label_hi: "निधन की तारीख", sample: "2026-11-01" },
    { key: "shok.ceremony_date", label: "Ceremony date", label_hi: "दशगात्र / चन्दनपान", sample: "2026-11-11" },
    { key: "shok.venue", label: "Venue", label_hi: "स्थान", sample: "सामुदायिक भवन, आदर्श नगर" },
    { key: "shok.family", label: "Bereaved family", label_hi: "शोकाकुल परिवार", sample: "कश्यप परिवार, कुसमुण्डा" },
    { key: "recipient.name", label: "Recipient name (per person)", label_hi: "प्राप्तकर्ता का नाम", sample: "श्री रमेश कुमार" },
  ];
  return doc;
}


/** निमंत्रण / Invitation — A5 portrait, ivory with maroon & gold, garland, info strip, guest box with QR. */
export function invitationTemplate(b: Brand, lang: Lang = "hi"): DesignDoc {
  const k = kit(lang);
  const accent = b.color && b.color !== "#0f766e" ? b.color : "#8b1e2d";
  const doc = newDoc("a5p", "#fffaf0");
  const W = Math.round(mm(148)), H = Math.round(mm(210)), m = mm(7);
  doc.master = [
    { id: uid(), type: "rect", name: "Edge", x: 0, y: 0, w: W, h: H, lw: mm(3), color: accent },
    { id: uid(), type: "frame", name: "Border", style: "ornate", x: m, y: m, w: W - 2 * m, h: H - 2 * m, color: gold, lw: 2, radius: 10 },
    { id: uid(), type: "art", name: "Watermark", art: "mandala", x: W / 2 - mm(52), y: mm(55), w: mm(104), h: mm(104), color: gold, opacity: 0.08 },
    { id: uid(), type: "art", name: "Garland", art: "garland", x: m + mm(6), y: m + mm(5), w: W - 2 * m - mm(12), h: mm(7), color: gold },
  ];
  const cx = m + mm(6), cw = W - 2 * m - mm(12), half = (cw - mm(8)) / 2;
  const evTitle = k.hi ? "{{event.title_hi}}" : "{{event.title}}";
  const evVenue = k.hi ? "{{event.venue_hi}}" : "{{event.venue}}";
  doc.pages[0]!.layers = [
    k.hi
      ? { id: uid(), type: "art", name: "Om", art: "om", x: W / 2 - mm(6), y: mm(23), w: mm(12), h: mm(12), color: accent }
      : logo(W / 2 - mm(7), mm(21), mm(14), accent, { shape: "circle" }),
    { id: uid(), type: "text", name: "Shubh", text: k.t("॥ शुभ निमंत्रण ॥", "YOU ARE INVITED"), x: cx, y: mm(36), w: cw, size: k.hi ? 20 : 14, weight: 700, font: k.head, color: gold, align: "center", lh: 28, ls: k.ls(4) },
    { id: uid(), type: "text", name: "Org", text: k.org, x: cx, y: mm(46), w: cw, h: mm(6), size: 12.5, weight: 700, font: k.head, color: ink, align: "center", lh: 18, fit: true },
    { id: uid(), type: "text", name: "Lead", text: k.t("आपको सादर आमंत्रित करता है", "cordially invites you to"), x: cx, y: mm(52.5), w: cw, size: 10.5, font: k.body, italic: !k.hi, color: muted, align: "center", lh: 15 },
    { id: uid(), type: "text", name: "Title", text: evTitle, x: cx + mm(2), y: mm(61), w: cw - mm(4), h: mm(16), size: 34, weight: 700, font: k.hi ? "tiro" : "notoserif", color: accent, align: "center", lh: 48, fit: true },
    { id: uid(), type: "art", name: "Divider", art: "flourish", x: W / 2 - mm(28), y: mm(79), w: mm(56), h: mm(5), color: gold },
    { id: uid(), type: "rect", name: "Info strip", x: cx + mm(2), y: mm(87), w: cw - mm(4), h: mm(26), radius: 8, fill: tint(accent, 0.06), lw: 1, color: tint(gold, 0.7) },
    { id: uid(), type: "text", name: "When label", text: k.t("दिनांक", "DATE"), x: cx + mm(4), y: mm(89.5), w: half, size: 8.5, weight: 700, font: k.body, color: gold, align: "center", lh: 12, ls: k.ls(1.2) },
    { id: uid(), type: "text", name: "When", text: "**{{event.date}}**", x: cx + mm(4), y: mm(94), w: half, size: 13, font: k.body, color: ink, align: "center", lh: 18 },
    { id: uid(), type: "text", name: "Time label", text: k.t("समय", "TIME"), x: cx + mm(4) + half, y: mm(89.5), w: half, size: 8.5, weight: 700, font: k.body, color: gold, align: "center", lh: 12, ls: k.ls(1.2) },
    { id: uid(), type: "text", name: "Time", text: "**{{event.time}}**", x: cx + mm(4) + half, y: mm(94), w: half, size: 13, font: k.body, color: ink, align: "center", lh: 18 },
    { id: uid(), type: "line", name: "Info divider", x: cx + mm(8), y: mm(101.5), w: cw - mm(16), lw: 0.6, color: tint(gold, 0.6) },
    { id: uid(), type: "text", name: "Venue", text: k.t("स्थान: ", "Venue: ") + "**" + evVenue + "**", x: cx + mm(5), y: mm(103.5), w: cw - mm(10), h: mm(8), size: 11, font: k.body, color: ink, align: "center", lh: 15 },
    { id: uid(), type: "text", name: "Body", text: "{{event.message}}", x: cx + mm(4), y: mm(118), w: cw - mm(8), size: 11.5, font: k.body, color: "#3b3b46", align: "center", lh: 17 },
    { id: uid(), type: "rect", name: "Guest box", x: cx + mm(2), y: mm(140), w: cw - mm(4), h: mm(26), radius: 8, lw: 1.2, color: gold, fill: "#fff3dc" },
    { id: uid(), type: "text", name: "Guest label", text: k.t("सादर आमंत्रित", "DEAR GUEST"), x: cx + mm(6), y: mm(143), w: cw - mm(34), size: 9, weight: 700, font: k.body, color: gold, lh: 13, ls: k.ls(1) },
    { id: uid(), type: "text", name: "Guest", text: "{{guest.name}}", x: cx + mm(6), y: mm(148), w: cw - mm(34), h: mm(8), size: 17, weight: 700, font: k.hi ? "tiro" : "notoserif", color: ink, lh: 24, fit: true },
    { id: uid(), type: "text", name: "Guest group", text: "{{guest.group}}", x: cx + mm(6), y: mm(157), w: cw - mm(34), size: 10, font: k.body, color: muted, lh: 14 },
    { id: uid(), type: "qr", name: "Check-in QR", data: "{{guest.rsvp_url}}", x: cx + cw - mm(25), y: mm(142.5), w: mm(21), h: mm(21), color: ink },
    { id: uid(), type: "text", name: "QR hint", text: k.t("उपस्थिति हेतु स्कैन करें", "Scan to RSVP / check in"), x: cx + mm(2), y: mm(168), w: cw - mm(4), size: 7.5, font: k.body, color: muted, align: "right", lh: 10 },
    ...(k.hi ? [logo(W / 2 - mm(5.5), H - mm(33), mm(11), accent, { shape: "circle" })] : []),
    { id: uid(), type: "text", name: "Footer", text: k.t("निवेदक: **{{event.organizer}}**[[ · संपर्क {{event.contact}}]]", "With best compliments: **{{event.organizer}}**[[ · Contact {{event.contact}}]]"), x: cx, y: H - mm(20.5), w: cw, size: 9.5, font: k.body, color: ink, align: "center", lh: 14 },
  ];
  doc.fields = [
    { key: k.hi ? "event.title_hi" : "event.title", label: "Event title", label_hi: "आयोजन", sample: k.t("वार्षिक स्नेह मिलन", "Annual Get-together") },
    { key: "event.date", label: "Date", label_hi: "दिनांक", sample: k.t("15 दिसम्बर 2026", "15 December 2026") },
    { key: "event.time", label: "Time", label_hi: "समय", sample: k.t("सुबह 10 बजे", "10:00 AM") },
    { key: k.hi ? "event.venue_hi" : "event.venue", label: "Venue", label_hi: "स्थान", sample: k.t("सामुदायिक भवन, रायपुर", "Community Hall, Raipur") },
    { key: "event.message", label: "Message", label_hi: "संदेश", sample: k.t("आप सपरिवार सादर आमंत्रित हैं।", "You and your family are cordially invited.") },
    { key: "guest.name", label: "Guest name (per person)", label_hi: "अतिथि", sample: k.t("श्री रमेश कुमार", "Mr. Ramesh Kumar") },
  ];
  return doc;
}

/** Start from the organization's own printed letterhead / card artwork: the uploaded picture fills the page as the
 *  master layer and the movable fields (ref no, date, body / member details) sit on top — drag them into place. */
export function fromUploadedBackground(kind: "letter" | "certificate" | "id_card" | "receipt", src: string, b: Brand, orientation: "portrait" | "landscape" = "portrait", lang: Lang = "hi"): DesignDoc {
  const base = kind === "id_card" ? idCardTemplate(b, lang) : kind === "certificate" ? certificateTemplate(b, lang) : kind === "receipt" ? receiptTemplate(b, lang) : letterTemplate(b, lang);
  const { W, H } = pagePx(base);
  void orientation;
  base.master = [{ id: uid(), type: "image", name: "My letterhead / artwork", src, x: 0, y: 0, w: W, h: H, fit: "cover" }];
  // keep only the merge-field layers (drop decorative shapes/text that the artwork already carries)
  for (const pg of base.pages) pg.layers = pg.layers.filter((l) => l.type === "flow" || l.type === "qr" || l.type === "image" || (l.type === "text" && /\{\{/.test(l.text)));
  return base;
}

export const STARTER_TEMPLATES: { kind: string; name: string; name_hi: string; langs: Lang[]; make: (b: Brand, lang?: Lang) => DesignDoc }[] = [
  { kind: "letterhead", name: "Official letterhead", name_hi: "आधिकारिक लेटरहेड", langs: ["hi", "en"], make: letterheadTemplate },
  { kind: "letter", name: "General letter", name_hi: "सामान्य पत्र", langs: ["hi", "en"], make: letterTemplate },
  { kind: "certificate", name: "Certificate", name_hi: "प्रमाणपत्र", langs: ["hi", "en"], make: certificateTemplate },
  { kind: "receipt", name: "Receipt", name_hi: "रसीद", langs: ["hi", "en"], make: receiptTemplate },
  { kind: "id_card", name: "Membership card", name_hi: "सदस्यता कार्ड", langs: ["hi", "en"], make: idCardTemplate },
  { kind: "shok_patra", name: "Condolence letter (शोकपत्र)", name_hi: "शोकपत्र", langs: ["hi"], make: shokPatraTemplate },
  { kind: "invitation", name: "Invitation (निमंत्रण)", name_hi: "निमंत्रण", langs: ["hi", "en"], make: invitationTemplate },
];
