// उपयोग गाइड (Hindi): one page, section per module, numbered steps.
import { createFileRoute } from "@tanstack/react-router";

import { GUIDE_HI } from "@/content/guide-hi";

export const Route = createFileRoute("/_authenticated/admin/guide")({ component: GuidePage });

function GuidePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header><h1 className="font-display text-2xl font-semibold">उपयोग गाइड</h1><p className="text-sm text-muted-foreground">हर module के लिए क्रम से चरण। विस्तृत तकनीकी दस्तावेज़ repo के <code>docs/kalchuri-one/</code> में हैं।</p></header>
      <nav className="flex flex-wrap gap-1 text-xs">{GUIDE_HI.map((s, i) => <a key={s.title} href={`#g${i}`} className="rounded-full border border-border px-3 py-1 hover:bg-secondary">{s.title}</a>)}</nav>
      {GUIDE_HI.map((s, i) => (
        <section key={s.title} id={`g${i}`} className="rounded-lg border border-border bg-background p-4">
          <h2 className="font-display text-lg font-semibold">{s.title} <span className="text-sm font-normal text-muted-foreground">— {s.subtitle}</span></h2>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[15px] leading-relaxed">{s.steps.map((st, j) => <li key={j}>{st}</li>)}</ol>
        </section>
      ))}
    </div>
  );
}
