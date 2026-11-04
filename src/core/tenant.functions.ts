import { createServerFn } from "@tanstack/react-start";

export const getTenant = createServerFn({ method: "GET" }).handler(async () => {
  const { resolveTenant } = await import("./tenant.server");
  return resolveTenant();
});
