// Kalchuri One · cm-moderate: reads a community post (text + images) and decides whether it is promotional
// (advertisement, sales, business promotion, political campaigning, spam). Verdict goes to k1_cm_moderation_result,
// which limits reach and alerts moderators. AI provider: Google Gemini (secret GEMINI_API_KEY, free tier is enough);
// without a key only the database keyword heuristic applies.
// Called by: trigger on cm_posts insert ({action:'post', post_id}) and cron every 5 min ({action:'scan'}); header x-cron-secret.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

type Post = { id: string; organization_id: string; body: string | null; link_url: string | null; media: { type: string; path: string }[]; moderation: Record<string, unknown> };
type Verdict = { promotional: boolean; confidence: number; category: string; reason: string; model: string };

const PROMPT = `You moderate a community social feed for an Indian caste/community organisation (Hindi + English).
Decide whether this post is PROMOTIONAL content that should not get free reach in the feed:
- advertisement for a product, shop, service, business, course, coaching, clinic, real estate, insurance, loan, MLM/earn-money scheme
- price lists, offers, discounts, "contact/call/WhatsApp us" for sales, booking links, shop links
- political campaigning / propaganda for a candidate or party (वोट माँगना, प्रचार)
- spam, chain messages, lottery
NOT promotional: personal news, family events, condolences, religious/cultural events of the community, achievements, jobs posted as community help, blood donation requests, government schemes info, education info without selling, a member's own video/poem/song.
Look at the images too: banners, posters with prices/phone numbers, business cards, product photos are promotional; family photos, event photos are not.
Reply with JSON only: {"promotional": true|false, "confidence": 0..1, "category": "ad"|"political"|"spam"|"none", "reason": "<one short sentence in Hindi>"}`;

async function gemini(key: string, model: string, text: string, images: { mime: string; b64: string }[]): Promise<Verdict> {
  const parts: unknown[] = [{ text: PROMPT + "\n\nPOST TEXT:\n" + (text || "(no text)") }];
  for (const im of images) parts.push({ inline_data: { mime_type: im.mime, data: im.b64 } });
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { response_mime_type: "application/json", temperature: 0 } }),
  });
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = await r.json();
  const raw = j?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  const v = JSON.parse(raw.replace(/^```json|```$/g, "").trim());
  return { promotional: !!v.promotional, confidence: Math.max(0, Math.min(1, Number(v.confidence) || 0)), category: String(v.category || "none"), reason: String(v.reason || ""), model };
}

async function analyse(db: ReturnType<typeof createClient>, p: Post): Promise<Verdict> {
  const key = Deno.env.get("GEMINI_API_KEY");
  const model = Deno.env.get("MODERATION_MODEL") || "gemini-2.5-flash";
  const text = [p.body, p.link_url ? `Link: ${p.link_url}` : null].filter(Boolean).join("\n");
  if (!key) return { promotional: false, confidence: 0, category: "none", reason: "", model: "heuristic-only" };
  const images: { mime: string; b64: string }[] = [];
  for (const m of (p.media ?? []).slice(0, 4)) {
    if (m.type !== "image" || !m.path) continue;
    const { data } = await db.storage.from("community").download(m.path);
    if (!data) continue;
    const buf = new Uint8Array(await data.arrayBuffer());
    let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    images.push({ mime: data.type || "image/jpeg", b64: btoa(bin) });
  }
  try { return await gemini(key, model, text, images); }
  catch (e) { return { promotional: false, confidence: 0, category: "none", reason: "", model: `error: ${(e as Error).message.slice(0, 200)}` }; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!, service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(url, service);
  const body = await req.json().catch(() => ({}));
  const secret = req.headers.get("x-cron-secret");
  const { data: s } = await db.from("server_secrets").select("value").eq("key", "cron_secret").maybeSingle();
  if (!secret || !s || s.value !== secret) return json({ ok: false, error: "Bad cron secret" }, 401);

  let posts: Post[] = [];
  if (body.action === "post" && body.post_id) {
    const { data } = await db.from("cm_posts").select("id,organization_id,body,link_url,media,moderation,moderation_status").eq("id", body.post_id).maybeSingle();
    if (data && (data as { moderation_status: string }).moderation_status !== "clean") posts = [data as unknown as Post];
  } else {
    const { data } = await db.rpc("k1_cm_pending_posts", { p_limit: 10 });
    posts = (data ?? []) as Post[];
  }
  const results: Record<string, unknown>[] = [];
  for (const p of posts) {
    const v = await analyse(db, p);
    const { error } = await db.rpc("k1_cm_moderation_result", { p_post: p.id, p_ai: v });
    results.push({ id: p.id, ...v, error: error?.message });
  }
  return json({ ok: true, processed: results.length, results });
});
