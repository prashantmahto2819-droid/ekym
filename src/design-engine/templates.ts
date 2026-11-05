// Built-in starter templates. Organizations copy these and edit them in the Studio.
import { pagePx } from "./model";
import { mm, newDoc, uid, type DesignDoc, type Layer } from "./model";

export type Brand = { name: string; name_hi?: string | null | undefined; tagline?: string | null | undefined; address?: string | null | undefined; phone?: string | null | undefined; email?: string | null | undefined; website?: string | null | undefined; logo?: string | null | undefined; color?: string | undefined };

const ink = "#1b2a4a";

function header(b: Brand, W: number, accent: string): Layer[] {
  const m = mm(14);
  const layers: Layer[] = [];
  if (b.logo) layers.push({ id: uid(), type: "image", name: "Logo", src: b.logo, x: m, y: mm(12), w: mm(22), h: mm(22), shape: "rect" });
  const tx = b.logo ? m + mm(26) : m;
  layers.push({ id: uid(), type: "text", name: "Organization name", text: "{{org.name}}", x: tx, y: mm(12), w: W - tx - m, size: 26, weight: 700, font: "sora", color: accent, lh: 32 });
  layers.push({ id: uid(), type: "text", name: "Name (Hindi)", text: "{{org.name_hi}}", x: tx, y: mm(12) + 32, w: W - tx - m, size: 18, weight: 700, font: "tiro", color: ink, lh: 24 });
  layers.push({ id: uid(), type: "text", name: "Address line", text: "{{org.address}} · {{org.phone}} · {{org.email}}", x: tx, y: mm(12) + 58, w: W - tx - m, size: 10.5, font: "manrope", color: "#4b5563", lh: 14 });
  layers.push({ id: uid(), type: "line", name: "Header rule", x: m, y: mm(36), w: W - 2 * m, lw: 2, color: accent });
  return layers;
}
function footer(W: number, H: number, accent: string): Layer[] {
  const m = mm(14);
  return [
    { id: uid(), type: "line", name: "Footer rule", x: m, y: H - mm(18), w: W - 2 * m, lw: 1, color: accent },
    { id: uid(), type: "text", name: "Footer", text: "{{org.website}}  ·  {{org.tagline}}", x: m, y: H - mm(16), w: W - 2 * m, size: 9.5, font: "manrope", color: "#6b7280", align: "center", lh: 13 },
    { id: uid(), type: "text", name: "Page credit", text: "Kalchuri One · Designed & Developed by Vivid Brandify", x: m, y: H - mm(10), w: W - 2 * m, size: 7.5, font: "manrope", color: "#9ca3af", align: "center", lh: 10 },
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
  const W = Math.round(mm(210)), H = Math.round(mm(297)), m = mm(14);
  const top = mm(44);
  const page = doc.pages[0]!;
  page.layers = [
    { id: uid(), type: "text", name: "Ref no", text: "Ref: {{doc.ref_no}}", x: m, y: top, w: mm(90), size: 11, font: "manrope", color: ink, lh: 15 },
    { id: uid(), type: "text", name: "Date", text: "Date: {{doc.date|date}}", x: W - m - mm(60), y: top, w: mm(60), size: 11, font: "manrope", color: ink, align: "right", lh: 15 },
    { id: uid(), type: "text", name: "Recipient", text: "To,\n{{recipient.name}}\n{{recipient.designation}}\n{{recipient.organization}}\n{{recipient.address}}", x: m, y: top + mm(10), w: mm(110), size: 11.5, font: "manrope", color: ink, lh: 16 },
    { id: uid(), type: "text", name: "Subject", text: "Subject: **{{doc.subject}}**", x: m, y: top + mm(42), w: W - 2 * m, size: 12, font: "manrope", color: ink, lh: 17 },
    { id: uid(), type: "text", name: "Salutation", text: "{{doc.salutation}}", x: m, y: top + mm(52), w: W - 2 * m, size: 11.5, font: "manrope", color: ink, lh: 16 },
    { id: uid(), type: "flow", name: "Body", text: "{{doc.body}}", x: m, y: top + mm(60), w: W - 2 * m, h: H - mm(22) - (top + mm(60)) - mm(40), size: 11.5, font: "manrope", color: ink, lh: 17, align: "justify" },
    { id: uid(), type: "text", name: "Signature", text: "{{doc.closing}}\n\n\n**{{signatory.name}}**\n{{signatory.designation}}\n{{org.name}}", x: W - m - mm(70), y: H - mm(22) - mm(38), w: mm(70), size: 11, font: "manrope", color: ink, lh: 15, lastPageOnly: true },
    { id: uid(), type: "qr", name: "Verify QR", data: "{{doc.verify_url}}", x: m, y: H - mm(22) - mm(22), w: mm(18), h: mm(18), color: ink, lastPageOnly: true },
    { id: uid(), type: "text", name: "Verify hint", text: "Scan to verify", x: m, y: H - mm(22) - mm(3), w: mm(30), size: 7.5, font: "manrope", color: "#6b7280", lh: 10, lastPageOnly: true },
  ];
  doc.fields = [
    { key: "recipient.name", label: "Recipient name", label_hi: "प्राप्तकर्ता का नाम" },
    { key: "recipient.designation", label: "Recipient designation", label_hi: "पद" },
    { key: "recipient.organization", label: "Recipient organization", label_hi: "संस्था" },
    { key: "recipient.address", label: "Recipient address", label_hi: "पता" },
    { key: "doc.salutation", label: "Salutation", label_hi: "संबोधन", sample: "Respected Sir/Madam," },
    { key: "doc.closing", label: "Closing", label_hi: "समापन", sample: "Yours sincerely," },
    { key: "signatory.name", label: "Signatory name", label_hi: "हस्ताक्षरकर्ता" },
    { key: "signatory.designation", label: "Signatory designation", label_hi: "हस्ताक्षरकर्ता का पद" },
  ];
  void accent;
  return doc;
}

export function certificateTemplate(b: Brand): DesignDoc {
  const accent = b.color ?? "#b8924a";
  const doc = newDoc("a4l", "#fffdf7");
  const W = Math.round(mm(297)), H = Math.round(mm(210)), m = mm(12);
  doc.master = [
    { id: uid(), type: "frame", name: "Border", style: "double", x: m, y: m, w: W - 2 * m, h: H - 2 * m, color: accent, lw: 3, radius: 10 },
    { id: uid(), type: "art", name: "Corner", art: "ornament", x: m + 10, y: m + 10, w: 60, h: 60, color: accent },
  ];
  const page = doc.pages[0]!;
  page.layers = [
    ...(b.logo ? [{ id: uid(), type: "image", name: "Logo", src: b.logo, x: W / 2 - mm(12), y: mm(22), w: mm(24), h: mm(24), shape: "circle" } as Layer] : []),
    { id: uid(), type: "text", name: "Organization", text: "{{org.name}}", x: m, y: mm(48), w: W - 2 * m, size: 24, weight: 700, font: "sora", color: ink, align: "center", lh: 30 },
    { id: uid(), type: "text", name: "Title", text: "CERTIFICATE OF {{doc.certificate_type|upper}}", x: m, y: mm(62), w: W - 2 * m, size: 34, weight: 700, font: "sora", color: accent, align: "center", lh: 42 },
    { id: uid(), type: "text", name: "Lead", text: "This certificate is proudly presented to", x: m, y: mm(82), w: W - 2 * m, size: 13, font: "manrope", color: "#4b5563", align: "center", lh: 18 },
    { id: uid(), type: "text", name: "Recipient", text: "{{recipient.name}}", x: mm(40), y: mm(92), w: W - mm(80), h: mm(16), size: 40, weight: 700, font: "tiro", color: ink, align: "center", lh: 50, fit: true },
    { id: uid(), type: "line", name: "Name rule", x: mm(60), y: mm(108), w: W - mm(120), lw: 1.5, color: accent },
    { id: uid(), type: "text", name: "Body", text: "{{doc.body}}", x: mm(40), y: mm(114), w: W - mm(80), size: 13, font: "manrope", color: ink, align: "center", lh: 19 },
    { id: uid(), type: "text", name: "Date", text: "Date: {{doc.date|date}}\nRef: {{doc.ref_no}}", x: mm(30), y: H - mm(40), w: mm(70), size: 10.5, font: "manrope", color: ink, lh: 15 },
    { id: uid(), type: "text", name: "Signature", text: "\n**{{signatory.name}}**\n{{signatory.designation}}", x: W - mm(100), y: H - mm(44), w: mm(70), size: 11, font: "manrope", color: ink, align: "center", lh: 15 },
    { id: uid(), type: "line", name: "Sign rule", x: W - mm(100), y: H - mm(40), w: mm(70), lw: 1, color: ink },
    { id: uid(), type: "qr", name: "Verify QR", data: "{{doc.verify_url}}", x: W / 2 - mm(9), y: H - mm(40), w: mm(18), h: mm(18), color: ink },
  ];
  doc.fields = [
    { key: "doc.certificate_type", label: "Certificate type", label_hi: "प्रमाणपत्र प्रकार", sample: "Appreciation" },
    { key: "recipient.name", label: "Recipient name", label_hi: "नाम" },
    { key: "signatory.name", label: "Signatory name", label_hi: "हस्ताक्षरकर्ता" },
    { key: "signatory.designation", label: "Signatory designation", label_hi: "पद" },
  ];
  return doc;
}

export function receiptTemplate(b: Brand): DesignDoc {
  const accent = b.color ?? "#0f766e";
  const doc = newDoc("a5l");
  const W = Math.round(mm(210)), H = Math.round(mm(148)), m = mm(10);
  doc.master = [
    { id: uid(), type: "frame", name: "Border", style: "single", x: m / 2, y: m / 2, w: W - m, h: H - m, color: accent, lw: 1.5, radius: 6 },
    ...(b.logo ? [{ id: uid(), type: "image", name: "Logo", src: b.logo, x: m, y: m, w: mm(16), h: mm(16) } as Layer] : []),
    { id: uid(), type: "text", name: "Organization", text: "{{org.name}}", x: m + (b.logo ? mm(19) : 0), y: m, w: W - 2 * m - mm(19), size: 18, weight: 700, font: "sora", color: accent, lh: 22 },
    { id: uid(), type: "text", name: "Address", text: "{{org.address}} · {{org.phone}} · {{org.email}}", x: m + (b.logo ? mm(19) : 0), y: m + 23, w: W - 2 * m - mm(19), size: 8.5, font: "manrope", color: "#4b5563", lh: 11 },
    { id: uid(), type: "text", name: "Reg", text: "Reg. No: {{org.registration_no}}   PAN: {{org.pan}}   80G: {{org.g80}}", x: m + (b.logo ? mm(19) : 0), y: m + 35, w: W - 2 * m - mm(19), size: 8, font: "manrope", color: "#4b5563", lh: 10 },
    { id: uid(), type: "line", name: "Rule", x: m, y: mm(28), w: W - 2 * m, lw: 1, color: accent },
  ];
  doc.pages[0]!.layers = [
    { id: uid(), type: "text", name: "Title", text: "{{doc.title|upper}}", x: m, y: mm(31), w: W - 2 * m, size: 14, weight: 700, font: "sora", color: ink, align: "center", lh: 18 },
    { id: uid(), type: "text", name: "Meta", text: "Receipt No: **{{doc.ref_no}}**\nDate: **{{doc.date|date}}**\nMode: {{receipt.mode}} {{receipt.instrument}}", x: W - m - mm(70), y: mm(31), w: mm(70), size: 9.5, font: "manrope", color: ink, align: "right", lh: 13 },
    { id: uid(), type: "text", name: "Received from", text: "Received with thanks from **{{receipt.payer_name}}**\n{{receipt.payer_address}}\nMobile: {{receipt.payer_mobile}}   PAN: {{receipt.payer_pan}}", x: m, y: mm(48), w: W - 2 * m - mm(60), size: 10, font: "manrope", color: ink, lh: 14 },
    { id: uid(), type: "text", name: "Purpose", text: "Towards: **{{receipt.purpose}}**", x: m, y: mm(70), w: W - 2 * m - mm(60), size: 10, font: "manrope", color: ink, lh: 14 },
    { id: uid(), type: "rect", name: "Amount box", x: W - m - mm(55), y: mm(48), w: mm(55), h: mm(26), radius: 6, lw: 1.2, color: accent, fill: "#f0fdfa" },
    { id: uid(), type: "text", name: "Amount", text: "{{receipt.amount|inr}}", x: W - m - mm(55), y: mm(51), w: mm(55), size: 20, weight: 700, font: "sora", color: accent, align: "center", lh: 26 },
    { id: uid(), type: "text", name: "Amount words", text: "{{receipt.amount|words}}", x: W - m - mm(55), y: mm(61), w: mm(55), h: mm(10), size: 8, font: "manrope", color: ink, align: "center", lh: 10 },
    { id: uid(), type: "text", name: "Footer note", text: "{{receipt.footer_note}}", x: m, y: H - mm(32), w: W - 2 * m - mm(60), size: 8, font: "manrope", color: "#6b7280", lh: 11 },
    { id: uid(), type: "text", name: "Signature", text: "\n\n**{{signatory.name}}**\n{{signatory.designation}}", x: W - m - mm(50), y: H - mm(38), w: mm(50), size: 9.5, font: "manrope", color: ink, align: "center", lh: 12 },
    { id: uid(), type: "qr", name: "Verify QR", data: "{{doc.verify_url}}", x: m, y: H - mm(24), w: mm(14), h: mm(14), color: ink },
    { id: uid(), type: "text", name: "Verify hint", text: "Scan to verify this receipt", x: m + mm(16), y: H - mm(20), w: mm(50), size: 7.5, font: "manrope", color: "#6b7280", lh: 10 },
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

export function idCardTemplate(b: Brand): DesignDoc {
  const accent = b.color ?? "#0f766e";
  const doc = newDoc("idcard", "#ffffff");
  const W = Math.round(mm(85.6)), H = Math.round(mm(54));
  doc.master = [
    { id: uid(), type: "rect", name: "Header band", x: 0, y: 0, w: W, h: mm(14), fill: accent },
    { id: uid(), type: "text", name: "Organization", text: "{{org.name}}", x: mm(3), y: mm(2), w: W - mm(6), size: 10, weight: 700, font: "sora", color: "#ffffff", lh: 12, fit: true },
    { id: uid(), type: "text", name: "Organization Hindi", text: "{{org.name_hi}}", x: mm(3), y: mm(6.5), w: W - mm(6), size: 7, weight: 700, font: "tiro", color: "#ffffff", lh: 9, fit: true },
    { id: uid(), type: "text", name: "Card type", text: "{{doc.title|upper}} · {{org.name}}", x: mm(3), y: mm(10), w: W - mm(6), size: 5.5, weight: 600, font: "manrope", color: "#e6fffa", lh: 7 },
    { id: uid(), type: "text", name: "Footer", text: "{{org.phone}} · {{org.website}}", x: mm(3), y: H - mm(5), w: W - mm(6), size: 5.5, font: "manrope", color: "#6b7280", lh: 7 },
  ];
  doc.pages[0]!.layers = [
    { id: uid(), type: "image", name: "Photo", src: "{{member.photo}}", x: mm(3), y: mm(17), w: mm(20), h: mm(25), shape: "rect", radius: 4, ring: 1, color: accent },
    { id: uid(), type: "text", name: "Name", text: "{{member.name}}", x: mm(26), y: mm(17), w: mm(42), h: mm(7), size: 11, weight: 700, font: "sora", color: ink, lh: 14, fit: true },
    { id: uid(), type: "text", name: "Name Hindi", text: "{{member.name_hi}}", x: mm(26), y: mm(23), w: mm(42), size: 9, weight: 700, font: "tiro", color: ink, lh: 12, fit: true },
    { id: uid(), type: "text", name: "Details", text: "Member No: **{{member.member_no}}**   Blood: **{{member.blood_group}}**\nS/o {{member.father_name}}\n{{member.village}} {{member.city}}\nMob: {{member.mobile}}\nValid: {{member.valid_from|date}} – {{member.valid_to|date}}", x: mm(26), y: mm(29), w: mm(42), size: 6, font: "manrope", color: ink, lh: 8 },
    { id: uid(), type: "qr", name: "Verify QR", data: "{{doc.verify_url}}", x: W - mm(16), y: mm(28), w: mm(13), h: mm(13), color: ink },
  ];
  doc.fields = [];
  return doc;
}


/** शोकपत्र (condolence letter) — portrait, dark navy with diya; recipient name is merged per person. */
export function shokPatraTemplate(b: Brand): DesignDoc {
  const accent = b.color && b.color !== "#0f766e" ? b.color : "#b8924a";
  const doc = newDoc("shokp", "#14213d");
  const W = Math.round(mm(277.8)), H = Math.round(mm(394.5)), m = mm(18);
  doc.master = [
    { id: uid(), type: "frame", name: "Border", style: "double", x: m, y: m, w: W - 2 * m, h: H - 2 * m, color: accent, lw: 3, radius: 14 },
    { id: uid(), type: "art", name: "Diya", art: "diya", x: W / 2 - mm(16), y: mm(28), w: mm(32), h: mm(32), color: accent },
    { id: uid(), type: "art", name: "Divider", art: "divider", x: W / 2 - mm(50), y: mm(64), w: mm(100), h: mm(8), color: accent },
  ];
  doc.pages[0]!.layers = [
    { id: uid(), type: "text", name: "Shraddhanjali", text: "॥ श्रद्धांजलि ॥", x: m, y: mm(74), w: W - 2 * m, size: 30, weight: 700, font: "tiro", color: accent, align: "center", lh: 40 },
    { id: uid(), type: "text", name: "Deceased", text: "{{shok.deceased}}", x: m + mm(10), y: mm(92), w: W - 2 * m - mm(20), h: mm(26), size: 52, weight: 700, font: "tiro", color: "#ffffff", align: "center", lh: 64, fit: true },
    { id: uid(), type: "text", name: "Dates", text: "निधन: {{shok.death_date|date}}", x: m, y: mm(122), w: W - 2 * m, size: 18, font: "mukta", color: "#e5e7eb", align: "center", lh: 26 },
    { id: uid(), type: "text", name: "Body", text: "अत्यंत दुःख के साथ सूचित करना पड़ रहा है कि **{{shok.deceased}}** का निधन दिनांक {{shok.death_date|date}} को हो गया है। उनका दशगात्र एवं चन्दनपान दिनांक **{{shok.ceremony_date|date}}** को संपन्न होगा।\n\nस्थान: {{shok.venue}}\n\nआप सपरिवार पधारकर मृतात्मा को शांति प्रदान कर हमें अनुग्रहित करें।", x: m + mm(14), y: mm(140), w: W - 2 * m - mm(28), size: 18, font: "mukta", color: "#f3f4f6", align: "center", lh: 29 },
    { id: uid(), type: "rect", name: "Name box", x: m + mm(20), y: mm(236), w: W - 2 * m - mm(40), h: mm(34), radius: 10, lw: 1.5, color: accent, fill: "#1d2b4f" },
    { id: uid(), type: "text", name: "Recipient label", text: "सेवा में,", x: m + mm(24), y: mm(239), w: W - 2 * m - mm(48), size: 13, font: "mukta", color: accent, lh: 18 },
    { id: uid(), type: "text", name: "Recipient", text: "**{{recipient.name}}** {{recipient.father_line}}\n{{recipient.village}}", x: m + mm(24), y: mm(246), w: W - 2 * m - mm(48), h: mm(22), size: 22, font: "tiro", color: "#ffffff", lh: 30, fit: true },
    { id: uid(), type: "text", name: "Family", text: "शोकाकुल: {{shok.family}}", x: m, y: mm(290), w: W - 2 * m, size: 16, font: "mukta", color: "#e5e7eb", align: "center", lh: 24 },
    { id: uid(), type: "text", name: "Organization", text: "{{org.name_hi}}", x: m, y: H - mm(50), w: W - 2 * m, size: 15, weight: 700, font: "tiro", color: accent, align: "center", lh: 22 },
    { id: uid(), type: "text", name: "Org line", text: "{{org.address}} · {{org.phone}}", x: m, y: H - mm(42), w: W - 2 * m, size: 11, font: "mukta", color: "#9ca3af", align: "center", lh: 16 },
  ];
  doc.fields = [
    { key: "shok.deceased", label: "Deceased name", label_hi: "दिवंगत का नाम", sample: "श्री संतोष कुमार कश्यप" },
    { key: "shok.death_date", label: "Date of death", label_hi: "निधन की तारीख", sample: "2026-11-01" },
    { key: "shok.ceremony_date", label: "Ceremony date", label_hi: "दशगात्र / चन्दनपान", sample: "2026-11-11" },
    { key: "shok.venue", label: "Venue", label_hi: "स्थान", sample: "सामुदायिक भवन, आदर्श नगर" },
    { key: "shok.family", label: "Bereaved family", label_hi: "शोकाकुल परिवार", sample: "कश्यप परिवार, कुसमुण्डा" },
    { key: "recipient.name", label: "Recipient name (per person)", label_hi: "प्राप्तकर्ता का नाम", sample: "श्री रमेश कुमार" },
  ];
  return doc;
}


/** निमंत्रण (invitation) — portrait story size, QR per guest for check-in / RSVP. */
export function invitationTemplate(b: Brand): DesignDoc {
  const accent = b.color ?? "#b8924a";
  const doc = newDoc("a5p", "#fffaf0");
  const W = Math.round(mm(148)), H = Math.round(mm(210)), m = mm(10);
  doc.master = [
    { id: uid(), type: "frame", name: "Border", style: "ornate", x: m, y: m, w: W - 2 * m, h: H - 2 * m, color: accent, lw: 2.5, radius: 12 },
    { id: uid(), type: "art", name: "Ornament", art: "ornament", x: W / 2 - mm(10), y: mm(16), w: mm(20), h: mm(20), color: accent },
  ];
  doc.pages[0]!.layers = [
    { id: uid(), type: "text", name: "Shubh", text: "॥ शुभ निमंत्रण ॥", x: m, y: mm(38), w: W - 2 * m, size: 22, weight: 700, font: "tiro", color: accent, align: "center", lh: 30 },
    { id: uid(), type: "text", name: "Org", text: "{{org.name_hi}}", x: m, y: mm(50), w: W - 2 * m, size: 13, font: "mukta", color: ink, align: "center", lh: 18 },
    { id: uid(), type: "text", name: "Title", text: "{{event.title_hi}}", x: m + mm(6), y: mm(62), w: W - 2 * m - mm(12), h: mm(22), size: 30, weight: 700, font: "tiro", color: ink, align: "center", lh: 38, fit: true },
    { id: uid(), type: "text", name: "When", text: "दिनांक: **{{event.date}}** · समय: **{{event.time}}**", x: m, y: mm(90), w: W - 2 * m, size: 13, font: "mukta", color: ink, align: "center", lh: 19 },
    { id: uid(), type: "text", name: "Venue", text: "स्थान: {{event.venue_hi}}", x: m + mm(6), y: mm(100), w: W - 2 * m - mm(12), size: 13, font: "mukta", color: ink, align: "center", lh: 19 },
    { id: uid(), type: "text", name: "Body", text: "{{event.message}}", x: m + mm(8), y: mm(118), w: W - 2 * m - mm(16), size: 12, font: "mukta", color: "#374151", align: "center", lh: 18 },
    { id: uid(), type: "rect", name: "Guest box", x: m + mm(10), y: mm(150), w: W - 2 * m - mm(20), h: mm(22), radius: 8, lw: 1.2, color: accent, fill: "#fff7e6" },
    { id: uid(), type: "text", name: "Guest", text: "सादर आमंत्रित: **{{guest.name}}**\n{{guest.group}}", x: m + mm(12), y: mm(153), w: W - 2 * m - mm(44), h: mm(16), size: 14, font: "tiro", color: ink, lh: 20, fit: true },
    { id: uid(), type: "qr", name: "Check-in QR", data: "{{guest.rsvp_url}}", x: W - m - mm(30), y: mm(152), w: mm(18), h: mm(18), color: ink },
    { id: uid(), type: "text", name: "Footer", text: "{{event.organizer}} · {{event.contact}}", x: m, y: H - mm(26), w: W - 2 * m, size: 10, font: "mukta", color: "#6b7280", align: "center", lh: 14 },
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
