import { createFileRoute } from "@tanstack/react-router";

/** ads.txt per organization (Admin → Ads → ads.txt). */
export const Route = createFileRoute("/ads.txt")({
  server: {
    handlers: {
      GET: async () => {
        const { resolveTenant } = await import("@/core/tenant.server");
        const { createClient } = await import("@supabase/supabase-js");
        const t = await resolveTenant();
        const c = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, { auth: { persistSession: false } });
        const { data } = await c.from("ad_settings").select("ads_txt").eq("organization_id", t.organization_id).maybeSingle();
        return new Response((data?.ads_txt ?? "") + "\n", { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
      },
    },
  },
});
