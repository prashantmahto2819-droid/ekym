// Builds the merge data used by templates: org.*, doc.*, recipient.*, signatory.*, receipt.*, member.* …
import type { MergeData } from "@/design-engine";

type OrgSettings = Record<string, unknown> | null | undefined;
type Tenant = { name: string; name_hi: string | null; slug: string };

export function orgMergeData(tenant: Tenant, settings: OrgSettings): MergeData {
  const s = (settings ?? {}) as Record<string, unknown>;
  const addr = [s["address"], s["city"], s["district"], s["state"], s["pincode"]].filter(Boolean).join(", ");
  const reg = (s["registration"] ?? {}) as Record<string, unknown>;
  return {
    org: {
      name: (s["organization_name"] as string) || tenant.name,
      // Hindi documents print name_hi; fall back to the main name so the heading is never blank
      name_hi: (s["organization_name_hi"] as string) || tenant.name_hi || (s["organization_name"] as string) || tenant.name,
      tagline: s["tagline"] ?? "",
      address: addr,
      phone: s["phone"] ?? "",
      whatsapp: s["whatsapp"] ?? "",
      email: s["email"] ?? "",
      website: s["website"] ?? "",
      logo: s["logo"] ?? "",
      registration_no: reg["reg_no"] ?? s["registration_no"] ?? "",
      pan: reg["pan"] ?? "",
      g80: reg["g80"] ?? "",
    },
  };
}

export type DocRow = {
  id: string;
  kind: string;
  title: string;
  ref_no: string | null;
  doc_date: string;
  subject: string | null;
  recipient: Record<string, unknown>;
  body: string | null;
  fields: Record<string, unknown>;
  signatories: { name?: string; designation?: string }[];
  status: string;
  verify_code: string | null;
};

export function docMergeData(d: DocRow, siteUrl: string): MergeData {
  const sig = d.signatories?.[0] ?? {};
  const f = d.fields ?? {};
  // fields may be flat ("doc.closing") or nested ({doc:{closing}}) — support both
  const nested: Record<string, Record<string, unknown>> = {};
  for (const [k, v] of Object.entries(f)) {
    if (k.startsWith("_")) continue;
    const [a, ...rest] = k.split(".");
    if (rest.length) (nested[a!] ??= {})[rest.join(".")] = v;
    else if (v && typeof v === "object" && !Array.isArray(v)) nested[k] = { ...(nested[k] ?? {}), ...(v as Record<string, unknown>) };
    else (nested["doc"] ??= {})[k] = v;
  }
  return {
    ...nested,
    doc: {
      ...(nested["doc"] ?? {}),
      id: d.id,
      kind: d.kind,
      title: d.title,
      ref_no: d.ref_no ?? (d.status === "issued" ? "" : "DRAFT"),
      date: d.doc_date,
      subject: d.subject ?? "",
      body: d.body ?? "",
      verify_url: d.verify_code ? `${siteUrl}/verify/${d.verify_code}` : `${siteUrl}/verify`,
      status: d.status,
    },
    recipient: { ...(nested["recipient"] ?? {}), ...(d.recipient ?? {}) },
    signatory: { ...(nested["signatory"] ?? {}), ...sig },
  };
}

export const SAMPLE_DATA: MergeData = {
  doc: { ref_no: "EKYM/L/0001", date: "2026-11-04", subject: "Sample subject of the letter", body: "This is sample body text. It wraps across lines and, when long enough, continues on the next page.\n\nRegards.", salutation: "Respected Sir/Madam,", closing: "Yours sincerely,", title: "Donation Receipt", certificate_type: "Appreciation", verify_url: "https://example.org/verify/SAMPLE" },
  recipient: { name: "Shri Ramesh Kumar", designation: "President", organization: "Kalchuri Samaj, Raipur", address: "Main Road, Raipur" },
  signatory: { name: "Prashant Mahto", designation: "Secretary" },
  receipt: { payer_name: "Shri Ramesh Kumar", amount: 1100, purpose: "General donation", mode: "UPI", instrument: "TXN123456", payer_mobile: "98xxxxxx10", payer_address: "Raipur", payer_pan: "", footer_note: "This receipt is computer generated." },
  member: { name: "Ramesh Kumar", name_hi: "रमेश कुमार", member_no: "EKYM/M/0001", category: "Life", city: "Raipur", village: "Kharora", district: "Raipur", father_name: "Shri Mohan Kumar", mobile: "98765 43210", blood_group: "B+", valid_from: "2026-11-04", valid_to: "2031-11-03", photo: "" },
  event: { title_hi: "वार्षिक स्नेह मिलन", date: "15-12-2026", time: "सुबह 10 बजे", venue_hi: "सामुदायिक भवन, रायपुर", message: "आप सपरिवार सादर आमंत्रित हैं।", organizer: "आयोजन समिति", contact: "98xxxxxx10" },
  guest: { name: "श्री रमेश कुमार", group: "कुसमुण्डा", rsvp_url: "https://example.org/rsvp/abc" },
  shok: { deceased: "श्री संतोष कुमार कश्यप", death_date: "2026-11-01", ceremony_date: "2026-11-11", venue: "नगर पालिका सामुदायिक भवन, आदर्श नगर, कुसमुण्डा", family: "कश्यप परिवार, कुसमुण्डा" },
};
// recipient sample for शोकपत्र previews (father_line = "(पिता: …)" or empty)
(SAMPLE_DATA["recipient"] as Record<string, unknown>)["father_line"] = "(पिता: श्री मोहन लाल)";
(SAMPLE_DATA["recipient"] as Record<string, unknown>)["village"] = "कुसमुण्डा";
