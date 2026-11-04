// Kalchuri One · comms-worker: drains the comms_messages queue through the organization's channels.
// Triggered every minute by pg_cron (comms_tick, header x-cron-secret) or by an admin ("test" action, user JWT).
// Providers: Vivid Relay (unofficial WhatsApp gateway), Meta WhatsApp Cloud API, SMTP email.
import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Channel = { id: string; organization_id: string; kind: string; provider: string; config: Record<string, string>; secret: string | null; gap_min_s: number; gap_max_s: number; status: string };
type Msg = { id: string; channel_id: string; kind: string; to_contact: string; to_name: string | null; subject: string | null; body: string; media: { type: string; bucket?: string; path?: string; url?: string; filename?: string }[]; meta_template: Record<string, unknown> | null; attempts: number };
type SendResult = { ok: boolean; id?: string; error?: string; fatal?: boolean };

function uniqueRef() {
  const b = new Uint32Array(2); crypto.getRandomValues(b);
  const L = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  return `Ref: ${L[b[0] % 24]}${L[(b[0] >> 8) % 24]}${L[(b[0] >> 16) % 24]}-${String(100000 + (b[1] % 900000))}`;
}

async function mediaUrl(db: ReturnType<typeof createClient>, m: Msg["media"][number]): Promise<string | null> {
  if (m.url) return m.url;
  if (m.bucket && m.path) {
    const { data } = await db.storage.from(m.bucket).createSignedUrl(m.path, 3600);
    return data?.signedUrl ?? null;
  }
  return null;
}

async function sendRelay(db: ReturnType<typeof createClient>, ch: Channel, m: Msg): Promise<SendResult> {
  const relay = (ch.config.relay_url || "").replace(/\/+$/, ""), session = ch.config.session || "";
  if (!relay || !session || !ch.secret) return { ok: false, fatal: true, error: "Vivid Relay channel is not fully configured (URL, session, API key)" };
  const body: Record<string, unknown> = { to: m.to_contact, text: m.body.trimEnd() + "\n\n" + uniqueRef() };
  const first = m.media[0];
  if (first) { const url = await mediaUrl(db, first); if (url) body.media = { type: first.type === "document" ? "document" : "image", url, filename: first.filename }; }
  try {
    const r = await fetch(`${relay}/api/sessions/${encodeURIComponent(session)}/send`, {
      method: "POST", headers: { Authorization: `Bearer ${ch.secret}`, "Content-Type": "application/json", "X-Requested-With": "vivid" },
      body: JSON.stringify(body), signal: AbortSignal.timeout(70000),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.ok !== false) return { ok: true, id: j.id ?? j.messageId ?? null };
    const err = String(j.error || `HTTP ${r.status}`).slice(0, 300);
    return { ok: false, error: `Vivid Relay: ${err}`, fatal: [401, 402, 403].includes(r.status) };
  } catch (e) { return { ok: false, error: `Vivid Relay: ${(e as Error).message.slice(0, 200)}` }; }
}

async function sendMeta(db: ReturnType<typeof createClient>, ch: Channel, m: Msg): Promise<SendResult> {
  const pn = ch.config.phone_number_id;
  if (!pn || !ch.secret) return { ok: false, fatal: true, error: "Meta Cloud channel needs phone_number_id and an access token" };
  const first = m.media[0];
  let payload: Record<string, unknown>;
  if (m.meta_template) {
    payload = { messaging_product: "whatsapp", to: m.to_contact, type: "template", template: m.meta_template };
  } else if (first) {
    const url = await mediaUrl(db, first);
    if (!url) return { ok: false, error: "Media URL could not be created" };
    payload = first.type === "document"
      ? { messaging_product: "whatsapp", to: m.to_contact, type: "document", document: { link: url, caption: m.body.slice(0, 1000), filename: first.filename ?? "document.pdf" } }
      : { messaging_product: "whatsapp", to: m.to_contact, type: "image", image: { link: url, caption: m.body.slice(0, 1000) } };
  } else {
    payload = { messaging_product: "whatsapp", to: m.to_contact, type: "text", text: { body: m.body, preview_url: true } };
  }
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${pn}/messages`, {
      method: "POST", headers: { Authorization: `Bearer ${ch.secret}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(30000),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok) return { ok: true, id: j.messages?.[0]?.id ?? null };
    const code = j.error?.code, msg = String(j.error?.message ?? `HTTP ${r.status}`).slice(0, 300);
    // 190 = bad token, 10/200-299 = permissions, 131056 = pair rate limit (retry), 131047 = 24h window (needs template → fail)
    const fatal = r.status === 401 || code === 190 || code === 10 || (code >= 200 && code <= 299);
    return { ok: false, error: `Meta: ${msg}`, fatal };
  } catch (e) { return { ok: false, error: `Meta: ${(e as Error).message.slice(0, 200)}` }; }
}

async function sendSmtp(db: ReturnType<typeof createClient>, ch: Channel, m: Msg): Promise<SendResult> {
  const c = ch.config;
  if (!c.host || !c.username || !ch.secret || !c.from_email) return { ok: false, fatal: true, error: "SMTP channel needs host, username, password and from_email" };
  try {
    const t = nodemailer.createTransport({ host: c.host, port: Number(c.port || 587), secure: String(c.port) === "465", auth: { user: c.username, pass: ch.secret } });
    const attachments = [];
    for (const a of m.media) { const url = await mediaUrl(db, a); if (url) attachments.push({ filename: a.filename ?? "attachment", path: url }); }
    const info = await t.sendMail({ from: c.from_name ? `"${c.from_name}" <${c.from_email}>` : c.from_email, to: m.to_name ? `"${m.to_name}" <${m.to_contact}>` : m.to_contact, subject: m.subject ?? "(no subject)", text: m.body, attachments });
    return { ok: true, id: info.messageId };
  } catch (e) {
    const msg = (e as Error).message.slice(0, 300);
    return { ok: false, error: `SMTP: ${msg}`, fatal: /auth|535|credentials/i.test(msg) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!, service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const db = createClient(url, service);
  const body = await req.json().catch(() => ({}));
  const action = (body.action as string) || "tick";

  // auth: cron secret, or a signed-in user for test/kick
  const cronSecret = req.headers.get("x-cron-secret");
  let userId: string | null = null;
  if (!cronSecret) {
    const uc = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data } = await uc.auth.getUser();
    userId = data.user?.id ?? null;
    if (!userId) return json({ ok: false, error: "Sign in required" }, 401);
  } else {
    const { data: s } = await db.from("server_secrets").select("value").eq("key", "cron_secret").maybeSingle();
    if (!s || s.value !== cronSecret) return json({ ok: false, error: "Bad cron secret" }, 401);
  }

  if (action === "test") {
    // admin tests a channel: permission checked by RLS-free RPC via the user's client would be ideal; here we require org channel manage
    const channelId = body.channel_id as string;
    const uc = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: chRow } = await uc.from("comms_channels").select("id,organization_id").eq("id", channelId).maybeSingle();
    if (!chRow) return json({ ok: false, error: "Channel not found" }, 404);
    const { data: can } = await uc.rpc("k1_can", { p_org: chRow.organization_id, p_perm: "comms.channel.manage" });
    if (can !== true) return json({ ok: false, error: "Not allowed" }, 403);
    const { data: rt } = await db.rpc("k1_comms_channel_runtime", { p_channel: channelId });
    const ch = (rt as Channel[] | null)?.[0];
    if (!ch) return json({ ok: false, error: "Channel runtime missing" });
    if (ch.provider === "vivid_relay") {
      const relay = (ch.config.relay_url || "").replace(/\/+$/, "");
      const r = await fetch(`${relay}/api/sessions`, { headers: { Authorization: `Bearer ${ch.secret}`, "X-Requested-With": "vivid" }, signal: AbortSignal.timeout(15000) }).catch((e) => e as Error);
      if (r instanceof Error) return json({ ok: false, error: `Cannot reach Vivid Relay: ${r.message}` });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.ok === false) return json({ ok: false, error: j.error || `Vivid Relay answered ${r.status}` });
      const names = (j.sessions || []).map((x: { name: string }) => x.name);
      return json({ ok: names.includes(ch.config.session), sessions: names, error: names.includes(ch.config.session) ? null : `Session "${ch.config.session}" not found` });
    }
    if (ch.provider === "meta_cloud") {
      const r = await fetch(`https://graph.facebook.com/v21.0/${ch.config.phone_number_id}?fields=display_phone_number,verified_name,quality_rating`, { headers: { Authorization: `Bearer ${ch.secret}` }, signal: AbortSignal.timeout(15000) }).catch((e) => e as Error);
      if (r instanceof Error) return json({ ok: false, error: r.message });
      const j = await r.json().catch(() => ({}));
      return json({ ok: r.ok, info: j, error: r.ok ? null : j.error?.message });
    }
    if (ch.provider === "smtp") {
      try {
        const t = nodemailer.createTransport({ host: ch.config.host, port: Number(ch.config.port || 587), secure: String(ch.config.port) === "465", auth: { user: ch.config.username, pass: ch.secret } });
        await t.verify();
        return json({ ok: true });
      } catch (e) { return json({ ok: false, error: (e as Error).message }); }
    }
    return json({ ok: false, error: "Unknown provider" });
  }

  // tick / kick: drain a batch, respecting per-channel gaps
  const started = Date.now();
  const budgetMs = 50_000; // edge function wall-clock budget
  let processed = 0, sent = 0, failed = 0;
  const channels = new Map<string, Channel>();
  while (Date.now() - started < budgetMs) {
    const { data: batch, error } = await db.rpc("k1_comms_claim", { p_batch: 5 });
    if (error) return json({ ok: false, error: error.message }, 500);
    const msgs = (batch ?? []) as Msg[];
    if (!msgs.length) break;
    for (const m of msgs) {
      if (!channels.has(m.channel_id)) {
        const { data: rt } = await db.rpc("k1_comms_channel_runtime", { p_channel: m.channel_id });
        channels.set(m.channel_id, (rt as Channel[] | null)?.[0] as Channel);
      }
      const ch = channels.get(m.channel_id)!;
      let res: SendResult;
      if (!ch) res = { ok: false, fatal: true, error: "Channel missing" };
      else if (ch.provider === "vivid_relay") res = await sendRelay(db, ch, m);
      else if (ch.provider === "meta_cloud") res = await sendMeta(db, ch, m);
      else res = await sendSmtp(db, ch, m);
      await db.rpc("k1_comms_result", { p_id: m.id, p_ok: res.ok, p_provider_id: res.id ?? null, p_error: res.error ?? null, p_fatal: !!res.fatal });
      processed++; if (res.ok) sent++; else failed++;
      if (res.fatal) { channels.delete(m.channel_id); continue; }
      if (ch && m.kind === "whatsapp" && res.ok) {
        const gap = (ch.gap_min_s + Math.random() * Math.max(0, ch.gap_max_s - ch.gap_min_s)) * 1000;
        await sleep(Math.min(gap, 20000));
      }
      if (Date.now() - started > budgetMs) break;
    }
  }
  return json({ ok: true, processed, sent, failed, ms: Date.now() - started });
});
