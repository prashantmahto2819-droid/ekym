import { createFileRoute } from "@tanstack/react-router";

import { CrudPage } from "@/components/admin/CrudPage";

export const Route = createFileRoute("/_authenticated/admin/homepage")({
  component: () => (
    <CrudPage
      table="homepage_sections"
      title="Homepage sections"
      description="Control which sections appear on the homepage, their titles and their order."
      orderBy="display_order"
      ascending
      defaults={{ active: true }}
      columns={[
        { key: "section_key", label: "Section key" },
        { key: "title", label: "Title" },
        { key: "display_order", label: "Order" },
        { key: "active", label: "Active", render: (r) => (r.active ? "Yes" : "No") },
      ]}
      fields={[
        { key: "section_key", label: "Section key", required: true, hint: "e.g. hero, blood, news" },
        { key: "display_order", label: "Display order", type: "number" },
        { key: "title", label: "Title", full: true },
        { key: "subtitle", label: "Subtitle", type: "textarea", full: true },
        { key: "active", label: "Active", type: "checkbox" },
      ]}
    />
  ),
});
