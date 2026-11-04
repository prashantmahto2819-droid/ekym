import { createContext, useContext, type ReactNode } from "react";

import type { Tenant } from "./tenant.server";

const TenantContext = createContext<Tenant | null>(null);

export function TenantProvider({ tenant, children }: { tenant: Tenant; children: ReactNode }) {
  return <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>;
}

/** The organization whose website is being viewed (resolved on the server from the hostname). */
export function useTenant(): Tenant {
  const t = useContext(TenantContext);
  if (!t) throw new Error("useTenant outside TenantProvider");
  return t;
}
