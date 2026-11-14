import { createFileRoute } from "@tanstack/react-router";
import { T, txNow } from "@/components/admin/T";

import { CrudPage } from "@/components/admin/CrudPage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin/media")({
  component: MediaAdmin,
});

function MediaAdmin() {
  return (
    <Tabs defaultValue="videos">
      <TabsList className="mb-6">
        <TabsTrigger value="videos"><T>Videos</T></TabsTrigger>
        <TabsTrigger value="reels"><T>Reels</T></TabsTrigger>
        <TabsTrigger value="gallery"><T>Gallery albums</T></TabsTrigger>
      </TabsList>

      <TabsContent value="videos">
        <CrudPage
          table="videos"
          title="Videos"
          orderBy="display_order"
          ascending
          defaults={{ active: true }}
          columns={[
            { key: "title", label: "Title" },
            { key: "platform", label: "Platform" },
            { key: "display_order", label: "Order" },
            { key: "active", label: "Active", render: (r) => <T>{r.active ? "Yes" : "No"}</T> },
          ]}
          fields={[
            { key: "title", label: "Title", required: true, full: true },
            {
              key: "platform",
              label: "Platform",
              type: "select",
              options: ["youtube", "instagram", "facebook", "vimeo", "other"],
            },
            { key: "video_url", label: "Video URL", type: "url", required: true },
            { key: "thumbnail", label: "Thumbnail URL", type: "image", full: true },
            { key: "description", label: "Description", type: "textarea", full: true },
            { key: "display_order", label: "Display order", type: "number" },
            { key: "active", label: "Active", type: "checkbox" },
          ]}
        />
      </TabsContent>

      <TabsContent value="reels">
        <CrudPage
          table="reels"
          title="Reels"
          orderBy="display_order"
          ascending
          defaults={{ active: true }}
          columns={[
            { key: "title", label: "Title" },
            { key: "platform", label: "Platform" },
            { key: "display_order", label: "Order" },
            { key: "active", label: "Active", render: (r) => <T>{r.active ? "Yes" : "No"}</T> },
          ]}
          fields={[
            { key: "title", label: "Title", required: true, full: true },
            {
              key: "platform",
              label: "Platform",
              type: "select",
              options: ["instagram", "youtube", "facebook", "vimeo", "other"],
            },
            { key: "video_url", label: "Reel URL", type: "url", required: true },
            { key: "thumbnail", label: "Thumbnail URL", type: "image", full: true },
            { key: "description", label: "Description", type: "textarea", full: true },
            { key: "display_order", label: "Display order", type: "number" },
            { key: "active", label: "Active", type: "checkbox" },
          ]}
        />
      </TabsContent>

      <TabsContent value="gallery">
        <CrudPage
          table="galleries"
          title="Gallery albums"
          slugFrom="title"
          orderBy="display_order"
          ascending
          defaults={{ active: true }}
          columns={[
            { key: "title", label: "Album" },
            { key: "category", label: "Category" },
            { key: "location", label: "Location" },
            { key: "active", label: "Active", render: (r) => <T>{r.active ? "Yes" : "No"}</T> },
          ]}
          fields={[
            { key: "title", label: "Album title", required: true, full: true },
            { key: "slug", label: "Slug", hint: "Auto-generated if empty" },
            { key: "category", label: "Category" },
            { key: "cover_image", label: "Cover image URL", type: "image", full: true },
            { key: "description", label: "Description", type: "textarea", full: true },
            { key: "event_date", label: "Event date", type: "date" },
            { key: "location", label: "Location" },
            { key: "display_order", label: "Display order", type: "number" },
            { key: "active", label: "Active", type: "checkbox" },
          ]}
        />
      </TabsContent>
    </Tabs>
  );
}
