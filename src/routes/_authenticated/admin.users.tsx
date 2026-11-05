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
  regions: string[] | null;
  valid_to: string | null;
};
/** Practical roles for one organization, shown first; the rest follow alphabetically. */
const MAIN_ROLES = ["org_admin", "secretary", "editor", "family_admin", "treasurer"];
type Found = { user_id: string; full_name: string | null; email: string | null; mobile: string | null; village: string | null; source: string; roles: string[] | null };
type RoleRow = { role_id: string; key: string; name: string; name_hi: string | null; permissions: string[]; is_system: boolean };

function UsersPage() {
  const tenant = useTenant();
  const { can, user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Found | null>(null);
  const [roleId, setRoleId] = useState<string>("");
  const [regions, setRegions] = useState<string[]>([]);
  const [validTo, setValidTo] = useState("");
  const regionList = useQuery({ queryKey: ["k1_social_regions"], staleTime: 600_000, queryFn: async () => { const { data } = await supabase.rpc("k1_social_regions"); return (data ?? []) as { id: string; name: string; sort_order: number }[]; } });
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

  const found = useQuery({
    queryKey: ["k1_find_users", tenant.organization_id, q],
    enabled: canManage && q.trim().length >= 2,
    queryFn: async () => { const { data, error } = await supabase.rpc("k1_find_users", { p_org: tenant.organization_id, p_q: q, p_limit: 20 } as never); if (error) throw error; return (data ?? []) as unknown as Found[]; },
  });
  const assign = useMutation({
    mutationFn: async () => {
      if (!roleId) throw new Error("पहले भूमिका चुनिए");
      if (!picked) throw new Error("पहले व्यक्ति चुनिए");
      const { error } = await supabase.rpc("k1_assign_role_user", { p_org: tenant.organization_id, p_user: picked.user_id, p_role_id: roleId, p_regions: regions.length ? regions : null, p_valid_to: validTo || null } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("भूमिका दे दी गई");
      setPicked(null); setQ(""); setRegions([]); setValidTo("");
      qc.invalidateQueries({ queryKey: ["org-team"] });
      qc.invalidateQueries({ queryKey: ["k1_find_users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase.rpc("k1_remove_role", { p_assignment: assignmentId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("भूमिका हटाई");
      qc.invalidateQueries({ queryKey: ["org-team"] });
      qc.invalidateQueries({ queryKey: ["my-orgs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!canManage) {
    return <p className="text-sm text-muted-foreground">सिर्फ़ संगठन एडमिन टीम बदल सकते हैं।</p>;
  }

  const byUser = new Map<string, TeamRow[]>();
  for (const r of team.data ?? []) byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">टीम व भूमिकाएँ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tenant.name_hi ?? tenant.name} में जिनके पास कोई भूमिका है। भूमिका तय करती है कि कौन क्या कर सकता है (हर अनुरोध पर सर्वर जाँचता है)। व्यक्ति का खाता पहले बना हो — फिर नाम/मोबाइल/ईमेल से खोजकर भूमिका दीजिए।
        </p>
      </div>

      <div className="surface-card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <label className="text-xs font-medium text-muted-foreground">व्यक्ति खोजें — नाम, मोबाइल या ईमेल (खाता बना होना चाहिए)</label>
          {picked ? (
            <div className="flex items-center justify-between rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm">
              <span><b>{picked.full_name || "—"}</b> <span className="text-muted-foreground">{[picked.mobile, picked.email, picked.village].filter(Boolean).join(" · ")}</span></span>
              <button type="button" className="text-xs underline" onClick={() => setPicked(null)}>बदलें</button>
            </div>
          ) : (
            <>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="जैसे: पुष्पेन्द्र / 98765 / name@example.com" />
              {q.trim().length >= 2 ? (
                <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-background text-sm shadow-md">
                  {found.isLoading ? <li className="px-3 py-2 text-muted-foreground">खोज रहे हैं…</li> : null}
                  {found.isSuccess && !found.data.length ? <li className="px-3 py-2 text-muted-foreground">कोई खाता नहीं मिला — व्यक्ति पहले वेबसाइट पर लॉगिन/साइनअप करे।</li> : null}
                  {(found.data ?? []).map((f) => (
                    <li key={f.user_id}>
                      <button type="button" className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-secondary" onClick={() => setPicked(f)}>
                        <span className="font-medium">{f.full_name || "(नाम नहीं)"} <span className="text-xs font-normal text-muted-foreground">· {f.source}</span></span>
                        <span className="text-xs text-muted-foreground">{[f.mobile, f.email, f.village].filter(Boolean).join(" · ")}{f.roles?.length ? ` · पहले से: ${f.roles.join(", ")}` : ""}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </div>
        <div className="w-full sm:w-64">
          <label className="text-xs font-medium text-muted-foreground">भूमिका</label>
          <Select value={roleId} onValueChange={setRoleId}>
            <SelectTrigger>
              <SelectValue placeholder="भूमिका चुनें" />
            </SelectTrigger>
            <SelectContent>
              {[...(roles.data ?? [])].sort((a, b) => (MAIN_ROLES.indexOf(a.key) === -1 ? 99 : MAIN_ROLES.indexOf(a.key)) - (MAIN_ROLES.indexOf(b.key) === -1 ? 99 : MAIN_ROLES.indexOf(b.key)) || a.name.localeCompare(b.name)).map((r) => (
                <SelectItem key={r.role_id} value={r.role_id}>
                  {r.name}
                  {r.name_hi ? ` · ${r.name_hi}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {roles.data?.find((r) => r.role_id === roleId)?.key === "family_admin" ? (
          <div className="w-full sm:w-72">
            <label className="text-xs font-medium text-muted-foreground">सामाजिक क्षेत्र (खाली = पूरा संगठन)</label>
            <div className="max-h-28 overflow-auto rounded-md border border-input p-2 text-xs">
              {(regionList.data ?? []).map((r) => <label key={r.id} className="mr-3 inline-flex items-center gap-1"><input type="checkbox" checked={regions.includes(r.id)} onChange={(e) => setRegions((x) => (e.target.checked ? [...x, r.id] : x.filter((y) => y !== r.id)))} /> {r.name}</label>)}
            </div>
          </div>
        ) : null}
        <div className="w-full sm:w-40">
          <label className="text-xs font-medium text-muted-foreground">कार्यकाल समाप्ति (वैकल्पिक)</label>
          <Input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
        </div>
        <Button onClick={() => assign.mutate()} disabled={assign.isPending || !picked || !roleId}>
          भूमिका दें
        </Button>
      </div>

      <div className="surface-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2">व्यक्ति</th>
              <th className="px-4 py-2">संपर्क</th>
              <th className="px-4 py-2">भूमिकाएँ</th>
            </tr>
          </thead>
          <tbody>
            {[...byUser.entries()].map(([uid, rows]) => (
              <tr key={uid} className="border-t border-border">
                <td className="px-4 py-2 font-medium">
                  {rows[0]?.full_name || "—"}
                  {uid === user?.id ? <span className="ml-1 text-xs text-muted-foreground">(आप)</span> : null}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {rows[0]?.email}
                  {rows[0]?.mobile ? ` · ${rows[0].mobile}` : ""}
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    {rows.map((r) => (
                      <Badge key={r.assignment_id} variant="secondary" className="gap-1">
                        {r.role_name}{r.regions?.length ? ` · ${r.regions.join(", ")}` : ""}{r.valid_to ? ` · ${r.valid_to.split("-").reverse().join(".")} तक` : ""}
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
                  अभी कोई टीम सदस्य नहीं।
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
