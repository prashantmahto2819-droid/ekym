import { createFileRoute } from "@tanstack/react-router";
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
      const { data, error } = await supabase.rpc("k1_decide_membership", {
        p_id: id,
        p_approve: approve,
        p_category: approve ? category : null,
        p_note: note || null,
      });
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
                  <td className="px-4 py-3">{[m.village, m.city, m.district].filter(Boolean).join(", ") || "—"}</td>
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
        description="All members of the organization. Add a member directly here; applications are approved above."
        orderBy="member_no"
        ascending
        defaults={{ status: "active", consent: true }}
        columns={[
          { key: "member_no", label: "No." },
          { key: "full_name", label: "Name" },
          { key: "mobile", label: "Mobile" },
          { key: "village", label: "Village / City", render: (r) => r.village || r.city || "—" },
          { key: "category", label: "Category" },
          { key: "status", label: "Status" },
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
                {[deciding.village, deciding.city, deciding.district].filter(Boolean).join(", ")}
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
