// Community admin: listings moderation, matrimony verification, polls, contributors & testimonials.
import { createFileRoute } from "@tanstack/react-router";
import { T, txNow } from "@/components/admin/T";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CrudPage } from "@/components/admin/CrudPage";
import { BizAdmin } from "@/components/business/BizAdmin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { KIND_LABEL, type Listing } from "@/lib/community";

export const Route = createFileRoute("/_authenticated/admin/community")({ component: CommunityAdmin });

const rpc = async (fn: string, args: Record<string, unknown>) => { const { data, error } = await supabase.rpc(fn as never, args as never); if (error) throw new Error(error.message); return data; };

function CommunityAdmin() {
  const tenant = useTenant();
  const org = tenant.organization_id;
  const { can } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"feed" | "business" | "listings" | "matrimony" | "polls" | "people">("feed");
  const [status, setStatus] = useState("pending");
  const listings = useQuery({ queryKey: ["cm_listings_admin", org, status], queryFn: async () => { let q = supabase.from("cm_listings").select("*").eq("organization_id", org).order("created_at", { ascending: false }).limit(300); if (status) q = q.eq("status", status); const { data } = await q; return (data ?? []) as unknown as Listing[]; } });
  const profiles = useQuery({ queryKey: ["cm_matri_admin", org], enabled: tab === "matrimony", queryFn: async () => { const { data } = await supabase.from("cm_matrimony_profiles").select("id,display_name,gender,birth_year,city,education,profession,created_for,verified_at,status,created_at").eq("organization_id", org).order("created_at", { ascending: false }); return (data ?? []) as { id: string; display_name: string; gender: string; birth_year: number; city: string | null; education: string | null; profession: string | null; created_for: string; verified_at: string | null; status: string; created_at: string }[]; } });

  async function decide(l: Listing, st: "approved" | "rejected" | "expired") {
    const note = st === "rejected" ? prompt("Reason (sent to the submitter)") : null; if (st === "rejected" && !note) return;
    try { await rpc("k1_listing_decide", { p_id: l.id, p_status: st, p_note: note }); qc.invalidateQueries({ queryKey: ["cm_listings_admin", org] }); } catch (e) { toast.error((e as Error).message); }
  }
  async function verify(id: string, ok: boolean) { try { await rpc("k1_matrimony_verify", { p_id: id, p_verified: ok }); qc.invalidateQueries({ queryKey: ["cm_matri_admin", org] }); } catch (e) { toast.error((e as Error).message); } }

  return (
    <div className="space-y-4">
      <header><h1 className="font-display text-2xl font-semibold"><T>Community</T></h1><p className="text-sm text-muted-foreground">Directory listings (business, professionals, jobs, scholarships, emergency help), matrimony verification and polls.</p></header>
      <div className="flex w-fit rounded-md border border-border p-0.5 text-xs">{([["feed", "Kalchuri One feed"], ["business", "व्यापार पैकेज"], ["listings", "Listings"], ["matrimony", "Matrimony"], ["polls", "Polls"], ["people", "Contributors & testimonials"]] as const).map(([k, l]) => <button key={k} type="button" className={`rounded px-3 py-1 ${tab === k ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setTab(k)}>{l}</button>)}</div>

      {tab === "feed" ? <FeedModeration org={org} /> : null}
      {tab === "business" ? <BizAdmin org={org} /> : null}

      {tab === "listings" ? (
        <div className="space-y-2">
          <div className="flex gap-2 text-xs">{["pending", "approved", "rejected", "expired", ""].map((s) => <button key={s} type="button" className={`rounded-full border px-3 py-1 ${status === s ? "border-primary bg-primary/10" : "border-border"}`} onClick={() => setStatus(s)}>{s || "all"}</button>)}</div>
          {(listings.data ?? []).map((l) => (
            <div key={l.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border bg-background p-3 text-sm">
              <div className="min-w-0 flex-1">
                <p><Badge variant="outline">{KIND_LABEL[l.kind].en}</Badge> <b className="ml-1">{l.title}</b> {l.category ? <span className="text-xs text-muted-foreground">· {l.category}</span> : null} <Badge variant={l.status === "approved" ? "default" : l.status === "pending" ? "secondary" : "destructive"} className="ml-1">{l.status}</Badge></p>
                <p className="mt-1 line-clamp-2 text-muted-foreground">{l.body}</p>
                <p className="text-xs text-muted-foreground">{[l.contact_name, l.phone, l.city, l.expires_at ? `expires ${l.expires_at}` : null].filter(Boolean).join(" · ")}</p>
              </div>
              {can("community.listing.moderate") ? <div className="flex gap-1">{l.status !== "approved" ? <Button size="sm" onClick={() => decide(l, "approved")}><T>Approve</T></Button> : null}{l.status !== "rejected" ? <Button size="sm" variant="outline" onClick={() => decide(l, "rejected")}><T>Reject</T></Button> : null}{l.status === "approved" ? <Button size="sm" variant="ghost" onClick={() => decide(l, "expired")}><T>Expire</T></Button> : null}</div> : null}
            </div>
          ))}
          {listings.isSuccess && !listings.data.length ? <p className="text-sm text-muted-foreground"><T>Nothing here.</T></p> : null}
        </div>
      ) : null}

      {tab === "matrimony" ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Verify after a phone call / document check. Only verified, active profiles are visible to members; phone numbers are revealed only when both sides accept an interest.</p>
          {(profiles.data ?? []).map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background p-3 text-sm">
              <span><b>{p.display_name}</b> · {p.gender} · {new Date().getFullYear() - p.birth_year} yrs · {p.city ?? ""} · {p.education ?? ""} {p.profession ? `· ${p.profession}` : ""} <span className="text-xs text-muted-foreground">({p.created_for})</span> {p.verified_at ? <Badge className="ml-1">verified</Badge> : <Badge variant="secondary" className="ml-1">unverified</Badge>} <Badge variant="outline" className="ml-1">{p.status}</Badge></span>
              {can("community.matrimony.manage") ? <Button size="sm" variant={p.verified_at ? "ghost" : "default"} onClick={() => verify(p.id, !p.verified_at)}>{p.verified_at ? "Un-verify" : "Verify"}</Button> : null}
            </div>
          ))}
          {profiles.isSuccess && !profiles.data.length ? <p className="text-sm text-muted-foreground"><T>No profiles yet.</T></p> : null}
        </div>
      ) : null}

      {tab === "polls" ? <PollsAdmin org={org} /> : null}

      {tab === "people" ? (
        <div className="space-y-8">
          <CrudPage table="contributors" title="Contributors" description="Donors, partners and well-wishers recognised on the site." defaults={{ active: true, display_publicly: true }}
            columns={[{ key: "name", label: "Name" }, { key: "organization", label: "Organization" }, { key: "contribution_type", label: "Type" }, { key: "active", label: "Active", render: (r) => <T>{r.active ? "Yes" : "No"}</T> }]}
            fields={[{ key: "name", label: "Name", required: true, full: true }, { key: "organization", label: "Organization" }, { key: "contribution_type", label: "Contribution type" }, { key: "photo", label: "Photo URL", type: "url", full: true }, { key: "description", label: "Description", type: "textarea", full: true }, { key: "recognition_message", label: "Recognition message", type: "textarea", full: true }, { key: "location", label: "Location" }, { key: "contribution_date", label: "Contribution date", type: "date" }, { key: "display_publicly", label: "Show publicly", type: "checkbox" }, { key: "active", label: "Active", type: "checkbox" }]} />
          <CrudPage table="testimonials" title="Testimonials" description="Only approved and active testimonials appear publicly." orderBy="display_order" ascending defaults={{ active: true, approved: true }}
            columns={[{ key: "name", label: "Name" }, { key: "city", label: "City" }, { key: "approved", label: "Approved", render: (r) => <T>{r.approved ? "Yes" : "No"}</T> }, { key: "active", label: "Active", render: (r) => <T>{r.active ? "Yes" : "No"}</T> }]}
            fields={[{ key: "name", label: "Name", required: true }, { key: "role", label: "Role" }, { key: "city", label: "City" }, { key: "photo", label: "Photo URL", type: "url" }, { key: "message", label: "Message", type: "textarea", full: true, required: true }, { key: "display_order", label: "Display order", type: "number" }, { key: "approved", label: "Approved", type: "checkbox" }, { key: "active", label: "Active", type: "checkbox" }]} />
        </div>
      ) : null}
    </div>
  );
}

function PollsAdmin({ org }: { org: string }) {
  const qc = useQueryClient();
  const [opts, setOpts] = useState("");
  const polls = useQuery({ queryKey: ["cm_polls_admin", org], queryFn: async () => { const { data } = await supabase.from("cm_polls").select("*").eq("organization_id", org).order("created_at", { ascending: false }); return (data ?? []) as unknown as { id: string; question: string; status: string; audience: string; options: { key: string; label: string }[]; ends_at: string | null }[]; } });
  const results = useQuery({ queryKey: ["cm_poll_results_all", polls.data?.map((p) => p.id).join(",")], enabled: !!polls.data?.length, queryFn: async () => { const out: Record<string, { total: number; counts?: Record<string, number> }> = {}; for (const p of polls.data!) out[p.id] = (await rpc("k1_poll_results", { p_poll: p.id })) as { total: number; counts?: Record<string, number> }; return out; } });
  async function close(id: string) { if (!confirm("Close this poll? Voting stops and results become visible.")) return; try { await rpc("k1_poll_close", { p_poll: id }); qc.invalidateQueries({ queryKey: ["cm_polls_admin", org] }); } catch (e) { toast.error((e as Error).message); } }
  return (
    <div className="space-y-4">
      <CrudPage table="cm_polls" title="Polls" description="Members vote once each. Options: one per line in the box below (first word before | is English, after | Hindi), e.g. 'Yes|हाँ'." orderBy="created_at" createdBy
        defaults={{ status: "open" }}
        toolbar={<label className="block text-sm"><span className="mb-1 block text-xs text-muted-foreground">Options for the NEXT poll you create (one per line, English|हिंदी)</span><textarea className="w-full rounded-md border border-input bg-background p-2 text-sm" rows={3} value={opts} onChange={(e) => setOpts(e.target.value)} placeholder={"Yes|हाँ\nNo|नहीं"} /></label>}
        columns={[{ key: "question", label: "Question" }, { key: "audience", label: "Audience" }, { key: "status", label: "Status" }, { key: "votes", label: "Votes / results", render: (r) => { const res = results.data?.[r.id]; return res ? <span className="text-xs">{res.total} votes{res.counts ? " · " + Object.entries(res.counts).map(([k, n]) => `${(r.options as { key: string; label: string }[]).find((o) => o.key === k)?.label ?? k}: ${n}`).join(", ") : ""}</span> : null; } }]}
        fields={[{ key: "question", label: "Question (English)", required: true, full: true }, { key: "question_hi", label: "प्रश्न (हिंदी)", full: true }, { key: "description", label: "Description", type: "textarea", full: true }, { key: "audience", label: "Who can vote", type: "select", options: ["members", "team", "public"] }, { key: "status", label: "Status", type: "select", options: ["open", "draft", "closed"] }, { key: "ends_at", label: "Ends at", type: "datetime" }, { key: "anonymous", label: "Anonymous (hide who voted)", type: "checkbox" }, { key: "open_results", label: "Show results while open", type: "checkbox" }, { key: "multi", label: "Allow multiple choices", type: "checkbox" }]}
        extraActions={(r) => r.status === "open" ? <Button size="sm" variant="outline" onClick={() => close(r.id)}><T>Close</T></Button> : null}
      />
      <OptionsApplier org={org} opts={opts} onApplied={() => { setOpts(""); qc.invalidateQueries({ queryKey: ["admin", "cm_polls"] }); qc.invalidateQueries({ queryKey: ["cm_polls_admin", org] }); }} />
    </div>
  );
}

/** CrudPage cannot edit jsonb arrays, so options typed above are applied to the newest poll without options. */
function OptionsApplier({ org, opts, onApplied }: { org: string; opts: string; onApplied: () => void }) {
  const [busy, setBusy] = useState(false);
  async function apply() {
    const lines = opts.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) { toast.error(txNow("Enter at least two options")); return; }
    setBusy(true);
    try {
      const { data } = await supabase.from("cm_polls").select("id,question,options").eq("organization_id", org).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!data) throw new Error("Create the poll first (New), then apply options");
      const options = lines.map((l, i) => { const [en, hi] = l.split("|").map((x) => x.trim()); return { key: `o${i + 1}`, label: en, label_hi: hi || en }; });
      const { error } = await supabase.from("cm_polls").update({ options } as never).eq("id", data.id); if (error) throw error;
      toast.success(`Options applied to "${(data as { question: string }).question}"`); onApplied();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  if (!opts.trim()) return null;
  return <Button size="sm" onClick={apply} disabled={busy}><T>Apply these options to the newest poll</T></Button>;
}

type Report = { id: string; post_id: string | null; comment_id: string | null; reason: string; status: string; created_at: string };
function FeedModeration({ org }: { org: string }) {
  const qc = useQueryClient();
  const reports = useQuery({ queryKey: ["cm_reports", org], queryFn: async () => { const { data } = await supabase.from("cm_post_reports").select("*").eq("organization_id", org).eq("status", "open").order("created_at", { ascending: false }); return (data ?? []) as Report[]; } });
  const hidden = useQuery({ queryKey: ["cm_hidden", org], queryFn: async () => { const { data } = await supabase.from("cm_posts").select("id,body,status,created_at,link_url").eq("organization_id", org).in("status", ["hidden"]).order("created_at", { ascending: false }); return (data ?? []) as { id: string; body: string | null; status: string; created_at: string; link_url: string | null }[]; } });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["cm_reports", org] }); qc.invalidateQueries({ queryKey: ["cm_hidden", org] }); };
  async function act(postId: string | null, status: string | null, reportId?: string, dismiss?: boolean) {
    try {
      if (dismiss && reportId) { await supabase.from("cm_post_reports").update({ status: "dismissed" } as never).eq("id", reportId); }
      else if (postId && status) await rpc("k1_post_moderate", { p_post: postId, p_status: status, p_pinned: null });
      refresh();
    } catch (e) { toast.error((e as Error).message); }
  }
  return (
    <div className="space-y-4 text-sm">
      <p className="text-xs text-muted-foreground">Members post on <a href="/community" className="underline" target="_blank" rel="noreferrer">/community</a>. Every post is screened for advertising / promotion (keywords instantly, AI on text + images when configured): flagged posts get limited reach (only the author and moderators see them) and you get a WhatsApp alert. Paid sponsors appear on <a href="/sponsored" className="underline" target="_blank" rel="noreferrer">/sponsored</a> (Admin → Ads & revenue). Reports land here; hide removes a post from the feed (restorable), remove deletes it from view permanently.</p>
      <Flagged org={org} />
      <div className="rounded-lg border border-border bg-background p-3"><p className="font-medium">Open reports ({reports.data?.length ?? 0})</p>
        <ul className="mt-2 divide-y divide-border">{(reports.data ?? []).map((r) => <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span>{r.reason} <span className="text-xs text-muted-foreground">· {new Date(r.created_at).toLocaleString("en-IN")}</span> {r.post_id ? <a className="ml-1 underline" href={`/community/${r.post_id}`} target="_blank" rel="noreferrer">view post</a> : null}</span><span className="flex gap-1">{r.post_id ? <><Button size="sm" variant="outline" onClick={() => act(r.post_id, "hidden")}><T>Hide post</T></Button><Button size="sm" variant="ghost" className="text-destructive" onClick={() => act(r.post_id, "removed")}><T>Remove</T></Button></> : null}<Button size="sm" variant="ghost" onClick={() => act(null, null, r.id, true)}><T>Dismiss</T></Button></span></li>)}{reports.isSuccess && !reports.data.length ? <li className="py-2 text-muted-foreground"><T>None.</T></li> : null}</ul></div>
      <ModerationSettings org={org} />
      <div className="rounded-lg border border-border bg-background p-3"><p className="font-medium"><T>Hidden posts</T></p>
        <ul className="mt-2 divide-y divide-border">{(hidden.data ?? []).map((p) => <li key={p.id} className="flex items-center justify-between gap-2 py-2"><span className="line-clamp-1">{p.body ?? p.link_url ?? "(photo)"} <span className="text-xs text-muted-foreground">· {new Date(p.created_at).toLocaleDateString("en-IN")}</span></span><span className="flex gap-1"><Button size="sm" variant="outline" onClick={() => act(p.id, "active")}><T>Restore</T></Button><Button size="sm" variant="ghost" className="text-destructive" onClick={() => act(p.id, "removed")}><T>Remove</T></Button></span></li>)}{hidden.isSuccess && !hidden.data.length ? <li className="py-2 text-muted-foreground"><T>None.</T></li> : null}</ul></div>
    </div>
  );
}

type Flag = { id: string; author_name: string; body: string | null; link_url: string | null; media: { path: string }[]; moderation: { reason?: string; political?: { score: number; hits: string[] }; heuristic?: { score: number; hits: string[] }; ai?: { promotional: boolean; confidence: number; category: string; reason: string; model: string }; appeal?: { at: string; note: string } }; moderation_status: string; reach: string; created_at: string };
function Flagged({ org }: { org: string }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["cm_flagged", org], queryFn: async () => (await rpc("k1_cm_flagged", { p_org: org })) as Flag[] });
  async function review(id: string, action: "allow" | "limit" | "remove") {
    if (action === "remove" && !confirm("Remove this post?")) return;
    try { await rpc("k1_cm_review", { p_post: id, p_action: action }); qc.invalidateQueries({ queryKey: ["cm_flagged", org] }); qc.invalidateQueries({ queryKey: ["feed"] }); } catch (e) { toast.error((e as Error).message); }
  }
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50/40 p-3 dark:bg-amber-950/20"><p className="font-medium">Held / limited posts — promotional & political ({q.data?.length ?? 0})</p><p className="text-xs text-muted-foreground">🗳️ Political posts are held automatically (keywords + AI) and need your approval; "Allow" shows them to everyone, "Remove" takes them down.</p>
      <ul className="mt-2 divide-y divide-border">{(q.data ?? []).map((p) => {
        const ai = p.moderation?.ai, h = p.moderation?.heuristic;
        return <li key={p.id} className="flex flex-wrap items-start justify-between gap-2 py-2">
          <div className="min-w-0 flex-1">
            <p>{p.moderation?.reason === "political" ? <span className="mr-1 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-800 dark:text-rose-200">🗳️ POLITICAL — approval needed</span> : null}<b>{p.author_name}</b> <span className="text-xs text-muted-foreground">· {new Date(p.created_at).toLocaleString("en-IN")}</span> <a className="ml-1 text-xs underline" href={`/community/${p.id}`} target="_blank" rel="noreferrer">view</a></p>
            <p className="line-clamp-2">{p.body ?? p.link_url ?? "(photo)"}</p>
            {p.media?.length ? <div className="mt-1 flex gap-1">{p.media.slice(0, 4).map((m, i) => <img key={i} src={supabase.storage.from("community").getPublicUrl(m.path).data.publicUrl} alt="" className="h-12 w-12 rounded object-cover" />)}</div> : null}
            {p.moderation?.appeal ? <p className="mt-1 rounded bg-amber-100 px-2 py-1 text-xs">🙋 {new Date(p.moderation.appeal.at).toLocaleString("en-IN")} — author asks for review{p.moderation.appeal.note ? `: ${p.moderation.appeal.note}` : ""}</p> : null}
            <p className="text-xs text-muted-foreground">{ai?.reason ? `AI (${ai.category}, ${Math.round(ai.confidence * 100)}%): ${ai.reason}` : ai?.model ? `AI: ${ai.model}` : "AI: pending"}{p.moderation?.political?.hits?.length ? ` · political words: ${p.moderation.political.hits.join(", ")}` : ""}{h?.hits?.length ? ` · keywords: ${h.hits.join(", ")} (score ${h.score})` : ""}</p>
          </div>
          <span className="flex gap-1"><Button size="sm" onClick={() => review(p.id, "allow")}><T>Allow (full reach)</T></Button><Button size="sm" variant="ghost" className="text-destructive" onClick={() => review(p.id, "remove")}><T>Remove</T></Button></span>
        </li>; })}{q.isSuccess && !q.data.length ? <li className="py-2 text-muted-foreground"><T>None.</T></li> : null}</ul>
    </div>
  );
}

type CmSettings = { organization_id: string; auto_limit: boolean; threshold: number; ai_min_confidence: number; keywords: string[]; notify_moderators: boolean; political_hold?: boolean; occasion_posts?: boolean; occasion_greetings?: boolean };
function ModerationSettings({ org }: { org: string }) {
  const q = useQuery({ queryKey: ["cm_settings", org], queryFn: async () => { const { data } = await supabase.from("cm_settings").select("*").eq("organization_id", org).maybeSingle(); return (data as unknown as CmSettings | null) ?? null; } });
  const [s, setS] = useState<CmSettings | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { if (q.isSuccess && !s) setS(q.data ?? { organization_id: org, auto_limit: true, threshold: 3, ai_min_confidence: 0.6, keywords: [], notify_moderators: true }); }, [q.isSuccess, q.data, s, org]);
  async function save() { if (!s) return; const { error } = await supabase.from("cm_settings").upsert(s as never, { onConflict: "organization_id" }); if (error) toast.error(error.message); else toast.success(txNow("Saved")); }
  if (!s) return null;
  return (
    <details open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)} className="rounded-lg border border-border bg-background p-3"><summary className="cursor-pointer font-medium"><T>Promotion filter settings</T></summary>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="flex items-center gap-2"><input type="checkbox" checked={s.auto_limit} onChange={(e) => setS({ ...s, auto_limit: e.target.checked })} /> Limit reach automatically (off = only flag for review)</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={s.notify_moderators} onChange={(e) => setS({ ...s, notify_moderators: e.target.checked })} /> WhatsApp alert to moderators</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={s.political_hold ?? true} onChange={(e) => setS({ ...s, political_hold: e.target.checked })} /> 🗳️ Hold political posts for approval (limited reach until an admin allows)</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={s.occasion_posts ?? true} onChange={(e) => setS({ ...s, occasion_posts: e.target.checked })} /> 🎂 Post birthdays / anniversaries on the wall as the organization</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={s.occasion_greetings ?? true} onChange={(e) => setS({ ...s, occasion_greetings: e.target.checked })} /> 💐 Send birthday / anniversary greetings (WhatsApp / email)</label>
        <label className="block"><span className="text-xs text-muted-foreground"><T>Keyword score to flag (phone number = 2, % off = 2, each keyword = 1)</T></span><Input type="number" value={s.threshold} onChange={(e) => setS({ ...s, threshold: Number(e.target.value) })} /></label>
        <label className="block"><span className="text-xs text-muted-foreground"><T>AI confidence needed (0–1)</T></span><Input type="number" step="0.05" min="0" max="1" value={s.ai_min_confidence} onChange={(e) => setS({ ...s, ai_min_confidence: Number(e.target.value) })} /></label>
        <label className="block sm:col-span-2"><span className="text-xs text-muted-foreground"><T>Keywords (comma separated; empty = built-in Hindi + English list)</T></span><Textarea rows={3} value={s.keywords.join(", ")} onChange={(e) => setS({ ...s, keywords: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /></label>
        <div className="sm:col-span-2"><Button size="sm" onClick={save}><T>Save</T></Button> <span className="ml-2 text-xs text-muted-foreground">Image + text AI needs the secret GEMINI_API_KEY on the cm-moderate function (Supabase → Edge Functions → Secrets).</span></div>
      </div>
    </details>
  );
}
