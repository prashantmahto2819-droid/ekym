import { createFileRoute } from "@tanstack/react-router";

import { RequisitionSlipCell } from "@/components/admin/RequisitionSlipCell";
import { ReviewPage } from "@/components/admin/ReviewPage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/blood")({
  component: BloodAdmin,
});

function BloodAdmin() {
  return (
    <Tabs defaultValue="requirements">
      <TabsList className="mb-6">
        <TabsTrigger value="requirements">Blood requirements</TabsTrigger>
        <TabsTrigger value="donors">Donor registry</TabsTrigger>
      </TabsList>

      <TabsContent value="requirements">
        <ReviewPage
          table="blood_requirements"
          title="Blood requirements"
          description="Verify requests before they appear publicly."
          statusField="verification_status"
          statuses={["pending", "verified", "active", "fulfilled", "expired", "cancelled"]}
          searchKeys={["requirement_id", "patient_name", "hospital", "blood_group", "city"]}
          columns={[
            { key: "requirement_id", label: "Ref" },
            { key: "patient_name", label: "Patient" },
            { key: "blood_group", label: "Group" },
            { key: "units_required", label: "Units" },
            { key: "hospital", label: "Hospital" },
            { key: "city", label: "City" },
            { key: "urgency", label: "Urgency" },
            {
              key: "requester",
              label: "Requester",
              render: (r) => `${r.requester_name ?? "—"} · ${r.requester_mobile ?? ""}`,
            },
            { key: "required_date", label: "Needed by", render: (r) => formatDate(r.required_date) },
            {
              key: "requisition_slip",
              label: "Slip",
              render: (r) => <RequisitionSlipCell path={r.requisition_slip as string | null} />,
            },
          ]}
        />
      </TabsContent>

      <TabsContent value="donors">
        <ReviewPage
          table="blood_donors"
          title="Donor registry"
          description="Approve donors and keep availability up to date."
          statuses={["pending", "verified", "active", "inactive", "blocked"]}
          searchKeys={["donor_id", "full_name", "mobile", "blood_group", "city", "district"]}
          columns={[
            { key: "donor_id", label: "Ref" },
            { key: "full_name", label: "Name" },
            { key: "blood_group", label: "Group" },
            { key: "mobile", label: "Mobile" },
            { key: "city", label: "City" },
            {
              key: "emergency_available",
              label: "Emergency",
              render: (r) => (r.emergency_available ? "Yes" : "No"),
            },
            {
              key: "last_donation_date",
              label: "Last donation",
              render: (r) => formatDate(r.last_donation_date),
            },
          ]}
        />
      </TabsContent>
    </Tabs>
  );
}
