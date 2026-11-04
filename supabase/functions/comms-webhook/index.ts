// Meta WhatsApp Cloud API webhook: delivery/read statuses → comms_messages; inbound "STOP" → opt-out.
// Dashboard: set verify token secret META_WEBHOOK_VERIFY_TOKEN and (optional) META_APP_SECRET for signature checks.
import { createClient } from "npm:@supabase/supabase-js@2";

async function validSignature(raw: string, header: string | null, secret: string) {
  if (!header?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)));
  const hex = [...mac].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === header.slice(7);
}

Deno.serve(async (req) => {
  const u = new URL(req.url);
  if (req.method === "GET") {
    const token = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN") ?? "";
    if (u.searchParams.get("hub.mode") === "subscribe" && u.searchParams.get("hub.verify_token") === token) {
      return new Response(u.searchParams.get("hub.challenge") ?? "", { status: 200 });
    }
    return new Response("forbidden", { status: 403 });
  }
  const raw = await req.text();
  const appSecret = Deno.env.get("META_APP_SECRET");
  if (appSecret && !(await validSignature(raw, req.headers.get("x-hub-signature-256"), appSecret))) return new Response("bad signature", { status: 401 });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let payload: { entry?: { changes?: { value?: { metadata?: { phone_number_id?: string }; statuses?: { id: string; status: string; timestamp: string; pricing?: { category?: string } }[]; messages?: { from: string; text?: { body?: string } }[] } }[] }[] };
  try { payload = JSON.parse(raw); } catch { return new Response("bad json", { status: 400 }); }
  for (const e of payload.entry ?? []) for (const c of e.changes ?? []) {
    const v = c.value ?? {};
    for (const s of v.statuses ?? []) {
      await db.rpc("k1_comms_status_update", { p_provider_id: s.id, p_status: s.status, p_at: new Date(Number(s.timestamp) * 1000).toISOString() });
    }
    for (const m of v.messages ?? []) {
      const text = (m.text?.body ?? "").trim().toUpperCase();
      if (["STOP", "UNSUBSCRIBE", "बंद"].includes(text) && v.metadata?.phone_number_id) {
        const { data: ch } = await db.from("comms_channels").select("organization_id").eq("provider", "meta_cloud").contains("config", { phone_number_id: v.metadata.phone_number_id }).maybeSingle();
        if (ch) await db.rpc("k1_comms_opt_out", { p_org: ch.organization_id, p_contact: m.from, p_reason: "STOP via WhatsApp" });
      }
    }
  }
  return new Response("ok", { status: 200 });
});
