// Organization name / description for page <head> metadata. Routes receive `matches`; the root match carries the tenant
// and the organization settings, so every page describes the organization whose site it is (never a template text).
type AnyMatch = { routeId?: string; loaderData?: unknown };
type RootData = { tenant?: { name?: string; name_hi?: string | null }; org?: { tagline?: string | null; tagline_hi?: string | null; about_short?: string | null; about_short_hi?: string | null } | null; lang?: string };

function rootData(matches: ReadonlyArray<AnyMatch> | undefined): RootData {
  return (matches?.find((m) => m.routeId === "__root__")?.loaderData as RootData | undefined) ?? {};
}

export function siteName(matches: ReadonlyArray<AnyMatch> | undefined): string {
  const d = rootData(matches);
  return (d.lang === "hi" && d.tenant?.name_hi) || d.tenant?.name || "Kalchuri One";
}

export function siteDescription(matches: ReadonlyArray<AnyMatch> | undefined): string {
  const d = rootData(matches);
  const hi = d.lang === "hi";
  return (hi && (d.org?.about_short_hi || d.org?.tagline_hi)) || d.org?.about_short || d.org?.tagline || `${siteName(matches)} — on the Kalchuri One community platform.`;
}

/** Standard meta set for a page: "<Page> — <Org>", a description that mentions the organization, and OG/Twitter tags. */
export function pageMeta(matches: ReadonlyArray<AnyMatch> | undefined, page: { en: string; hi?: string }, desc?: { en: string; hi?: string }, extra: Record<string, string>[] = []) {
  const d = rootData(matches);
  const hi = d.lang === "hi";
  const name = siteName(matches);
  const title = `${(hi && page.hi) || page.en} — ${name}`;
  const description = desc ? `${(hi && desc.hi) || desc.en} ${siteDescription(matches)}`.trim() : siteDescription(matches);
  return { meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, ...extra] };
}

/** Home page: "<Org> — <tagline>" and the organization's own description. */
export function homeMeta(matches: ReadonlyArray<AnyMatch> | undefined) {
  const d = rootData(matches);
  const hi = d.lang === "hi";
  const name = siteName(matches);
  const tagline = (hi && d.org?.tagline_hi) || d.org?.tagline || "";
  const title = tagline ? `${name} — ${tagline}` : name;
  const description = siteDescription(matches);
  return { meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] };
}
