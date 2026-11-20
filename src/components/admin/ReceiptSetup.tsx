import type { SupabaseClient } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLang } from "@/core/i18n";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as unknown as SupabaseClient;
type Row = { channel_id: string; name: string; secret_set: boolean; delivered_30d: number };

/** Delivered / read receipts for shok letters sent through the organization's own Vivid Relay channel. */
export function ReceiptSetup({ org, canManage }: { org: string; canManage: boolean }) {
  const L = useLang().lang === "hi";
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const q = useQuery({ queryKey: ["shok_receipt_channels", org], queryFn: async () => { const { data, error } = await sb.rpc("shok_receipt_channels", { p_org: org }); if (error) throw new Error(error.message); return (data ?? []) as Row[]; } });
  const base = String(import.meta.env["VITE_SUPABASE_URL"] || "https://udxdxkyfrqlgdwwqaucu.supabase.co").replace(/\/+$/, "");
  const hook = (id: string) => `${base}/functions/v1/shok-receipt?c=${id}`;
  async function save(id: string) {
    const { error } = await sb.rpc("shok_receipt_channel_secret_set", { p_channel: id, p_secret: secrets[id] ?? "" });
    if (error) { toast.error(error.message); return; }
    toast.success(L ? "सहेज लिया" : "Saved");
    setSecrets((x) => ({ ...x, [id]: "" }));
    void q.refetch();
  }
  if (!q.data?.length) return null;
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4 text-sm">
      <div>
        <h2 className="font-semibold">{L ? "शोक पत्र: पहुँचा / पढ़ा गया की रसीद" : "Shok letters: delivered / read receipts"}</h2>
        <p className="text-xs text-muted-foreground">{L ? "अपने Vivid Relay में एक webhook जोड़ने पर हर पत्र के आगे पहुँचा / पढ़ा दिखने लगता है।" : "Add one webhook in your Vivid Relay and every letter shows delivered / read."}</p>
      </div>
      <ol className="ml-5 list-decimal space-y-0.5 text-xs text-muted-foreground">
        <li>{L ? "Vivid Relay → Webhooks → नया webhook; नीचे दिया पता URL में डालिए।" : "Vivid Relay → Webhooks → new webhook; paste the URL shown below."}</li>
        <li>{L ? "Events में सिर्फ़ message.receipt चुनकर सहेजिए।" : "Choose only the message.receipt event and save."}</li>
        <li>{L ? "जो secret (whsec_…) एक बार दिखे, उसे यहाँ चिपकाकर सहेजिए।" : "Paste the secret (whsec_…) that is shown once, here, and save."}</li>
      </ol>
      {q.data.map((c) => (
        <div key={c.channel_id} className="space-y-2 rounded-lg border border-border p-3">
          <p><b>{c.name}</b> — {c.secret_set ? (L ? `जुड़ा हुआ · 30 दिन में ${c.delivered_30d} पहुँचे` : `connected · ${c.delivered_30d} delivered in 30 days`) : (L ? "अभी जुड़ा नहीं" : "not connected yet")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="max-w-full truncate rounded bg-secondary px-2 py-1 text-xs">{hook(c.channel_id)}</code>
            <Button size="sm" variant="outline" onClick={() => void navigator.clipboard.writeText(hook(c.channel_id)).then(() => toast.success(L ? "कॉपी हो गया" : "Copied"))}>{L ? "कॉपी" : "Copy"}</Button>
          </div>
          {canManage ? (
            <div className="flex flex-wrap items-center gap-2">
              <Input type="password" autoComplete="off" className="h-9 max-w-xs" placeholder="whsec_…" value={secrets[c.channel_id] ?? ""} onChange={(e) => setSecrets((x) => ({ ...x, [c.channel_id]: e.target.value }))} />
              <Button size="sm" onClick={() => void save(c.channel_id)}>{L ? "सहेजें" : "Save"}</Button>
              {c.secret_set ? <span className="text-xs text-muted-foreground">{L ? "खाली सहेजने पर रसीद बंद हो जाती है।" : "Saving it empty turns receipts off."}</span> : null}
            </div>
          ) : null}
        </div>
      ))}
    </section>
  );
}
