import { createFileRoute } from "@tanstack/react-router";

import { CrudPage } from "@/components/admin/CrudPage";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/blogs")({
  component: () => (
    <CrudPage
      table="blogs"
      title="Blogs"
      description="Stories from the field. Leave the slug blank to generate it from the title."
      slugFrom="title"
      defaults={{ status: "published" }}
      columns={[
        { key: "title", label: "Title" },
        { key: "status", label: "Status" },
        { key: "city", label: "City" },
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
        { key: "excerpt", label: "Excerpt", type: "textarea", full: true },
        { key: "content", label: "Content", type: "textarea", full: true },
        { key: "featured_image", label: "Featured image URL", type: "url", full: true },
        { key: "state", label: "State" },
        { key: "city", label: "City" },
        { key: "published_at", label: "Published on", type: "date" },
        { key: "seo_title", label: "SEO title", full: true },
        { key: "seo_description", label: "SEO description", type: "textarea", full: true },
      ]}
    />
  ),
});
