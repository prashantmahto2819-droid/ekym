import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { useTenant } from "@/core/tenant-context";
import { supabase } from "@/integrations/supabase/client";

export type OrgMembership = {
  organization_id: string;
  slug: string;
  name: string;
  name_hi: string | null;
  role_keys: string[];
  permissions: string[];
};

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

/** Does this permission list grant `perm`? Mirrors core.can(): exact key, `module.*`, or `*`. */
export function grants(perms: string[] | undefined, perm: string) {
  if (!perms) return false;
  return perms.includes("*") || perms.includes(perm) || perms.includes(perm.split(".")[0] + ".*");
}

/**
 * Session plus permissions in the organization whose site is being viewed.
 * Permissions always come from the database (k1_my_orgs), never from the browser.
 */
export function useAuth() {
  const { session, user, loading } = useSession();
  const tenant = useTenant();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const orgsQuery = useQuery({
    queryKey: ["my-orgs", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("k1_my_orgs");
      if (error) throw error;
      return (data ?? []) as OrgMembership[];
    },
  });

  const orgs = orgsQuery.data ?? [];
  const current = orgs.find((o) => o.organization_id === tenant.organization_id);
  const perms = current?.permissions ?? [];
  const can = (perm: string) => grants(perms, perm);
  const isPlatformAdmin = orgs.some((o) => o.role_keys.includes("platform_admin")) || perms.includes("*") && current?.role_keys.includes("platform_admin") === true;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return {
    session,
    user,
    loading: loading || (!!user && orgsQuery.isLoading),
    orgs,
    currentOrg: current ?? null,
    permissions: perms,
    can,
    isPlatformAdmin,
    isSuperAdmin: isPlatformAdmin || perms.includes("*"),
    isAdmin: can("org.settings.edit"),
    canManageContent: can("cms.post.publish"),
    canManageBlood: can("community.blood.manage"),
    canManageLibrary: can("community.library.manage"),
    canManageVolunteers: can("community.volunteer.manage"),
    canManageInternships: can("community.internship.manage"),
    canViewDonations: can("community.donation.view") || can("fin.report.view"),
    canManageMessages: can("community.messages.manage"),
    /** Any role at all in this organization (team member). */
    isStaff: !!current && perms.length > 0,
    signOut,
  };
}
