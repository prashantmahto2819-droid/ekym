import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersPage,
});

type TeamRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  mobile: string | null;
  role_key: string;
  role_name: string;
  role_id: string;
  assignment_id: string;
};
type RoleRow = { role_id: string; key: string; name: string; name_hi: string | null; permissions: string[]; is_system: boolean };

function UsersPage() {
  const tenant = useTenant();
  const { can, user } = useAuth();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState<string>("");
  const canManage = can("org.roles.manage");

  const team = useQuery({
    queryKey: ["org-team", tenant.organization_id],
    enabled: canManage,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("k1_org_team", { p_org: tenant.organization_id });
      if (error) throw error;
      return (data ?? []) as TeamRow[];
    },
  });
  const roles = useQuery({
    queryKey: ["org-roles", tenant.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("k1_org_roles", { p_org: tenant.organization_id });
      if (error) throw error;
      return (data ?? []) as RoleRow[];
    },
  });

  const assign = useMutation({
    mutationFn: async () => {
      if (!roleId) throw new Error("Choose a role");
      const { error } = await supabase.rpc("k1_assign_role", { p_org: tenant.organization_id, p_email: email, p_role_id: roleId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role assigned");
      setEmail("");
      qc.invalidateQueries({ queryKey: ["org-team"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase.rpc("k1_remove_role", { p_assignment: assignmentId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role removed");
      qc.invalidateQueries({ queryKey: ["org-team"] });
      qc.invalidateQueries({ queryKey: ["my-orgs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!canManage) {
    return <p className="text-sm text-muted-foreground">Only organization admins can manage the team.</p>;
  }

  const byUser = new Map<string, TeamRow[]>();
  for (const r of team.data ?? []) byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Team &amp; roles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          People with a role in {tenant.name}. Roles decide what each person can do; the server checks them on every
          request. A person must sign up on the website first, then you can give them a role by email.
        </p>
      </div>

      <div className="surface-card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="text-xs font-medium text-muted-foreground">Email of an existing account</label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
        </div>
        <div className="w-full sm:w-64">
          <label className="text-xs font-medium text-muted-foreground">Role</label>
          <Select value={roleId} onValueChange={setRoleId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a role" />
            </SelectTrigger>
            <SelectContent>
              {(roles.data ?? []).map((r) => (
                <SelectItem key={r.role_id} value={r.role_id}>
                  {r.name}
                  {r.name_hi ? ` · ${r.name_hi}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => assign.mutate()} disabled={assign.isPending || !email || !roleId}>
          Assign
        </Button>
      </div>

      <div className="surface-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Person</th>
              <th className="px-4 py-2">Contact</th>
              <th className="px-4 py-2">Roles</th>
            </tr>
          </thead>
          <tbody>
            {[...byUser.entries()].map(([uid, rows]) => (
              <tr key={uid} className="border-t border-border">
                <td className="px-4 py-2 font-medium">
                  {rows[0]?.full_name || "—"}
                  {uid === user?.id ? <span className="ml-1 text-xs text-muted-foreground">(you)</span> : null}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {rows[0]?.email}
                  {rows[0]?.mobile ? ` · ${rows[0].mobile}` : ""}
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    {rows.map((r) => (
                      <Badge key={r.assignment_id} variant="secondary" className="gap-1">
                        {r.role_name}
                        <button
                          type="button"
                          aria-label={`Remove ${r.role_name}`}
                          className="rounded-full hover:bg-foreground/10"
                          onClick={() => remove.mutate(r.assignment_id)}
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {team.isSuccess && byUser.size === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                  No team members yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
