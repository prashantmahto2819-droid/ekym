import { createFileRoute } from "@tanstack/react-router";

import { CrudPage } from "@/components/admin/CrudPage";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/news")({
  component: () => (
    <CrudPage
      table="news"
      title="News & media coverage"
      slugFrom="title"
      defaults={{ status: "published" }}
      columns={[
        { key: "title", label: "Title" },
        { key: "source_name", label: "Source" },
        { key: "status", label: "Status" },
        { key: "published_at", label: "Published", render: (r) => formatDate(r.published_at) },
      ]}
      fields={[
        { key: "title", label: "Title", required: true, full: true },
        { key: "slug", label: "Slug", hint: "Auto-generated if empty" },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: ["published", "draft", "review", "archived"],
        },
        { key: "source_name", label: "Source name" },
        { key: "external_url", label: "External link", type: "url" },
        { key: "thumbnail", label: "Thumbnail URL", type: "url", full: true },
        { key: "description", label: "Description", type: "textarea", full: true },
        { key: "published_at", label: "Published on", type: "date" },
        { key: "display_homepage", label: "Show on homepage", type: "checkbox" },
      ]}
    />
  ),
});
