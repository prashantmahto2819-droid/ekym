import { createFileRoute } from "@tanstack/react-router";

import { CrudPage } from "@/components/admin/CrudPage";

export const Route = createFileRoute("/_authenticated/admin/announcements")({
  component: () => (
    <CrudPage
      table="gov_announcements"
      title="Announcements"
      description="Internal notices for the team, members-only notices, or public announcements shown on the website."
      orderBy="publish_at"
      columns={[
        { key: "title", label: "Title" },
        { key: "audience", label: "Audience" },
        { key: "pinned", label: "Pinned", render: (r) => (r.pinned ? "Yes" : "") },
        { key: "publish_at", label: "Publish", render: (r) => new Date(r.publish_at).toLocaleDateString("en-IN") },
        { key: "expires_at", label: "Expires", render: (r) => (r.expires_at ? new Date(r.expires_at).toLocaleDateString("en-IN") : "—") },
      ]}
      fields={[
        { key: "title", label: "Title (English)", required: true, full: true },
        { key: "title_hi", label: "शीर्षक (हिंदी)", full: true },
        { key: "audience", label: "Audience", type: "select", options: ["members", "team", "public"] },
        { key: "pinned", label: "Pin to top", type: "checkbox" },
        { key: "publish_at", label: "Publish at", type: "datetime", required: true },
        { key: "expires_at", label: "Expires at", type: "datetime" },
        { key: "body", label: "Message (English)", type: "textarea", required: true, full: true },
        { key: "body_hi", label: "संदेश (हिंदी)", type: "textarea", full: true },
      ]}
    />
  ),
});
