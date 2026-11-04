// Page builder: block list (add / reorder / edit / remove) on the left, live preview on the right, revisions, publish.
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BLOCK_LABELS, Blocks, newBlock, type Block, type BlockType } from "@/components/site/Blocks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLang } from "@/core/i18n";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/pages/$id")({ component: PageBuilder });

type Page = { id: string; slug: string; title: string; title_hi: string | null; blocks: Block[]; status: string; publish_at: string | null; seo: { title?: string; description?: string; image?: string }; is_home: boolean; show_in_menu: boolean; menu_order: number; updated_at: string };
type Rev = { id: string; title: string; saved_at: string };

function PageBuilder() {
  const { id } = Route.useParams();
  const tenant = useTenant();
  const { can } = useAuth();
  const { lang } = useLang();
  const L = lang === "hi";
  const qc = useQueryClient();
  const nav = useNavigate();
  const [page, setPage] = useState<Page | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showRevs, setShowRevs] = useState(false);

  const q = useQuery({ queryKey: ["cms_page", id], queryFn: async () => { const { data, error } = await supabase.from("cms_pages").select("*").eq("id", id).single(); if (error) throw error; return data as unknown as Page; } });
  const revs = useQuery({ queryKey: ["cms_page_revs", id], enabled: showRevs, queryFn: async () => { const { data } = await supabase.from("cms_page_revisions").select("id,title,saved_at").eq("page_id", id).order("saved_at", { ascending: false }); return (data ?? []) as Rev[]; } });
  useEffect(() => { if (q.data && !dirty) setPage(q.data); }, [q.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const canEdit = can("cms.page.edit");

  const patch = (p: Partial<Page>) => { setPage((x) => (x ? { ...x, ...p } : x)); setDirty(true); };
  const setBlocks = (blocks: Block[]) => patch({ blocks });
  const updateBlock = (b: Block) => setBlocks(page!.blocks.map((x) => (x.id === b.id ? b : x)));
  const move = (i: number, d: -1 | 1) => { const arr = [...page!.blocks]; const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j]!, arr[i]!]; setBlocks(arr); };
  const add = (t: BlockType) => { const b = newBlock(t); setBlocks([...page!.blocks, b]); setSel(b.id); };

  async function save(extra: Partial<Page> = {}) {
    if (!page) return;
    setBusy(true);
    try {
      const row = { title: page.title, title_hi: page.title_hi, slug: page.slug, blocks: page.blocks, seo: page.seo, is_home: page.is_home, show_in_menu: page.show_in_menu, menu_order: page.menu_order, publish_at: page.publish_at, ...extra };
      const { error } = await supabase.from("cms_pages").update(row as never).eq("id", id);
      if (error) throw error;
      setDirty(false); qc.invalidateQueries({ queryKey: ["cms_page", id] }); qc.invalidateQueries({ queryKey: ["cms_pages"] }); qc.invalidateQueries({ queryKey: ["cms_page_revs", id] });
      toast.success(extra.status === "published" ? (L ? "प्रकाशित" : "Published") : (L ? "सहेजा" : "Saved"));
      if (extra.status) setPage({ ...page, ...extra });
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function restore(r: Rev) {
    if (!confirm(L ? `${new Date(r.saved_at).toLocaleString("en-IN")} का संस्करण वापस लाएँ?` : `Restore the version from ${new Date(r.saved_at).toLocaleString("en-IN")}?`)) return;
    const { error } = await supabase.rpc("k1_page_restore", { p_revision: r.id } as never);
    if (error) { toast.error(error.message); return; }
    setDirty(false); qc.invalidateQueries({ queryKey: ["cms_page", id] }); toast.success(L ? "वापस लाया" : "Restored");
  }
  async function remove() {
    if (!confirm(L ? "यह पेज हटाएँ?" : "Delete this page?")) return;
    const { error } = await supabase.from("cms_pages").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    nav({ to: "/admin/pages" });
  }

  if (q.error) return <p className="text-sm text-destructive">{(q.error as Error).message}</p>;
  if (!page) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const selected = page.blocks.find((b) => b.id === sel) ?? null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground"><Link to="/admin/pages" className="hover:underline">Pages</Link> · {page.is_home ? "/" : `/p/${page.slug}`} <Badge variant={page.status === "published" ? "default" : "secondary"} className="ml-1">{page.status}</Badge>{dirty ? <span className="ml-2 text-amber-700">{L ? "असहेजे बदलाव" : "unsaved changes"}</span> : null}</p>
          <Input className="mt-1 w-80 font-display text-lg font-semibold" value={page.title} onChange={(e) => patch({ title: e.target.value })} disabled={!canEdit} />
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit ? <><Button size="sm" variant="outline" onClick={() => save()} disabled={busy}>{L ? "सहेजें" : "Save"}</Button>
            {page.status !== "published" ? <Button size="sm" onClick={() => save({ status: "published" })} disabled={busy}>{L ? "प्रकाशित करें" : "Publish"}</Button> : <Button size="sm" variant="ghost" onClick={() => save({ status: "draft" })} disabled={busy}>{L ? "अप्रकाशित करें" : "Unpublish"}</Button>}
            <Button size="sm" variant="ghost" onClick={() => setShowRevs((v) => !v)}>{L ? "संस्करण" : "Revisions"}</Button>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={remove}>{L ? "हटाएँ" : "Delete"}</Button></> : null}
          {page.status === "published" ? <Button asChild size="sm" variant="ghost"><a href={page.is_home ? "/" : `/p/${page.slug}`} target="_blank" rel="noreferrer">{L ? "देखें ↗" : "View ↗"}</a></Button> : null}
        </div>
      </div>

      <details className="rounded-lg border border-border bg-background p-3 text-sm">
        <summary className="cursor-pointer font-medium">{L ? "पेज सेटिंग (URL, मेनू, SEO, समय)" : "Page settings (URL, menu, SEO, schedule)"}</summary>
        <fieldset disabled={!canEdit} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Lbl label="URL slug"><Input value={page.slug} onChange={(e) => patch({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} /></Lbl>
          <Lbl label="शीर्षक (हिंदी)"><Input value={page.title_hi ?? ""} onChange={(e) => patch({ title_hi: e.target.value })} /></Lbl>
          <Lbl label={L ? "समय पर प्रकाशित (वैकल्पिक)" : "Publish at (optional)"}><Input type="datetime-local" value={page.publish_at ? page.publish_at.slice(0, 16) : ""} onChange={(e) => patch({ publish_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></Lbl>
          <Lbl label="SEO title"><Input value={page.seo?.title ?? ""} onChange={(e) => patch({ seo: { ...page.seo, title: e.target.value } })} /></Lbl>
          <Lbl label="SEO description"><Input value={page.seo?.description ?? ""} onChange={(e) => patch({ seo: { ...page.seo, description: e.target.value } })} /></Lbl>
          <Lbl label="Share image URL"><Input value={page.seo?.image ?? ""} onChange={(e) => patch({ seo: { ...page.seo, image: e.target.value } })} /></Lbl>
          <label className="flex items-center gap-2"><input type="checkbox" checked={page.is_home} onChange={(e) => patch({ is_home: e.target.checked })} /> {L ? "होम पेज की जगह दिखाएँ" : "Use as the home page"}</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={page.show_in_menu} onChange={(e) => patch({ show_in_menu: e.target.checked })} /> {L ? "मेनू में दिखाएँ" : "Show in the menu"}</label>
          <Lbl label={L ? "मेनू क्रम" : "Menu order"}><Input type="number" value={page.menu_order} onChange={(e) => patch({ menu_order: Number(e.target.value) })} /></Lbl>
        </fieldset>
      </details>

      {showRevs ? (
        <div className="rounded-lg border border-border bg-background p-3 text-sm">
          <p className="font-medium">{L ? "पिछले संस्करण (हर सहेजने पर)" : "Previous versions (one per save)"}</p>
          <ul className="mt-2 flex flex-wrap gap-2">{(revs.data ?? []).map((r) => <li key={r.id}><Button size="sm" variant="outline" onClick={() => restore(r)}>{new Date(r.saved_at).toLocaleString("en-IN")}</Button></li>)}{revs.isSuccess && !revs.data.length ? <li className="text-muted-foreground">—</li> : null}</ul>
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[360px_1fr]">
        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-background p-3 text-sm">
            <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">{L ? "ब्लॉक जोड़ें" : "Add block"}</p>
            <div className="flex flex-wrap gap-1">{(Object.keys(BLOCK_LABELS) as BlockType[]).map((t) => <Button key={t} size="sm" variant="outline" onClick={() => add(t)} disabled={!canEdit}>+ {L ? BLOCK_LABELS[t].hi : BLOCK_LABELS[t].en}</Button>)}</div>
          </div>
          <div className="rounded-lg border border-border bg-background p-3 text-sm">
            <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">{L ? "पेज के ब्लॉक" : "Page blocks"}</p>
            <ul className="space-y-1">
              {page.blocks.map((b, i) => (
                <li key={b.id} className={`flex items-center gap-1 rounded px-2 py-1 ${sel === b.id ? "bg-primary/10 ring-1 ring-primary" : "hover:bg-secondary"}`}>
                  <button type="button" className="flex-1 text-left" onClick={() => setSel(b.id)}>{i + 1}. {L ? BLOCK_LABELS[b.type].hi : BLOCK_LABELS[b.type].en} <span className="text-xs text-muted-foreground">{summary(b)}</span></button>
                  {canEdit ? <><Button size="sm" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}>▲</Button><Button size="sm" variant="ghost" onClick={() => move(i, 1)} disabled={i === page.blocks.length - 1}>▼</Button><Button size="sm" variant="ghost" onClick={() => { setBlocks(page.blocks.filter((x) => x.id !== b.id)); if (sel === b.id) setSel(null); }}>×</Button></> : null}
                </li>
              ))}
              {!page.blocks.length ? <li className="text-muted-foreground">{L ? "ऊपर से ब्लॉक जोड़िए।" : "Add blocks from above."}</li> : null}
            </ul>
          </div>
          {selected ? <div className="rounded-lg border border-primary/40 bg-background p-3 text-sm"><p className="mb-2 font-medium">{L ? BLOCK_LABELS[selected.type].hi : BLOCK_LABELS[selected.type].en}</p><BlockForm b={selected} onChange={updateBlock} disabled={!canEdit} /></div> : null}
        </div>
        <div className="overflow-hidden rounded-lg border border-border bg-background">
          <p className="border-b border-border bg-secondary/60 px-3 py-1 text-xs text-muted-foreground">{L ? "पूर्वावलोकन" : "Preview"} · {lang === "hi" ? "हिंदी" : "English"}</p>
          <div className="max-h-[75vh] overflow-auto">
            {page.blocks.length ? <Blocks blocks={page.blocks} preview /> : <p className="p-6 text-sm text-muted-foreground">{L ? "खाली पेज" : "Empty page"}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function summary(b: Block): string {
  switch (b.type) {
    case "hero": return b.title; case "text": return b.heading || b.body.slice(0, 30); case "image": return b.caption || ""; case "gallery": return `${b.images.length} images`;
    case "cards": return `${b.items.length} cards`; case "cta": return b.label; case "stats": return `${b.items.length}`; case "embed": return b.url.slice(0, 30); case "posts": return b.kind; default: return "";
  }
}

type Rec = Record<string, unknown>;
type Ctx = { b: Block; set: (k: string, v: unknown) => void; disabled: boolean };
function F({ b, set, disabled, k, label, area, type }: Ctx & { k: string; label: string; area?: boolean; type?: string }) {
  const val = (b as unknown as Rec)[k];
  return <Lbl label={label}>{area ? <Textarea rows={5} value={String(val ?? "")} onChange={(e) => set(k, e.target.value)} disabled={disabled} /> : <Input type={type ?? "text"} value={String(val ?? "")} onChange={(e) => set(k, e.target.value)} disabled={disabled} />}</Lbl>;
}
function Sel({ b, set, disabled, k, label, opts }: Ctx & { k: string; label: string; opts: (string | number)[] }) {
  return <Lbl label={label}><select className="h-9 w-full rounded-md border border-input bg-background px-2" value={String((b as unknown as Rec)[k] ?? "")} onChange={(e) => set(k, typeof opts[0] === "number" ? Number(e.target.value) : e.target.value)} disabled={disabled}>{opts.map((o) => <option key={o} value={o}>{o}</option>)}</select></Lbl>;
}
function Chk({ b, set, disabled, k, label }: Ctx & { k: string; label: string }) {
  return <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!(b as unknown as Rec)[k]} onChange={(e) => set(k, e.target.checked)} disabled={disabled} /> {label}</label>;
}
type Item = Record<string, string>;
function ListEditor({ b, set, disabled, k, fields }: Ctx & { k: string; fields: { key: string; label: string }[] }) {
  const items = ((b as unknown as Record<string, Item[]>)[k] ?? []);
  const upd = (i: number, key: string, v: string) => set(k, items.map((it, j) => (j === i ? { ...it, [key]: v } : it)));
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="rounded border border-border p-2">
          <div className="grid grid-cols-2 gap-1">{fields.map((f) => <Input key={f.key} placeholder={f.label} value={it[f.key] ?? ""} onChange={(e) => upd(i, f.key, e.target.value)} disabled={disabled} />)}</div>
          <div className="mt-1 flex gap-1"><Button size="sm" variant="ghost" disabled={disabled || i === 0} onClick={() => { const a = [...items]; [a[i - 1], a[i]] = [a[i]!, a[i - 1]!]; set(k, a); }}>▲</Button><Button size="sm" variant="ghost" disabled={disabled || i === items.length - 1} onClick={() => { const a = [...items]; [a[i + 1], a[i]] = [a[i]!, a[i + 1]!]; set(k, a); }}>▼</Button><Button size="sm" variant="ghost" disabled={disabled} onClick={() => set(k, items.filter((_, j) => j !== i))}>×</Button></div>
        </div>
      ))}
      <Button size="sm" variant="outline" disabled={disabled} onClick={() => set(k, [...items, Object.fromEntries(fields.map((f) => [f.key, ""]))])}>+ item</Button>
    </div>
  );
}

function BlockForm({ b, onChange, disabled }: { b: Block; onChange: (b: Block) => void; disabled: boolean }) {
  const set = (k: string, v: unknown) => onChange({ ...b, [k]: v } as Block);
  const c: Ctx = { b, set, disabled };
  switch (b.type) {
    case "hero": return <div className="space-y-2"><F {...c} k="title" label="Title" /><F {...c} k="title_hi" label="शीर्षक (हिंदी)" /><F {...c} k="subtitle" label="Subtitle" /><F {...c} k="subtitle_hi" label="उपशीर्षक (हिंदी)" /><F {...c} k="image" label="Background image URL" /><F {...c} k="cta_label" label="Button label" /><F {...c} k="cta_to" label="Button link (e.g. /join)" /><Sel {...c} k="align" label="Align" opts={["center", "left"]} /><Chk {...c} k="dark" label="Dark background" /></div>;
    case "text": return <div className="space-y-2"><F {...c} k="heading" label="Heading" /><F {...c} k="heading_hi" label="शीर्षक (हिंदी)" /><F {...c} k="body" label="Text (blank line = new paragraph, **bold**)" area /><F {...c} k="body_hi" label="पाठ (हिंदी)" area /><Sel {...c} k="width" label="Width" opts={["narrow", "wide"]} /></div>;
    case "image": return <div className="space-y-2"><F {...c} k="src" label="Image URL" /><F {...c} k="caption" label="Caption" /><Chk {...c} k="full" label="Full width" /></div>;
    case "gallery": return <div className="space-y-2"><Sel {...c} k="cols" label="Columns" opts={[2, 3, 4]} /><ListEditor {...c} k="images" fields={[{ key: "src", label: "Image URL" }, { key: "caption", label: "Caption" }]} /></div>;
    case "cards": return <div className="space-y-2"><F {...c} k="heading" label="Heading" /><F {...c} k="heading_hi" label="शीर्षक (हिंदी)" /><Sel {...c} k="cols" label="Columns" opts={[2, 3, 4]} /><ListEditor {...c} k="items" fields={[{ key: "title", label: "Title" }, { key: "title_hi", label: "शीर्षक" }, { key: "text", label: "Text" }, { key: "text_hi", label: "पाठ" }, { key: "image", label: "Image URL" }, { key: "to", label: "Link" }]} /></div>;
    case "cta": return <div className="space-y-2"><F {...c} k="text" label="Text" /><F {...c} k="text_hi" label="पाठ (हिंदी)" /><F {...c} k="label" label="Button label" /><F {...c} k="label_hi" label="बटन (हिंदी)" /><F {...c} k="to" label="Link" /><Sel {...c} k="style" label="Style" opts={["primary", "accent"]} /></div>;
    case "stats": return <ListEditor {...c} k="items" fields={[{ key: "value", label: "Value (e.g. 500+)" }, { key: "label", label: "Label" }, { key: "label_hi", label: "लेबल (हिंदी)" }]} />;
    case "embed": return <div className="space-y-2"><F {...c} k="url" label="YouTube / map / embed URL" /><F {...c} k="title" label="Title" /><Sel {...c} k="ratio" label="Ratio" opts={["16/9", "4/3", "1/1"]} /></div>;
    case "posts": return <div className="space-y-2"><F {...c} k="heading" label="Heading" /><F {...c} k="heading_hi" label="शीर्षक (हिंदी)" /><Sel {...c} k="kind" label="Source" opts={["news", "blog"]} /><Sel {...c} k="limit" label="How many" opts={[3, 6, 9]} /></div>;
    case "contact": return <div className="space-y-2"><F {...c} k="heading" label="Heading" /><F {...c} k="heading_hi" label="शीर्षक (हिंदी)" /></div>;
    case "spacer": return <Sel {...c} k="size" label="Size" opts={["s", "m", "l"]} />;
    case "divider": return <p className="text-xs text-muted-foreground">—</p>;
  }
}

function Lbl({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}
