// Research & internship programmes (public page /internship lists active ones).
import { createFileRoute } from "@tanstack/react-router";

import { CrudPage } from "@/components/admin/CrudPage";

export const Route = createFileRoute("/_authenticated/admin/programs")({
  component: () => (
    <CrudPage table="internship_programs" title="Research & internship programmes" description="Research programmes on Kalchuri history / genealogy / villages / culture, and internships. Applications arrive under Research & internship applications." orderBy="display_order" createdBy
      columns={[{ key: "name", label: "Programme" }, { key: "kind", label: "Kind" }, { key: "theme", label: "Theme" }, { key: "duration", label: "Duration" }, { key: "seats", label: "Seats" }, { key: "active", label: "Active", render: (r) => (r.active ? "✓" : "") }]}
      fields={[
        { key: "name", label: "Name (English)", required: true }, { key: "name_hi", label: "नाम (हिंदी)" },
        { key: "slug", label: "Slug", required: true, hint: "lowercase-with-dashes" },
        { key: "kind", label: "Kind", type: "select", options: [{ value: "research", label: "Research (शोध)" }, { value: "internship", label: "Internship" }] },
        { key: "theme", label: "Theme", type: "select", options: ["इतिहास", "वंशावली", "गाँव-दस्तावेज़ीकरण", "संस्कृति", "अन्य"] },
        { key: "department", label: "Department / mentor" },
        { key: "description", label: "Description (English)", type: "textarea", full: true }, { key: "description_hi", label: "विवरण (हिंदी)", type: "textarea", full: true },
        { key: "duration", label: "Duration" }, { key: "eligibility", label: "Eligibility" }, { key: "seats", label: "Seats", type: "number" }, { key: "fee", label: "Fee (₹, 0 = free)", type: "number" },
        { key: "start_date", label: "Starts", type: "date" }, { key: "end_date", label: "Ends", type: "date" },
        { key: "display_order", label: "Order", type: "number" }, { key: "active", label: "Active", type: "checkbox" },
      ]}
      defaults={{ kind: "research", fee: 0, active: true }}
    />
  ),
});
