// Kalchuri One · Universal Design Engine · document model.
// One engine for letterheads, letters, certificates, receipts, ID cards, invitations, posters and shok patra.
// Geometry is in page pixels at 96 dpi (A4 = 794 × 1123). Export rasterises at a higher scale (default 300 dpi).

export const MM_TO_PX = 96 / 25.4;
export const mm = (v: number) => v * MM_TO_PX;

export type PagePreset = { key: string; label: string; wMm: number; hMm: number };
export const PAGE_PRESETS: PagePreset[] = [
  { key: "a4p", label: "A4 portrait", wMm: 210, hMm: 297 },
  { key: "a4l", label: "A4 landscape", wMm: 297, hMm: 210 },
  { key: "a5p", label: "A5 portrait", wMm: 148, hMm: 210 },
  { key: "a5l", label: "A5 landscape", wMm: 210, hMm: 148 },
  { key: "letter", label: "US Letter", wMm: 215.9, hMm: 279.4 },
  { key: "idcard", label: "ID card (CR80)", wMm: 85.6, hMm: 54 },
  { key: "idcardp", label: "ID card portrait", wMm: 54, hMm: 85.6 },
  { key: "square", label: "Square post (1080)", wMm: 285.75, hMm: 285.75 },
  { key: "story", label: "Story (1080×1920)", wMm: 285.75, hMm: 508 },
  { key: "shokl", label: "शोकपत्र आड़ा (1400×1120)", wMm: 370.4, hMm: 296.3 },
  { key: "shokp", label: "शोकपत्र खड़ा (1050×1491)", wMm: 277.8, hMm: 394.5 },
];

export type FontKey = "mukta" | "tiro" | "notoserif" | "sora" | "manrope";
export const FONTS: Record<FontKey, { label: string; css: string }> = {
  mukta: { label: "Mukta (Devanagari + Latin)", css: "Mukta" },
  tiro: { label: "Tiro Devanagari Hindi", css: '"Tiro Devanagari Hindi"' },
  notoserif: { label: "Noto Serif Devanagari", css: '"Noto Serif Devanagari"' },
  sora: { label: "Sora (headings)", css: "Sora" },
  manrope: { label: "Manrope", css: "Manrope" },
};

export type ArtName = "diya" | "lotus" | "flower" | "om" | "divider" | "ornament" | "leaf" | "garland" | "seal" | "mandala" | "flourish";
export type FrameStyle = "single" | "double" | "corner" | "ornate" | "rounded";

type Base = {
  id: string;
  name?: string;
  x: number;
  y: number;
  w: number;
  h?: number;                // optional for text/line (computed)
  rot?: number;
  opacity?: number;
  hidden?: boolean;
  locked?: boolean;
  /** Page-0 layer that should appear only on the last page (signature, QR) when body text flows. */
  lastPageOnly?: boolean;
};

export type TextLayer = Base & {
  type: "text";
  text: string;              // may contain **bold** and {{merge.fields}}
  font?: FontKey;
  size?: number;             // px
  weight?: 400 | 500 | 600 | 700;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  align?: "left" | "center" | "right";
  lh?: number;               // line height px
  indent?: number;
  nowrap?: boolean;
  fit?: boolean;             // shrink font until it fits the box (single-line fields such as names)
  ls?: number;               // letter spacing px (labels in capitals)
};
export type FlowLayer = Base & {
  type: "flow";              // long body text; paginates onto following pages
  text: string;
  font?: FontKey;
  size?: number;
  color?: string;
  lh?: number;
  align?: "left" | "justify";
  paraGap?: number;
};
/** fill2 + grad turn the fill into a linear gradient (v = top→bottom, h = left→right). */
export type RectLayer = Base & { type: "rect"; fill?: string; fill2?: string; grad?: "v" | "h"; color?: string; lw?: number; radius?: number };
export type LineLayer = Base & { type: "line"; color?: string; lw?: number; dash?: boolean };
export type FrameLayer = Base & { type: "frame"; style?: FrameStyle; color?: string; lw?: number; radius?: number };
export type ArtLayer = Base & { type: "art"; art: ArtName; color?: string };
/** When the picture is missing: `monogram` (merge text, e.g. "{{org.name}}") draws a round badge with its first letter;
 *  otherwise nothing is drawn on the final output (the editor shows a dashed placeholder). */
export type ImageLayer = Base & { type: "image"; src: string; shape?: "rect" | "circle"; radius?: number; ring?: number; color?: string; fit?: "cover" | "contain"; monogram?: string };
export type QrLayer = Base & { type: "qr"; data: string; color?: string };   // data may contain merge fields
export type TableLayer = Base & {
  type: "table";
  columns: { key: string; label: string; width: number; align?: "left" | "right" | "center" }[];
  rowsField: string;         // merge field holding an array of rows
  font?: FontKey;
  size?: number;
  color?: string;
  headerFill?: string;
  rowH?: number;
};

export type Layer = TextLayer | FlowLayer | RectLayer | LineLayer | FrameLayer | ArtLayer | ImageLayer | QrLayer | TableLayer;

/** Omit that distributes over the Layer union (keeps the discriminant). */
export type LayerInput = Layer extends infer L ? (L extends Layer ? Omit<L, "id"> : never) : never;

export type Page = { id: string; layers: Layer[] };

export type DesignDoc = {
  version: 1;
  preset: string;            // PAGE_PRESETS key or "custom"
  wMm: number;
  hMm: number;
  bg: string;
  /** Layers repeated on every page (letterhead header/footer). */
  master: Layer[];
  pages: Page[];
  /** Declared merge fields with labels, for the form in the letter composer. */
  fields?: { key: string; label: string; label_hi?: string; sample?: string }[];
  /** Document language: "hi" = everything in Hindi, "en" = everything in English (picks preview sample data). */
  lang?: "hi" | "en";
};

export const uid = () => Math.random().toString(36).slice(2, 10);

export function pagePx(doc: Pick<DesignDoc, "wMm" | "hMm">) {
  return { W: Math.round(mm(doc.wMm)), H: Math.round(mm(doc.hMm)) };
}

export function newDoc(preset = "a4p", bg = "#ffffff"): DesignDoc {
  const p = PAGE_PRESETS.find((x) => x.key === preset) ?? PAGE_PRESETS[0]!;
  return { version: 1, preset: p.key, wMm: p.wMm, hMm: p.hMm, bg, master: [], pages: [{ id: uid(), layers: [] }], fields: [] };
}

/** Deep clone without runtime-only keys (those starting with "_"). */
export function cleanDoc<T>(v: T): T {
  return JSON.parse(JSON.stringify(v, (k, val) => (k.startsWith("_") ? undefined : val)));
}
