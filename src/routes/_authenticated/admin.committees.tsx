import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { CrudPage } from "@/components/admin/CrudPage";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/committees")({
  component: CommitteesPage,
});

const DESIGNATIONS = [
  "President", "Vice President", "Secretary", "Joint Secretary", "Treasurer", "Co-Treasurer",
  "Organising Secretary", "Spokesperson", "Advisor", "Patron", "Executive Member", "Member",
];

function CommitteesPage() {
  const [committee, setCommittee] = useState<{ id: string; name: string } | null>(null);

  return (
    <div className="space-y-10">
      <CrudPage
        table="gov_committees"
        title="Committees"
        description="Executive, advisory and working committees with their tenure. Click a row to manage its office bearers."
        orderBy="display_order"
        ascending
        onRowClick={(r) => setCommittee({ id: r.id, name: r.name })}
        columns={[
          { key: "name", label: "Committee" },
          { key: "kind", label: "Type" },
          { key: "tenure_from", label: "Tenure from" },
          { key: "tenure_to", label: "Tenure to" },
          { key: "status", label: "Status" },
        ]}
        fields={[
          { key: "name", label: "Name (English)", required: true },
          { key: "name_hi", label: "नाम (हिंदी)" },
          { key: "kind", label: "Type", type: "select", options: ["executive", "advisory", "working", "women", "youth", "trustee", "other"] },
          { key: "status", label: "Status", type: "select", options: ["active", "dissolved"] },
          { key: "tenure_from", label: "Tenure from", type: "date" },
          { key: "tenure_to", label: "Tenure to", type: "date" },
          { key: "display_order", label: "Display order", type: "number" },
          { key: "description", label: "Description", type: "textarea", full: true },
        ]}
      />

      {committee ? (
        <div className="rounded-lg border border-border p-4 sm:p-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Office bearers of</p>
            <Button size="sm" variant="ghost" onClick={() => setCommittee(null)}>
              Close
            </Button>
          </div>
          <CrudPage
            key={committee.id}
            table="gov_positions"
            title={committee.name}
            description="Designations shown on the public Team page in rank order. Phone numbers are hidden unless allowed."
            orderBy="rank"
            ascending
            filter={{ committee_id: committee.id }}
            columns={[
              { key: "rank", label: "#" },
              { key: "person_name", label: "Name" },
              { key: "designation", label: "Designation" },
              { key: "city", label: "City" },
              { key: "from_date", label: "From" },
              { key: "to_date", label: "To" },
              { key: "show_public", label: "Public", render: (r) => (r.show_public ? "Yes" : "No") },
            ]}
            fields={[
              { key: "person_name", label: "Name (English)", required: true },
              { key: "person_name_hi", label: "नाम (हिंदी)" },
              { key: "designation", label: "Designation", type: "select", required: true, options: DESIGNATIONS },
              { key: "designation_hi", label: "पद (हिंदी)" },
              { key: "rank", label: "Rank (1 = top)", type: "number", required: true },
              { key: "appointed_by", label: "Appointed by", type: "select", options: ["nomination", "election", "ex_officio", "co_option"] },
              { key: "from_date", label: "From", type: "date" },
              { key: "to_date", label: "To", type: "date" },
              { key: "phone", label: "Phone" },
              { key: "email", label: "Email" },
              { key: "city", label: "City" },
              { key: "photo_path", label: "फोटो", type: "image" },
              { key: "about", label: "About / परिचय (English)", type: "textarea", full: true, hint: "संक्षिप्त परिचय, अनुभव, संदेश — Team पेज और पत्रिका में दिखता है" },
              { key: "about_hi", label: "परिचय (हिंदी)", type: "textarea", full: true },
              { key: "email_public", label: "Show email publicly", type: "checkbox" },
              { key: "membership_id", label: "Linked member", fk: { table: "org_memberships", label: "full_name" } },
              { key: "show_public", label: "Show on public Team page", type: "checkbox" },
              { key: "show_phone_public", label: "Show phone publicly", type: "checkbox" },
            ]}
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Select a committee above to add its office bearers.</p>
      )}
    </div>
  );
}
