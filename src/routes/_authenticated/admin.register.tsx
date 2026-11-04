import { createFileRoute } from "@tanstack/react-router";

import { CrudPage } from "@/components/admin/CrudPage";

export const Route = createFileRoute("/_authenticated/admin/register")({
  component: () => (
    <div className="space-y-10">
      <CrudPage
        table="docs_register"
        title="Inward register (आवक)"
        description="Letters received by the organization. Entry numbers are assigned automatically."
        orderBy="entry_date"
        filter={{ direction: "inward" }}
        columns={[{ key: "entry_no", label: "No." }, { key: "entry_date", label: "Date" }, { key: "from_to", label: "From" }, { key: "subject", label: "Subject" }, { key: "ref_no", label: "Their ref" }]}
        fields={[
          { key: "entry_date", label: "Date received", type: "date", required: true },
          { key: "from_to", label: "From", required: true },
          { key: "ref_no", label: "Their reference no." },
          { key: "subject", label: "Subject", required: true, full: true },
          { key: "external_url", label: "Scanned copy link", type: "url", full: true },
          { key: "note", label: "Note", type: "textarea", full: true },
        ]}
      />
      <CrudPage
        table="docs_register"
        title="Outward register (जावक)"
        description="Letters sent. Documents issued from the studio are added here automatically when dispatched."
        orderBy="entry_date"
        filter={{ direction: "outward" }}
        columns={[{ key: "entry_no", label: "No." }, { key: "entry_date", label: "Date" }, { key: "from_to", label: "To" }, { key: "subject", label: "Subject" }, { key: "ref_no", label: "Our ref" }]}
        fields={[
          { key: "entry_date", label: "Date sent", type: "date", required: true },
          { key: "from_to", label: "To", required: true },
          { key: "ref_no", label: "Our reference no." },
          { key: "subject", label: "Subject", required: true, full: true },
          { key: "note", label: "Note", type: "textarea", full: true },
        ]}
      />
    </div>
  ),
});
