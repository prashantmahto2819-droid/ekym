// शोक पत्र सेवा · shok-receipt: Vivid Relay का webhook (event "message.receipt") — पत्र पहुँचा / पढ़ा गया।
// Vivid Relay → Webhooks में यह पता जोड़ें: https://<project>.supabase.co/functions/v1/shok-receipt  (event: message.receipt)
// हस्ताक्षर: X-Signature = "sha256=" + HMAC_SHA256(secret, X-Timestamp + "." + body); secret तालिका server_secrets (key relay_webhook_secret) में।
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");

async function hmac(secret: string, msg: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg)));
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: false }, 405);
  const body = await req.text();
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: s } = await db.from("server_secrets").select("value").eq("key", "relay_webhook_secret").maybeSingle();
  if (!s?.value) return json({ ok: false, error: "secret not set" }, 503);
  const ts = req.headers.get("X-Timestamp") || "";
  const sig = (req.headers.get("X-Signature") || "").replace(/^sha256=/, "");
  if (!ts || !sig || !safeEqual(sig, await hmac(String(s.value), ts + "." + body))) return json({ ok: false, error: "bad signature" }, 401);

  let ev: { event?: string; data?: { ids?: string[]; status?: string; timestamp?: number } };
  try { ev = JSON.parse(body); } catch { return json({ ok: false, error: "bad json" }, 400); }
  if (ev.event !== "message.receipt") return json({ ok: true, ignored: ev.event ?? null });
  const ids = (ev.data?.ids ?? []).filter((x) => typeof x === "string" && x).slice(0, 200);
  const status = String(ev.data?.status || "");
  if (!ids.length || !["delivered", "read", "played"].includes(status)) return json({ ok: true, updated: 0 });
  const at = new Date((Number(ev.data?.timestamp) || Math.floor(Date.now() / 1000)) * 1000).toISOString();
  const { data, error } = await db.rpc("shok_receipt", { p_ids: ids, p_status: status === "played" ? "read" : status, p_at: at });
  if (error) return json({ ok: false, error: error.message }, 500);
  return json({ ok: true, updated: data ?? 0 });
});
