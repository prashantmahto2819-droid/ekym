import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersAdmin,
});

const ASSIGNABLE: AppRole[] = [
  "ADMIN",
  "CONTENT_MANAGER",
  "STAFF",
  "AUDITOR",
  "BLOOD_MANAGER",
  "LIBRARY_MANAGER",
  "VOLUNTEER_MANAGER",
  "INTERNSHIP_MANAGER",
  "HR_MANAGER",
  "ACCOUNTANT",
  "USER",
];

function UsersAdmin() {
  const qc = useQueryClient();
  const { isSuperAdmin, isAdmin } = useAuth();
  const [q, setQ] = useState("");
  const [pending, setPending] = useState<Record<string, AppRole | undefined>>({});

  const users = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const [profiles, roles] = await Promise.all([
        supabase
          .from("site_profiles")
          .select("id,full_name,email,mobile,city,status,created_at")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase.from("user_roles").select("id,user_id,role"),
      ]);
      if (profiles.error) throw profiles.error;
      return {
        profiles: profiles.data ?? [],
        roles: roles.data ?? [],
      };
    },
  });

  const addRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role granted");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not grant role"),
  });

  const removeRole = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role removed");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not remove role"),
  });

  const canEdit = isSuperAdmin || isAdmin;
  const rows = (users.data?.profiles ?? []).filter((p: any) =>
    `${p.full_name ?? ""} ${p.email ?? ""} ${p.mobile ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Users & roles</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Roles are stored separately from profiles and always checked on the server.
      </p>

      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name, email or mobile"
        aria-label="Search users"
        className="mb-4 mt-6 max-w-sm"
      />

      <div className="surface-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/70 text-left">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Contact</th>
              <th className="px-4 py-3 font-semibold">Roles</th>
              {canEdit ? <th className="px-4 py-3 font-semibold">Grant role</th> : null}
            </tr>
          </thead>
          <tbody>
            {users.isLoading ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                  Loading…
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((p: any) => {
                const userRoles = (users.data?.roles ?? []).filter((r: any) => r.user_id === p.id);
                return (
                  <tr key={p.id} className="border-t border-border align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{p.status ?? ""}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{p.email ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{p.mobile ?? ""}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {userRoles.length ? (
                          userRoles.map((r: any) => (
                            <Badge key={r.id} variant="secondary" className="gap-1">
                              {r.role}
                              {canEdit ? (
                                <button
                                  type="button"
                                  aria-label={`Remove ${r.role}`}
                                  onClick={() => removeRole.mutate(r.id)}
                                >
                                  <X className="size-3" />
                                </button>
                              ) : null}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground">member</span>
                        )}
                      </div>
                    </td>
                    {canEdit ? (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Select
                            value={pending[p.id] ?? ""}
                            onValueChange={(v) =>
                              setPending((prev) => ({ ...prev, [p.id]: v as AppRole }))
                            }
                          >
                            <SelectTrigger className="w-44">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              {ASSIGNABLE.map((r) => (
                                <SelectItem key={r} value={r}>
                                  {r}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            disabled={!pending[p.id]}
                            onClick={() => {
                              const role = pending[p.id];
                              if (role) addRole.mutate({ userId: p.id, role });
                            }}
                          >
                            Grant
                          </Button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
