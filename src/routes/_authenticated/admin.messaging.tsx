import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { CrudPage } from "@/components/admin/CrudPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { enqueueMessage, kickWorker, looksLikeEmail, mergeMessage, normPhone } from "@/lib/comms";

export const Route = createFileRoute("/_authenticated/admin/messaging")({ component: MessagingPage });

type Provider = "vivid_relay" | "meta_cloud" | "smtp";
type Channel = { id: string; kind: "whatsapp" | "email"; provider: Provider; name: string; config: Record<string, string>; secret_id: string | null; status: string; is_default: boolean; daily_limit: number; gap_min_s: number; gap_max_s: number; last_error: string | null };
type Msg = { id: string; kind: string; to_contact: string; to_name: string | null; subject: string | null; body: string; status: string; attempts: number; error: string | null; created_at: string; sent_at: string | null; ref_table: string | null };
type Template = { id: string; kind: string; name: string; subject: string | null; body: string; category: string };

const PROVIDER_FIELDS: Record<Provider, { key: string; label: string; hint?: string }[]> = {
  vivid_relay: [
    { key: "relay_url", label: "Relay URL", hint: "e.g. https://relay.example.com" },
    { key: "session", label: "Session name", hint: "the WhatsApp session created in Vivid Relay" },
  ],
  meta_cloud: [
    { key: "phone_number_id", label: "Phone number ID", hint: "from Meta Business → WhatsApp → API setup" },
    { key: "waba_id", label: "WhatsApp Business Account ID" },
  ],
  smtp: [
    { key: "host", label: "SMTP host" },
    { key: "port", label: "Port", hint: "587 (STARTTLS) or 465 (SSL)" },
    { key: "username", label: "Username" },
    { key: "from_email", label: "From email" },
    { key: "from_name", label: "From name" },
  ],
};
const SECRET_LABEL: Record<Provider, string> = { vivid_relay: "API key (vr_…)", meta_cloud: "Permanent access token", smtp: "Password / app password" };

function MessagingPage() {
  const tenant = useTenant();
  const { can } = useAuth();
  const qc = useQueryClient();
  const org = tenant.organization_id;
  const canChannels = can("comms.channel.manage");
  const canSend = can("comms.campaign.send");

  const channels = useQuery({
    queryKey: ["comms_channels", org],
    queryFn: async () => { const { data, error } = await supabase.from("comms_channels").select("*").eq("organization_id", org).order("created_at"); if (error) throw error; return (data ?? []) as unknown as Channel[]; },
  });
  const stats = useQuery({
    queryKey: ["comms_stats", org],
    queryFn: async () => { const { data } = await supabase.rpc("k1_comms_stats", { p_org: org }); return (data ?? {}) as Record<string, number>; },
    refetchInterval: 30000,
  });
  const log = useQuery({
    queryKey: ["comms_messages", org],
    queryFn: async () => { const { data, error } = await supabase.from("comms_messages").select("id,kind,to_contact,to_name,subject,body,status,attempts,error,created_at,sent_at,ref_table").eq("organization_id", org).order("created_at", { ascending: false }).limit(200); if (error) throw error; return (data ?? []) as unknown as Msg[]; },
    refetchInterval: 20000,
  });

  const invalidate = () => { qc.invalidateQueries({ queryKey: ["comms_channels", org] }); qc.invalidateQueries({ queryKey: ["comms_stats", org] }); qc.invalidateQueries({ queryKey: ["comms_messages", org] }); };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl font-semibold">Messaging (WhatsApp &amp; email)</h1>
        <p className="text-sm text-muted-foreground">Channels, templates, broadcasts and the delivery log. Messages are queued on the server and sent automatically every minute with safe gaps between them.</p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["queued", "In queue"], ["sent_24h", "Sent (24 h)"], ["failed_7d", "Failed (7 d)"], ["blocked_7d", "Blocked / opted out (7 d)"]].map(([k, l]) => (
          <div key={k} className="rounded-lg border border-border bg-background p-3"><p className="text-xs text-muted-foreground">{l}</p><p className="font-display text-2xl">{stats.data?.[k!] ?? 0}</p></div>
        ))}
      </section>

      <ChannelsSection channels={channels.data ?? []} canManage={canChannels} onChange={invalidate} org={org} />

      {canSend ? <BroadcastSection org={org} channels={channels.data ?? []} onDone={invalidate} /> : null}

      <CrudPage
        table="comms_templates"
        title="Message templates"
        description="Reusable texts. Merge fields: {{member.name}}, {{org.name}}, {{meeting.title}}, {{meeting.date}}, {{doc.ref_no}}, {{doc.subject}}, {{doc.verify_url}}."
        orderBy="name"
        columns={[{ key: "name", label: "Name" }, { key: "kind", label: "Channel" }, { key: "category", label: "Category" }, { key: "language", label: "Lang" }]}
        fields={[
          { key: "name", label: "Name", required: true },
          { key: "kind", label: "Channel", type: "select", options: ["whatsapp", "email"] },
          { key: "category", label: "Category", type: "select", options: ["utility", "marketing"], hint: "marketing needs the recipient's consent" },
          { key: "language", label: "Language", type: "select", options: ["hi", "en"] },
          { key: "subject", label: "Subject (email only)", full: true },
          { key: "body", label: "Message", type: "textarea", required: true, full: true },
          { key: "meta_template_name", label: "Meta approved template name (Cloud API only)", full: true },
        ]}
      />

      <section className="space-y-2">
        <h2 className="font-display text-lg font-semibold">Delivery log</h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground"><tr><th className="p-2">When</th><th className="p-2">To</th><th className="p-2">Message</th><th className="p-2">Status</th><th className="p-2"></th></tr></thead>
            <tbody>
              {(log.data ?? []).map((m) => (
                <tr key={m.id} className="border-t border-border align-top">
                  <td className="p-2 whitespace-nowrap text-xs">{new Date(m.created_at).toLocaleString("en-IN")}</td>
                  <td className="p-2 text-xs">{m.to_name ? <div>{m.to_name}</div> : null}<div className="text-muted-foreground">{m.to_contact}</div></td>
                  <td className="p-2 text-xs max-w-md"><div className="line-clamp-2">{m.subject ? <b>{m.subject} · </b> : null}{m.body}</div>{m.error ? <div className="text-destructive">{m.error}</div> : null}</td>
                  <td className="p-2"><StatusBadge s={m.status} /> {m.attempts > 1 ? <span className="text-xs text-muted-foreground">×{m.attempts}</span> : null}</td>
                  <td className="p-2">{m.status === "queued" ? <Button size="sm" variant="ghost" onClick={async () => { const { error } = await supabase.rpc("k1_cancel_message", { p_id: m.id }); if (error) toast.error(error.message); else invalidate(); }}>Cancel</Button> : null}</td>
                </tr>
              ))}
              {!log.data?.length ? <tr><td className="p-3 text-sm text-muted-foreground" colSpan={5}>Nothing sent yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ s }: { s: string }) {
  const v = s === "sent" || s === "delivered" || s === "read" ? "default" : s === "failed" || s === "blocked" ? "destructive" : "secondary";
  return <Badge variant={v}>{s}</Badge>;
}

function ChannelsSection({ channels, canManage, onChange, org }: { channels: Channel[]; canManage: boolean; onChange: () => void; org: string }) {
  const [editing, setEditing] = useState<Partial<Channel> | null>(null);
  const [secret, setSecret] = useState("");
  const [testing, setTesting] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const provider = (editing.provider ?? "vivid_relay") as Provider;
      const row = { organization_id: org, kind: provider === "smtp" ? "email" : "whatsapp", provider, name: editing.name || provider, config: editing.config ?? {}, daily_limit: editing.daily_limit ?? 500, gap_min_s: editing.gap_min_s ?? 4, gap_max_s: editing.gap_max_s ?? 12, is_default: editing.is_default ?? channels.length === 0 };
      let id = editing.id;
      if (id) { const { error } = await supabase.from("comms_channels").update(row as never).eq("id", id); if (error) throw error; }
      else { const { data, error } = await supabase.from("comms_channels").insert(row as never).select("id").single(); if (error) throw error; id = (data as { id: string }).id; }
      if (secret.trim()) { const { error } = await supabase.rpc("k1_comms_set_secret", { p_channel: id!, p_secret: secret.trim() }); if (error) throw error; }
    },
    onSuccess: () => { toast.success("Channel saved"); setEditing(null); setSecret(""); onChange(); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function test(id: string) {
    setTesting(id);
    try {
      const { data, error } = await supabase.functions.invoke("comms-worker", { body: { action: "test", channel_id: id } });
      if (error) throw error;
      const r = data as { ok: boolean; error?: string; sessions?: string[]; info?: { display_phone_number?: string; verified_name?: string } };
      if (r.ok) toast.success(r.info?.display_phone_number ? `Connected: ${r.info.verified_name ?? ""} ${r.info.display_phone_number}` : "Connected");
      else toast.error(r.error ?? "Test failed" + (r.sessions ? ` (sessions: ${r.sessions.join(", ")})` : ""));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Test failed"); } finally { setTesting(null); }
  }

  async function resume(id: string) {
    const { error } = await supabase.from("comms_channels").update({ status: "active", last_error: null } as never).eq("id", id);
    if (error) toast.error(error.message); else { onChange(); kickWorker(); }
  }

  const provider = (editing?.provider ?? "vivid_relay") as Provider;
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Channels</h2>
        {canManage ? <Button size="sm" onClick={() => setEditing({ provider: "vivid_relay", config: {} })}>+ Add channel</Button> : null}
      </div>
      {!channels.length ? <p className="text-sm text-muted-foreground">No channel yet. Add Vivid Relay (your own WhatsApp number), Meta WhatsApp Cloud API, or an SMTP mailbox.</p> : null}
      <div className="grid gap-3 md:grid-cols-2">
        {channels.map((c) => (
          <div key={c.id} className="rounded-lg border border-border bg-background p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <div><b>{c.name}</b> <span className="text-xs text-muted-foreground">{c.provider.replace("_", " ")} · {c.kind}</span>{c.is_default ? <Badge className="ml-2" variant="secondary">default</Badge> : null}</div>
              <StatusBadge s={c.status} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{Object.entries(c.config).filter(([k]) => k !== "password").map(([k, v]) => `${k}: ${v}`).join(" · ")}{c.secret_id ? " · secret set" : " · no secret yet"}</p>
            <p className="text-xs text-muted-foreground">Limit {c.daily_limit}/day · gap {c.gap_min_s}–{c.gap_max_s} s</p>
            {c.last_error ? <p className="mt-1 text-xs text-destructive">{c.last_error}</p> : null}
            {canManage ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => { setEditing(c); setSecret(""); }}>Edit</Button>
                <Button size="sm" variant="outline" onClick={() => test(c.id)} disabled={testing === c.id}>{testing === c.id ? "Testing…" : "Test"}</Button>
                {c.status !== "active" ? <Button size="sm" variant="outline" onClick={() => resume(c.id)}>Resume</Button> : null}
                <Button size="sm" variant="ghost" onClick={async () => { if (!confirm("Delete this channel?")) return; const { error } = await supabase.from("comms_channels").delete().eq("id", c.id); if (error) toast.error(error.message); else onChange(); }}>Delete</Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {editing ? (
        <div className="rounded-lg border border-primary/40 bg-background p-4 text-sm">
          <h3 className="mb-3 font-semibold">{editing.id ? "Edit channel" : "New channel"}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <L label="Provider">
              <select className="h-9 w-full rounded-md border border-input bg-background px-2" value={provider} disabled={!!editing.id} onChange={(e) => setEditing({ ...editing, provider: e.target.value as Provider, config: {} })}>
                <option value="vivid_relay">Vivid Relay (own WhatsApp number)</option>
                <option value="meta_cloud">Meta WhatsApp Cloud API (official)</option>
                <option value="smtp">Email (SMTP)</option>
              </select>
            </L>
            <L label="Name"><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. Office WhatsApp" /></L>
            {PROVIDER_FIELDS[provider].map((f) => (
              <L key={f.key} label={f.label} hint={f.hint}><Input value={editing.config?.[f.key] ?? ""} onChange={(e) => setEditing({ ...editing, config: { ...(editing.config ?? {}), [f.key]: e.target.value } })} /></L>
            ))}
            <L label={SECRET_LABEL[provider]} hint={editing.id ? "leave blank to keep the stored secret" : "stored encrypted in Supabase Vault; never shown again"}><Input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="new-password" /></L>
            <L label="Daily limit"><Input type="number" value={editing.daily_limit ?? 500} onChange={(e) => setEditing({ ...editing, daily_limit: Number(e.target.value) })} /></L>
            <div className="grid grid-cols-2 gap-2">
              <L label="Gap min (s)"><Input type="number" value={editing.gap_min_s ?? 4} onChange={(e) => setEditing({ ...editing, gap_min_s: Number(e.target.value) })} /></L>
              <L label="Gap max (s)"><Input type="number" value={editing.gap_max_s ?? 12} onChange={(e) => setEditing({ ...editing, gap_max_s: Number(e.target.value) })} /></L>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_default ?? false} onChange={(e) => setEditing({ ...editing, is_default: e.target.checked })} /> Default channel for this kind</label>
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditing(null); setSecret(""); }}>Cancel</Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function BroadcastSection({ org, channels, onDone }: { org: string; channels: Channel[]; onDone: () => void }) {
  const [kind, setKind] = useState<"whatsapp" | "email">("whatsapp");
  const [audience, setAudience] = useState<"members" | "team" | "custom">("members");
  const [custom, setCustom] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [purpose, setPurpose] = useState<"utility" | "marketing">("utility");
  const [progress, setProgress] = useState<string | null>(null);
  const templates = useQuery({
    queryKey: ["comms_templates", org],
    queryFn: async () => { const { data } = await supabase.from("comms_templates").select("id,kind,name,subject,body,category").or(`organization_id.eq.${org},organization_id.is.null`).order("name"); return (data ?? []) as unknown as Template[]; },
  });
  const hasChannel = channels.some((c) => c.kind === kind && c.status === "active");

  async function recipients(): Promise<{ to: string; name: string; data: Record<string, unknown> }[]> {
    if (audience === "custom") {
      return custom.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean).map((s) => ({ to: looksLikeEmail(s) ? s : normPhone(s), name: "", data: { member: { name: "" } } }));
    }
    if (audience === "team") {
      const { data } = await supabase.rpc("k1_org_team", { p_org: org });
      const rows = (data ?? []) as { full_name: string | null; email: string | null; mobile: string | null }[];
      return rows.map((r) => ({ to: kind === "email" ? (r.email ?? "") : normPhone(r.mobile ?? ""), name: r.full_name ?? "", data: { member: { name: r.full_name ?? "" } } })).filter((r) => r.to);
    }
    const { data } = await supabase.from("org_memberships").select("full_name,full_name_hi,whatsapp,email,member_no").eq("organization_id", org).eq("status", "active").limit(5000);
    const rows = (data ?? []) as unknown as { full_name: string; full_name_hi: string | null; whatsapp: string | null; email: string | null; member_no: string | null }[];
    return rows.map((r) => ({ to: kind === "email" ? (r.email ?? "") : normPhone(r.whatsapp ?? ""), name: r.full_name, data: { member: { name: r.full_name, name_hi: r.full_name_hi ?? r.full_name, no: r.member_no ?? "" } } })).filter((r) => r.to && r.to.length >= 5);
  }

  async function send() {
    if (!body.trim()) return toast.error("Write the message");
    if (!hasChannel) return toast.error(`No active ${kind} channel`);
    const list = await recipients();
    if (!list.length) return toast.error("No recipients with a contact");
    if (!confirm(`Queue ${list.length} ${kind} message(s)? They go out gradually with gaps between them.`)) return;
    const { data: camp } = await supabase.from("comms_campaigns").insert({ organization_id: org, name: subject || body.slice(0, 40), purpose, status: "sending", total: list.length } as never).select("id").single();
    const campaignId = (camp as { id: string } | null)?.id ?? null;
    let n = 0, blocked = 0;
    for (const r of list) {
      try {
        await enqueueMessage({ org, kind, to: r.to, name: r.name, subject: kind === "email" ? mergeMessage(subject, { ...r.data, org: { name: "" } }) : null, body: mergeMessage(body, r.data), purpose, campaign: campaignId, refTable: "comms_campaigns", refId: campaignId });
      } catch (e) { blocked++; console.warn(e); }
      n++; setProgress(`${n}/${list.length}`);
    }
    setProgress(null);
    toast.success(`${n - blocked} queued${blocked ? `, ${blocked} skipped` : ""}`);
    kickWorker();
    onDone();
  }

  return (
    <section className="space-y-3 rounded-lg border border-border bg-background p-4 text-sm">
      <h2 className="font-display text-lg font-semibold">Broadcast</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <L label="Channel"><select className="h-9 w-full rounded-md border border-input bg-background px-2" value={kind} onChange={(e) => setKind(e.target.value as "whatsapp" | "email")}><option value="whatsapp">WhatsApp</option><option value="email">Email</option></select></L>
        <L label="Audience"><select className="h-9 w-full rounded-md border border-input bg-background px-2" value={audience} onChange={(e) => setAudience(e.target.value as typeof audience)}><option value="members">Active members</option><option value="team">Team / office bearers</option><option value="custom">Custom list</option></select></L>
        <L label="Purpose" hint="marketing = only to contacts who gave consent"><select className="h-9 w-full rounded-md border border-input bg-background px-2" value={purpose} onChange={(e) => setPurpose(e.target.value as typeof purpose)}><option value="utility">Notice / utility</option><option value="marketing">Promotion / marketing</option></select></L>
      </div>
      {audience === "custom" ? <L label="Numbers or emails (one per line)"><Textarea rows={3} value={custom} onChange={(e) => setCustom(e.target.value)} /></L> : null}
      {templates.data?.length ? (
        <L label="Start from a template"><select className="h-9 w-full rounded-md border border-input bg-background px-2" value="" onChange={(e) => { const t = templates.data!.find((x) => x.id === e.target.value); if (t) { setBody(t.body); setSubject(t.subject ?? ""); } }}><option value="">—</option>{templates.data.filter((t) => t.kind === kind).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></L>
      ) : null}
      {kind === "email" ? <L label="Subject"><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></L> : null}
      <L label="Message" hint="{{member.name}} is replaced per person"><Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} /></L>
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={send} disabled={!!progress || !hasChannel}>{progress ? `Queuing ${progress}` : "Queue broadcast"}</Button>
        {!hasChannel ? <span className="text-xs text-muted-foreground">Add and test a {kind} channel first.</span> : null}
      </div>
    </section>
  );
}

function L({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">{label}{hint ? <span className="font-normal"> · {hint}</span> : null}</span>{children}</label>;
}
