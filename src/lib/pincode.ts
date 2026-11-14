// India Post PIN lookup reply → district / state (ekym spellings) / post offices. Used by /api/public/pincode/$pin.
import { canonDistrict, canonState } from "@/lib/places";

export type PinPlace = { name: string; block: string; delivery: boolean };
export type PinInfo = { pin: string; state: string; district: string; districtKnown: boolean; places: PinPlace[] };

const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s\-(./])([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase());
const tidy = (v: unknown) => { const s = String(v ?? "").trim(); return !s || /^(na|n\/a|null|-)$/i.test(s) ? "" : s; };

export function isPin(p: string | null | undefined) { return /^[1-9]\d{5}$/.test(String(p ?? "").trim()); }

export function parsePinReply(pin: string, reply: unknown): PinInfo | null {
  const top = Array.isArray(reply) ? reply[0] : reply;
  const list = (top as { PostOffice?: unknown } | undefined)?.PostOffice;
  if (!Array.isArray(list) || !list.length) return null;
  const most = (k: string) => {
    const m = new Map<string, number>();
    for (const p of list) { const v = tidy((p as Record<string, unknown>)[k]); if (v) m.set(v, (m.get(v) ?? 0) + 1); }
    return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  };
  const state = canonState(most("State") || most("Circle"));
  const d = canonDistrict(titleCase(most("District")), state);
  const places = list.map((p) => {
    const r = p as Record<string, unknown>;
    return { name: titleCase(tidy(r["Name"])), block: titleCase(tidy(r["Block"])), delivery: /^delivery$/i.test(tidy(r["DeliveryStatus"])) };
  }).filter((p) => p.name).sort((a, b) => Number(b.delivery) - Number(a.delivery) || a.name.localeCompare(b.name));
  return { pin: String(pin).trim(), state: state || d.state, district: d.district, districtKnown: d.known, places };
}
