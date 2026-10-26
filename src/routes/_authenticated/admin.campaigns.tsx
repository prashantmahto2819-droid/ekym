import { createFileRoute } from "@tanstack/react-router";

import { CrudPage } from "@/components/admin/CrudPage";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/campaigns")({
  component: () => (
    <CrudPage
      table="campaigns"
      title="Campaigns"
      description="Fundraising and seva campaigns shown on the public site."
      slugFrom="title"
      defaults={{ status: "published" }}
      columns={[
        { key: "title", label: "Title" },
        { key: "status", label: "Status" },
        { key: "target_amount", label: "Target", render: (r) => formatCurrency(r.target_amount) },
        { key: "raised_amount", label: "Raised", render: (r) => formatCurrency(r.raised_amount) },
      ]}
      fields={[
        { key: "title", label: "Title", required: true, full: true },
        { key: "slug", label: "Slug", hint: "Auto-generated if empty" },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: ["published", "draft", "review", "archived"],
        },
        { key: "description", label: "Description", type: "textarea", full: true },
        { key: "cover_image", label: "Cover image URL", type: "url", full: true },
        { key: "target_amount", label: "Target amount", type: "number" },
        { key: "raised_amount", label: "Raised amount", type: "number" },
        { key: "start_date", label: "Start date", type: "date" },
        { key: "end_date", label: "End date", type: "date" },
        { key: "location", label: "Location" },
        { key: "beneficiary", label: "Beneficiary" },
      ]}
    />
  ),
});
