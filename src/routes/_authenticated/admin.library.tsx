import { createFileRoute } from "@tanstack/react-router";

import { CrudPage } from "@/components/admin/CrudPage";

export const Route = createFileRoute("/_authenticated/admin/library")({
  component: () => (
    <CrudPage
      table="books"
      title="Library catalogue"
      description="Books available in the foundation's reading rooms."
      defaults={{ status: "active" }}
      columns={[
        { key: "title", label: "Title" },
        { key: "author", label: "Author" },
        { key: "subject", label: "Subject" },
        { key: "available_quantity", label: "Available" },
        { key: "status", label: "Status" },
      ]}
      fields={[
        { key: "title", label: "Title", required: true, full: true },
        { key: "subtitle", label: "Subtitle", full: true },
        { key: "author", label: "Author" },
        { key: "publisher", label: "Publisher" },
        { key: "isbn", label: "ISBN" },
        { key: "edition", label: "Edition" },
        { key: "language", label: "Language" },
        { key: "subject", label: "Subject" },
        { key: "class_level", label: "Class / level" },
        { key: "quantity", label: "Total copies", type: "number" },
        { key: "available_quantity", label: "Available copies", type: "number" },
        { key: "shelf", label: "Shelf" },
        { key: "location", label: "Location" },
        { key: "cover_image", label: "Cover image URL", type: "image", full: true },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: ["active", "inactive", "lost", "damaged"],
        },
      ]}
    />
  ),
});
