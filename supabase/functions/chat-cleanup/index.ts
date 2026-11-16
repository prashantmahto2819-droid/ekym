// Kalchuri One · chat-cleanup: चैट की फोटो / फ़ाइलें k1_chat_media_days() (अभी 30) दिन बाद storage से हटाता है और संदेश में
// media = [{type:'expired', n}] कर देता है। रोज़ pg_cron (k1_chat_cleanup_tick, header x-cron-secret)।
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: s } = await db.from("server_secrets").select("value").eq("key", "cron_secret").maybeSingle();
  if (!s?.value || req.headers.get("x-cron-secret") !== s.value) return json({ ok: false, error: "forbidden" }, 403);
  let messages = 0, files = 0;
  for (let round = 0; round < 10; round++) {
    const { data, error } = await db.rpc("k1_chat_media_expired", { p_limit: 200 });
    if (error) return json({ ok: false, error: error.message }, 500);
    const rows = (data ?? []) as { message_id: string; bucket: string; path: string | null }[];
    if (!rows.length) break;
    for (const b of ["chat", "community"]) {
      const paths = [...new Set(rows.filter((r) => r.bucket === b && r.path).map((r) => r.path!))];
      for (let i = 0; i < paths.length; i += 500) {
        const { error: e } = await db.storage.from(b).remove(paths.slice(i, i + 500));
        if (e) console.error("remove", b, e.message); else files += Math.min(500, paths.length - i);
      }
    }
    const ids = [...new Set(rows.map((r) => r.message_id))];
    const { data: n } = await db.rpc("k1_chat_media_mark_expired", { p_ids: ids });
    messages += Number(n ?? 0);
    if (ids.length < 200) break;
  }
  return json({ ok: true, messages, files });
});
