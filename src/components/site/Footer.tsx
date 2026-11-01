import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Send,
  Twitter,
  Youtube,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { telHref } from "@/lib/format";
import { organizationQuery } from "@/lib/queries";

const sevaLinks = [
  { label: "Seva Prakalp", to: "/seva" },
  { label: "Blood donation", to: "/blood" },
  { label: "Community library", to: "/library" },
  { label: "Campaigns", to: "/campaigns" },
];

const getInvolved = [
  { label: "Volunteer with us", to: "/volunteer" },
  { label: "Internship", to: "/internship" },
  { label: "Donate", to: "/donate" },
  { label: "Contact us", to: "/contact" },
];

const readLinks = [
  { label: "Blogs", to: "/blogs" },
  { label: "News", to: "/news" },
  { label: "Gallery", to: "/gallery" },
  { label: "Videos", to: "/videos" },
  { label: "Reels", to: "/reels" },
];

const legalLinks = [
  { label: "Privacy policy", to: "/privacy-policy" },
  { label: "Terms", to: "/terms" },
  { label: "Refund policy", to: "/refund-policy" },
];

export function Footer() {
  const { data: org } = useSuspenseQuery(organizationQuery());
  const { user, isStaff } = useAuth();

  const socials = [
    { href: org?.instagram, icon: Instagram, label: "Instagram" },
    { href: org?.facebook, icon: Facebook, label: "Facebook" },
    { href: org?.youtube, icon: Youtube, label: "YouTube" },
    { href: org?.linkedin, icon: Linkedin, label: "LinkedIn" },
    { href: org?.x, icon: Twitter, label: "X" },
    { href: org?.telegram, icon: Send, label: "Telegram" },
  ].filter((s) => !!s.href);

  const address = [org?.address, org?.city, org?.district, org?.state, org?.pincode]
    .filter(Boolean)
    .join(", ") || "Raipur, Chhattisgarh";

  return (
    <footer className="mt-auto bg-sidebar text-sidebar-foreground">
      <div className="container-page grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <h2 className="font-display text-lg font-semibold">
            {org?.organization_name ?? "Ekatm Kalar Yuva Manch"}
          </h2>
          {org?.about_short ? (
            <p className="mt-3 text-sm opacity-80">{org.about_short}</p>
          ) : null}
          <ul className="mt-4 space-y-2 text-sm opacity-90">
            {address ? (
              <li className="flex gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0" />
                <span>{address}</span>
              </li>
            ) : null}
            {org?.phone ? (
              <li className="flex gap-2">
                <Phone className="mt-0.5 size-4 shrink-0" />
                <a href={telHref(org.phone)} className="hover:underline">
                  {org.phone}
                </a>
              </li>
            ) : null}
            <li className="flex gap-2">
              <Mail className="mt-0.5 size-4 shrink-0" />
              <a href={`mailto:${org?.email || "info@ekym.org"}`} className="hover:underline">
                {org?.email || "info@ekym.org"}
              </a>
            </li>
          </ul>
          {socials.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {socials.map(({ href, icon: Icon, label }) => (
                <a
                  key={label}
                  href={href!}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={label}
                  className="rounded-md border border-sidebar-border p-2 transition-colors hover:bg-sidebar-accent"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          ) : null}
        </div>

        <FooterColumn title="Our seva" links={sevaLinks} />
        <FooterColumn title="Get involved" links={getInvolved} />
        <div className="space-y-6">
          <FooterColumn title="Read & watch" links={readLinks} />
          <FooterColumn title="Policies" links={legalLinks} />
        </div>
      </div>

      <div className="border-t border-sidebar-border">
        <div className="container-page flex flex-col gap-2 py-5 text-xs opacity-75 sm:flex-row sm:items-center sm:justify-between">
          <p>{org?.footer_text ?? `© ${new Date().getFullYear()} Ekatm Kalar Yuva Manch`}</p>
          <div className="flex items-center gap-4">
            <span>© {new Date().getFullYear()}</span>
            <Link to={user ? (isStaff ? "/admin" : "/account") : "/auth"} className="hover:underline">
              {user ? (isStaff ? "Admin panel" : "My account") : "Staff sign in"}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { label: string; to: string }[] }) {
  return (
    <div>
      <h3 className="font-display text-sm font-semibold uppercase tracking-wider opacity-70">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="opacity-90 hover:opacity-100 hover:underline">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
