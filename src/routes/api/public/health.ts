import { createFileRoute } from "@tanstack/react-router";

/** Liveness probe for uptime monitors (UptimeRobot etc.): app + database answer. No data exposed. */
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const started = Date.now();
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin.rpc("k1_ping" as never);
          if (error) throw new Error(error.message);
          return Response.json({ ok: true, db: (data as { ok: boolean })?.ok === true, ms: Date.now() - started }, { headers: { "Cache-Control": "no-store" } });
        } catch (e) {
          return Response.json({ ok: false, error: (e as Error).message, ms: Date.now() - started }, { status: 503, headers: { "Cache-Control": "no-store" } });
        }
      },
    },
  },
});
