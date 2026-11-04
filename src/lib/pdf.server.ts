import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import QRCode from "qrcode";

/** Central PDF engine. Every generated document uses these primitives. */

const TEAL = rgb(0.059, 0.463, 0.431);
const AMBER = rgb(0.851, 0.467, 0.024);
const INK = rgb(0.043, 0.075, 0.125);
const MUTED = rgb(0.4, 0.44, 0.47);

export type PdfDocContext = {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
};

export async function startDocument(): Promise<PdfDocContext> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  return { doc, page, font, bold };
}

/** Draws a QR code as vector squares — no raster encoder needed at runtime. */
export function drawQrCode(
  page: PDFPage,
  text: string,
  opts: { x: number; y: number; size: number },
) {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const count = qr.modules.size;
  const data = qr.modules.data;
  const cell = opts.size / count;
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      if (!data[row * count + col]) continue;
      page.drawRectangle({
        x: opts.x + col * cell,
        y: opts.y + opts.size - (row + 1) * cell,
        width: cell,
        height: cell,
        color: INK,
      });
    }
  }
}

export type ReceiptDocInput = {
  title: string;
  documentNumber: string;
  issuedOn: string;
  organization: {
    organization_name: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
  };
  rows: { label: string; value: string }[];
  amountLabel?: string;
  amountValue?: string;
  verificationUrl: string;
  footerNote: string;
};

/** Shared A4 receipt/certificate layout used by every money document. */
export async function renderReceiptPdf(input: ReceiptDocInput): Promise<Uint8Array> {
  const { doc, page, font, bold } = await startDocument();
  const { width, height } = page.getSize();
  const M = 48;

  page.drawRectangle({ x: 0, y: height - 120, width, height: 120, color: TEAL });
  page.drawText(input.organization.organization_name ?? "Kalchuri One", {
    x: M,
    y: height - 58,
    size: 20,
    font: bold,
    color: rgb(1, 1, 1),
  });
  const addr = [
    input.organization.address,
    input.organization.city,
    input.organization.state,
    input.organization.pincode,
  ]
    .filter(Boolean)
    .join(", ");
  page.drawText(addr || "", {
    x: M,
    y: height - 78,
    size: 9,
    font,
    color: rgb(0.88, 0.95, 0.94),
  });
  page.drawText(
    [input.organization.phone, input.organization.email, input.organization.website]
      .filter(Boolean)
      .join("  |  "),
    { x: M, y: height - 93, size: 9, font, color: rgb(0.88, 0.95, 0.94) },
  );

  page.drawText(input.title.toUpperCase(), {
    x: M,
    y: height - 160,
    size: 14,
    font: bold,
    color: AMBER,
  });
  page.drawText(`No. ${input.documentNumber}`, {
    x: M,
    y: height - 182,
    size: 10,
    font: bold,
    color: INK,
  });
  page.drawText(`Date: ${input.issuedOn}`, {
    x: width - M - 150,
    y: height - 182,
    size: 10,
    font,
    color: INK,
  });

  page.drawLine({
    start: { x: M, y: height - 196 },
    end: { x: width - M, y: height - 196 },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.87),
  });

  let y = height - 226;
  for (const row of input.rows) {
    page.drawText(row.label, { x: M, y, size: 10, font, color: MUTED });
    page.drawText(row.value || "—", { x: M + 170, y, size: 10, font: bold, color: INK });
    y -= 22;
  }

  if (input.amountValue) {
    y -= 10;
    page.drawRectangle({
      x: M,
      y: y - 12,
      width: width - M * 2,
      height: 40,
      color: rgb(0.95, 0.98, 0.97),
    });
    page.drawText(input.amountLabel ?? "Amount received", {
      x: M + 14,
      y: y + 6,
      size: 11,
      font,
      color: MUTED,
    });
    page.drawText(input.amountValue, {
      x: width - M - 160,
      y: y + 2,
      size: 16,
      font: bold,
      color: TEAL,
    });
    y -= 50;
  }

  drawQrCode(page, input.verificationUrl, { x: M, y: 120, size: 90 });
  page.drawText("Scan to verify", { x: M, y: 106, size: 8, font, color: MUTED });
  page.drawText(input.verificationUrl, { x: M, y: 94, size: 7, font, color: MUTED });

  page.drawText("Authorised signatory", {
    x: width - M - 160,
    y: 132,
    size: 9,
    font,
    color: MUTED,
  });
  page.drawLine({
    start: { x: width - M - 160, y: 148 },
    end: { x: width - M, y: 148 },
    thickness: 0.8,
    color: rgb(0.7, 0.74, 0.73),
  });

  const note = input.footerNote;
  page.drawText(note.slice(0, 120), { x: M, y: 62, size: 8, font, color: MUTED });
  if (note.length > 120) {
    page.drawText(note.slice(120, 240), { x: M, y: 52, size: 8, font, color: MUTED });
  }

  return doc.save();
}

export type OrgHeader = ReceiptDocInput["organization"];

export type VolunteerDocInput = {
  name: string;
  referenceId: string;
  designation: string | null;
  city: string | null;
  state: string | null;
  mobile: string | null;
  bloodGroup?: string | null;
  validUntil?: string | null;
  issuedOn: string;
  organization: OrgHeader;
  verificationUrl: string;
  photo?: { bytes: Uint8Array; contentType: string } | null;
};

async function embedPhoto(doc: PDFDocument, photo: VolunteerDocInput["photo"]) {
  if (!photo) return null;
  try {
    return photo.contentType === "image/png"
      ? await doc.embedPng(photo.bytes)
      : await doc.embedJpg(photo.bytes);
  } catch {
    return null;
  }
}

/** Wallet-size volunteer ID card with the applicant's photo. */
export async function renderVolunteerIdCard(input: VolunteerDocInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([242, 153]); // 85.6 x 54 mm
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();

  page.drawRectangle({ x: 0, y: height - 30, width, height: 30, color: TEAL });
  page.drawText((input.organization.organization_name ?? "Kalchuri One").slice(0, 34), {
    x: 10,
    y: height - 19,
    size: 9,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawRectangle({ x: 0, y: 0, width, height: 16, color: AMBER });
  page.drawText("VOLUNTEER IDENTITY CARD", {
    x: 10,
    y: 5,
    size: 7,
    font: bold,
    color: rgb(1, 1, 1),
  });

  const img = await embedPhoto(doc, input.photo ?? null);
  const boxX = 10;
  const boxY = height - 120;
  page.drawRectangle({
    x: boxX,
    y: boxY,
    width: 54,
    height: 66,
    borderColor: rgb(0.8, 0.84, 0.83),
    borderWidth: 0.8,
    color: rgb(0.96, 0.97, 0.97),
  });
  if (img) page.drawImage(img, { x: boxX, y: boxY, width: 54, height: 66 });

  const x = 74;
  let y = height - 48;
  const line = (label: string, value: string) => {
    page.drawText(label, { x, y, size: 5.5, font, color: MUTED });
    page.drawText(value.slice(0, 32) || "—", { x, y: y - 9, size: 8, font: bold, color: INK });
    y -= 22;
  };
  line("Name", input.name);
  line("Volunteer ID", input.referenceId);
  line(
    "Role / Place",
    [input.designation ?? "Volunteer", input.city].filter(Boolean).join(" · "),
  );

  drawQrCode(page, input.verificationUrl, { x: width - 52, y: 22, size: 40 });
  page.drawText(`Issued ${input.issuedOn}`, { x: 10, y: 24, size: 5.5, font, color: MUTED });
  if (input.mobile) {
    page.drawText(input.mobile, { x: 10, y: 32, size: 5.5, font, color: MUTED });
  }
  return doc.save();
}

/** A4 volunteer service certificate carrying the same photo as the ID card. */
export async function renderVolunteerCertificate(input: VolunteerDocInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([841.89, 595.28]); // A4 landscape
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();
  const M = 40;

  page.drawRectangle({
    x: M / 2,
    y: M / 2,
    width: width - M,
    height: height - M,
    borderColor: TEAL,
    borderWidth: 3,
  });
  page.drawRectangle({
    x: M / 2 + 8,
    y: M / 2 + 8,
    width: width - M - 16,
    height: height - M - 16,
    borderColor: AMBER,
    borderWidth: 0.8,
  });

  page.drawText((input.organization.organization_name ?? "Kalchuri One").toUpperCase(), {
    x: M + 20,
    y: height - 92,
    size: 18,
    font: bold,
    color: TEAL,
  });
  page.drawText("CERTIFICATE OF VOLUNTEER SERVICE", {
    x: M + 20,
    y: height - 128,
    size: 13,
    font: bold,
    color: AMBER,
  });

  const img = await embedPhoto(doc, input.photo ?? null);
  const px = width - M - 130;
  const py = height - 230;
  page.drawRectangle({
    x: px,
    y: py,
    width: 96,
    height: 118,
    borderColor: rgb(0.8, 0.84, 0.83),
    borderWidth: 1,
    color: rgb(0.96, 0.97, 0.97),
  });
  if (img) page.drawImage(img, { x: px, y: py, width: 96, height: 118 });

  page.drawText("This is to certify that", {
    x: M + 20,
    y: height - 190,
    size: 11,
    font,
    color: MUTED,
  });
  page.drawText(input.name, { x: M + 20, y: height - 228, size: 26, font: bold, color: INK });

  const place = [input.city, input.state].filter(Boolean).join(", ");
  const body = `has served as a ${input.designation ?? "volunteer"} with the foundation${
    place ? ` at ${place}` : ""
  }, giving time and care to our seva work with sincerity and compassion.`;
  const words = body.split(" ");
  let lineText = "";
  let y = height - 268;
  for (const word of words) {
    const next = lineText ? `${lineText} ${word}` : word;
    if (font.widthOfTextAtSize(next, 12) > width - M * 2 - 180) {
      page.drawText(lineText, { x: M + 20, y, size: 12, font, color: INK });
      y -= 20;
      lineText = word;
    } else {
      lineText = next;
    }
  }
  if (lineText) page.drawText(lineText, { x: M + 20, y, size: 12, font, color: INK });

  page.drawText(`Volunteer ID: ${input.referenceId}`, {
    x: M + 20,
    y: 150,
    size: 10,
    font: bold,
    color: INK,
  });
  page.drawText(`Issued on: ${input.issuedOn}`, { x: M + 20, y: 134, size: 10, font, color: MUTED });

  drawQrCode(page, input.verificationUrl, { x: M + 20, y: 56, size: 64 });
  page.drawText("Scan to verify", { x: M + 20, y: 46, size: 7, font, color: MUTED });

  page.drawLine({
    start: { x: width - M - 220, y: 92 },
    end: { x: width - M - 20, y: 92 },
    thickness: 0.8,
    color: rgb(0.7, 0.74, 0.73),
  });
  page.drawText("Authorised signatory", {
    x: width - M - 220,
    y: 76,
    size: 9,
    font,
    color: MUTED,
  });
  return doc.save();
}
