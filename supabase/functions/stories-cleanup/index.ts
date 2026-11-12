// Kalchuri One · stories-cleanup: deletes the image files of expired 24-hour stories from the `stories` bucket, then the rows.
// Called hourly by pg_cron (stories_cleanup_tick, header x-cron-secret) — service role inside, nothing exposed to clients.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!, service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(url, service);
  const { data: s } = await db.from("server_secrets").select("value").eq("key", "cron_secret").maybeSingle();
  if (!s?.value || req.headers.get("x-cron-secret") !== s.value) return new Response(JSON.stringify({ ok: false, error: "forbidden" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });

  let removed = 0, purged = 0, failed = 0;
  for (let round = 0; round < 5; round++) {
    const { data: rows } = await db.rpc("k1_stories_expired", { p_limit: 200 });
    const list = (rows ?? []) as { id: string; path: string }[];
    if (!list.length) break;
    const paths = list.map((r) => r.path).filter((p) => p && p.length > 3);
    if (paths.length) {
      const { error } = await db.storage.from("stories").remove(paths);
      if (error) { failed += paths.length; console.error("remove", error.message); break; }
      removed += paths.length;
    }
    await db.from("cm_stories").update({ file_deleted: true }).in("id", list.map((r) => r.id));
    const { data: n } = await db.rpc("k1_story_purge", { p_ids: list.map((r) => r.id) });
    purged += Number(n ?? 0);
    if (list.length < 200) break;
  }
  return new Response(JSON.stringify({ ok: true, removed, purged, failed }), { headers: { ...cors, "Content-Type": "application/json" } });
});
