import { createFileRoute } from "@tanstack/react-router";

import { CrudPage } from "@/components/admin/CrudPage";

export const Route = createFileRoute("/_authenticated/admin/tasks")({
  component: () => (
    <CrudPage
      table="gov_tasks"
      title="Tasks"
      description="Work assigned to team members, usually arising from a meeting or resolution."
      orderBy="due_date"
      ascending
      columns={[
        { key: "title", label: "Task" },
        { key: "assignee_name", label: "Assignee" },
        { key: "due_date", label: "Due" },
        { key: "priority", label: "Priority" },
        { key: "status", label: "Status" },
      ]}
      fields={[
        { key: "title", label: "Task", required: true, full: true },
        { key: "assignee_name", label: "Assignee (name)" },
        { key: "due_date", label: "Due date", type: "date" },
        { key: "priority", label: "Priority", type: "select", options: ["normal", "high", "urgent", "low"] },
        { key: "status", label: "Status", type: "select", options: ["open", "in_progress", "done", "cancelled"] },
        { key: "meeting_id", label: "From meeting", fk: { table: "gov_meetings", label: "title", orderBy: "scheduled_at" } },
        { key: "detail", label: "Details", type: "textarea", full: true },
      ]}
    />
  ),
});
