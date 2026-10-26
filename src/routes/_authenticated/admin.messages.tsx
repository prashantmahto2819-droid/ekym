import { createFileRoute } from "@tanstack/react-router";

import { ReviewPage } from "@/components/admin/ReviewPage";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/messages")({
  component: () => (
    <ReviewPage
      table="contact_messages"
      title="Contact inbox"
      description="Enquiries submitted through the website contact form."
      statuses={["new", "contacted", "resolved", "closed"]}
      searchKeys={["name", "mobile", "email", "subject", "message", "city"]}
      columns={[
        { key: "name", label: "From" },
        { key: "mobile", label: "Mobile" },
        { key: "email", label: "Email" },
        { key: "subject", label: "Subject" },
        {
          key: "message",
          label: "Message",
          render: (r) => <span className="block whitespace-pre-wrap">{r.message}</span>,
        },
        { key: "created_at", label: "Received", render: (r) => formatDateTime(r.created_at) },
      ]}
    />
  ),
});
