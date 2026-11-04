import { createFileRoute } from "@tanstack/react-router";

/** sitemap.xml for the current organization's site (tenant resolved from the host). */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { getSitemapData } = await import("@/lib/public.functions");
        const d = await getSitemapData();
        const base = new URL(request.url).origin;
        const url = (path: string, lastmod?: string | null) => `<url><loc>${base}${path}</loc>${lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : ""}</url>`;
        const fixed = ["/", "/about", "/blogs", "/news", "/seva", "/campaigns", "/gallery", "/videos", "/donate", "/join", "/team", "/contact", "/blood", "/library", "/volunteer", "/internship", "/magazine", "/feed"];
        const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${fixed.map((p) => url(p)).join("")}${d.blogs.map((b) => url(`/blogs/${b.slug}`, b.updated_at)).join("")}${d.news.map((n) => url(`/news/${n.slug}`, n.updated_at)).join("")}${d.seva.map((s) => url(`/seva/${s.slug}`, s.updated_at)).join("")}${d.campaigns.map((c) => url(`/campaigns/${c.slug}`, c.updated_at)).join("")}${d.issues.map((i) => url(`/magazine/${i.slug}`, i.updated_at)).join("")}${d.pages.filter((p) => !p.is_home).map((p) => url(`/p/${p.slug}`, p.updated_at)).join("")}</urlset>`;
        return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
      },
    },
  },
});
