import { createFileRoute } from "@tanstack/react-router";

import { ReviewPage } from "@/components/admin/ReviewPage";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/interns")({
  component: () => (
    <ReviewPage
      table="intern_applications"
      title="Research & internship applications"
      description="Applications for research programmes (Kalchuri history, genealogy, villages, culture) and internships. Programmes are managed in Admin → Internship programmes; accepted research goes to Blogs → category इतिहास."
      statuses={["submitted", "under_review", "approved", "rejected", "completed"]}
      searchKeys={["application_id", "name", "mobile", "email", "college", "course"]}
      columns={[
        { key: "application_id", label: "Ref" },
        { key: "name", label: "Name" },
        { key: "mobile", label: "Mobile" },
        { key: "college", label: "College" },
        { key: "course", label: "Course" },
        { key: "research_topic", label: "Research topic" },
        { key: "expected_output", label: "Output" },
        { key: "preferred_department", label: "Department" },
        { key: "duration", label: "Duration" },
        { key: "created_at", label: "Applied", render: (r) => formatDate(r.created_at) },
      ]}
    />
  ),
});
