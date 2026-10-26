import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "CONTENT_MANAGER"
  | "STAFF"
  | "AUDITOR"
  | "USER"
  | "BLOOD_MANAGER"
  | "LIBRARY_MANAGER"
  | "VOLUNTEER_MANAGER"
  | "INTERNSHIP_MANAGER"
  | "HR_MANAGER"
  | "ACCOUNTANT"
  | "AMBULANCE_MANAGER"
  | "JOB_MANAGER"
  | "DONOR"
  | "VOLUNTEER"
  | "INTERN"
  | "STUDENT"
  | "JOB_SEEKER"
  | "EMPLOYER";

/** Live Supabase session for the current browser. */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, user: session?.user ?? null, loading };
}

/** Session plus role helpers. Roles always come from the database, never from the browser. */
export function useAuth() {
  const { session, user, loading } = useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const rolesQuery = useQuery({
    queryKey: ["my-roles", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as AppRole);
    },
  });

  const roles = rolesQuery.data ?? [];
  const has = (...wanted: AppRole[]) => wanted.some((r) => roles.includes(r));

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return {
    session,
    user,
    loading: loading || (!!user && rolesQuery.isLoading),
    roles,
    has,
    isSuperAdmin: has("SUPER_ADMIN"),
    isAdmin: has("SUPER_ADMIN", "ADMIN"),
    canManageContent: has("SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"),
    canManageBlood: has("SUPER_ADMIN", "ADMIN", "BLOOD_MANAGER"),
    canManageLibrary: has("SUPER_ADMIN", "ADMIN", "LIBRARY_MANAGER"),
    isStaff: has(
      "SUPER_ADMIN",
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
    ),
    signOut,
  };
}
