import { createFileRoute } from "@tanstack/react-router";

import { CrudPage } from "@/components/admin/CrudPage";

export const Route = createFileRoute("/_authenticated/admin/documents")({
  component: () => (
    <div className="space-y-10">
      <CrudPage
        table="org_documents"
        title="Organization documents"
        description="Registration, bylaws, policies, annual and audit reports. Paste a link for now; file upload arrives with the document studio."
        columns={[
          { key: "title", label: "Title" },
          { key: "kind", label: "Kind" },
          { key: "year", label: "Year" },
          { key: "visibility", label: "Visibility" },
        ]}
        fields={[
          { key: "title", label: "Title (English)", required: true, full: true },
          { key: "title_hi", label: "शीर्षक (हिंदी)", full: true },
          { key: "kind", label: "Kind", type: "select", options: ["registration", "bylaws", "policy", "annual_report", "activity_report", "audit_report", "minutes", "certificate", "other"] },
          { key: "year", label: "Year", type: "number" },
          { key: "visibility", label: "Visibility", type: "select", options: ["team", "members", "public"] },
          { key: "external_url", label: "Link (Drive / PDF URL)", type: "url", full: true },
        ]}
      />
      <CrudPage
        table="org_milestones"
        title="History & achievements"
        description="Founding, milestones, awards and memorable events, shown on the public About page in date order."
        orderBy="happened_on"
        columns={[
          { key: "happened_on", label: "Date" },
          { key: "title", label: "Title" },
          { key: "kind", label: "Kind" },
          { key: "show_public", label: "Public", render: (r) => (r.show_public ? "Yes" : "No") },
        ]}
        fields={[
          { key: "happened_on", label: "Date", type: "date", required: true },
          { key: "kind", label: "Kind", type: "select", options: ["milestone", "founding", "achievement", "award", "event"] },
          { key: "title", label: "Title (English)", required: true, full: true },
          { key: "title_hi", label: "शीर्षक (हिंदी)", full: true },
          { key: "body", label: "Details (English)", type: "textarea", full: true },
          { key: "body_hi", label: "विवरण (हिंदी)", type: "textarea", full: true },
          { key: "image", label: "Image URL", type: "url", full: true },
          { key: "show_public", label: "Show on website", type: "checkbox" },
        ]}
      />
    </div>
  ),
});
