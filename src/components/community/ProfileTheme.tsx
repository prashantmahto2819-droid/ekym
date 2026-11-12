// Profile look: colour presets, layout variants, emoji stickers on the cover (cover itself may be a static image or a GIF).

export type Sticker = { e: string; x: number; y: number; s: number };   // emoji, % from left, % from top, size px
export type Theme = { preset?: string; layout?: string; stickers?: Sticker[] };

export const PRESETS: { id: string; name: string; name_hi: string; cover: string; accent: string; card: string; ring: string }[] = [
  { id: "classic", name: "Classic", name_hi: "क्लासिक", cover: "from-primary/30 via-primary/15 to-amber-200/40", accent: "text-primary", card: "bg-card", ring: "border-card" },
  { id: "saffron", name: "Saffron", name_hi: "केसरिया", cover: "from-orange-400 via-amber-300 to-yellow-200", accent: "text-orange-700", card: "bg-orange-50/60 dark:bg-orange-950/20", ring: "border-orange-100" },
  { id: "royal", name: "Royal", name_hi: "शाही", cover: "from-indigo-700 via-purple-600 to-fuchsia-500", accent: "text-indigo-700", card: "bg-indigo-50/60 dark:bg-indigo-950/20", ring: "border-indigo-100" },
  { id: "forest", name: "Forest", name_hi: "हरियाली", cover: "from-emerald-700 via-green-500 to-lime-300", accent: "text-emerald-700", card: "bg-emerald-50/60 dark:bg-emerald-950/20", ring: "border-emerald-100" },
  { id: "rose", name: "Rose", name_hi: "गुलाबी", cover: "from-rose-500 via-pink-400 to-orange-200", accent: "text-rose-700", card: "bg-rose-50/60 dark:bg-rose-950/20", ring: "border-rose-100" },
  { id: "night", name: "Night", name_hi: "रात", cover: "from-slate-900 via-slate-700 to-sky-700", accent: "text-sky-700", card: "bg-slate-50/80 dark:bg-slate-900/40", ring: "border-slate-200" },
];
export const LAYOUTS: { id: string; name_hi: string; name: string }[] = [
  { id: "classic", name_hi: "क्लासिक (बाएँ फोटो)", name: "Classic (photo left)" },
  { id: "centered", name_hi: "बीच में फोटो", name: "Centered" },
  { id: "banner", name_hi: "बड़ा कवर", name: "Tall banner" },
];
export const STICKER_SET = ["🙏", "🪔", "🌸", "🌼", "🕉️", "🚩", "🎉", "🎂", "💐", "❤️", "⭐", "🌟", "✨", "🎊", "🏵️", "🌺", "🦚", "🐘", "🌞", "🌙", "🔥", "🏆", "🎵", "📿", "🪷", "🌾", "🏡", "👑", "💎", "🎈"];

export const presetOf = (t: Theme | undefined | null) => PRESETS.find((p) => p.id === (t?.preset ?? "classic")) ?? PRESETS[0]!;
export const isGif = (url: string | null | undefined) => !!url && /\.gif($|\?)/i.test(url);

/** Cover strip with background (image/GIF or gradient) and stickers; `editable` lets the parent place/remove stickers. */
export function Cover({ url, theme, height, onPlace, onRemove, children }: { url: string | null | undefined; theme: Theme; height: string; onPlace?: ((x: number, y: number) => void) | undefined; onRemove?: ((i: number) => void) | undefined; children?: React.ReactNode }) {
  const p = presetOf(theme);
  return (
    <div className={`relative ${height} bg-gradient-to-r ${p.cover} bg-cover bg-center select-none`} style={url ? { backgroundImage: `url(${url})` } : undefined}
      onClick={onPlace ? (e) => { const r = e.currentTarget.getBoundingClientRect(); onPlace(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100); } : undefined}>
      {(theme.stickers ?? []).map((s, i) => (
        <span key={i} className={`absolute -translate-x-1/2 -translate-y-1/2 drop-shadow ${onRemove ? "cursor-pointer hover:scale-110" : ""}`} style={{ left: `${s.x}%`, top: `${s.y}%`, fontSize: s.s }} title={onRemove ? "हटाएँ" : undefined}
          onClick={onRemove ? (e) => { e.stopPropagation(); onRemove(i); } : undefined}>{s.e}</span>
      ))}
      {children}
    </div>
  );
}

/** Editor controls: preset swatches, layout, sticker palette (click a sticker, then click on the cover to place it). */
export function ThemeEditor({ theme, onChange, L, picked, setPicked, size, setSize }: { theme: Theme; onChange: (t: Theme) => void; L: boolean; picked: string | null; setPicked: (e: string | null) => void; size: number; setSize: (n: number) => void }) {
  return (
    <div className="space-y-3 rounded-lg border border-border p-3 text-sm">
      <div>
        <p className="mb-1 font-semibold">🎨 {L ? "रंग-थीम" : "Colour theme"}</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => <button key={p.id} type="button" onClick={() => onChange({ ...theme, preset: p.id })} className={`flex items-center gap-2 rounded-full border px-2 py-1 text-xs ${(theme.preset ?? "classic") === p.id ? "border-primary ring-2 ring-primary/30" : "border-border"}`}><span className={`inline-block h-5 w-10 rounded-full bg-gradient-to-r ${p.cover}`} />{L ? p.name_hi : p.name}</button>)}
        </div>
      </div>
      <div>
        <p className="mb-1 font-semibold">🧩 {L ? "लेआउट" : "Layout"}</p>
        <div className="flex flex-wrap gap-2">{LAYOUTS.map((l) => <button key={l.id} type="button" onClick={() => onChange({ ...theme, layout: l.id })} className={`rounded-full border px-3 py-1 text-xs ${(theme.layout ?? "classic") === l.id ? "border-primary bg-primary/10" : "border-border"}`}>{L ? l.name_hi : l.name}</button>)}</div>
      </div>
      <div>
        <p className="mb-1 font-semibold">✨ {L ? "स्टिकर" : "Stickers"} <span className="font-normal text-muted-foreground">({L ? "स्टिकर चुनिए, फिर कवर पर जहाँ चाहिए क्लिक कीजिए; हटाने के लिए स्टिकर पर क्लिक" : "pick one, then click on the cover to place it; click a sticker to remove"})</span></p>
        <div className="flex flex-wrap gap-1">{STICKER_SET.map((e) => <button key={e} type="button" onClick={() => setPicked(picked === e ? null : e)} className={`grid size-9 place-items-center rounded-md border text-xl ${picked === e ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"}`}>{e}</button>)}</div>
        <label className="mt-2 flex items-center gap-2 text-xs">{L ? "आकार" : "Size"} <input type="range" min={20} max={72} value={size} onChange={(e) => { setSize(Number(e.target.value)); onChange({ ...theme, stickers: (theme.stickers ?? []).map((s, i, a) => i === a.length - 1 ? { ...s, s: Number(e.target.value) } : s) }); }} /> {size}px
          {(theme.stickers ?? []).length ? <button type="button" className="ml-2 underline" onClick={() => onChange({ ...theme, stickers: [] })}>{L ? "सब हटाएँ" : "clear all"}</button> : null}</label>
      </div>
    </div>
  );
}
