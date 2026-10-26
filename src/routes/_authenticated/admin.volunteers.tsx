import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { ReviewPage } from "@/components/admin/ReviewPage";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { volunteerDocument } from "@/lib/volunteer-docs.functions";

export const Route = createFileRoute("/_authenticated/admin/volunteers")({
  component: VolunteersAdmin,
});

function DocumentButtons({ row }: { row: any }) {
  const [busy, setBusy] = useState<string | null>(null);

  async function download(kind: "id-card" | "certificate") {
    setBusy(kind);
    try {
      const { fileName, base64 } = await volunteerDocument({ data: { id: row.id, kind } });
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create that document");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-1">
      <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => void download("id-card")}>
        {busy === "id-card" ? "Preparing…" : "ID card"}
      </Button>
      <Button
        size="sm"
        variant="secondary"
        disabled={busy !== null}
        onClick={() => void download("certificate")}
      >
        {busy === "certificate" ? "Preparing…" : "Certificate"}
      </Button>
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
