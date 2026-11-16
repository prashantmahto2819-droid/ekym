// Kalchuri One · push-send: ब्राउज़र / फ़ोन की सिस्टम सूचना (Web Push)।
// action 'init'  — VAPID चाबियाँ न हों तो बनाकर server_secrets में रखता है (कोई भी बुला सकता है; बस सार्वजनिक चाबी लौटाता है)।
// action 'send'  — cm_notifications की एक पंक्ति को उस व्यक्ति के हर जुड़े फ़ोन / ब्राउज़र पर भेजता है (trigger trg_cm_notif_push,
//                  header x-cron-secret)। बंद हो चुकी सदस्यता (404/410) हटा देता है।
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const TITLE: Record<string, string> = {
  like: "👍 आपकी पोस्ट पसंद की गई", comment: "💬 नई टिप्पणी", reply: "↩️ नया जवाब", mention: "@ आपका उल्लेख", chat_dm: "✉️ नया संदेश",
  friend_request: "🤝 मित्रता अनुरोध", friend_accept: "✅ अनुरोध स्वीकार", wish: "🎉 शुभकामना", birthday: "🎂 जन्मदिन", anniversary: "💐 वर्षगाँठ",
  announcement: "📣 सूचना", event: "📅 कार्यक्रम", blood: "🩸 रक्त की ज़रूरत", renewal: "🔔 सदस्यता", moderation: "🛡️ समीक्षा", system: "🔔 Kalchuri One",
};

async function keys(db: ReturnType<typeof createClient>) {
  const { data } = await db.from("server_secrets").select("key,value").in("key", ["vapid_public", "vapid_private"]);
  let pub = data?.find((r) => r.key === "vapid_public")?.value as string | undefined;
  let priv = data?.find((r) => r.key === "vapid_private")?.value as string | undefined;
  if (!pub || !priv) {
    const k = webpush.generateVAPIDKeys();
    const { error } = await db.from("server_secrets").insert([{ key: "vapid_public", value: k.publicKey }, { key: "vapid_private", value: k.privateKey }]);
    if (error) { // किसी और ने इसी बीच बना दी — वही पढ़ें
      const { data: d2 } = await db.from("server_secrets").select("key,value").in("key", ["vapid_public", "vapid_private"]);
      pub = d2?.find((r) => r.key === "vapid_public")?.value; priv = d2?.find((r) => r.key === "vapid_private")?.value;
    } else { pub = k.publicKey; priv = k.privateKey; }
  }
  return { pub: pub!, priv: priv! };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const body = await req.json().catch(() => ({})) as { action?: string; notification_id?: string };
  if (body.action === "init") { const k = await keys(db); return json({ ok: true, public_key: k.pub }); }

  const { data: s } = await db.from("server_secrets").select("value").eq("key", "cron_secret").maybeSingle();
  if (!s?.value || req.headers.get("x-cron-secret") !== s.value) return json({ ok: false, error: "forbidden" }, 403);
  if (body.action !== "send" || !body.notification_id) return json({ ok: false, error: "bad request" }, 400);

  const { data: n } = await db.from("cm_notifications").select("id,user_id,kind,text,link,post_id").eq("id", body.notification_id).maybeSingle();
  if (!n) return json({ ok: false, error: "not found" }, 404);
  const { data: subs } = await db.from("k1_push_subscriptions").select("id,endpoint,p256dh,auth").eq("user_id", n.user_id);
  if (!subs?.length) return json({ ok: true, sent: 0 });
  const k = await keys(db);
  webpush.setVapidDetails("mailto:support@kalchuri.org", k.pub, k.priv);
  const url = n.link ?? (n.post_id ? `/community/${n.post_id}` : "/community");
  const payload = JSON.stringify({ title: TITLE[n.kind] ?? TITLE["system"], body: (n.text ?? "").slice(0, 180), url, tag: n.kind === "chat_dm" ? `dm:${url}` : n.id });
  let sent = 0, gone = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, { TTL: 60 * 60 * 24, urgency: n.kind === "chat_dm" ? "high" : "normal" });
      sent++; await db.from("k1_push_subscriptions").update({ last_ok_at: new Date().toISOString() }).eq("id", sub.id);
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) { gone++; await db.from("k1_push_subscriptions").delete().eq("id", sub.id); }
      else console.error("push", code, (e as Error).message);
    }
  }
  return json({ ok: true, sent, gone });
});
