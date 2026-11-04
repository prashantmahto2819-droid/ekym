import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type FamilyCtx = { approved: boolean; shok_admin: boolean; super: boolean; platform_admin: boolean; family_manage: boolean; shok_send: boolean; profile_status: string | null };

/** Who the signed-in user is for the family-tree module (shokpatra approval / Kalchuri One roles). */
export function useFamilyCtx() {
  return useQuery({ queryKey: ["k1_family_ctx"], queryFn: async () => { const { data } = await supabase.rpc("k1_family_ctx"); return (data ?? {}) as FamilyCtx; }, staleTime: 60000 });
}
