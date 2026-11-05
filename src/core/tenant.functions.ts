import { createServerFn } from "@tanstack/react-start";

export const getTenant = createServerFn({ method: "GET" }).handler(async () => {
  const { resolveTenant } = await import("./tenant.server");
  return resolveTenant();
});

/** Absolute origin of the current request (for og:image and other absolute URLs). */
export const getOrigin = createServerFn({ method: "GET" }).handler(async () => {
  const { requestOrigin } = await import("./tenant.server");
  return requestOrigin();
});
