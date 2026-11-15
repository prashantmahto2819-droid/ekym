// शोक पत्र सेवा · letters-cleanup: भेजे जा चुके पत्रों के चित्र (बैच `letters`) 30 दिन बाद हटाता है। पत्र की सूची /
// किसे भेजा गया का रिकॉर्ड बना रहता है (ताकि दोबारा न जाए)। रोज़ pg_cron (shok_letters_cleanup_tick, header x-cron-secret)।
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: s } = await db.from("server_secrets").select("value").eq("key", "cron_secret").maybeSingle();
  if (!s?.value || req.headers.get("x-cron-secret") !== s.value) return json({ ok: false, error: "forbidden" }, 403);

  let removed = 0, letters = 0, failed = 0;
  for (let round = 0; round < 10; round++) {
    const { data, error } = await db.rpc("shok_letters_to_clean", { p_limit: 20 });
    if (error) return json({ ok: false, error: error.message }, 500);
    const rows = (data ?? []) as { letter_id: string; path: string | null }[];
    if (!rows.length) break;
    const ids = [...new Set(rows.map((r) => r.letter_id))];
    const paths = [...new Set(rows.map((r) => r.path).filter((p): p is string => !!p))];
    for (let i = 0; i < paths.length; i += 500) {
      const { error: e } = await db.storage.from("letters").remove(paths.slice(i, i + 500));
      if (e) { failed += paths.length; console.error("remove", e.message); return json({ ok: false, removed, letters, failed, error: e.message }, 500); }
    }
    removed += paths.length;
    await db.rpc("shok_letters_mark_cleaned", { p_ids: ids });
    letters += ids.length;
  }
  return json({ ok: true, letters, removed, failed });
});
