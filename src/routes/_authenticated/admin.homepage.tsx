// Default home page: sections (order / titles / on-off), hero slides (photos + text + button), festival wishes.
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { CrudPage } from "@/components/admin/CrudPage";

export const Route = createFileRoute("/_authenticated/admin/homepage")({ component: HomepageAdmin });

function HomepageAdmin() {
  const [tab, setTab] = useState<"sections" | "slides" | "festival">("slides");
  return (
    <div className="space-y-4">
      <div className="flex w-fit rounded-md border border-border p-0.5 text-xs">{([["slides", "Hero slides (photos)"], ["sections", "Sections & order"], ["festival", "Festival wishes"]] as const).map(([k, l]) => <button key={k} type="button" className={`rounded px-3 py-1 ${tab === k ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === "slides" ? (
        <CrudPage table="homepage_slides" title="Hero slides" description="The big pictures at the top of the home page. Upload a wide photo (1600×900 works best); title, subtitle and button are optional. Order decides the sequence." orderBy="display_order" ascending createdBy defaults={{ active: true, display_order: 1 }}
          columns={[{ key: "image", label: "Photo", render: (r) => (r.image ? <img src={r.image} alt="" className="h-10 w-16 rounded object-cover" /> : "—") }, { key: "title", label: "Title" }, { key: "display_order", label: "Order" }, { key: "active", label: "Active", render: (r) => (r.active ? "Yes" : "No") }]}
          fields={[
            { key: "image", label: "Photo", type: "image", full: true },
            { key: "title", label: "Title (English)" }, { key: "title_hi", label: "शीर्षक (हिंदी)" },
            { key: "subtitle", label: "Subtitle (English)" }, { key: "subtitle_hi", label: "उपशीर्षक (हिंदी)" },
            { key: "description", label: "Description (English)", type: "textarea", full: true }, { key: "description_hi", label: "विवरण (हिंदी)", type: "textarea", full: true },
            { key: "button_text", label: "Button text" }, { key: "button_text_hi", label: "बटन (हिंदी)" }, { key: "button_url", label: "Button link (e.g. /join)" },
            { key: "start_date", label: "Show from", type: "date" }, { key: "end_date", label: "Show until", type: "date" },
            { key: "display_order", label: "Order", type: "number" }, { key: "active", label: "Active", type: "checkbox" },
          ]} />
      ) : null}
      {tab === "sections" ? (
        <CrudPage table="homepage_sections" title="Homepage sections" description="Which sections appear on the home page, their titles and order. Section keys: hero, network, activities, festival, seva, today_activities, blood, contributors, blogs, news, achievements, videos, reels, campaigns, testimonials, donate, volunteer, contact." orderBy="display_order" ascending defaults={{ active: true }}
          columns={[{ key: "section_key", label: "Section key" }, { key: "title", label: "Title" }, { key: "display_order", label: "Order" }, { key: "active", label: "Active", render: (r) => (r.active ? "Yes" : "No") }]}
          fields={[
            { key: "section_key", label: "Section key", required: true, hint: "e.g. hero, news, network" },
            { key: "display_order", label: "Display order", type: "number" },
            { key: "title", label: "Title (English)" }, { key: "title_hi", label: "शीर्षक (हिंदी)" },
            { key: "subtitle", label: "Subtitle (English)", type: "textarea", full: true }, { key: "subtitle_hi", label: "उपशीर्षक (हिंदी)", type: "textarea", full: true },
            { key: "active", label: "Active", type: "checkbox" },
          ]} />
      ) : null}
      {tab === "festival" ? (
        <CrudPage table="festival_slides" title="Festival wishes" description="Greeting banners shown around a festival date." orderBy="festival_date" createdBy defaults={{ active: true }}
          columns={[{ key: "festival_name", label: "Festival" }, { key: "festival_date", label: "Date" }, { key: "active", label: "Active", render: (r) => (r.active ? "Yes" : "No") }]}
          fields={[
            { key: "festival_name", label: "Festival", required: true }, { key: "festival_date", label: "Date", type: "date" },
            { key: "image", label: "Banner image", type: "image", full: true },
            { key: "title", label: "Title (English)" }, { key: "title_hi", label: "शीर्षक (हिंदी)" },
            { key: "message", label: "Message (English)", type: "textarea", full: true }, { key: "message_hi", label: "संदेश (हिंदी)", type: "textarea", full: true },
            { key: "display_order", label: "Order", type: "number" }, { key: "active", label: "Active", type: "checkbox" },
          ]} />
      ) : null}
    </div>
  );
}
