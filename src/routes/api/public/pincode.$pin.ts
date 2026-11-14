import { createFileRoute } from "@tanstack/react-router";

import { isPin, parsePinReply, type PinInfo } from "@/lib/pincode";

/** PIN code → state, district and post offices from India Post's open lookup, read on the server (edge-cached 30 days).
 *  Forms use it to fill state / district with the official names; on any failure people simply type. */
const memo = new Map<string, { at: number; v: PinInfo | null }>();

const reply = (v: PinInfo | null) =>
  Response.json(v ? { ok: true, ...v } : { ok: false, error: "not_found" }, {
    status: v ? 200 : 404,
    headers: { "Cache-Control": "public, max-age=86400, s-maxage=2592000" },
  });

export const Route = createFileRoute("/api/public/pincode/$pin")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const pin = String(params.pin ?? "");
        if (!isPin(pin)) return Response.json({ ok: false, error: "bad_pin" }, { status: 400 });
        const hit = memo.get(pin);
        if (hit && Date.now() - hit.at < 864e5) return reply(hit.v);
        for (const base of ["https://api.postalpincode.in", "http://api.postalpincode.in"]) {
          try {
            const r = await fetch(`${base}/pincode/${pin}`, {
              signal: AbortSignal.timeout(5000),
              headers: { Accept: "application/json" },
              cf: { cacheTtl: 2592000, cacheEverything: true },
            } as RequestInit);
            if (!r.ok) continue;
            const v = parsePinReply(pin, await r.json());
            if (memo.size > 5000) memo.clear();
            memo.set(pin, { at: Date.now(), v });
            return reply(v);
          } catch { /* try the next */ }
        }
        return Response.json({ ok: false, error: "lookup_failed" }, { status: 502, headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});
