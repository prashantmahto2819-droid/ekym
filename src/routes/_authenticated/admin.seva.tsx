import { createFileRoute } from "@tanstack/react-router";

import { CrudPage } from "@/components/admin/CrudPage";

export const Route = createFileRoute("/_authenticated/admin/seva")({
  component: () => (
    <CrudPage
      table="seva_projects"
      title="Seva projects"
      description="Service projects of the organization."
      slugFrom="name"
      orderBy="display_order"
      ascending
      defaults={{ active: true }}
      columns={[
        { key: "name", label: "Name" },
        { key: "city", label: "City" },
        { key: "display_order", label: "Order" },
        { key: "active", label: "Active", render: (r) => (r.active ? "Yes" : "No") },
      ]}
      fields={[
        { key: "name", label: "Name", required: true, full: true },
        { key: "slug", label: "Slug", hint: "Auto-generated if empty" },
        { key: "icon", label: "Icon key", hint: "e.g. blood, food, books" },
        { key: "short_description", label: "Short description", type: "textarea", full: true },
        { key: "description", label: "Full description", type: "textarea", full: true },
        { key: "featured_image", label: "Featured image URL", type: "image", full: true },
        { key: "coordinator", label: "Coordinator" },
        { key: "phone", label: "Phone" },
        { key: "location", label: "Location" },
        { key: "state", label: "State" },
        { key: "city", label: "City" },
        { key: "display_order", label: "Display order", type: "number" },
        { key: "active", label: "Active", type: "checkbox" },
      ]}
    />
  ),
});
