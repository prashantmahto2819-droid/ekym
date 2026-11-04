// Organization name for page <head> metadata. Routes receive `matches`; the root match carries the tenant.
type AnyMatch = { routeId?: string; loaderData?: unknown };

export function siteName(matches: ReadonlyArray<AnyMatch> | undefined): string {
  const root = matches?.find((m) => m.routeId === "__root__");
  const tenant = (root?.loaderData as { tenant?: { name?: string } } | undefined)?.tenant;
  return tenant?.name ?? "Kalchuri One";
}
