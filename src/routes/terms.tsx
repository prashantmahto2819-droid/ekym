import { createFileRoute } from "@tanstack/react-router";
import { siteName } from "@/core/seo";

import { PageHeader } from "@/components/site/PageHeader";

export const Route = createFileRoute("/terms")({
  head: ({ matches }) => ({
    meta: [
      { title: `Terms of use — ${siteName(matches)}` },
      {
        name: "description",
        content:
          `Terms for using the ${siteName(matches)} website, including donor registration, blood requirements and volunteering.`,
      },
      { property: "og:title", content: `Terms of use — ${siteName(matches)}` },
      { property: "og:description", content: "The terms that apply when you use this website." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <>
      <PageHeader title="Terms of use" crumbs={[{ label: "Terms" }]} />
      <section className="section-y">
        <div className="container-page prose-content max-w-3xl">
          <h2>Using this website</h2>
          <p>
            This website shares information about our seva work and lets you register as a donor or
            volunteer, raise a requirement, and offer material support. Please submit accurate
            information — our teams act on it.
          </p>
          <h2>Blood requirements</h2>
          <p>
            We verify requirements before publishing them, but we are a facilitator, not a medical
            provider or blood bank. Donation eligibility is decided by the hospital or blood bank.
            Never pay anyone for blood.
          </p>
          <h2>Volunteering and internships</h2>
          <p>
            Applications are reviewed by our coordinators. Selection is at our discretion, and
            volunteers agree to follow our code of conduct while representing the foundation.
          </p>
          <h2>Misuse</h2>
          <p>
            Submitting false requirements, misusing contact details shared on this site, or
            impersonating the foundation may lead to removal of access and, where needed, a complaint
            to the authorities.
          </p>
        </div>
      </section>
    </>
  );
}
