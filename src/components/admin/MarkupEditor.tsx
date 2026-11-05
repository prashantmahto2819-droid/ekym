// Small content editor for the website builder text: toolbar inserts the lightweight markup that RichText renders
// (## heading, **bold**, *italic*, - list, [text](url), ![caption](image-url)). Images upload to site-media.
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Textarea } from "@/components/ui/textarea";
import { useTenant } from "@/core/tenant-context";
import { publicUrl, uploadPhoto } from "@/lib/images";

export function MarkupEditor({ value, onChange, disabled, rows = 10 }: { value: string; onChange: (v: string) => void; disabled?: boolean | undefined; rows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const tenant = useTenant();
  const [busy, setBusy] = useState(false);
  function wrap(before: string, after = "", placeholder = "text") {
    const el = ref.current; if (!el) return;
    const s = el.selectionStart, e = el.selectionEnd; const sel = value.slice(s, e) || placeholder;
    const next = value.slice(0, s) + before + sel + after + value.slice(e);
    onChange(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + before.length, s + before.length + sel.length); });
  }
  function linePrefix(prefix: string) {
    const el = ref.current; if (!el) return;
    const s = el.selectionStart; const ls = value.lastIndexOf("\n", s - 1) + 1;
    onChange(value.slice(0, ls) + prefix + value.slice(ls));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + prefix.length, s + prefix.length); });
  }
  async function image(f: File | undefined) {
    if (!f) return;
    setBusy(true);
    try { const path = `${tenant.organization_id}/pages/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`; await uploadPhoto("site-media", path, f, 1600); wrap(`\n![`, `](${publicUrl("site-media", path)})\n`, "caption"); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  const B = ({ t, onClick, title }: { t: string; onClick: () => void; title: string }) => <button type="button" title={title} className="rounded border border-border px-2 py-0.5 text-xs hover:bg-secondary" onClick={onClick} disabled={disabled}>{t}</button>;
  return (
    <div>
      <div className="mb-1 flex flex-wrap gap-1">
        <B t="H2" title="Heading" onClick={() => linePrefix("## ")} />
        <B t="H3" title="Sub-heading" onClick={() => linePrefix("### ")} />
        <B t="B" title="Bold" onClick={() => wrap("**", "**")} />
        <B t="I" title="Italic" onClick={() => wrap("*", "*")} />
        <B t="• list" title="Bullet list" onClick={() => linePrefix("- ")} />
        <B t="1. list" title="Numbered list" onClick={() => linePrefix("1. ")} />
        <B t="❝ quote" title="Quote" onClick={() => linePrefix("> ")} />
        <B t="link" title="Link" onClick={() => wrap("[", "](https://)", "link text")} />
        <label className="cursor-pointer rounded border border-border px-2 py-0.5 text-xs hover:bg-secondary">{busy ? "…" : "📷 image"}<input type="file" accept="image/*" hidden disabled={disabled || busy} onChange={(e) => void image(e.target.files?.[0])} /></label>
        <span className="self-center text-[11px] text-muted-foreground">blank line = new paragraph</span>
      </div>
      <Textarea ref={ref} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="font-mono text-[13px]" />
    </div>
  );
}
