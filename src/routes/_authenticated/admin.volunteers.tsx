import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { ReviewPage } from "@/components/admin/ReviewPage";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { download as download_, toPdfBytes, volunteerCertificateTemplate, volunteerIdTemplate, type Lang, type MergeData } from "@/design-engine";
import { volunteerDocumentData } from "@/lib/volunteer-docs.functions";

export const Route = createFileRoute("/_authenticated/admin/volunteers")({
  component: VolunteersAdmin,
});

function DocumentButtons({ row }: { row: any }) {
  const [busy, setBusy] = useState<string | null>(null);

  /** Renders in the browser with the design engine, so Hindi names and labels print correctly. */
  async function download(kind: "id-card" | "certificate", lang: Lang) {
    setBusy(`${kind}-${lang}`);
    try {
      const d = await volunteerDocumentData({ data: { id: row.id } });
      const brand = { name: d.org.name, name_hi: d.org.name_hi, logo: d.org.logo };
      const design = kind === "id-card" ? volunteerIdTemplate(brand, lang) : volunteerCertificateTemplate(brand, lang);
      const bytes = await toPdfBytes(design, d as unknown as MergeData, { dpi: kind === "id-card" ? 400 : 200 });
      download_(new Blob([bytes as BlobPart], { type: "application/pdf" }), `${kind === "id-card" ? "volunteer-id" : "volunteer-certificate"}-${d.reference.replace(/[^\w-]+/g, "-")}-${lang}.pdf`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create that document");
    } finally {
      setBusy(null);
    }
  }

  const btn = (kind: "id-card" | "certificate", lang: Lang, label: string) => (
    <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => void download(kind, lang)}>
      {busy === `${kind}-${lang}` ? "…" : label}
    </Button>
  );
  return (
    <div className="flex flex-wrap gap-1">
      {btn("id-card", "hi", "पहचान पत्र (हिंदी)")}
      {btn("id-card", "en", "ID card (English)")}
      {btn("certificate", "hi", "प्रमाण-पत्र (हिंदी)")}
      {btn("certificate", "en", "Certificate (English)")}
    </div>
  );
}

function VolunteersAdmin() {
  return (
    <ReviewPage
      table="volunteer_applications"
      title="Volunteer applications"
      description="Review and approve people who want to join the seva team. Photos can be replaced here before issuing an ID card."
      statuses={["submitted", "under_review", "approved", "rejected"]}
      searchKeys={["application_id", "name", "mobile", "email", "city", "occupation"]}
      photoField="photo"
      rowActions={(row) => (row.status === "approved" ? <DocumentButtons row={row} /> : null)}
      columns={[
        { key: "application_id", label: "Ref" },
        { key: "name", label: "Name" },
        { key: "mobile", label: "Mobile" },
        { key: "email", label: "Email" },
        { key: "city", label: "City" },
        { key: "areas_of_interest", label: "Interests" },
        { key: "availability", label: "Availability" },
        { key: "created_at", label: "Applied", render: (r) => formatDate(r.created_at) },
      ]}
    />
  );
}
