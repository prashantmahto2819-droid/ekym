// Family-tree data operations (shokpatra tables + RPCs), shared by the Kalchuri One pages.
import { supabase } from "@/integrations/supabase/client";
import { normPhone } from "@/lib/comms";

export const RELATIONS = ["मुखिया (पिता)", "पुत्र", "पौत्र (पोता)", "भाई", "पति/पत्नी", "अन्य", "पिता / पूर्वज"];
export const ANCESTOR_RELATION = RELATIONS[RELATIONS.length - 1]!;

export type Village = { id: string; name: string };
export type Origin = { id: string; name: string; region_id: string | null; region_name: string };

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

function err(e: { message: string } | null) { if (e) throw new Error(e.message); }

export async function loadVillages(): Promise<Village[]> {
  const { data, error } = await supabase.from("villages").select("id,name").order("name").limit(2000);
  err(error);
  return (data ?? []) as Village[];
}

export async function loadOrigins(): Promise<Origin[]> {
  const [{ data: regs }, { data: ovs }] = await Promise.all([
    supabase.from("social_regions").select("id,name,sort_order"),
    supabase.from("origin_villages").select("id,name,region_id,sort_order").limit(5000),
  ]);
  const rn = new Map(((regs ?? []) as { id: string; name: string; sort_order: number }[]).map((r) => [r.id, r]));
  return ((ovs ?? []) as { id: string; name: string; region_id: string | null; sort_order: number }[])
    .map((o) => ({ id: o.id, name: o.name, region_id: o.region_id, region_name: o.region_id ? rn.get(o.region_id)?.name ?? "" : "", rs: o.region_id ? rn.get(o.region_id)?.sort_order ?? 0 : 0, so: o.sort_order }))
    .sort((a, b) => a.rs - b.rs || a.so - b.so)
    .map(({ rs: _rs, so: _so, ...o }) => o);
}

/** Find a village by name (case-insensitive) or create it. Returns its id, or null for an empty name. */
export async function ensureVillage(name: string, list: Village[]): Promise<string | null> {
  const clean = name.trim().replace(/\s+/g, " ");
  if (!clean) return null;
  const hit = list.find((v) => norm(v.name) === norm(clean));
  if (hit) return hit.id;
  const { data, error } = await supabase.from("villages").insert({ name: clean }).select("id,name").single();
  err(error);
  list.push(data as Village);
  return (data as Village).id;
}

export function validPhone(s: string) { return /^(\+?91)?0?[6-9]\d{9}$/.test(s.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1")) || /^[6-9]\d{9}$/.test(s.replace(/\D/g, "")); }

export type PhoneHit = { kind: string; name: string | null; father_name: string | null; family_name: string | null; village_name: string | null; member_id: string | null };
/** Is this number already used by another member/family? (RPC phone_check) */
export async function phoneCheck(phone: string, family?: string | null, excludeMember?: string | null): Promise<PhoneHit[]> {
  const { data, error } = await supabase.rpc("phone_check", { p_phone: normPhone(phone), p_family: family ?? null, p_exclude_member: excludeMember ?? null } as never);
  err(error);
  return (data ?? []) as PhoneHit[];
}

export async function rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn as never, args as never);
  err(error);
  return data as T;
}

export const DecidedMsg = (r: { by?: string | null; status?: string }, L: boolean) =>
  L ? `यह अनुरोध पहले ही ${r.by ? r.by + " द्वारा " : ""}${r.status === "approved" ? "मंज़ूर" : r.status === "rejected" ? "अस्वीकार" : "निपटाया"} जा चुका है।`
    : `Already ${r.status ?? "decided"}${r.by ? ` by ${r.by}` : ""}.`;
