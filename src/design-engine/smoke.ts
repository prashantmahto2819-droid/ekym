// Browser smoke harness bundled by CI (bun build) and driven by scripts/smoke-engine.mjs.
import { STARTER_TEMPLATES, renderAll, toPdfBytes, pageCount } from "./index";

declare global { interface Window { __smoke: () => Promise<unknown> } }

const data = {
  org: { name: "Ekatm Kalar Yuva Manch", name_hi: "एकात्म कलार युवा मंच", tagline: "Youth united", address: "Raipur, Chhattisgarh", phone: "+91 98xxxxxx10", email: "info@ekym.org", website: "ekym.org", logo: "" },
  doc: { ref_no: "EKYM/L/0001", date: "2026-11-04", subject: "Smoke test letter", salutation: "Respected Sir,", closing: "Yours sincerely,", title: "Donation Receipt", certificate_type: "Appreciation", verify_url: "https://example.org/verify/ABC123", body: Array.from({ length: 40 }, (_, i) => `Paragraph ${i + 1}: यह एक परीक्षण पंक्ति है जो **बोल्ड** शब्दों के साथ कई पंक्तियों में फैलती है, ताकि body text का pagination जाँचा जा सके।`).join("\n\n") },
  recipient: { name: "श्री रमेश कुमार", designation: "President", organization: "Kalchuri Samaj", address: "Main Road, Raipur" },
  signatory: { name: "Prashant Mahto", designation: "Secretary" },
  receipt: { payer_name: "Ramesh Kumar", amount: 1100.5, purpose: "General donation", mode: "UPI", instrument: "TXN1", payer_mobile: "98xxxxxx10", payer_address: "Raipur", payer_pan: "", footer_note: "Computer generated." },
  member: { name: "Ramesh Kumar", name_hi: "रमेश कुमार", member_no: "EKYM/M/0001", category: "Life", city: "Raipur", valid_from: "2026-11-04", valid_to: "2031-11-03", photo: "" },
};

window.__smoke = async () => {
  const out: Record<string, unknown> = {};
  for (const t of STARTER_TEMPLATES) {
    const doc = t.make({ name: "EKYM", name_hi: "एकात्म", color: "#0f766e" });
    const pages = pageCount(doc, data);
    const canvases = await renderAll(doc, data, 1);
    const c = canvases[0]!;
    const px = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    let nonWhite = 0;
    for (let i = 0; i < px.length; i += 4 * 97) if (px[i]! < 240 || px[i + 1]! < 240 || px[i + 2]! < 240) nonWhite++;
    const pdf = await toPdfBytes(doc, data, { dpi: 72 });
    out[t.kind] = { pages, canvases: canvases.length, w: c.width, h: c.height, nonWhiteSamples: nonWhite, pdfBytes: pdf.length, png: c.toDataURL("image/png") };
  }
  return out;
};
