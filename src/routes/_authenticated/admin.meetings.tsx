import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";

import { CrudPage } from "@/components/admin/CrudPage";

export const Route = createFileRoute("/_authenticated/admin/meetings")({
  component: MeetingsPage,
});

function MeetingsPage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-8">
      <CrudPage
        table="gov_meetings"
        title="Meetings"
        description="Schedule meetings, then click a meeting to record its agenda, attendance, minutes and resolutions."
        orderBy="scheduled_at"
        onRowClick={(r) => navigate({ to: "/admin/meetings/$id", params: { id: r.id } })}
        columns={[
          { key: "scheduled_at", label: "When", render: (r) => new Date(r.scheduled_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) },
          { key: "title", label: "Meeting" },
          { key: "kind", label: "Type" },
          { key: "venue", label: "Venue" },
          { key: "status", label: "Status" },
          { key: "minutes_status", label: "Minutes" },
        ]}
        fields={[
          { key: "title", label: "Title (English)", required: true, full: true },
          { key: "title_hi", label: "शीर्षक (हिंदी)", full: true },
          { key: "kind", label: "Type", type: "select", options: ["committee", "general_body", "annual_general", "special", "working", "online"] },
          { key: "committee_id", label: "Committee", fk: { table: "gov_committees", label: "name" } },
          { key: "scheduled_at", label: "Date & time", type: "datetime", required: true },
          { key: "ends_at", label: "Ends at", type: "datetime" },
          { key: "venue", label: "Venue" },
          { key: "online_link", label: "Online link", type: "url" },
          { key: "status", label: "Status", type: "select", options: ["planned", "notice_sent", "held", "postponed", "cancelled"] },
          { key: "notice_text", label: "Notice text (sent to members)", type: "textarea", full: true },
        ]}
      />
      <Outlet />
    </div>
  );
}
