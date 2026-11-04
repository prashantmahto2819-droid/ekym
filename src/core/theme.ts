// Branding → CSS variables. Organizations set colors/fonts in Admin → Website → Theme (core.organizations.branding).
export type Branding = { primary?: string; accent?: string; font_display?: string; font_body?: string; logo?: string; radius?: string };

const FONT_STACKS: Record<string, string> = {
  sora: '"Sora", ui-sans-serif, system-ui, sans-serif',
  manrope: '"Manrope", ui-sans-serif, system-ui, sans-serif',
  mukta: '"Mukta", ui-sans-serif, system-ui, sans-serif',
  tiro: '"Tiro Devanagari Hindi", "Noto Serif Devanagari", serif',
  noto_serif: '"Noto Serif Devanagari", serif',
};
export const FONT_OPTIONS = Object.keys(FONT_STACKS);

/** Inline <style> for the document head: overrides tokens only when branding sets them. */
export function themeCss(b: Branding | null | undefined): string {
  if (!b) return "";
  const vars: string[] = [];
  const hex = (s?: string) => (s && /^#[0-9a-f]{6}$/i.test(s) ? s : null);
  const p = hex(b.primary), a = hex(b.accent);
  if (p) vars.push(`--primary:${p}`, `--primary-deep:color-mix(in oklab, ${p} 75%, black)`, `--primary-soft:color-mix(in oklab, ${p} 14%, white)`, `--primary-foreground:#ffffff`, `--ring:${p}`);
  if (a) vars.push(`--accent:${a}`, `--accent-soft:color-mix(in oklab, ${a} 18%, white)`, `--accent-foreground:#ffffff`);
  if (b.font_display && FONT_STACKS[b.font_display]) vars.push(`--font-display:${FONT_STACKS[b.font_display]}`);
  if (b.font_body && FONT_STACKS[b.font_body]) vars.push(`--font-sans:${FONT_STACKS[b.font_body]}`);
  if (b.radius && /^\d+(\.\d+)?(rem|px)$/.test(b.radius)) vars.push(`--radius:${b.radius}`);
  return vars.length ? `:root{${vars.join(";")}}` : "";
}
