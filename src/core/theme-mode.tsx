// Light / dark / follow-the-phone theme. The choice lives in localStorage (k1_theme); a tiny script in <head>
// applies the "dark" class before the page paints, so there is no white flash.
import { Monitor, Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export type ThemeMode = "light" | "dark" | "system";
const KEY = "k1_theme";

export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('${KEY}')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

function apply(mode: ThemeMode) {
  const dark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function useThemeMode() {
  const [mode, setModeState] = useState<ThemeMode>("system");
  useEffect(() => {
    let m: ThemeMode = "system";
    try { const v = localStorage.getItem(KEY); if (v === "light" || v === "dark") m = v; } catch { /* private window */ }
    setModeState(m);
  }, []);
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => apply("system");
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [mode]);
  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    try { if (m === "system") localStorage.removeItem(KEY); else localStorage.setItem(KEY, m); } catch { /* ignore */ }
    apply(m);
  }, []);
  return { mode, setMode };
}

/** One button: light → dark → like the phone → light … */
export function ThemeToggle({ L, className }: { L: boolean; className?: string }) {
  const { mode, setMode } = useThemeMode();
  const next: ThemeMode = mode === "light" ? "dark" : mode === "dark" ? "system" : "light";
  const label = { light: L ? "दिन (हल्का)" : "Light", dark: L ? "रात (गहरा)" : "Dark", system: L ? "फोन के अनुसार" : "Like my device" }[mode];
  const Icon = mode === "light" ? Sun : mode === "dark" ? Moon : Monitor;
  return (
    <Button type="button" variant="ghost" size="icon" className={className} onClick={() => setMode(next)} title={`${L ? "रंग" : "Theme"}: ${label}`} aria-label={`${L ? "रंग बदलें" : "Change theme"} (${label})`}>
      <Icon className="size-5" />
    </Button>
  );
}
