import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { parseLangCookie, type Lang } from "./i18n";

export const getLang = createServerFn({ method: "GET" }).handler(async (): Promise<Lang> => {
  try {
    return parseLangCookie(getRequest().headers.get("cookie"));
  } catch {
    return "en";
  }
});
