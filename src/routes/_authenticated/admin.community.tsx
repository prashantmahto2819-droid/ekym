import { createFileRoute } from "@tanstack/react-router";

import { CrudPage } from "@/components/admin/CrudPage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin/community")({
  component: CommunityAdmin,
});

function CommunityAdmin() {
  return (
    <Tabs defaultValue="contributors">
      <TabsList className="mb-6">
        <TabsTrigger value="contributors">Contributors</TabsTrigger>
        <TabsTrigger value="testimonials">Testimonials</TabsTrigger>
      </TabsList>

      <TabsContent value="contributors">
        <CrudPage
          table="contributors"
          title="Contributors"
          description="Donors, partners and well-wishers recognised on the site."
          defaults={{ active: true, display_publicly: true }}
          columns={[
            { key: "name", label: "Name" },
            { key: "organization", label: "Organization" },
            { key: "contribution_type", label: "Type" },
            { key: "active", label: "Active", render: (r) => (r.active ? "Yes" : "No") },
          ]}
          fields={[
            { key: "name", label: "Name", required: true, full: true },
            { key: "organization", label: "Organization" },
            { key: "contribution_type", label: "Contribution type" },
            { key: "photo", label: "Photo URL", type: "url", full: true },
            { key: "description", label: "Description", type: "textarea", full: true },
            { key: "recognition_message", label: "Recognition message", type: "textarea", full: true },
            { key: "location", label: "Location" },
            { key: "contribution_date", label: "Contribution date", type: "date" },
            { key: "display_publicly", label: "Show publicly", type: "checkbox" },
            { key: "active", label: "Active", type: "checkbox" },
          ]}
        />
      </TabsContent>

      <TabsContent value="testimonials">
        <CrudPage
          table="testimonials"
          title="Testimonials"
          description="Only approved and active testimonials appear publicly."
          orderBy="display_order"
          ascending
          defaults={{ active: true, approved: true }}
          columns={[
            { key: "name", label: "Name" },
            { key: "city", label: "City" },
            { key: "approved", label: "Approved", render: (r) => (r.approved ? "Yes" : "No") },
            { key: "active", label: "Active", render: (r) => (r.active ? "Yes" : "No") },
          ]}
          fields={[
            { key: "name", label: "Name", required: true },
            { key: "role", label: "Role" },
            { key: "city", label: "City" },
            { key: "photo", label: "Photo URL", type: "url" },
            { key: "message", label: "Message", type: "textarea", full: true, required: true },
            { key: "display_order", label: "Display order", type: "number" },
            { key: "approved", label: "Approved", type: "checkbox" },
            { key: "active", label: "Active", type: "checkbox" },
          ]}
        />
      </TabsContent>
    </Tabs>
  );
}
