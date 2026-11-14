// <T>Organization settings</T> — shows an admin label in the chosen language (via the shared dictionary in adminText).
// txNow("Saved") — the same for toasts / confirm boxes outside JSX (reads <html lang>, which the language switch sets).
import { tx } from "@/components/admin/adminText";
import { useLang } from "@/core/i18n";

export function T({ children }: { children: string }) {
  const hi = useLang().lang === "hi";
  return <>{tx(children, hi)}</>;
}

export const txNow = (s: string) => tx(s, typeof document !== "undefined" && document.documentElement.lang === "hi");
