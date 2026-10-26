import { createFileRoute } from "@tanstack/react-router";

import { ReviewPage } from "@/components/admin/ReviewPage";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/interns")({
  component: () => (
    <ReviewPage
      table="intern_applications"
      title="Internship applications"
      description="Applications for the foundation's internship programs."
      statuses={["submitted", "under_review", "approved", "rejected", "completed"]}
      searchKeys={["application_id", "name", "mobile", "email", "college", "course"]}
      columns={[
        { key: "application_id", label: "Ref" },
        { key: "name", label: "Name" },
        { key: "mobile", label: "Mobile" },
        { key: "college", label: "College" },
        { key: "course", label: "Course" },
        { key: "preferred_department", label: "Department" },
        { key: "duration", label: "Duration" },
        { key: "created_at", label: "Applied", render: (r) => formatDate(r.created_at) },
      ]}
    />
  ),
});
