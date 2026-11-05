// Home section: latest approved achievements of the organization's members.
import { Link } from "@tanstack/react-router";

import { SectionHeading } from "@/components/site/SectionHeading";
import { useLang } from "@/core/i18n";
import { useTenant } from "@/core/tenant-context";
import { AchievementCard, useAchievements } from "@/routes/achievements";

export function AchievementsSection({ title, subtitle }: { title: string; subtitle?: string | null }) {
  const tenant = useTenant();
  const { lang } = useLang();
  const hi = lang === "hi";
  const q = useAchievements(tenant.organization_id, 8);
  const rows = q.data ?? [];
  if (!rows.length) return null;
  return (
    <section className="section-y">
      <div className="container-page">
        <SectionHeading eyebrow="🏅" title={title || (hi ? "समाज की उपलब्धियाँ" : "Achievements")} subtitle={subtitle} action={{ label: hi ? "सभी देखें" : "View all", to: "/achievements" }} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{rows.slice(0, 4).map((a) => <AchievementCard key={a.id} a={a} hi={hi} />)}</div>
        <p className="mt-4 text-sm text-muted-foreground"><Link to="/achievements" className="underline">{hi ? "अपने परिवार की उपलब्धि जमा करें →" : "Submit your family's achievement →"}</Link></p>
      </div>
    </section>
  );
}
