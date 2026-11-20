// Sends shokpatra messages through Vivid Relay (wa-gateway), a few at a time with gaps in between.
// Sending runs on the server: pg_cron calls action "tick" every minute (x-cron-secret), the website only "kick"s it for an instant start.
// One letter at a time (oldest first), guarded by letters.lock_until. Settings live in the app_settings table.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// हर संदेश के अंत में अलग से रेफ़रेंस + रैंडम नंबर (खाली लाइन के बाद), ताकि कोई दो संदेश एक जैसे न हों और नंबर ब्लॉक होने का ख़तरा घटे
function uniqueRef() {
  const b = new Uint32Array(2); crypto.getRandomValues(b);
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const code = letters[b[0] % 24] + letters[(b[0] >> 8) % 24] + letters[(b[0] >> 16) % 24] + letters[(b[0] >> 24) % 24];
  const num = String(100000 + (b[1] % 900000));
  return `Ref: ${code}-${num}`;
}
const TOKENS: Record<string, "name" | "father" | "village"> = { "{नाम}": "name", "{पिता}": "father", "{गाँव}": "village" };
function fillTemplate(template: string, vars: Record<string, string>) {
  const sub = (s: string, strict: boolean) => {
    let empty = false;
    const out = s.replace(/\{[^}]+\}/g, (tok) => {
      const key = TOKENS[tok];
      if (!key) return tok;
      const v = (vars[key] || "").trim();
      if (!v) empty = true;
      return v;
    });
    return strict && empty ? "" : out;
  };
  return sub(template.replace(/\[([^\]]*)\]/g, (_, seg) => sub(seg, true)), false)
    .replace(/[ \t]+/g, " ").replace(/ +\n/g, "\n").trim();
}

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;
const BUDGET_MS = 100_000; // one worker run; the next cron tick continues

type Db = ReturnType<typeof createClient>;
type Cfg = Record<string, string>;

async function counts(db: Db, letterId: string) {
  const { data } = await db.from("letter_recipients").select("status").eq("letter_id", letterId).limit(20000);
  const c = { total: 0, queued: 0, sending: 0, sent: 0, failed: 0 } as Record<string, number>;
  for (const r of data ?? []) { c.total++; c[r.status] = (c[r.status] || 0) + 1; }
  return c;
}

/** Sends queued recipients of one letter, one by one with gaps, until the time budget is used. */
/** Each organization on Kalchuri One uses its own WhatsApp gateway: the letter's organization's default
 *  Vivid Relay channel (Admin → Messaging). The owner's gateway (app_settings) is only for the home organization
 *  (प्रगतिशील समाज) and for organizations the super admin has explicitly allowed (shok_owner_relay_ok). */
async function cfgForOrg(db: Db, base: Cfg, org: string | null): Promise<Cfg> {
  if (!org) return base;
  const { data: okv } = await db.rpc("shok_owner_relay_ok", { p_org: org });
  const fallback: Cfg = okv === false ? { ...base, relay_url: "", relay_key: "", relay_session: "" } : base;
  const { data: ch } = await db.from("comms_channels").select("id").eq("organization_id", org).eq("kind", "whatsapp").eq("provider", "vivid_relay").eq("status", "active").order("is_default", { ascending: false }).limit(1);
  const id = ch?.[0]?.id;
  if (!id) return fallback;
  const { data: rt } = await db.rpc("k1_comms_channel_runtime", { p_channel: id });
  const r = (rt as { config?: Record<string, string>; secret?: string; gap_min_s?: number; gap_max_s?: number }[] | null)?.[0];
  if (!r?.config?.relay_url || !r.secret) return fallback;
  return { ...base, relay_url: r.config.relay_url, relay_key: r.secret, relay_session: r.config.session || base.relay_session || "", gap_min: String(r.gap_min_s ?? base.gap_min ?? 6), gap_max: String(r.gap_max_s ?? base.gap_max ?? 14) };
}

async function work(db: Db, baseCfg: Cfg, letterId: string) {
  // take the lock (nobody else is sending this letter)
  const now = new Date();
  const { data: got } = await db.from("letters").update({ lock_until: new Date(now.getTime() + 5 * 60_000).toISOString() })
    .eq("id", letterId).in("status", ["queued", "sending"]).or(`lock_until.is.null,lock_until.lt.${now.toISOString()}`).select("*");
  const letter = got?.[0];
  if (!letter) return;
  const cfg = await cfgForOrg(db, baseCfg, (letter as { organization_id?: string | null }).organization_id ?? null);
  const relay = (cfg.relay_url || "").replace(/\/+$/, "");
  const key = cfg.relay_key || "";
  const session = cfg.relay_session || "";
  const relayHeaders = { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Requested-With": "vivid" };
  const gapMin = Math.max(3, Number(cfg.gap_min) || 6);
  const gapMax = Math.min(25, Math.max(gapMin + 1, Number(cfg.gap_max) || 14));

  let fatal: string | null = null;
  try {
    if (!relay || !key || !session) { fatal = "इस संस्था का अपना WhatsApp गेटवे नहीं जुड़ा है: संस्था के Kalchuri One Admin → Messaging में अपना Vivid Relay / API channel जोड़ें।"; return; }
    // we hold the lock, so rows still marked "sending" belong to a worker that died
    await db.from("letter_recipients").update({ status: "queued" }).eq("letter_id", letterId).eq("status", "sending");
    const start = Date.now();
    let first = true;
    while (Date.now() - start < BUDGET_MS) {
      const { data: next } = await db.from("letter_recipients").select("id").eq("letter_id", letterId).eq("status", "queued").order("created_at").order("id").limit(1);
      if (!next?.length) break;
      const { data: cl } = await db.from("letter_recipients").update({ status: "sending" }).eq("id", next[0].id).eq("status", "queued").select("*");
      const r = cl?.[0] as Record<string, string | number | null> | undefined;
      if (!r) continue;
      if (first) { await db.from("letters").update({ status: "sending", last_error: null }).eq("id", letterId); first = false; }
      await db.from("letters").update({ lock_until: new Date(Date.now() + 5 * 60_000).toISOString() }).eq("id", letterId); // keep lock fresh

      const text = fillTemplate(String(letter.message_text || ""), { name: String(r.recipient_name || ""), father: String(r.father_name || ""), village: String(r.village_name || "") }).trimEnd() + "\n\n" + uniqueRef();
      const msg: Record<string, unknown> = { to: String(r.phone), text };
      if (letter.base_image_path && r.image_path) {
        const ip = String(r.image_path);
        if (ip.startsWith("r2/")) {
          // Cloudflare R2 (shokpatra worker /f/…): पते में random अंश है, इसलिए अलग हस्ताक्षर की ज़रूरत नहीं
          const base = (Deno.env.get("FILES_BASE") || "https://shokpatra.kalchuri.org").replace(/\/$/, "");
          msg.media = { type: "image", url: `${base}/f/${ip.slice(3).split("/").map(encodeURIComponent).join("/")}` };
        } else {
          const { data: signed } = await db.storage.from("letters").createSignedUrl(ip, 3600);
          if (signed?.signedUrl) msg.media = { type: "image", url: signed.signedUrl };
        }
      }
      let ok = false, err = "";
      try {
        const res = await fetch(`${relay}/api/sessions/${encodeURIComponent(session)}/send`, {
          method: "POST", headers: relayHeaders, body: JSON.stringify(msg), signal: AbortSignal.timeout(60000),
        });
        const j = await res.json().catch(() => ({}));
        ok = res.ok && j.ok !== false;
        if (!ok) err = (j.error || `HTTP ${res.status}`).toString().slice(0, 300);
        if (res.status === 401 || res.status === 402 || res.status === 403) fatal = `Vivid Relay: ${err}`;
      } catch (e) { err = (e as Error).message.slice(0, 300); }

      if (fatal) { await db.from("letter_recipients").update({ status: "queued" }).eq("id", r.id); break; }
      // number not on WhatsApp → remember it and re-route the card (eldest son → branch head → family main number)
      if (!ok && /not_on_whatsapp|not on whatsapp/i.test(err) && Number(r.attempts || 0) < 3) {
        const { data: rr } = await db.rpc("shok_reroute_recipient", { p_recipient: r.id });
        if (rr && (rr as { phone?: string }).phone) {
          await db.from("letter_recipients").update({ attempts: Number(r.attempts || 0) + 1, error: `WhatsApp नहीं: ${String(r.phone)} → ${(rr as { via_name?: string }).via_name ?? "दूसरा नंबर"}` }).eq("id", r.id);
          continue; // stays queued; picked up again in this or the next run
        }
        err = "इस नंबर पर WhatsApp नहीं है और कोई वैकल्पिक नंबर (पुत्र / मुखिया / परिवार) नहीं मिला";
      }
      await db.from("letter_recipients").update({
        status: ok ? "sent" : "failed", error: ok ? null : err,
        attempts: Number(r.attempts || 0) + 1, sent_at: ok ? new Date().toISOString() : null,
      }).eq("id", r.id);
      if (Date.now() - start + gapMax * 1000 < BUDGET_MS) await sleep((gapMin + Math.random() * (gapMax - gapMin)) * 1000);
      else break;
    }
  } catch (e) { fatal = (e as Error).message; }
  finally {
    const c = await counts(db, letterId);
    const remaining = (c.queued || 0) + (c.sending || 0);
    const patch: Record<string, unknown> = { lock_until: null, last_error: fatal };
    if (!fatal) patch.status = remaining === 0 ? ((c.sent || 0) === 0 && (c.failed || 0) > 0 ? "failed" : "done") : "sending";
    await db.from("letters").update(patch).eq("id", letterId);
  }
}

/** Oldest approved letter that still has unsent recipients and is not being worked on. */
async function pickLetter(db: Db): Promise<string | null> {
  const { data } = await db.from("letters").select("id,lock_until").in("status", ["queued", "sending"]).order("created_at").limit(20);
  for (const l of data ?? []) {
    if (l.lock_until && new Date(l.lock_until) > new Date()) continue;
    const c = await counts(db, l.id);
    if ((c.queued || 0) + (c.sending || 0) > 0) return l.id;
  }
  return null;
}

const background = (p: Promise<unknown>) => {
  const q = p.catch((e) => console.error("send worker", e));
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime) EdgeRuntime.waitUntil(q);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(url, service);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    const { data: rows } = await db.from("app_settings").select("key,value");
    const cfg: Cfg = Object.fromEntries((rows ?? []).map((r) => [r.key, r.value ?? ""]));

    // ---- server timer (pg_cron) ----
    const cronHeader = req.headers.get("x-cron-secret");
    if (cronHeader) {
      const { data: sec } = await db.from("server_secrets").select("value").eq("key", "cron_secret").single();
      if (!sec || sec.value !== cronHeader) return json({ ok: false, error: "अनुमति नहीं।" }, 401);
      if (action !== "tick") return json({ ok: false, error: "अज्ञात काम।" }, 400);
      const id = await pickLetter(db);
      if (!id) return json({ ok: true, idle: true });
      background(work(db, cfg, id));
      return json({ ok: true, letter_id: id });
    }

    // ---- signed-in website user ----
    const userClient = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ ok: false, error: "लॉगिन ज़रूरी है।" }, 401);
    const { data: me } = await db.from("profiles").select("role,status").eq("id", user.id).single();
    if (me?.status !== "approved") return json({ ok: false, error: "आपका खाता मंज़ूर नहीं है।" }, 403);
    const isAdmin = me.role === "admin";

    if (action === "test") {
      const relay = (cfg.relay_url || "").replace(/\/+$/, ""), key = cfg.relay_key || "", session = cfg.relay_session || "";
      const relayHeaders = { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Requested-With": "vivid" };
      if (!isAdmin) return json({ ok: false, error: "सिर्फ़ एडमिन जाँच सकता है।" }, 403);
      if (!relay || !key) return json({ ok: false, error: "पहले Vivid Relay का पता और API की सहेजिए।" });
      const r = await fetch(`${relay}/api/sessions`, { headers: relayHeaders }).catch((e) => e as Error);
      if (r instanceof Error) return json({ ok: false, error: `Vivid Relay तक पहुँच नहीं हुई: ${r.message}` });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) return json({ ok: false, error: j.error || `Vivid Relay ने जवाब दिया: ${r.status}` });
      const s = (j.sessions || []).find((x: { name: string }) => x.name === session);
      if (!s) return json({ ok: false, error: `सेशन "${session}" नहीं मिला। उपलब्ध: ${(j.sessions || []).map((x: { name: string }) => x.name).join(", ") || "कोई नहीं"}` });
      return json({ ok: true, session: s });
    }

    const letterId = body.letter_id as string;
    if (!letterId) return json({ ok: false, error: "letter_id चाहिए।" }, 400);
    const { data: letter } = await db.from("letters").select("*").eq("id", letterId).single();
    if (!letter || (letter.created_by !== user.id && !isAdmin)) return json({ ok: false, error: "यह पत्र आपका नहीं है।" }, 403);
    // मंज़ूरी से पहले (या नामंज़ूर) पत्र किसी भी हालत में नहीं भेजा जाएगा
    if (!["queued", "sending", "done", "failed"].includes(letter.status)) return json({ ok: false, error: "यह पत्र अभी मंज़ूर नहीं हुआ है।" }, 400);

    if (action === "retry") {
      await db.from("letter_recipients").update({ status: "queued", error: null }).eq("letter_id", letterId).eq("status", "failed");
      await db.from("letters").update({ status: "queued", last_error: null }).eq("id", letterId);
      background(work(db, cfg, letterId)); // instant start; the server timer keeps going afterwards
      return json({ ok: true });
    }

    // "kick" (and the old name "process"): start now instead of waiting for the next timer tick, return at once
    if (action === "kick" || action === "process") {
      const c = await counts(db, letterId);
      if ((c.queued || 0) + (c.sending || 0) > 0 && ["queued", "sending", "failed"].includes(letter.status)) {
        if (letter.status === "failed") await db.from("letters").update({ status: "queued" }).eq("id", letterId);
        background(work(db, cfg, letterId));
      }
      return json({ ok: true, remaining: (c.queued || 0) + (c.sending || 0), sent: c.sent || 0, failed: c.failed || 0, total: c.total });
    }
    return json({ ok: false, error: "अज्ञात काम।" }, 400);
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
