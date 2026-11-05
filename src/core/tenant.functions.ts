import { createServerFn } from "@tanstack/react-start";

export const getTenant = createServerFn({ method: "GET" }).handler(async () => {
  const { resolveTenant } = await import("./tenant.server");
  return resolveTenant();
});

/** Absolute origin of the current request (for og:image and other absolute URLs). */
export const getOrigin = createServerFn({ method: "GET" }).handler(async () => {
  const { requestOrigin } = await import("./tenant.server");
  return requestOrigin();
});

/** Everything the root route needs, in ONE server round-trip (tenant, language, organization settings, origin). */
export const getBoot = createServerFn({ method: "GET" }).handler(async () => {
  const [{ resolveTenant, requestOrigin }, { readOrganization }, { parseLangCookie }, { getRequest }] = await Promise.all([import("./tenant.server"), import("@/lib/public.functions"), import("./i18n"), import("@tanstack/react-start/server")]);
  const tenant = await resolveTenant();
  const org = await readOrganization(tenant.organization_id);
  let lang: "en" | "hi" = "en";
  try { lang = parseLangCookie(getRequest().headers.get("cookie")); } catch { /* default */ }
  return { tenant, org, lang, origin: requestOrigin() };
});
