// सदस्य के लिए एक परिवार का वंश वृक्ष (बनाना / बदलना / मंज़ूरी के लिए भेजना) — वही संपादक जो एडमिन पैनल में है।
import { createFileRoute } from "@tanstack/react-router";

import { FamilyView } from "@/routes/_authenticated/admin.families.$id";

export const Route = createFileRoute("/_authenticated/shok/family/$id")({ component: Page });

function Page() {
  const { id } = Route.useParams();
  return <section className="container-page py-6"><FamilyView id={id} member /></section>;
}
