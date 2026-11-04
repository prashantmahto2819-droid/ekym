import { createFileRoute } from "@tanstack/react-router";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

/** RSS 2.0 feed: latest blogs + news of the current organization. */
export const Route = createFileRoute("/feed.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { getSitemapData } = await import("@/lib/public.functions");
        const { resolveTenant } = await import("@/core/tenant.server");
        const [d, tenant] = await Promise.all([getSitemapData(), resolveTenant()]);
        const base = new URL(request.url).origin;
        const items = [
          ...d.blogs.map((b) => ({ title: b.title, link: `${base}/blogs/${b.slug}`, desc: b.excerpt ?? "", date: b.published_at })),
          ...d.news.map((n) => ({ title: n.title, link: `${base}/news/${n.slug}`, desc: n.description ?? "", date: n.published_at })),
        ].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")).slice(0, 50);
        const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${esc(tenant.name)}</title><link>${base}</link><description>${esc(tenant.name)} — latest posts</description><language>hi</language>${items.map((i) => `<item><title>${esc(i.title)}</title><link>${i.link}</link><guid>${i.link}</guid>${i.date ? `<pubDate>${new Date(i.date).toUTCString()}</pubDate>` : ""}<description>${esc(i.desc)}</description></item>`).join("")}</channel></rss>`;
        return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=900" } });
      },
    },
  },
});
