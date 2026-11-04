// Website: theme/branding, header & footer menus, domains.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTenant } from "@/core/tenant-context";
import { FONT_OPTIONS, type Branding } from "@/core/theme";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { MenuItem } from "@/lib/public.functions";

export const Route = createFileRoute("/_authenticated/admin/website")({ component: WebsitePage });

const rpc = async (fn: string, args: Record<string, unknown>) => { const { data, error } = await supabase.rpc(fn as never, args as never); if (error) throw new Error(error.message); return data; };

function WebsitePage() {
  const tenant = useTenant();
  const { can, isPlatformAdmin } = useAuth();
  const [tab, setTab] = useState<"theme" | "menus" | "domains">("theme");
  return (
    <div className="space-y-4">
      <header><h1 className="font-display text-2xl font-semibold">Website</h1><p className="text-sm text-muted-foreground">Theme colours and fonts, navigation menus, and the domains this site answers on. Pages are built under <Link to="/admin/pages" className="underline">Pages</Link>.</p></header>
      <div className="flex w-fit rounded-md border border-border p-0.5 text-xs">{(["theme", "menus", "domains"] as const).map((k) => <button key={k} type="button" className={`rounded px-3 py-1 capitalize ${tab === k ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setTab(k)}>{k}</button>)}</div>
      {tab === "theme" ? <ThemeTab org={tenant.organization_id} initial={(tenant.branding ?? {}) as Branding} canEdit={can("cms.settings.edit")} /> : null}
      {tab === "menus" ? <MenusTab org={tenant.organization_id} canEdit={can("cms.settings.edit")} /> : null}
      {tab === "domains" ? <DomainsTab org={tenant.organization_id} slug={tenant.slug} canEdit={can("org.settings.edit")} isPlatformAdmin={!!isPlatformAdmin} /> : null}
    </div>
  );
}

function ThemeTab({ org, initial, canEdit }: { org: string; initial: Branding; canEdit: boolean }) {
  const [b, setB] = useState<Branding>(initial);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try { await rpc("k1_set_branding", { p_org: org, p_branding: b }); toast.success("Saved — reload the site to see it"); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <fieldset disabled={!canEdit} className="grid max-w-2xl gap-3 rounded-lg border border-border bg-background p-4 text-sm sm:grid-cols-2">
      <L label="Primary colour"><div className="flex gap-2"><input type="color" value={b.primary ?? "#0f766e"} onChange={(e) => setB({ ...b, primary: e.target.value })} className="h-9 w-12 rounded border border-input" /><Input value={b.primary ?? ""} placeholder="#0f766e" onChange={(e) => setB({ ...b, primary: e.target.value })} /></div></L>
      <L label="Accent colour"><div className="flex gap-2"><input type="color" value={b.accent ?? "#d97706"} onChange={(e) => setB({ ...b, accent: e.target.value })} className="h-9 w-12 rounded border border-input" /><Input value={b.accent ?? ""} placeholder="#d97706" onChange={(e) => setB({ ...b, accent: e.target.value })} /></div></L>
      <L label="Heading font"><select className="h-9 w-full rounded-md border border-input bg-background px-2" value={b.font_display ?? ""} onChange={(e) => setB({ ...b, font_display: e.target.value })}><option value="">default (Sora)</option>{FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}</select></L>
      <L label="Body font"><select className="h-9 w-full rounded-md border border-input bg-background px-2" value={b.font_body ?? ""} onChange={(e) => setB({ ...b, font_body: e.target.value })}><option value="">default (Manrope)</option>{FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}</select></L>
      <L label="Corner radius (e.g. 0.5rem)"><Input value={b.radius ?? ""} placeholder="0.75rem" onChange={(e) => setB({ ...b, radius: e.target.value })} /></L>
      <div className="sm:col-span-2 flex items-center gap-3"><Button onClick={save} disabled={busy}>Save theme</Button><Button variant="ghost" onClick={() => setB({})}>Reset to defaults</Button><span className="text-xs text-muted-foreground">Logo, name and contact details are under Organization settings.</span></div>
      <div className="sm:col-span-2 rounded-md p-4 text-white" style={{ background: b.primary || "#0f766e" }}>Preview: primary <span className="ml-2 rounded px-2 py-0.5" style={{ background: b.accent || "#d97706" }}>accent</span></div>
    </fieldset>
  );
}

function MenusTab({ org, canEdit }: { org: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const menus = useQuery({ queryKey: ["cms_menus_admin", org], queryFn: async () => { const { data } = await supabase.from("cms_menus").select("location,items").eq("organization_id", org); return Object.fromEntries((data ?? []).map((m) => [m.location, (m.items as unknown as MenuItem[]) ?? []])) as Record<string, MenuItem[]>; } });
  const [header, setHeader] = useState<MenuItem[]>([]);
  const [footer, setFooter] = useState<MenuItem[]>([]);
  useEffect(() => { if (menus.data) { setHeader(menus.data["header"] ?? []); setFooter(menus.data["footer"] ?? []); } }, [menus.data]);
  async function save(location: "header" | "footer", items: MenuItem[]) {
    const clean = items.filter((i) => i.label.trim() && i.to.trim()).map((i) => ({ ...i, children: (i.children ?? []).filter((c) => c.label.trim() && c.to.trim()) }));
    const { error } = await supabase.from("cms_menus").upsert({ organization_id: org, location, items: clean } as never, { onConflict: "organization_id,location" });
    if (error) toast.error(error.message); else { toast.success("Menu saved"); qc.invalidateQueries({ queryKey: ["cms_menus_admin", org] }); qc.invalidateQueries({ queryKey: ["menus"] }); }
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <MenuEditor title="Header menu" hint="Empty = default navigation. Items with sub-items become the 'More' dropdown. Links: /about, /p/my-page, /news …" items={header} onChange={setHeader} onSave={() => save("header", header)} canEdit={canEdit} nested />
      <MenuEditor title="Footer links" hint="Shown as an extra column in the footer." items={footer} onChange={setFooter} onSave={() => save("footer", footer)} canEdit={canEdit} />
    </div>
  );
}

function MenuEditor({ title, hint, items, onChange, onSave, canEdit, nested }: { title: string; hint: string; items: MenuItem[]; onChange: (i: MenuItem[]) => void; onSave: () => void; canEdit: boolean; nested?: boolean }) {
  const upd = (i: number, p: Partial<MenuItem>) => onChange(items.map((it, j) => (j === i ? { ...it, ...p } : it)));
  const mv = (i: number, d: -1 | 1) => { const a = [...items]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j]!, a[i]!]; onChange(a); };
  return (
    <fieldset disabled={!canEdit} className="space-y-2 rounded-lg border border-border bg-background p-4 text-sm">
      <p className="font-medium">{title}</p><p className="text-xs text-muted-foreground">{hint}</p>
      {items.map((it, i) => (
        <div key={i} className="rounded border border-border p-2">
          <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-1">
            <Input placeholder="Label" value={it.label} onChange={(e) => upd(i, { label: e.target.value })} /><Input placeholder="लेबल (हिंदी)" value={it.label_hi ?? ""} onChange={(e) => upd(i, { label_hi: e.target.value })} /><Input placeholder="/link" value={it.to} onChange={(e) => upd(i, { to: e.target.value })} />
            <div className="flex"><Button size="sm" variant="ghost" onClick={() => mv(i, -1)}>▲</Button><Button size="sm" variant="ghost" onClick={() => mv(i, 1)}>▼</Button><Button size="sm" variant="ghost" onClick={() => onChange(items.filter((_, j) => j !== i))}>×</Button></div>
          </div>
          {nested ? (
            <div className="ml-4 mt-1 space-y-1">
              {(it.children ?? []).map((c, k) => (
                <div key={k} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-1"><Input placeholder="Sub label" value={c.label} onChange={(e) => upd(i, { children: it.children!.map((x, m) => (m === k ? { ...x, label: e.target.value } : x)) })} /><Input placeholder="हिंदी" value={c.label_hi ?? ""} onChange={(e) => upd(i, { children: it.children!.map((x, m) => (m === k ? { ...x, label_hi: e.target.value } : x)) })} /><Input placeholder="/link" value={c.to} onChange={(e) => upd(i, { children: it.children!.map((x, m) => (m === k ? { ...x, to: e.target.value } : x)) })} /><Button size="sm" variant="ghost" onClick={() => upd(i, { children: it.children!.filter((_, m) => m !== k) })}>×</Button></div>
              ))}
              <Button size="sm" variant="ghost" onClick={() => upd(i, { children: [...(it.children ?? []), { label: "", to: "" }] })}>+ sub-item</Button>
            </div>
          ) : null}
        </div>
      ))}
      <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => onChange([...items, { label: "", to: "" }])}>+ item</Button><Button size="sm" onClick={onSave}>Save</Button></div>
    </fieldset>
  );
}

type Domain = { id: string; hostname: string; kind: string; is_primary: boolean; verified_at: string | null; created_at: string };
function DomainsTab({ org, slug, canEdit, isPlatformAdmin }: { org: string; slug: string; canEdit: boolean; isPlatformAdmin: boolean }) {
  const qc = useQueryClient();
  const [host, setHost] = useState("");
  const domains = useQuery({ queryKey: ["org_domains", org], queryFn: async () => (await rpc("k1_org_domains", { p_org: org })) as Domain[] });
  const pending = useQuery({ queryKey: ["pending_domains"], enabled: isPlatformAdmin, queryFn: async () => (await rpc("k1_pending_domains", {})) as { id: string; hostname: string; org_name: string; created_at: string }[] });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["org_domains", org] }); qc.invalidateQueries({ queryKey: ["pending_domains"] }); };
  async function request() { try { await rpc("k1_request_domain", { p_org: org, p_hostname: host }); setHost(""); toast.success("Requested — point the DNS, then the platform admin verifies it"); refresh(); } catch (e) { toast.error((e as Error).message); } }
  async function verify(id: string, ok: boolean) { try { await rpc("k1_verify_domain", { p_id: id, p_verified: ok }); refresh(); } catch (e) { toast.error((e as Error).message); } }
  async function del(id: string) { if (!confirm("Remove this domain?")) return; try { await rpc("k1_delete_domain", { p_id: id }); refresh(); } catch (e) { toast.error((e as Error).message); } }
  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-lg border border-border bg-background p-4">
        <p className="font-medium">Addresses for this site</p>
        <p className="text-xs text-muted-foreground">Sub-domain: <code>{slug}.&lt;platform domain&gt;</code> (always works once the platform domain is set). Custom domains work after DNS points to the platform and the platform admin verifies them.</p>
        <ul className="mt-2 divide-y divide-border">
          {(domains.data ?? []).map((d) => <li key={d.id} className="flex items-center justify-between py-2"><span><code>{d.hostname}</code> <Badge variant="outline" className="ml-1">{d.kind}</Badge> {d.verified_at ? <Badge className="ml-1">verified</Badge> : <Badge variant="secondary" className="ml-1">pending DNS / verification</Badge>}</span><span className="flex gap-1">{isPlatformAdmin && !d.verified_at ? <Button size="sm" onClick={() => verify(d.id, true)}>Verify</Button> : null}{(isPlatformAdmin || !d.verified_at) && canEdit ? <Button size="sm" variant="ghost" onClick={() => del(d.id)}>Remove</Button> : null}</span></li>)}
          {domains.isSuccess && !domains.data.length ? <li className="py-2 text-muted-foreground">No domains yet.</li> : null}
        </ul>
        {canEdit ? <div className="mt-3 flex gap-2"><Input placeholder="www.yoursamaj.org" value={host} onChange={(e) => setHost(e.target.value)} className="w-72" /><Button onClick={request} disabled={!host.trim()}>Request custom domain</Button></div> : null}
        <div className="mt-3 rounded bg-secondary/50 p-3 text-xs">
          <p className="font-medium">DNS steps (give these to whoever manages the domain)</p>
          <ol className="ml-4 list-decimal space-y-1"><li>Open the domain's DNS settings (e.g. GoDaddy / Cloudflare / Hostinger).</li><li>Add a <b>CNAME</b> record: name = <code>www</code> (or the sub-domain you requested), target = the platform hostname given by the platform admin.</li><li>Wait up to an hour, then ask the platform admin to click Verify.</li></ol>
        </div>
      </div>
      {isPlatformAdmin ? (
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="font-medium">Platform admin · pending domain requests</p>
          <ul className="mt-2 divide-y divide-border">{(pending.data ?? []).map((d) => <li key={d.id} className="flex items-center justify-between py-2"><span><code>{d.hostname}</code> · {d.org_name} · <span className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString("en-IN")}</span></span><span className="flex gap-1"><Button size="sm" onClick={() => verify(d.id, true)}>Verify</Button><Button size="sm" variant="ghost" onClick={() => del(d.id)}>Remove</Button></span></li>)}{pending.isSuccess && !pending.data.length ? <li className="py-2 text-muted-foreground">None pending.</li> : null}</ul>
          <p className="mt-2 text-xs text-muted-foreground">Before verifying: add the hostname as a Custom Domain on the Cloudflare Worker (Workers &amp; Pages → kalchuri-one → Settings → Domains &amp; Routes), then confirm the CNAME resolves.</p>
        </div>
      ) : null}
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}
