import { useQuery } from "@tanstack/react-query";

import type { Village } from "@/family/api";
import type { Person } from "@/family/layout";
import { supabase } from "@/integrations/supabase/client";

export type FamilyCtx = { approved: boolean; shok_admin: boolean; super: boolean; platform_admin: boolean; family_manage: boolean; shok_send: boolean; profile_status: string | null };

/** Who the signed-in user is for the family-tree module (shokpatra approval / Kalchuri One roles). */
export function useFamilyCtx() {
  return useQuery({ queryKey: ["k1_family_ctx"], queryFn: async () => { const { data } = await supabase.rpc("k1_family_ctx"); return (data ?? {}) as FamilyCtx; }, staleTime: 60000 });
}

export type MemberRow = Person & { village_id?: string | null };

/** Members of a family: own/managed families read the table (phones included), others go through family_tree() (no phones). */
export function useFamilyMembers(id: string, canRead: boolean, villages: Village[] | undefined) {
  return useQuery({
    queryKey: ["family_members", id, !!villages],
    enabled: canRead && !!id,
    queryFn: async (): Promise<{ people: MemberRow[]; direct: boolean }> => {
      const { data: rows } = await supabase.from("members").select("*").eq("family_id", id).limit(2000);
      if (rows && rows.length) {
        const vn = new Map((villages ?? []).map((x) => [x.id, x.name] as const));
        return { direct: true, people: (rows as unknown as MemberRow[]).map((m) => ({ ...m, village_name: m.village_id ? vn.get(m.village_id) ?? null : null })) };
      }
      const { data, error } = await supabase.rpc("family_tree", { p_family: id });
      if (error) throw error;
      return { direct: false, people: (data ?? []) as unknown as MemberRow[] };
    },
  });
}

/** Same-name people in other trees (for one family, optionally one member). */
export type SimilarRow = { member_id: string; member_name: string; father_name: string | null; other_member_id: string; other_name: string; other_father: string | null; other_family_id: string; other_family_name: string; other_family_status: string; other_village: string | null; other_native: string | null; other_is_root: boolean; link_parent_id: string | null; score: number; reason: string | null };
export function useSimilarMembers(familyId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["shok_similar", familyId],
    enabled: enabled && !!familyId,
    queryFn: async () => { const { data, error } = await supabase.rpc("shok_similar_members", { p_family: familyId } as never); if (error) throw error; return (data ?? []) as unknown as SimilarRow[]; },
  });
}
