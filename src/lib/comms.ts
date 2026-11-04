// Client helpers for the communication engine (Phase 5). Server-side queue: see supabase/functions/comms-worker.
import { supabase } from "@/integrations/supabase/client";

export type Media = { type: "image" | "document"; bucket?: string; path?: string; url?: string; filename?: string };

export type EnqueueInput = {
  org: string;
  kind: "whatsapp" | "email";
  to: string;
  body: string;
  name?: string | null;
  subject?: string | null;
  media?: Media[];
  purpose?: "utility" | "marketing" | "authentication";
  refTable?: string | null;
  refId?: string | null;
  channel?: string | null;
  campaign?: string | null;
  metaTemplate?: Record<string, unknown> | null;
};

/** Queue one message; the worker sends it within a minute. Returns the message id. */
export async function enqueueMessage(i: EnqueueInput): Promise<string> {
  const { data, error } = await supabase.rpc("k1_enqueue_message", {
    p_org: i.org,
    p_kind: i.kind,
    p_to: i.to,
    p_body: i.body,
    p_name: i.name ?? null,
    p_subject: i.subject ?? null,
    p_media: (i.media ?? []) as never,
    p_purpose: i.purpose ?? "utility",
    p_ref_table: i.refTable ?? null,
    p_ref_id: i.refId ?? null,
    p_channel: i.channel ?? null,
    p_campaign: i.campaign ?? null,
    p_meta_template: (i.metaTemplate ?? null) as never,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Ask the worker to drain the queue now instead of waiting for the next cron minute. */
export async function kickWorker() {
  try { await supabase.functions.invoke("comms-worker", { body: { action: "tick" } }); } catch { /* cron will pick it up */ }
}

export function looksLikeEmail(s: string) { return /@/.test(s); }

/** Normalise an Indian mobile number to 91XXXXXXXXXX (same rule as the database). */
export function normPhone(s: string) {
  const d = s.replace(/\D/g, "");
  if (d.length === 10) return "91" + d;
  if (d.length === 12 && d.startsWith("91")) return d;
  if (d.length === 11 && d.startsWith("0")) return "91" + d.slice(1);
  return d;
}

/** Simple {{a.b}} merge for message templates (same syntax as the design engine, without formatters). */
export function mergeMessage(body: string, data: Record<string, unknown>) {
  return body.replace(/\{\{\s*([\w.]+)(?:\|[^}]*)?\s*\}\}/g, (_m, key: string) => {
    const v = key.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), data);
    return v == null ? "" : String(v);
  });
}
