import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { CrudPage } from "@/components/admin/CrudPage";

export const Route = createFileRoute("/_authenticated/admin/events/")({ component: EventsList });

function EventsList() {
  const nav = useNavigate();
  return (
    <CrudPage
      table="ev_events"
      title="Events & invitations"
      description="Create the event, then open it to add guests, send invitations with RSVP links, reminders and QR check-in."
      orderBy="starts_at"
      slugFrom="title"
      createdBy
      onRowClick={(r) => nav({ to: "/admin/events/$id", params: { id: r.id } })}
      columns={[
        { key: "starts_at", label: "When", render: (r) => new Date(r.starts_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) },
        { key: "title", label: "Event" },
        { key: "kind", label: "Type" },
        { key: "venue", label: "Venue" },
        { key: "status", label: "Status" },
        { key: "registration_open", label: "Public registration", render: (r) => (r.registration_open ? "open" : "") },
      ]}
      fields={[
        { key: "title", label: "Title (English)", required: true, full: true },
        { key: "title_hi", label: "शीर्षक (हिंदी)", full: true },
        { key: "slug", label: "Slug", hint: "auto from title" },
        { key: "kind", label: "Type", type: "select", options: ["program", "meeting", "festival", "camp", "wedding", "shok", "other"] },
        { key: "starts_at", label: "Starts", type: "datetime", required: true },
        { key: "ends_at", label: "Ends", type: "datetime" },
        { key: "venue", label: "Venue (English)" },
        { key: "venue_hi", label: "स्थान (हिंदी)" },
        { key: "map_url", label: "Map link", type: "url", full: true },
        { key: "cover_image", label: "Cover image URL", type: "url", full: true },
        { key: "description", label: "Description (English)", type: "textarea", full: true },
        { key: "description_hi", label: "विवरण (हिंदी)", type: "textarea", full: true },
        { key: "organizer", label: "Organizer / committee" },
        { key: "contact_phone", label: "Contact phone" },
        { key: "invitation_template_id", label: "Invitation design", fk: { table: "docs_templates", label: "name" } },
        { key: "status", label: "Status", type: "select", options: ["draft", "published", "done", "cancelled"] },
        { key: "registration_open", label: "Allow public registration on the event page", type: "checkbox" },
        { key: "capacity", label: "Capacity (seats, optional)", type: "number" },
      ]}
    />
  );
}
