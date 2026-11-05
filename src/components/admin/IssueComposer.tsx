// Magazine composer: pick content (blogs, news, achievements, announcements — own organization, or every organization for
// Kalchuri One's magazine), add custom pieces, order them into sections, write the editorial, choose the look (layout, colours,
// font, columns, cover) with a live preview, and save. Rendering is shared with the public reader.
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { ImageField } from "@/components/admin/ImageField";
import { MarkupEditor } from "@/components/admin/MarkupEditor";
import { MagazineReader, THEME_PRESETS, type Article, type IssueLike, type MagTheme } from "@/components/magazine/MagazineReader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTenant } from "@/core/tenant-context";
import { supabase } from "@/integrations/supabase/client";

type Source = { id: string; kind: string; title: string; title_hi: string | null; org_id: string; org_name: string; published_at: string | null; image: string | null; excerpt: string | null };
const KINDS: [string, string][] = [["", "सब"], ["blog", "ब्लॉग"], ["news", "समाचार"], ["achievement", "उपलब्धियाँ"], ["announcement", "सूचनाएँ"]];
const uid = () => Math.random().toString(36).slice(2, 10);

export function IssueComposer({ issue, open, onClose, onSaved }: { issue: IssueLike & { organization_id: string }; open: boolean; onClose: () => void; onSaved: () => void }) {
  const tenant = useTenant();
  const [arts, setArts] = useState<Article[]>(() => (Array.isArray(issue.articles) ? (issue.articles as Article[]) : []));
  const [theme, setTheme] = useState<MagTheme>(() => ({ ...THEME_PRESETS[0]!.theme, ...(issue.theme ?? {}) }));
  const [editorial, setEditorial] = useState(issue.editorial ?? "");
  const [editorialHi, setEditorialHi] = useState(issue.editorial_hi ?? "");
  const [editor, setEditor] = useState(issue.editor_name ?? "");
  const [tab, setTab] = useState<"content" | "look" | "preview">("content");
  const [kind, setKind] = useState("");
  const [q, setQ] = useState("");
  const [custom, setCustom] = useState<{ title: string; body: string; image: string; section: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const sources = useQuery({ queryKey: ["mag_sources", issue.organization_id, kind, q], enabled: open && tab === "content", queryFn: async () => { const { data, error } = await supabase.rpc("k1_magazine_sources", { p_org: issue.organization_id, p_kind: kind || null, p_q: q || null, p_limit: 60 } as never); if (error) throw error; return (data ?? []) as unknown as Source[]; } });
  const preview = useQuery({ queryKey: ["mag_preview", issue.id, JSON.stringify(arts)], enabled: open && tab === "preview", queryFn: async () => { const { data, error } = await supabase.rpc("k1_issue_articles", { p_issue: issue.id } as never); if (error) throw error; const resolved = (data ?? []) as unknown as Article[]; return arts.map((a) => resolved.find((r) => r.id === a.id) ?? a); } });

  const has = (s: Source) => arts.some((a) => a.ref === s.id);
  function add(s: Source) { if (has(s)) return; setArts((x) => [...x, { id: uid(), type: s.kind, ref: s.id, section: null, org_name: s.org_name, title: undefined }]); }
  function move(i: number, d: -1 | 1) { setArts((x) => { const y = [...x]; const j = i + d; if (j < 0 || j >= y.length) return y; [y[i], y[j]] = [y[j]!, y[i]!]; return y; }); }
  async function save(andPreview = false) {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("k1_issue_set_articles", { p_issue: issue.id, p_articles: arts, p_editorial: editorial || null, p_editorial_hi: editorialHi || null, p_editor: editor || null } as never); if (error) throw error;
      const { error: e2 } = await supabase.rpc("k1_issue_set_theme", { p_issue: issue.id, p_theme: theme } as never); if (e2) throw e2;
      toast.success("सहेजा"); onSaved(); if (andPreview) setTab("preview");
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  const sourceTitle = (a: Article) => a.title || (sources.data?.find((s) => s.id === a.ref)?.title_hi ?? sources.data?.find((s) => s.id === a.ref)?.title) || (a.type === "custom" ? "(अपना लेख)" : `${a.type} …`);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-h-[92vh] w-[96vw] max-w-6xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-5 py-3"><DialogTitle>पत्रिका बनाएँ — {issue.title_hi || issue.title}</DialogTitle></DialogHeader>
        <div className="flex items-center gap-2 border-b border-border px-5 py-2 text-sm">
          {([["content", "1 · सामग्री"], ["look", "2 · रूप-रंग"], ["preview", "3 · पूर्वावलोकन"]] as const).map(([k, l]) => <button key={k} type="button" className={`rounded-full px-3 py-1 ${tab === k ? "bg-primary text-primary-foreground" : "bg-secondary"}`} onClick={() => { if (k === "preview") void save(true); else setTab(k); }}>{l}</button>)}
          <span className="ml-auto text-xs text-muted-foreground">{arts.length} लेख</span>
          <Button size="sm" onClick={() => save()} disabled={busy}>सहेजें</Button>
        </div>

        {tab === "content" ? (
          <div className="grid max-h-[70vh] gap-4 overflow-auto p-5 lg:grid-cols-2">
            <div className="space-y-2">
              <p className="font-semibold">इस अंक के लेख (क्रम में)</p>
              {arts.length === 0 ? <p className="text-sm text-muted-foreground">दाईं ओर से लेख जोड़ें या "अपना लेख" लिखें।</p> : null}
              <ul className="space-y-1">
                {arts.map((a, i) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background p-2 text-sm">
                    <span className="rounded bg-secondary px-1.5 text-[11px]">{KINDS.find((k) => k[0] === a.type)?.[1] ?? "अपना"}</span>
                    <span className="min-w-0 flex-1 truncate">{sourceTitle(a)}{a.org_name ? <span className="text-xs text-muted-foreground"> · {a.org_name}</span> : null}</span>
                    <Input className="h-7 w-36 text-xs" placeholder="खंड (जैसे समाचार)" value={a.section ?? ""} onChange={(e) => setArts((x) => x.map((y) => (y.id === a.id ? { ...y, section: e.target.value || null } : y)))} />
                    <button type="button" className="px-1" onClick={() => move(i, -1)}>▲</button><button type="button" className="px-1" onClick={() => move(i, 1)}>▼</button>
                    {a.type === "custom" ? <button type="button" className="text-xs underline" onClick={() => setCustom({ title: a.title ?? "", body: a.body ?? "", image: a.image ?? "", section: a.section ?? "" })}>बदलें</button> : null}
                    <button type="button" className="text-xs text-destructive" onClick={() => setArts((x) => x.filter((y) => y.id !== a.id))}>हटाएँ</button>
                  </li>
                ))}
              </ul>
              <div className="rounded-md border border-dashed border-border p-3">
                <div className="flex items-center justify-between"><p className="text-sm font-medium">अपना लेख / संदेश (जैसे अध्यक्ष का संदेश)</p>{!custom ? <Button size="sm" variant="outline" onClick={() => setCustom({ title: "", body: "", image: "", section: "" })}>+ लिखें</Button> : null}</div>
                {custom ? (
                  <div className="mt-2 space-y-2">
                    <Input placeholder="शीर्षक" value={custom.title} onChange={(e) => setCustom({ ...custom, title: e.target.value })} />
                    <Input placeholder="खंड (वैकल्पिक, जैसे: संदेश)" value={custom.section} onChange={(e) => setCustom({ ...custom, section: e.target.value })} />
                    <MarkupEditor value={custom.body} onChange={(v) => setCustom({ ...custom, body: v })} rows={6} />
                    <ImageField label="चित्र (वैकल्पिक)" value={custom.image} onChange={(v) => setCustom({ ...custom, image: v })} folder="magazine" max={1600} />
                    <div className="flex gap-2"><Button size="sm" onClick={() => { if (!custom.title.trim()) { toast.error("शीर्षक लिखें"); return; } setArts((x) => [...x, { id: uid(), type: "custom", ref: null, title: custom.title, body: custom.body, image: custom.image || null, section: custom.section || null, org_name: (tenant.name_hi ?? tenant.name) }]); setCustom(null); }}>जोड़ें</Button><Button size="sm" variant="ghost" onClick={() => setCustom(null)}>रद्द</Button></div>
                  </div>
                ) : null}
              </div>
              <div className="space-y-2 rounded-md border border-border p-3">
                <p className="text-sm font-medium">संपादकीय</p>
                <MarkupEditor value={editorialHi} onChange={setEditorialHi} rows={5} />
                <details><summary className="cursor-pointer text-xs text-muted-foreground">English editorial (optional)</summary><Textarea rows={4} value={editorial} onChange={(e) => setEditorial(e.target.value)} /></details>
                <Input placeholder="संपादक का नाम" value={editor} onChange={(e) => setEditor(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <p className="font-semibold">सामग्री चुनें {tenant.parent_id ? "" : <span className="text-xs font-normal text-muted-foreground">(सभी संस्थाओं की)</span>}</p>
              <div className="flex flex-wrap gap-1 text-xs">{KINDS.map(([k, l]) => <button key={k} type="button" className={`rounded-full px-2.5 py-1 ${kind === k ? "bg-primary text-primary-foreground" : "bg-secondary"}`} onClick={() => setKind(k)}>{l}</button>)}</div>
              <Input placeholder="खोजें…" value={q} onChange={(e) => setQ(e.target.value)} />
              <ul className="max-h-[52vh] space-y-1 overflow-auto">
                {(sources.data ?? []).map((s) => (
                  <li key={s.id} className={`flex items-center gap-2 rounded-md border border-border p-2 text-sm ${has(s) ? "opacity-50" : ""}`}>
                    {s.image ? <img src={s.image.startsWith("http") || s.image.startsWith("/") ? s.image : supabase.storage.from("publications").getPublicUrl(s.image).data.publicUrl} alt="" className="size-10 rounded object-cover" /> : <span className="grid size-10 place-items-center rounded bg-secondary text-xs">{KINDS.find((k) => k[0] === s.kind)?.[1]?.slice(0, 2)}</span>}
                    <span className="min-w-0 flex-1"><span className="block truncate font-medium">{s.title_hi || s.title}</span><span className="block truncate text-xs text-muted-foreground">{s.org_name}{s.published_at ? ` · ${new Date(s.published_at).toLocaleDateString("hi-IN")}` : ""}</span></span>
                    <Button size="sm" variant={has(s) ? "ghost" : "outline"} disabled={has(s)} onClick={() => add(s)}>{has(s) ? "जुड़ा" : "+ जोड़ें"}</Button>
                  </li>
                ))}
                {sources.isSuccess && !sources.data.length ? <li className="p-3 text-sm text-muted-foreground">कुछ नहीं मिला — पहले ब्लॉग/समाचार/उपलब्धि प्रकाशित करें।</li> : null}
              </ul>
            </div>
          </div>
        ) : null}

        {tab === "look" ? (
          <div className="grid max-h-[70vh] gap-4 overflow-auto p-5 lg:grid-cols-[22rem_1fr]">
            <div className="space-y-3 text-sm">
              <p className="font-semibold">तैयार शैली</p>
              <div className="grid gap-1">{THEME_PRESETS.map((p) => <button key={p.key} type="button" className={`rounded-md border px-3 py-2 text-left ${theme.layout === p.theme.layout ? "border-primary bg-primary/5" : "border-border"}`} onClick={() => setTheme({ ...p.theme })}>{p.label}</button>)}</div>
              <p className="font-semibold">रंग</p>
              {([["accent", "मुख्य रंग (शीर्षक/पट्टी)"], ["paper", "पृष्ठ का रंग"], ["ink", "पाठ का रंग"]] as const).map(([k, l]) => <label key={k} className="flex items-center justify-between gap-2">{l}<span className="flex items-center gap-1"><input type="color" value={theme[k] ?? "#000000"} onChange={(e) => setTheme({ ...theme, [k]: e.target.value })} /><Input className="h-8 w-24 text-xs" value={theme[k] ?? ""} onChange={(e) => setTheme({ ...theme, [k]: e.target.value })} /></span></label>)}
              <label className="flex items-center justify-between">फ़ॉन्ट<select className="h-8 rounded-md border border-input bg-background px-2" value={theme.font ?? "serif"} onChange={(e) => setTheme({ ...theme, font: e.target.value as MagTheme["font"] })}><option value="serif">Serif (Noto Serif Devanagari)</option><option value="devanagari">Tiro Devanagari Hindi</option><option value="sans">Sans (Mukta)</option></select></label>
              <label className="flex items-center justify-between">लेख के कॉलम<select className="h-8 rounded-md border border-input bg-background px-2" value={theme.columns ?? 1} onChange={(e) => setTheme({ ...theme, columns: Number(e.target.value) as 1 | 2 })}><option value={1}>1</option><option value={2}>2 (समाचार-पत्र)</option></select></label>
              <label className="flex items-center justify-between">आवरण<select className="h-8 rounded-md border border-input bg-background px-2" value={theme.cover ?? "image"} onChange={(e) => setTheme({ ...theme, cover: e.target.value as MagTheme["cover"] })}><option value="image">पूरी फोटो</option><option value="band">रंगीन पट्टी + फोटो</option><option value="minimal">सादा</option></select></label>
              <label className="flex items-center justify-between">लेआउट<select className="h-8 rounded-md border border-input bg-background px-2" value={theme.layout ?? "classic"} onChange={(e) => setTheme({ ...theme, layout: e.target.value as MagTheme["layout"] })}><option value="classic">क्लासिक</option><option value="modern">आधुनिक (2 लेख साथ)</option><option value="newspaper">समाचार-पत्र</option></select></label>
              <p className="text-xs text-muted-foreground">आवरण फोटो सूची में "Cover" बटन से अपलोड होती है।</p>
            </div>
            <div className="max-h-[66vh] overflow-auto rounded-lg border border-border">
              <div className="origin-top-left scale-[.85]" style={{ width: "117%" }}>
                <MagazineReader issue={{ ...issue, theme, editorial, editorial_hi: editorialHi, editor_name: editor }} orgName={tenant.name_hi ?? tenant.name} articles={SAMPLE} preview />
              </div>
            </div>
          </div>
        ) : null}

        {tab === "preview" ? (
          <div className="max-h-[70vh] overflow-auto p-5">
            {preview.data ? <MagazineReader issue={{ ...issue, theme, editorial, editorial_hi: editorialHi, editor_name: editor }} orgName={tenant.name_hi ?? tenant.name} articles={preview.data} preview /> : <p className="text-sm text-muted-foreground">…</p>}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

const SAMPLE: Article[] = [
  { id: "s1", type: "custom", title: "अध्यक्ष का संदेश", body: "समाज के सभी सदस्यों को नमस्कार। इस अंक में हमारी संस्था की गतिविधियाँ, उपलब्धियाँ और आगामी आयोजन प्रस्तुत हैं।\n\n**एकता ही शक्ति है।**", section: "संदेश", author: "अध्यक्ष" },
  { id: "s2", type: "news", title: "वार्षिक महासभा संपन्न", body: "महासभा में नई कार्यकारिणी का चुनाव हुआ और आगामी वर्ष की योजनाएँ तय हुईं।", section: "समाचार", org_name: "संस्था" },
  { id: "s3", type: "achievement", title: "कु. प्रिया — राज्य स्तर पर प्रथम", body: "शिक्षा में उत्कृष्ट प्रदर्शन के लिए सम्मान।", section: "उपलब्धियाँ", category: "education" },
];
