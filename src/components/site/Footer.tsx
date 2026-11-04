import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
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
import { useLang, type TKey } from "@/core/i18n";
import { useTenant } from "@/core/tenant-context";
import { telHref } from "@/lib/format";
import { menusQuery, organizationQuery } from "@/lib/queries";

const sevaLinks: { key: TKey; to: string }[] = [
  { key: "seva", to: "/seva" },
  { key: "blood", to: "/blood" },
  { key: "library", to: "/library" },
  { key: "campaigns", to: "/campaigns" },
];

const getInvolved: { key: TKey; to: string }[] = [
  { key: "join", to: "/join" },
  { key: "team", to: "/team" },
  { key: "volunteer", to: "/volunteer" },
  { key: "internship", to: "/internship" },
  { key: "donate", to: "/donate" },
  { key: "contact", to: "/contact" },
];

const readLinks: { key: TKey; to: string }[] = [
  { key: "blogs", to: "/blogs" },
  { key: "news", to: "/news" },
  { key: "gallery", to: "/gallery" },
  { key: "videos", to: "/videos" },
  { key: "reels", to: "/reels" },
];

const legalLinks: { key: TKey; to: string }[] = [
  { key: "privacy", to: "/privacy-policy" },
  { key: "terms", to: "/terms" },
  { key: "refund", to: "/refund-policy" },
];

export function Footer() {
  const { data: org } = useSuspenseQuery(organizationQuery());
  const { user, isStaff } = useAuth();
  const { t, lang, loc } = useLang();
  const tenant = useTenant();
  const orgName = loc(org, "organization_name") || (lang === "hi" && tenant.name_hi) || tenant.name;

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
            {orgName}
          </h2>
          {loc(org, "about_short") ? (
            <p className="mt-3 text-sm opacity-80">{loc(org, "about_short")}</p>
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

        <FooterColumn title={t("our_seva")} links={sevaLinks} />
        <FooterColumn title={t("get_involved")} links={getInvolved} />
        <CustomFooterLinks />
        <div className="space-y-6">
          <FooterColumn title={t("read_watch")} links={readLinks} />
          <FooterColumn title={t("policies")} links={legalLinks} />
        </div>
      </div>

      <div className="border-t border-sidebar-border">
        <div className="container-page flex flex-col gap-2 py-5 text-xs opacity-75 sm:flex-row sm:items-center sm:justify-between">
          <p>{loc(org, "footer_text") || `© ${new Date().getFullYear()} ${orgName}`}</p>
          <div className="flex items-center gap-4">
            <span>© {new Date().getFullYear()}</span>
            <Link to={user ? (isStaff ? "/admin" : "/account") : "/auth"} className="hover:underline">
              {user ? (isStaff ? t("admin_panel") : t("my_account")) : t("staff_sign_in")}
            </Link>
          </div>
        </div>
      </div>

      {/* Platform credit: fixed for every organisation's site, not editable from org settings. */}
      <div className="border-t border-sidebar-border">
        <p className="container-page py-3 text-center text-xs opacity-70">
          {t("designed_by")}{" "}
          <a
            href="https://vividbrandify.com"
            target="_blank"
            rel="noopener"
            className="font-semibold underline-offset-2 hover:underline"
          >
            Vivid Brandify
          </a>
        </p>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { key: TKey; to: string }[] }) {
  const { t } = useLang();
  return (
    <div>
      <h3 className="font-display text-sm font-semibold uppercase tracking-wider opacity-70">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="opacity-90 hover:opacity-100 hover:underline">
              {t(l.key)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Extra footer links from the website builder (Admin → Website → Menus → Footer). */
function CustomFooterLinks() {
  const { lang } = useLang();
  const menus = useQuery(menusQuery());
  const items = menus.data?.footer ?? [];
  if (!items.length) return null;
  return (
    <div>
      <h3 className="font-display text-sm font-semibold uppercase tracking-wider opacity-70">{lang === "hi" ? "और लिंक" : "More"}</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {items.map((l) => (
          <li key={l.to}>
            {l.to.startsWith("http") ? <a href={l.to} target="_blank" rel="noreferrer" className="opacity-90 hover:opacity-100 hover:underline">{lang === "hi" && l.label_hi ? l.label_hi : l.label}</a>
              : <Link to={l.to as "/"} className="opacity-90 hover:opacity-100 hover:underline">{lang === "hi" && l.label_hi ? l.label_hi : l.label}</Link>}
          </li>
        ))}
      </ul>
    </div>
  );
}
