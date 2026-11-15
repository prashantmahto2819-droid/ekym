import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { cleanDoc, STARTER_TEMPLATES } from "@/design-engine";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { CrudPage } from "@/components/admin/CrudPage";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { placeLine } from "@/lib/places";

export const Route = createFileRoute("/_authenticated/admin/members")({
  component: MembersPage,
});

type Membership = {
  id: string;
  member_no: string | null;
  full_name: string;
  full_name_hi: string | null;
  father_name: string | null;
  mobile: string;
  email: string | null;
  village: string | null;
  city: string | null;
  district: string | null;
  category: string;
  status: string;
  applied_at: string;
  admin_note: string | null;
};

const CATEGORIES = ["general", "life", "patron", "executive", "honorary"];

function MembersPage() {
  const tenant = useTenant();
  const { can } = useAuth();
  const qc = useQueryClient();
  const [deciding, setDeciding] = useState<Membership | null>(null);
  const [category, setCategory] = useState("general");
  const [note, setNote] = useState("");
  const [q, setQ] = useState("");

  const navigate = useNavigate();
  // मूल संस्था: for members with an account — is this organization their base, or which one is
  const bases = useQuery({
    queryKey: ["k1_member_bases", tenant.organization_id],
    queryFn: async () => { const { data } = await supabase.rpc("k1_member_bases" as never, { p_org: tenant.organization_id } as never); return new Map(((data ?? []) as unknown as { membership_id: string; is_base: boolean; base_org: string | null; other_orgs: number }[]).map((b) => [b.membership_id, b])); },
  });
  async function makeBaseHere(id: string) {
    if (!confirm("इस सदस्य की मूल संस्था यह संस्था बनाएँ? (उनकी दूसरी सदस्यताएँ बनी रहेंगी)")) return;
    const { error } = await supabase.rpc("k1_set_base_membership" as never, { p_id: id } as never);
    if (error) toast.error(error.message); else { toast.success("मूल संस्था बदल दी"); void bases.refetch(); }
  }
  /** Create an ID-card document for this member from the organization's id_card template (first one, else from the starter). */
  async function issueCard(m: Membership & { photo_path?: string | null; blood_group?: string | null; valid_to?: string | null; valid_from?: string | null }) {
    try {
      let { data: tpl } = await supabase.from("docs_templates").select("id").eq("organization_id", tenant.organization_id).eq("kind", "id_card").eq("status", "active").order("is_default", { ascending: false }).limit(1).maybeSingle();
      if (!tpl) {
        const starter = STARTER_TEMPLATES.find((s) => s.kind === "id_card")!;
        const design = starter.make({ name: tenant.name, name_hi: tenant.name_hi });
        const ins = await supabase.from("docs_templates").insert({ organization_id: tenant.organization_id, kind: "id_card", name: starter.name, name_hi: starter.name_hi, design: cleanDoc(design) as never } as never).select("id").single();
        if (ins.error) throw ins.error; tpl = ins.data as { id: string };
      }
      let photo = "";
      if (m.photo_path) { const { data: su } = await supabase.storage.from("documents").createSignedUrl(m.photo_path, 60 * 60 * 24 * 30); photo = su?.signedUrl ?? ""; }
      const fields = { member: { name: m.full_name, name_hi: m.full_name_hi ?? m.full_name, member_no: m.member_no ?? "", category: m.category, city: m.city ?? "", village: m.village ?? "", district: m.district ?? "", father_name: m.father_name ?? "", mobile: m.mobile, blood_group: m.blood_group ?? "", valid_from: m.valid_from ?? new Date().toISOString().slice(0, 10), valid_to: m.valid_to ?? "", photo } };
      const { data, error } = await supabase.from("docs_documents").insert({ organization_id: tenant.organization_id, kind: "id_card", title: "Membership card", template_id: (tpl as { id: string }).id, recipient: { name: m.full_name, phone: m.mobile }, fields, signatories: [{ name: "", designation: "" }] } as never).select("id").single();
      if (error) throw error;
      navigate({ to: "/admin/letters/$id", params: { id: (data as { id: string }).id } });
    } catch (e) { toast.error((e as Error).message); }
  }

  const applications = useQuery({
    queryKey: ["admin", "org_memberships", tenant.organization_id, "applied"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("org_memberships")
        .select("id,member_no,full_name,full_name_hi,father_name,mobile,email,village,city,district,category,status,applied_at,admin_note")
        .eq("organization_id", tenant.organization_id)
        .eq("status", "applied")
        .order("applied_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Membership[];
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const args: { p_id: string; p_approve: boolean; p_category?: string; p_note?: string } = { p_id: id, p_approve: approve };
      if (approve) args.p_category = category;
      if (note) args.p_note = note;
      const { data, error } = await supabase.rpc("k1_decide_membership", args);
      if (error) throw error;
      return data as unknown as Membership;
    },
    onSuccess: (m) => {
      toast.success(m.status === "active" ? `Approved · ${m.member_no}` : "Rejected");
      setDeciding(null);
      setNote("");
      qc.invalidateQueries({ queryKey: ["admin", "org_memberships"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!can("org.member.approve") && !can("org.member.card.issue")) {
    return <p className="text-sm text-muted-foreground">You need the membership permission to view this page.</p>;
  }

  const pending = (applications.data ?? []).filter((m) =>
    q ? `${m.full_name} ${m.mobile} ${m.village ?? ""} ${m.city ?? ""}`.toLowerCase().includes(q.toLowerCase()) : true,
  );

  return (
    <div className="space-y-10">
      {(tenant.child_count ?? 0) > 0 ? <NetworkMembers org={tenant.organization_id} /> : null}
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold">Membership applications</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              New applications from the Join page. Approval assigns the member number automatically; the first decision is final.
            </p>
          </div>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name / mobile / village" className="w-64" />
        </div>
        <div className="surface-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/70 text-left">
              <tr>
                <th className="px-4 py-3">Applicant</th>
                <th className="px-4 py-3">Father</th>
                <th className="px-4 py-3">Mobile</th>
                <th className="px-4 py-3">Place</th>
                <th className="px-4 py-3">Applied</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {pending.map((m) => (
                <tr key={m.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">
                    {m.full_name}
                    {m.full_name_hi ? <span className="block text-xs text-muted-foreground">{m.full_name_hi}</span> : null}
                  </td>
                  <td className="px-4 py-3">{m.father_name ?? "—"}</td>
                  <td className="px-4 py-3">{m.mobile}</td>
                  <td className="px-4 py-3">{placeLine([m.village, m.city, m.district], false) || "—"}</td>
                  <td className="px-4 py-3">{new Date(m.applied_at).toLocaleDateString("en-IN")}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" onClick={() => { setDeciding(m); setCategory(m.category); setNote(""); }}>
                      Decide
                    </Button>
                  </td>
                </tr>
              ))}
              {applications.isSuccess && pending.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No pending applications.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <CrudPage
        table="org_memberships"
        title="Members"
        extraActions={(r) => {
          const b = bases.data?.get(r.id);
          return (
            <>
              {r.status === "active" && b && !b.is_base && can("org.member.approve") ? <Button size="sm" variant="outline" onClick={() => void makeBaseHere(r.id)} title={b.base_org ? `अभी मूल संस्था: ${b.base_org}` : undefined}>⭐ मूल बनाएँ</Button> : null}
              {r.status === "active" && can("org.member.card.issue") ? <Button size="sm" variant="outline" onClick={() => void issueCard(r as Membership & { photo_path?: string | null; blood_group?: string | null; valid_to?: string | null; valid_from?: string | null })}>ID card</Button> : null}
            </>
          );
        }}
        description="All members of the organization. Add a member directly here; applications are approved above."
        orderBy="member_no"
        ascending
        defaults={{ status: "active", consent: true }}
        columns={[
          { key: "member_no", label: "No." },
          { key: "full_name", label: "Name" },
          { key: "mobile", label: "Mobile" },
          { key: "village", label: "Village / City", render: (r) => r.village || r.city || "—" },
          { key: "district", label: "District" },
          { key: "category", label: "Category" },
          { key: "status", label: "Status" },
          { key: "is_base", label: "मूल संस्था", render: (r) => { const b = bases.data?.get(r.id); return !b ? "—" : b.is_base ? (b.other_orgs ? `⭐ यही (+${b.other_orgs} और)` : "⭐ यही") : (b.base_org ?? "—"); } },
        ]}
        fields={[
          { key: "full_name", label: "Full name (English)", required: true },
          { key: "full_name_hi", label: "पूरा नाम (हिंदी)" },
          { key: "father_name", label: "Father's name" },
          { key: "mobile", label: "Mobile", required: true },
          { key: "email", label: "Email" },
          { key: "gender", label: "Gender", type: "select", options: ["male", "female", "other"] },
          { key: "dob", label: "Date of birth", type: "date" },
          { key: "village", label: "Village" },
          { key: "city", label: "City" },
          { key: "district", label: "District" },
          { key: "state", label: "State" },
          { key: "occupation", label: "Occupation" },
          { key: "blood_group", label: "Blood group" },
          { key: "family_id", label: "परिवार (वंश वृक्ष)", type: "select", fk: { table: "families", label: "family_name" }, hint: "वंश वृक्ष में दर्ज परिवार से जोड़ें" },
          { key: "family_head_name", label: "परिवार के मुखिया का नाम", hint: "यदि वंश वृक्ष में अभी नहीं" },
          { key: "native_place", label: "मूल ग्राम" },
          { key: "category", label: "Category", type: "select", options: CATEGORIES },
          { key: "status", label: "Status", type: "select", options: ["active", "applied", "lapsed", "expelled", "rejected"] },
          { key: "member_no", label: "Member no.", hint: "Leave empty to assign automatically on approval", only: "edit" },
          { key: "valid_to", label: "Valid till", type: "date" },
          { key: "address", label: "Address", type: "textarea", full: true },
          { key: "admin_note", label: "Admin note", type: "textarea", full: true },
        ]}
      />

      <Dialog open={!!deciding} onOpenChange={(v) => !v && setDeciding(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{deciding?.full_name}</DialogTitle>
          </DialogHeader>
          {deciding ? (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                {deciding.father_name ? `S/o ${deciding.father_name} · ` : ""}
                {deciding.mobile}
                {deciding.email ? ` · ${deciding.email}` : ""}
                <br />
                {placeLine([deciding.village, deciding.city, deciding.district], false)}
              </p>
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Membership category</span>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 capitalize">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Note (optional)</span>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
              </label>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" disabled={decide.isPending} onClick={() => deciding && decide.mutate({ id: deciding.id, approve: false })}>
              Reject
            </Button>
            <Button disabled={decide.isPending} onClick={() => deciding && decide.mutate({ id: deciding.id, approve: true })}>
              Approve &amp; assign number
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type NetRow = { id: string; organization_id: string; org_name: string; org_slug: string; member_no: string | null; full_name: string; mobile: string; village: string | null; city: string | null; status: string; category: string; family_id: string | null; applied_at: string };
/** Umbrella admins: every member of every organization on the platform; approve or move to another organization. */
function NetworkMembers({ org }: { org: string }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const rows = useQuery({ queryKey: ["k1_network_members", org, q], queryFn: async () => { const { data, error } = await supabase.rpc("k1_network_members", { p_org: org, p_q: q || null, p_limit: 500 } as never); if (error) throw new Error(error.message); return (data ?? []) as unknown as NetRow[]; } });
  const orgs = useQuery({ queryKey: ["contact_targets", org], queryFn: async () => { const { data } = await supabase.rpc("k1_contact_targets", { p_org: org } as never); return (data ?? []) as unknown as { id: string; name: string }[]; } });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["k1_network_members"] }); qc.invalidateQueries({ queryKey: ["admin", "org_memberships"] }); };
  async function move(r: NetRow, to: string) { if (!to || to === r.organization_id) return; const { error } = await supabase.rpc("k1_membership_move", { p_id: r.id, p_org: to } as never); if (error) toast.error(error.message); else { toast.success("Moved"); refresh(); } }
  async function approve(r: NetRow) { const { error } = await supabase.rpc("k1_decide_membership", { p_id: r.id, p_approve: true, p_category: r.category } as never); if (error) toast.error(error.message); else { toast.success("Approved"); refresh(); } }
  const list = rows.data ?? [];
  const byStatus = (st: string) => list.filter((r) => r.status === st).length;
  return (
    <section className="rounded-lg border border-border bg-background p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><h2 className="font-display text-xl font-semibold">All organizations — members</h2><p className="text-sm text-muted-foreground">Who registered where. Applications are approved by that organization's admin or by you here; a member can be moved to another organization (e.g. registered under Kalchuri One before their samiti existed). {byStatus("applied")} applied · {byStatus("active")} active</p></div>
        <Input className="w-56" placeholder="Search name / mobile / organization" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-secondary/60 text-xs uppercase text-muted-foreground"><tr><th className="p-2">Member</th><th className="p-2">Mobile</th><th className="p-2">Place</th><th className="p-2">Organization</th><th className="p-2">Status</th><th className="p-2">Applied</th><th className="p-2">Move to</th><th className="p-2"></th></tr></thead>
        <tbody>{list.map((r) => <tr key={r.id} className={`border-t border-border ${r.status === "applied" ? "bg-amber-50/60 dark:bg-amber-950/20" : ""}`}>
          <td className="p-2"><b>{r.full_name}</b>{r.member_no ? <span className="ml-1 text-xs text-muted-foreground">#{r.member_no}</span> : null}</td>
          <td className="p-2 text-xs">{r.mobile}</td><td className="p-2 text-xs">{r.village || r.city || "—"}</td>
          <td className="p-2 text-xs">{r.org_name}</td><td className="p-2 text-xs">{r.status}</td><td className="p-2 text-xs">{new Date(r.applied_at).toLocaleDateString("en-IN")}</td>
          <td className="p-2"><select className="h-8 rounded-md border border-input bg-background px-1 text-xs" value={r.organization_id} onChange={(e) => void move(r, e.target.value)}>{(orgs.data ?? []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></td>
          <td className="p-2">{r.status === "applied" ? <Button size="sm" onClick={() => approve(r)}>Approve</Button> : null}</td>
        </tr>)}{rows.isSuccess && !list.length ? <tr><td className="p-3 text-muted-foreground" colSpan={8}>None.</td></tr> : null}</tbody></table></div>
    </section>
  );
}
