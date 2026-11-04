import { createFileRoute } from "@tanstack/react-router";
import { siteName } from "@/core/seo";

import { PageHeader } from "@/components/site/PageHeader";

export const Route = createFileRoute("/privacy-policy")({
  head: ({ matches }) => ({
    meta: [
      { title: `Privacy policy — ${siteName(matches)}` },
      {
        name: "description",
        content:
          `How ${siteName(matches)} collects, uses and protects the personal information of donors, volunteers and people we serve.`,
      },
      { property: "og:title", content: `Privacy policy — ${siteName(matches)}` },
      { property: "og:description", content: "How we handle your personal information." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <>
      <PageHeader title="Privacy policy" crumbs={[{ label: "Privacy policy" }]} />
      <section className="section-y">
        <div className="container-page prose-content max-w-3xl">
          <h2>What we collect</h2>
          <p>
            We collect only what we need to deliver seva: your name and contact details when you
            register as a donor, volunteer or intern, and the details of any requirement you raise.
            Blood donors also share their blood group and last donation date.
          </p>
          <h2>How we use it</h2>
          <p>
            Contact details are used to reach you about the activity you signed up for — a matching
            blood requirement, a volunteering shift, a donation pickup or your application status. We
            do not sell or rent personal information to anyone.
          </p>
          <h2>What is public</h2>
          <p>
            Donor contact details are never published. For a blood requirement, only the details
            needed to help a patient are shown publicly, with the requester's consent.
          </p>
          <h2>Storage and access</h2>
          <p>
            Data is stored securely and access is restricted to authorised team members by role.
            Sensitive records such as donor lists and applications are visible only to the staff who
            manage that seva.
          </p>
          <h2>Your choices</h2>
          <p>
            You can ask us to stop contacting you, correct your details, or delete your record at any
            time by writing to us through the contact page.
          </p>
        </div>
      </section>
    </>
  );
}
