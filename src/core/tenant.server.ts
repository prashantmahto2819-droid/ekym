// Tenant (organization) resolution for the public website: which organization does this request belong to?
// Order: exact hostname in core.org_domains → `<slug>.<PUBLIC_BASE_DOMAIN>` → DEFAULT_ORG_SLUG (local/dev/workers.dev).
import { createClient } from "@supabase/supabase-js";
import { getRequest } from "@tanstack/react-start/server";

import type { Database } from "@/integrations/supabase/types";

export type Tenant = {
  organization_id: string;
  slug: string;
  name: string;
  name_hi: string | null;
  short_name: string | null;
  branding: Record<string, string | number | boolean | null>;
  parent_id: string | null;
  child_count: number;
};

const cache = new Map<string, { at: number; tenant: Tenant | null }>();
const TTL_MS = 10 * 60_000; // in-isolate memory
const EDGE_TTL_S = 300; // Cloudflare Cache API (survives isolate restarts in a colo)

type EdgeCache = { match(req: Request): Promise<Response | undefined>; put(req: Request, res: Response): Promise<void> };
function edgeCache(): EdgeCache | null {
  try { const c = (globalThis as unknown as { caches?: { default?: EdgeCache } }).caches; return c?.default ?? null; } catch { return null; }
}
const edgeKey = (host: string) => new Request(`https://tenant-cache.kalchuri.internal/${encodeURIComponent(host || "_default")}`);

function anonClient() {
  return createClient<Database>(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** https://host of the current request, falling back to PUBLIC_SITE_URL. */
export function requestOrigin(): string {
  const h = hostOf();
  if (h) return (h.startsWith("localhost") ? "http://" : "https://") + h;
  return process.env["PUBLIC_SITE_URL"] ?? "https://kalchuri.org";
}

function hostOf(): string {
  try {
    const h = getRequest().headers.get("x-forwarded-host") ?? getRequest().headers.get("host") ?? "";
    return h.split(":")[0]!.toLowerCase();
  } catch {
    return "";
  }
}

async function lookup(host: string): Promise<Tenant | null> {
  const c = anonClient();
  if (host) {
    const byHost = await c.rpc("k1_resolve_host", { p_host: host });
    if (byHost.data?.[0]) return byHost.data[0] as Tenant;
    const base = (process.env["PUBLIC_BASE_DOMAIN"] ?? "").toLowerCase();
    if (base && host.endsWith("." + base)) {
      const slug = host.slice(0, -(base.length + 1));
      const bySlug = await c.rpc("k1_org_by_slug", { p_slug: slug });
      if (bySlug.data?.[0]) return bySlug.data[0] as Tenant;
    }
  }
  const fallback = process.env["DEFAULT_ORG_SLUG"] ?? "ekym";
  const def = await c.rpc("k1_org_by_slug", { p_slug: fallback });
  return (def.data?.[0] as Tenant | undefined) ?? null;
}

/** Organization for the current request: memory cache → Cloudflare edge cache → database. */
export async function resolveTenant(): Promise<Tenant> {
  const host = hostOf();
  const hit = cache.get(host);
  if (hit && Date.now() - hit.at < TTL_MS && hit.tenant) return hit.tenant;
  const ec = edgeCache();
  if (ec) {
    try {
      const r = await ec.match(edgeKey(host));
      if (r) { const t = (await r.json()) as Tenant; cache.set(host, { at: Date.now(), tenant: t }); return t; }
    } catch { /* cache unavailable: fall through */ }
  }
  const tenant = await lookup(host);
  cache.set(host, { at: Date.now(), tenant });
  if (!tenant) throw new Error("No organization is configured for this address");
  if (ec) { try { await ec.put(edgeKey(host), new Response(JSON.stringify(tenant), { headers: { "content-type": "application/json", "cache-control": `public, max-age=${EDGE_TTL_S}` } })); } catch { /* ignore */ } }
  return tenant;
}

export async function tenantId(): Promise<string> {
  return (await resolveTenant()).organization_id;
}
