// Built-in starter templates. Organizations copy these and edit them in the Studio.
import { pagePx } from "./model";
import { mm, newDoc, uid, type DesignDoc, type Layer } from "./model";

export type Brand = { name: string; name_hi?: string | null | undefined; tagline?: string | null | undefined; address?: string | null | undefined; phone?: string | null | undefined; email?: string | null | undefined; website?: string | null | undefined; logo?: string | null | undefined; color?: string | undefined };

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
const logo = (x: number, y: number, size: number, color: string, extra: Partial<Extract<Layer, { type: "image" }>> = {}): Layer =>
  ({ id: uid(), type: "image", name: "Logo", src: "{{org.logo}}", x, y, w: size, h: size, fit: "contain", monogram: "{{org.name_hi}}{{org.name}}", color, ...extra });

/* ---------- letterhead: logo + bilingual name block left, contacts right, double rule; footer band ---------- */
function header(_b: Brand, W: number, accent: string): Layer[] {
  const m = mm(16), top = mm(13), L = mm(25), tx = m + L + mm(5), cw = mm(58);
  return [
    { id: uid(), type: "rect", name: "Top band", x: 0, y: 0, w: W, h: mm(4), fill: accent, fill2: gold, grad: "h" },
    logo(m, top, L, accent),
    { id: uid(), type: "text", name: "Name (Hindi)", text: "{{org.name_hi}}", x: tx, y: top - 2, w: W - tx - m - cw - mm(4), h: mm(9), size: 25, weight: 700, font: "tiro", color: accent, lh: 34, fit: true },
    { id: uid(), type: "text", name: "Organization name", text: "{{org.name|upper}}", x: tx, y: top + 34, w: W - tx - m - cw - mm(4), h: mm(5), size: 11.5, weight: 700, font: "sora", color: ink, lh: 16, ls: 0.8, fit: true },
    { id: uid(), type: "text", name: "Tagline", text: "{{org.tagline}}", x: tx, y: top + 53, w: W - tx - m - cw - mm(4), size: 10.5, font: "mukta", italic: true, color: gold, lh: 15 },
    { id: uid(), type: "text", name: "Address line", text: "{{org.address}}", x: tx, y: top + 70, w: W - tx - m - cw - mm(4), size: 9.5, font: "mukta", color: muted, lh: 13 },
    { id: uid(), type: "text", name: "Contacts", text: "[[फ़ोन  **{{org.phone}}**]]\n[[WhatsApp  **{{org.whatsapp}}**]]\n[[{{org.email}}]]\n[[{{org.website}}]]\n[[पंजीयन क्र. {{org.registration_no}}]]", x: W - m - cw, y: top + 4, w: cw, size: 9.5, font: "mukta", color: ink, align: "right", lh: 15 },
    { id: uid(), type: "line", name: "Header rule", x: m, y: mm(41), w: W - 2 * m, lw: 2.2, color: accent },
    { id: uid(), type: "line", name: "Header rule (gold)", x: m, y: mm(41) + 4.5, w: W - 2 * m, lw: 0.8, color: gold },
  ];
}
function footer(W: number, H: number, accent: string): Layer[] {
  const m = mm(16);
  return [
    { id: uid(), type: "art", name: "Watermark", art: "mandala", x: W / 2 - mm(70), y: H / 2 - mm(60), w: mm(140), h: mm(140), color: accent, opacity: 0.045 },
    { id: uid(), type: "text", name: "Page credit", text: "Kalchuri One · kalchuri.org", x: m, y: H - mm(15.5), w: W - 2 * m, size: 7, font: "manrope", color: "#9ca3af", align: "right", lh: 9 },
    { id: uid(), type: "rect", name: "Footer band", x: 0, y: H - mm(11), w: W, h: mm(11), fill: accent, fill2: shade(accent), grad: "h" },
    { id: uid(), type: "text", name: "Footer", text: "{{org.address}} · {{org.phone}} · {{org.website}}", x: m, y: H - mm(8.6), w: W - 2 * m, h: mm(5), size: 9.5, font: "mukta", color: "#ffffff", align: "center", lh: 15, fit: true },
  ];
}

export function letterheadTemplate(b: Brand): DesignDoc {
  const accent = b.color ?? "#0f766e";
  const doc = newDoc("a4p");
  const W = Math.round(mm(210)), H = Math.round(mm(297));
  doc.master = [...header(b, W, accent), ...footer(W, H, accent)];
  doc.fields = [];
  return doc;
}

export function letterTemplate(b: Brand): DesignDoc {
  const accent = b.color ?? "#0f766e";
  const doc = letterheadTemplate(b);
  const W = Math.round(mm(210)), H = Math.round(mm(297)), m = mm(18);
  const top = mm(48);
  const sigY = H - mm(66);
  doc.pages[0]!.layers = [
    { id: uid(), type: "text", name: "Ref no", text: "पत्रांक / Ref:  **{{doc.ref_no}}**", x: m, y: top, w: mm(100), size: 11, font: "mukta", color: ink, lh: 16 },
    { id: uid(), type: "text", name: "Date", text: "दिनांक / Date:  **{{doc.date|date}}**", x: W - m - mm(70), y: top, w: mm(70), size: 11, font: "mukta", color: ink, align: "right", lh: 16 },
    { id: uid(), type: "text", name: "Recipient", text: "सेवा में / To,\n**{{recipient.name}}**\n[[{{recipient.designation}}]]\n[[{{recipient.organization}}]]\n[[{{recipient.address}}]]", x: m, y: top + mm(9), w: mm(115), size: 11.5, font: "mukta", color: ink, lh: 17 },
    { id: uid(), type: "rect", name: "Subject band", x: m, y: top + mm(38), w: W - 2 * m, h: mm(9), radius: 4, fill: tint(accent, 0.08) },
    { id: uid(), type: "rect", name: "Subject mark", x: m, y: top + mm(38), w: mm(1.2), h: mm(9), fill: accent },
    { id: uid(), type: "text", name: "Subject", text: "विषय / Subject:  **{{doc.subject}}**", x: m + mm(4), y: top + mm(39.4), w: W - 2 * m - mm(6), size: 11.5, font: "mukta", color: ink, lh: 17 },
    { id: uid(), type: "text", name: "Salutation", text: "{{doc.salutation}}", x: m, y: top + mm(52), w: W - 2 * m, size: 11.5, font: "mukta", color: ink, lh: 17 },
    { id: uid(), type: "flow", name: "Body", text: "{{doc.body}}", x: m, y: top + mm(60), w: W - 2 * m, h: sigY - mm(4) - (top + mm(60)), size: 11.5, font: "mukta", color: ink, lh: 18, align: "justify" },
    { id: uid(), type: "text", name: "Closing", text: "{{doc.closing}}", x: W - m - mm(70), y: sigY, w: mm(70), size: 11, font: "mukta", color: ink, align: "center", lh: 16, lastPageOnly: true },
    { id: uid(), type: "line", name: "Sign rule", x: W - m - mm(62), y: sigY + mm(22), w: mm(54), lw: 0.8, color: muted, lastPageOnly: true },
    { id: uid(), type: "text", name: "Signature", text: "**{{signatory.name}}**\n{{signatory.designation}}\n{{org.name_hi}}", x: W - m - mm(70), y: sigY + mm(24), w: mm(70), size: 10.5, font: "mukta", color: ink, align: "center", lh: 15, lastPageOnly: true },
    { id: uid(), type: "qr", name: "Verify QR", data: "{{doc.verify_url}}", x: m, y: sigY + mm(10), w: mm(19), h: mm(19), color: ink, lastPageOnly: true },
    { id: uid(), type: "text", name: "Verify hint", text: "सत्यापन हेतु स्कैन करें\nScan to verify", x: m + mm(22), y: sigY + mm(13), w: mm(40), size: 8, font: "mukta", color: muted, lh: 11, lastPageOnly: true },
  ];
  doc.fields = [
    { key: "recipient.name", label: "Recipient name", label_hi: "प्राप्तकर्ता का नाम" },
    { key: "recipient.designation", label: "Recipient designation", label_hi: "पद" },
    { key: "recipient.organization", label: "Recipient organization", label_hi: "संस्था" },
    { key: "recipient.address", label: "Recipient address", label_hi: "पता" },
    { key: "doc.salutation", label: "Salutation", label_hi: "संबोधन", sample: "महोदय / महोदया," },
    { key: "doc.closing", label: "Closing", label_hi: "समापन", sample: "भवदीय," },
    { key: "signatory.name", label: "Signatory name", label_hi: "हस्ताक्षरकर्ता" },
    { key: "signatory.designation", label: "Signatory designation", label_hi: "हस्ताक्षरकर्ता का पद" },
  ];
  return doc;
}

/* ---------- certificate: cream paper, double gold frame, corner ornaments, mandala watermark, seal ---------- */
export function certificateTemplate(b: Brand): DesignDoc {
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
    { id: uid(), type: "text", name: "Organization (Hindi)", text: "{{org.name_hi}}", x: mm(40), y: mm(40), w: W - mm(80), h: mm(9), size: 22, weight: 700, font: "tiro", color: accent, align: "center", lh: 32, fit: true },
    { id: uid(), type: "text", name: "Organization", text: "{{org.name|upper}}", x: mm(40), y: mm(49.5), w: W - mm(80), h: mm(5), size: 10.5, weight: 600, font: "sora", color: muted, align: "center", lh: 15, ls: 2, fit: true },
    { id: uid(), type: "text", name: "Title", text: "प्रमाण-पत्र", x: mm(40), y: mm(58), w: W - mm(80), size: 46, weight: 700, font: "tiro", color: gold, align: "center", lh: 62 },
    { id: uid(), type: "text", name: "Subtitle", text: "CERTIFICATE OF {{doc.certificate_type|upper}}", x: mm(40), y: mm(76), w: W - mm(80), size: 13, weight: 600, font: "sora", color: accent, align: "center", lh: 18, ls: 4.5 },
    { id: uid(), type: "art", name: "Divider", art: "flourish", x: W / 2 - mm(40), y: mm(84), w: mm(80), h: mm(6), color: gold },
    { id: uid(), type: "text", name: "Lead", text: "यह प्रमाण-पत्र सम्मानपूर्वक प्रदान किया जाता है  ·  This certificate is proudly presented to", x: mm(45), y: mm(93), w: W - mm(90), size: 12.5, font: "mukta", color: muted, align: "center", lh: 18 },
    { id: uid(), type: "text", name: "Recipient", text: "{{recipient.name}}", x: mm(55), y: mm(101), w: W - mm(110), h: mm(17), size: 42, weight: 700, font: "tiro", color: ink, align: "center", lh: 60, fit: true },
    { id: uid(), type: "line", name: "Name rule", x: W / 2 - mm(70), y: mm(119), w: mm(140), lw: 1.2, color: gold },
    { id: uid(), type: "text", name: "Body", text: "{{doc.body}}", x: (W - cw) / 2, y: mm(123), w: cw, size: 13.5, font: "mukta", color: ink, align: "center", lh: 21 },
    { id: uid(), type: "qr", name: "Verify QR", data: "{{doc.verify_url}}", x: mm(30), y: H - mm(48), w: mm(20), h: mm(20), color: ink },
    { id: uid(), type: "text", name: "Date", text: "दिनांक: **{{doc.date|date}}**\n[[क्रमांक: **{{doc.ref_no}}**]]\nस्कैन कर सत्यापित करें", x: mm(53), y: H - mm(46.5), w: mm(70), size: 10, font: "mukta", color: ink, lh: 15 },
    { id: uid(), type: "art", name: "Seal", art: "seal", x: W / 2 - mm(15), y: H - mm(56), w: mm(30), h: mm(38), color: gold },
    { id: uid(), type: "line", name: "Sign rule", x: W - mm(100), y: H - mm(36), w: mm(66), lw: 0.9, color: ink },
    { id: uid(), type: "text", name: "Signature", text: "**{{signatory.name}}**\n{{signatory.designation}}", x: W - mm(102), y: H - mm(34), w: mm(70), size: 11, font: "mukta", color: ink, align: "center", lh: 16 },
  ];
  doc.fields = [
    { key: "doc.certificate_type", label: "Certificate type", label_hi: "प्रमाणपत्र प्रकार", sample: "Appreciation" },
    { key: "recipient.name", label: "Recipient name", label_hi: "नाम" },
    { key: "signatory.name", label: "Signatory name", label_hi: "हस्ताक्षरकर्ता" },
    { key: "signatory.designation", label: "Signatory designation", label_hi: "पद" },
  ];
  return doc;
}

/* ---------- receipt (A5 landscape): gradient header band with logo, labelled rows, amount panel ---------- */
export function receiptTemplate(b: Brand): DesignDoc {
  const accent = b.color ?? "#0f766e";
  const doc = newDoc("a5l");
  const W = Math.round(mm(210)), H = Math.round(mm(148)), m = mm(10), band = mm(25);
  doc.master = [
    { id: uid(), type: "rect", name: "Header band", x: 0, y: 0, w: W, h: band, fill: accent, fill2: shade(accent), grad: "h" },
    logo(m, mm(4), mm(17), "#ffffff40", { shape: "circle", ring: 1.5 }),
    { id: uid(), type: "text", name: "Organization (Hindi)", text: "{{org.name_hi}}", x: m + mm(21), y: mm(4.2), w: W - m * 2 - mm(70), h: mm(8), size: 18, weight: 700, font: "tiro", color: "#ffffff", lh: 26, fit: true },
    { id: uid(), type: "text", name: "Organization", text: "{{org.name|upper}}", x: m + mm(21), y: mm(12), w: W - m * 2 - mm(70), h: mm(4), size: 8.5, weight: 600, font: "sora", color: "#e6fffa", lh: 12, ls: 0.6, fit: true },
    { id: uid(), type: "text", name: "Address", text: "{{org.address}} · {{org.phone}}", x: m + mm(21), y: mm(16.8), w: W - m * 2 - mm(70), h: mm(4), size: 8, font: "mukta", color: "#e6fffa", lh: 12, fit: true },
    { id: uid(), type: "text", name: "Receipt word", text: "रसीद", x: W - m - mm(46), y: mm(4.6), w: mm(46), size: 22, weight: 700, font: "tiro", color: "#ffffff", align: "right", lh: 30 },
    { id: uid(), type: "text", name: "Title", text: "{{doc.title|upper}}", x: W - m - mm(46), y: mm(14.6), w: mm(46), size: 8, weight: 600, font: "sora", color: "#e6fffa", align: "right", lh: 12, ls: 1.4 },
    { id: uid(), type: "rect", name: "Bottom bar", x: 0, y: H - mm(3), w: W, h: mm(3), fill: accent, fill2: gold, grad: "h" },
    { id: uid(), type: "art", name: "Watermark", art: "mandala", x: W / 2 - mm(40), y: mm(40), w: mm(80), h: mm(80), color: accent, opacity: 0.05 },
  ];
  const lw = W - 2 * m - mm(66);
  const lbl = (t: string, y: number): Layer => ({ id: uid(), type: "text", name: "Label", text: t, x: m, y, w: lw, size: 7.5, weight: 600, font: "mukta", color: muted, lh: 11, ls: 0.6 });
  doc.pages[0]!.layers = [
    { id: uid(), type: "text", name: "Reg", text: "[[पंजीयन क्र. {{org.registration_no}}]] · [[PAN {{org.pan}}]] · [[80G {{org.g80}}]]", x: m, y: band + mm(2), w: W - 2 * m, size: 8, font: "mukta", color: muted, lh: 11 },
    { id: uid(), type: "text", name: "Meta", text: "रसीद क्र. / No.  **{{doc.ref_no}}**", x: m, y: band + mm(7), w: mm(90), size: 10.5, font: "mukta", color: ink, lh: 15 },
    { id: uid(), type: "text", name: "Date", text: "दिनांक / Date  **{{doc.date|date}}**", x: W - m - mm(80), y: band + mm(7), w: mm(80), size: 10.5, font: "mukta", color: ink, align: "right", lh: 15 },
    { id: uid(), type: "line", name: "Rule", x: m, y: band + mm(13.5), w: W - 2 * m, lw: 0.7, color: tint(accent, 0.35) },
    lbl("प्राप्त किया / RECEIVED WITH THANKS FROM", band + mm(17)),
    { id: uid(), type: "text", name: "Received from", text: "{{receipt.payer_name}}", x: m, y: band + mm(21), w: lw, h: mm(8), size: 20, weight: 700, font: "tiro", color: ink, lh: 28, fit: true },
    { id: uid(), type: "text", name: "Payer details", text: "{{receipt.payer_address}}[[ · मो. {{receipt.payer_mobile}}]][[ · PAN {{receipt.payer_pan}}]]", x: m, y: band + mm(30), w: lw, size: 9.5, font: "mukta", color: muted, lh: 13 },
    lbl("उद्देश्य / TOWARDS", band + mm(38)),
    { id: uid(), type: "text", name: "Purpose", text: "**{{receipt.purpose}}**", x: m, y: band + mm(42.5), w: lw, size: 13, font: "mukta", color: ink, lh: 16 },
    lbl("भुगतान माध्यम / PAYMENT MODE", band + mm(52)),
    { id: uid(), type: "text", name: "Mode", text: "{{receipt.mode}}[[ · {{receipt.instrument}}]]", x: m, y: band + mm(56.5), w: lw, size: 12, font: "mukta", color: ink, lh: 15 },
    { id: uid(), type: "rect", name: "Amount panel", x: W - m - mm(62), y: band + mm(17), w: mm(62), h: mm(47), radius: 8, fill: tint(accent, 0.07), lw: 1.2, color: accent },
    { id: uid(), type: "text", name: "Amount label", text: "राशि / AMOUNT", x: W - m - mm(62), y: band + mm(20), w: mm(62), size: 8, weight: 700, font: "mukta", color: accent, align: "center", lh: 12, ls: 1.2 },
    { id: uid(), type: "text", name: "Amount", text: "{{receipt.amount|inr}}", x: W - m - mm(60), y: band + mm(25.5), w: mm(58), h: mm(10), size: 24, weight: 700, font: "sora", color: accent, align: "center", lh: 34, fit: true },
    { id: uid(), type: "text", name: "Amount words", text: "{{receipt.amount|words}}", x: W - m - mm(58), y: band + mm(39), w: mm(54), size: 8.5, font: "manrope", color: ink, align: "center", lh: 11 },
    { id: uid(), type: "text", name: "Thanks", text: "आपके सहयोग के लिए हार्दिक आभार", x: W - m - mm(62), y: band + mm(55.5), w: mm(62), size: 11, font: "tiro", color: gold, align: "center", lh: 14 },
    { id: uid(), type: "qr", name: "Verify QR", data: "{{doc.verify_url}}", x: m, y: H - mm(24), w: mm(16), h: mm(16), color: ink },
    { id: uid(), type: "text", name: "Verify hint", text: "स्कैन कर रसीद सत्यापित करें\n{{receipt.footer_note}}", x: m + mm(19), y: H - mm(21.5), w: mm(85), size: 8, font: "mukta", color: muted, lh: 11 },
    { id: uid(), type: "line", name: "Sign rule", x: W - m - mm(52), y: H - mm(15), w: mm(52), lw: 0.8, color: muted },
    { id: uid(), type: "text", name: "Signature", text: "**{{signatory.name}}**\n{{signatory.designation}}", x: W - m - mm(56), y: H - mm(13.8), w: mm(60), size: 9, font: "mukta", color: ink, align: "center", lh: 12 },
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

/* ---------- membership ID card (CR80): gradient band, gold title strip, photo, label/value lines, QR ---------- */
export function idCardTemplate(b: Brand): DesignDoc {
  const accent = b.color ?? "#0f766e";
  const doc = newDoc("idcard", "#ffffff");
  const W = Math.round(mm(85.6)), H = Math.round(mm(54)), band = mm(12.5);
  doc.master = [
    { id: uid(), type: "art", name: "Watermark", art: "mandala", x: W - mm(40), y: mm(10), w: mm(50), h: mm(50), color: accent, opacity: 0.07 },
    { id: uid(), type: "rect", name: "Header band", x: 0, y: 0, w: W, h: band, fill: accent, fill2: shade(accent), grad: "h" },
    logo(mm(2.4), mm(1.7), mm(9), "#ffffff40", { shape: "circle", ring: 0.6 }),
    { id: uid(), type: "text", name: "Organization Hindi", text: "{{org.name_hi}}", x: mm(13), y: mm(1.6), w: W - mm(15), h: mm(5), size: 10, weight: 700, font: "tiro", color: "#ffffff", lh: 14, fit: true },
    { id: uid(), type: "text", name: "Organization", text: "{{org.name|upper}}", x: mm(13), y: mm(6.9), w: W - mm(15), h: mm(3), size: 5.2, weight: 600, font: "sora", color: "#e6fffa", lh: 7.5, ls: 0.4, fit: true },
    { id: uid(), type: "rect", name: "Title strip", x: 0, y: band, w: W, h: mm(3.6), fill: gold },
    { id: uid(), type: "text", name: "Card type", text: "सदस्यता पहचान पत्र  ·  MEMBERSHIP CARD", x: 0, y: band + mm(0.45), w: W, size: 5.2, weight: 700, font: "mukta", color: "#ffffff", align: "center", lh: 8, ls: 0.6 },
    { id: uid(), type: "rect", name: "Footer band", x: 0, y: H - mm(5), w: W, h: mm(5), fill: accent },
    { id: uid(), type: "text", name: "Footer", text: "{{org.phone}} · {{org.website}}", x: mm(3), y: H - mm(4.2), w: W - mm(6), h: mm(3.4), size: 5.4, font: "mukta", color: "#ffffff", align: "center", lh: 8, fit: true },
  ];
  const tx = mm(25.5), tw = W - tx - mm(18);
  doc.pages[0]!.layers = [
    { id: uid(), type: "image", name: "Photo", src: "{{member.photo}}", x: mm(3), y: mm(19), w: mm(19), h: mm(24), shape: "rect", radius: 4, ring: 1.2, color: accent, monogram: "{{member.name_hi}}{{member.name}}" },
    { id: uid(), type: "text", name: "Name Hindi", text: "{{member.name_hi}}", x: tx, y: mm(18.6), w: tw, h: mm(5), size: 10.5, weight: 700, font: "tiro", color: ink, lh: 14, fit: true },
    { id: uid(), type: "text", name: "Name", text: "{{member.name|upper}}", x: tx, y: mm(23.3), w: tw, h: mm(3), size: 5.6, weight: 700, font: "sora", color: accent, lh: 8, ls: 0.3, fit: true },
    { id: uid(), type: "text", name: "Details", text: "सदस्य क्र.  **{{member.member_no}}**\n[[पिता  {{member.father_name}}]]\n[[निवास  {{member.village}}]][[, {{member.city}}]]\n[[मोबाइल  {{member.mobile}}]]\n[[रक्त समूह  **{{member.blood_group}}**]][[  ·  {{member.category}}]]", x: tx, y: mm(27.2), w: tw, size: 5.6, font: "mukta", color: ink, lh: 7.6 },
    { id: uid(), type: "qr", name: "Verify QR", data: "{{doc.verify_url}}", x: W - mm(16), y: mm(19), w: mm(13), h: mm(13), color: ink },
    { id: uid(), type: "text", name: "Verify hint", text: "स्कैन कर सत्यापित करें", x: W - mm(17.5), y: mm(32.6), w: mm(16), size: 3.8, font: "mukta", color: muted, align: "center", lh: 5 },
    { id: uid(), type: "text", name: "Validity", text: "वैध: {{member.valid_from|date}}[[ – {{member.valid_to|date}}]]", x: W - mm(20), y: mm(37), w: mm(18.5), size: 4.4, weight: 600, font: "mukta", color: accent, align: "center", lh: 6 },
  ];
  doc.fields = [];
  return doc;
}


/** शोकपत्र (condolence letter) — portrait, deep navy with diya; recipient name is merged per person. */
export function shokPatraTemplate(b: Brand): DesignDoc {
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
    { id: uid(), type: "text", name: "Dates", text: "निधन: {{shok.death_date|date}}", x: m, y: mm(127), w: W - 2 * m, size: 19, font: "mukta", color: "#d8dde8", align: "center", lh: 28, ls: 0.5 },
    { id: uid(), type: "line", name: "Rule", x: W / 2 - mm(30), y: mm(138), w: mm(60), lw: 1, color: accent },
    { id: uid(), type: "text", name: "Body", text: "अत्यंत दुःख के साथ सूचित करना पड़ रहा है कि **{{shok.deceased}}** का निधन दिनांक {{shok.death_date|date}} को हो गया है। उनका दशगात्र एवं चन्दनपान कार्यक्रम दिनांक **{{shok.ceremony_date|date}}** को संपन्न होगा।\n\nआप सपरिवार पधारकर दिवंगत आत्मा को श्रद्धांजलि अर्पित करें एवं हमें अनुग्रहित करें।", x: cx + mm(4), y: mm(146), w: cw - mm(8), size: 19, font: "mukta", color: "#eef1f6", align: "center", lh: 31 },
    { id: uid(), type: "rect", name: "Venue panel", x: cx + mm(10), y: mm(196), w: cw - mm(20), h: mm(17), radius: 10, fill: "#ffffff10", lw: 1, color: tint(accent, 0.6) },
    { id: uid(), type: "text", name: "Venue", text: "स्थान: **{{shok.venue}}**", x: cx + mm(14), y: mm(200.5), w: cw - mm(28), h: mm(8), size: 18, font: "mukta", color: "#ffffff", align: "center", lh: 25 },
    { id: uid(), type: "rect", name: "Name box", x: cx + mm(6), y: mm(224), w: cw - mm(12), h: mm(34), radius: 12, lw: 1.6, color: accent, fill: "#1f3361", fill2: "#162650", grad: "v" },
    { id: uid(), type: "text", name: "Recipient label", text: "सेवा में,", x: cx + mm(12), y: mm(227.5), w: cw - mm(24), size: 14, font: "mukta", color: accent, lh: 20, ls: 0.5 },
    { id: uid(), type: "text", name: "Recipient", text: "**{{recipient.name}}** {{recipient.father_line}}\n{{recipient.village}}", x: cx + mm(12), y: mm(234.5), w: cw - mm(24), h: mm(21), size: 26, font: "tiro", color: "#ffffff", lh: 32, fit: true },
    { id: uid(), type: "text", name: "Family label", text: "शोकाकुल परिवार", x: m, y: mm(276), w: W - 2 * m, size: 14, font: "mukta", color: accent, align: "center", lh: 20, ls: 1 },
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


/** निमंत्रण (invitation) — A5 portrait, ivory with maroon & gold, garland, info strip, guest box with QR. */
export function invitationTemplate(b: Brand): DesignDoc {
  const accent = b.color && b.color !== "#0f766e" ? b.color : "#8b1e2d";
  const doc = newDoc("a5p", "#fffaf0");
  const W = Math.round(mm(148)), H = Math.round(mm(210)), m = mm(7);
  doc.master = [
    { id: uid(), type: "rect", name: "Edge", x: 0, y: 0, w: W, h: H, lw: mm(3), color: accent },
    { id: uid(), type: "frame", name: "Border", style: "ornate", x: m, y: m, w: W - 2 * m, h: H - 2 * m, color: gold, lw: 2, radius: 10 },
    { id: uid(), type: "art", name: "Watermark", art: "mandala", x: W / 2 - mm(52), y: mm(58), w: mm(104), h: mm(104), color: gold, opacity: 0.08 },
    { id: uid(), type: "art", name: "Garland", art: "garland", x: m + mm(6), y: m + mm(5), w: W - 2 * m - mm(12), h: mm(7), color: gold },
  ];
  const cx = m + mm(6), cw = W - 2 * m - mm(12);
  doc.pages[0]!.layers = [
    { id: uid(), type: "art", name: "Om", art: "om", x: W / 2 - mm(6), y: mm(23), w: mm(12), h: mm(12), color: accent },
    { id: uid(), type: "text", name: "Shubh", text: "॥ शुभ निमंत्रण ॥", x: cx, y: mm(36), w: cw, size: 20, weight: 700, font: "tiro", color: gold, align: "center", lh: 28 },
    { id: uid(), type: "text", name: "Org", text: "{{org.name_hi}}", x: cx, y: mm(46), w: cw, h: mm(6), size: 12.5, weight: 700, font: "tiro", color: ink, align: "center", lh: 18, fit: true },
    { id: uid(), type: "text", name: "Lead", text: "आपको सादर आमंत्रित करता है", x: cx, y: mm(52.5), w: cw, size: 10.5, font: "mukta", color: muted, align: "center", lh: 15 },
    { id: uid(), type: "text", name: "Title", text: "{{event.title_hi}}", x: cx + mm(2), y: mm(61), w: cw - mm(4), h: mm(16), size: 34, weight: 700, font: "tiro", color: accent, align: "center", lh: 48, fit: true },
    { id: uid(), type: "art", name: "Divider", art: "flourish", x: W / 2 - mm(28), y: mm(79), w: mm(56), h: mm(5), color: gold },
    { id: uid(), type: "rect", name: "Info strip", x: cx + mm(2), y: mm(87), w: cw - mm(4), h: mm(26), radius: 8, fill: tint(accent, 0.06), lw: 1, color: tint(gold, 0.7) },
    { id: uid(), type: "text", name: "When label", text: "दिनांक", x: cx + mm(4), y: mm(89.5), w: (cw - mm(8)) / 2, size: 8.5, weight: 700, font: "mukta", color: gold, align: "center", lh: 12, ls: 0.8 },
    { id: uid(), type: "text", name: "When", text: "**{{event.date}}**", x: cx + mm(4), y: mm(94), w: (cw - mm(8)) / 2, size: 13, font: "mukta", color: ink, align: "center", lh: 18 },
    { id: uid(), type: "text", name: "Time label", text: "समय", x: cx + mm(4) + (cw - mm(8)) / 2, y: mm(89.5), w: (cw - mm(8)) / 2, size: 8.5, weight: 700, font: "mukta", color: gold, align: "center", lh: 12, ls: 0.8 },
    { id: uid(), type: "text", name: "Time", text: "**{{event.time}}**", x: cx + mm(4) + (cw - mm(8)) / 2, y: mm(94), w: (cw - mm(8)) / 2, size: 13, font: "mukta", color: ink, align: "center", lh: 18 },
    { id: uid(), type: "line", name: "Info divider", x: cx + mm(8), y: mm(101.5), w: cw - mm(16), lw: 0.6, color: tint(gold, 0.6) },
    { id: uid(), type: "text", name: "Venue", text: "स्थान: **{{event.venue_hi}}**", x: cx + mm(5), y: mm(103.5), w: cw - mm(10), h: mm(8), size: 11, font: "mukta", color: ink, align: "center", lh: 15 },
    { id: uid(), type: "text", name: "Body", text: "{{event.message}}", x: cx + mm(4), y: mm(115), w: cw - mm(8), size: 11.5, font: "mukta", color: "#3b3b46", align: "center", lh: 17 },
    { id: uid(), type: "rect", name: "Guest box", x: cx + mm(2), y: mm(140), w: cw - mm(4), h: mm(26), radius: 8, lw: 1.2, color: gold, fill: "#fff3dc" },
    { id: uid(), type: "text", name: "Guest label", text: "सादर आमंत्रित", x: cx + mm(6), y: mm(143), w: cw - mm(34), size: 9, weight: 700, font: "mukta", color: gold, lh: 13, ls: 0.6 },
    { id: uid(), type: "text", name: "Guest", text: "{{guest.name}}", x: cx + mm(6), y: mm(148), w: cw - mm(34), h: mm(8), size: 17, weight: 700, font: "tiro", color: ink, lh: 24, fit: true },
    { id: uid(), type: "text", name: "Guest group", text: "{{guest.group}}", x: cx + mm(6), y: mm(157), w: cw - mm(34), size: 10, font: "mukta", color: muted, lh: 14 },
    { id: uid(), type: "qr", name: "Check-in QR", data: "{{guest.rsvp_url}}", x: cx + cw - mm(25), y: mm(142.5), w: mm(21), h: mm(21), color: ink },
    { id: uid(), type: "text", name: "QR hint", text: "उपस्थिति हेतु स्कैन करें", x: cx + mm(2), y: mm(168), w: cw - mm(4), size: 7.5, font: "mukta", color: muted, align: "right", lh: 10 },
    logo(W / 2 - mm(5.5), H - mm(33), mm(11), accent, { shape: "circle" }),
    { id: uid(), type: "text", name: "Footer", text: "निवेदक: **{{event.organizer}}**[[ · संपर्क {{event.contact}}]]", x: cx, y: H - mm(20.5), w: cw, size: 9.5, font: "mukta", color: ink, align: "center", lh: 14 },
  ];
  doc.fields = [
    { key: "event.title_hi", label: "Event title", label_hi: "आयोजन", sample: "वार्षिक स्नेह मिलन" },
    { key: "event.date", label: "Date", label_hi: "दिनांक", sample: "15-12-2026" },
    { key: "event.time", label: "Time", label_hi: "समय", sample: "सुबह 10 बजे" },
    { key: "event.venue_hi", label: "Venue", label_hi: "स्थान", sample: "सामुदायिक भवन, रायपुर" },
    { key: "event.message", label: "Message", label_hi: "संदेश", sample: "आप सपरिवार सादर आमंत्रित हैं।" },
    { key: "guest.name", label: "Guest name (per person)", label_hi: "अतिथि", sample: "श्री रमेश कुमार" },
  ];
  return doc;
}

/** Start from the organization's own printed letterhead / card artwork: the uploaded picture fills the page as the
 *  master layer and the movable fields (ref no, date, body / member details) sit on top — drag them into place. */
export function fromUploadedBackground(kind: "letter" | "certificate" | "id_card" | "receipt", src: string, b: Brand, orientation: "portrait" | "landscape" = "portrait"): DesignDoc {
  const base = kind === "id_card" ? idCardTemplate(b) : kind === "certificate" ? certificateTemplate(b) : kind === "receipt" ? receiptTemplate(b) : letterTemplate(b);
  const { W, H } = pagePx(base);
  void orientation;
  base.master = [{ id: uid(), type: "image", name: "My letterhead / artwork", src, x: 0, y: 0, w: W, h: H, fit: "cover" }];
  // keep only the merge-field layers (drop decorative shapes/text that the artwork already carries)
  for (const pg of base.pages) pg.layers = pg.layers.filter((l) => l.type === "flow" || l.type === "qr" || l.type === "image" || (l.type === "text" && /\{\{/.test(l.text)));
  return base;
}

export const STARTER_TEMPLATES: { kind: string; name: string; name_hi: string; make: (b: Brand) => DesignDoc }[] = [
  { kind: "letterhead", name: "Official letterhead", name_hi: "आधिकारिक लेटरहेड", make: letterheadTemplate },
  { kind: "letter", name: "General letter", name_hi: "सामान्य पत्र", make: letterTemplate },
  { kind: "certificate", name: "Certificate", name_hi: "प्रमाणपत्र", make: certificateTemplate },
  { kind: "receipt", name: "Receipt", name_hi: "रसीद", make: receiptTemplate },
  { kind: "id_card", name: "Membership card", name_hi: "सदस्यता कार्ड", make: idCardTemplate },
  { kind: "shok_patra", name: "Condolence letter (शोकपत्र)", name_hi: "शोकपत्र", make: shokPatraTemplate },
  { kind: "invitation", name: "Invitation (निमंत्रण)", name_hi: "निमंत्रण", make: invitationTemplate },
];
