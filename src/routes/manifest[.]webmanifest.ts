import { createFileRoute } from "@tanstack/react-router";

/** Web app manifest per organization (name, colours, icon from its branding) — makes "Add to home screen" an app. */
export const Route = createFileRoute("/manifest.webmanifest")({
  server: {
    handlers: {
      GET: async () => {
        const { resolveTenant } = await import("@/core/tenant.server");
        const { createClient } = await import("@supabase/supabase-js");
        const t = await resolveTenant();
        const b = t.branding ?? {};
        const c = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, { auth: { persistSession: false } });
        const { data: org } = await c.from("organization_settings").select("logo, organization_name_hi").eq("organization_id", t.organization_id).maybeSingle();
        const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
        const color = (v: unknown) => (typeof v === "string" && /^#[0-9a-f]{3,8}$/i.test(v.trim()) ? v.trim() : null);
        const name = str(org?.organization_name_hi) || t.name_hi || t.name || "Kalchuri One";
        const logo = str(org?.logo);
        const icons = [
          ...(logo ? [{ src: logo, sizes: "any", type: logo.endsWith(".png") ? "image/png" : logo.endsWith(".svg") ? "image/svg+xml" : "image/jpeg", purpose: "any" }] : []),
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ];
        const manifest = {
          id: "/",
          name,
          short_name: (t.short_name || name).slice(0, 24),
          description: `${name} — Kalchuri One`,
          lang: "hi",
          dir: "ltr",
          start_url: "/?source=app",
          scope: "/",
          display: "standalone",
          orientation: "portrait",
          theme_color: color(b["primary"]) ?? "#0f766e",
          background_color: "#ffffff",
          icons,
          categories: ["social", "lifestyle"],
          shortcuts: [
            { name: "चौपाल", short_name: "चौपाल", url: "/community", icons: [{ src: "/pwa-192.png", sizes: "192x192" }] },
            { name: "चैट", short_name: "चैट", url: "/community/chat", icons: [{ src: "/pwa-192.png", sizes: "192x192" }] },
            { name: "आयोजन", short_name: "आयोजन", url: "/events", icons: [{ src: "/pwa-192.png", sizes: "192x192" }] },
            { name: "रक्त सेवा", short_name: "रक्त", url: "/blood", icons: [{ src: "/pwa-192.png", sizes: "192x192" }] },
          ],
        };
        return new Response(JSON.stringify(manifest), { headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
      },
    },
  },
});
