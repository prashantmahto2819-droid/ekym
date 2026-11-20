import type { Person } from "@/family/layout";

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cut = (t: string, n: number) => { const a = [...t]; return a.length > n ? a.slice(0, n - 1).join("") + "…" : t; };

type TNode = Person & { kids: TNode[]; d: number; h: number; w: number; x: number; y: number };

/** Printable chart of one family as an SVG string: ancestors on top, wife inside the husband's box, never phone numbers. */
export function treeSvg(people: Person[], title: string, subtitle: string, L: boolean): { svg: string; W: number; H: number } {
  const NW = 172, HG = 16, VG = 46, PAD = 40;
  const late = (p: Person) => (p.is_deceased ? (L ? "स्व. " : "Late ") : "") + p.name;
  const wifeOf = new Map<string, Person>();
  for (const p of people) if (p.member_kind === "spouse" && p.parent_id) wifeOf.set(p.parent_id, p);
  const byId = new Map<string, TNode>();
  for (const p of people) if (p.member_kind !== "spouse") byId.set(p.id, { ...p, kids: [], d: 0, h: 0, w: 0, x: 0, y: 0 });
  const roots: TNode[] = [];
  for (const n of byId.values()) { const par = n.parent_id ? byId.get(n.parent_id) : undefined; if (par) par.kids.push(n); else roots.push(n); }
  const rank = (n: TNode) => (n.member_kind === "daughter" ? 1 : 0);
  const sortKids = (n: TNode) => { n.kids.sort((a, b) => rank(a) - rank(b) || (a.sort_order ?? 0) - (b.sort_order ?? 0)); n.kids.forEach(sortKids); };
  roots.forEach(sortKids);
  const lines = (n: TNode) => {
    const out: { t: string; b?: boolean; dim?: boolean }[] = [{ t: cut(late(n), 20), b: true }];
    const w = wifeOf.get(n.id);
    if (w && !w.name_unknown) out.push({ t: cut((L ? "पत्नी: " : "Wife: ") + late(w), 24) });
    const place = n.native_place || n.village_name;
    if (place) out.push({ t: cut(place, 24), dim: true });
    return out;
  };
  const levelH: number[] = [];
  const walk = (n: TNode, d: number) => { n.d = d; n.h = 16 + lines(n).length * 17; levelH[d] = Math.max(levelH[d] ?? 0, n.h); n.kids.forEach((c) => walk(c, d + 1)); };
  roots.forEach((r) => walk(r, 0));
  const levelY: number[] = [];
  let yy = PAD + 74;
  levelH.forEach((lh, i) => { levelY[i] = yy; yy += lh + VG; });
  const measure = (n: TNode): number => { n.w = Math.max(NW, n.kids.reduce((a, c) => a + measure(c), 0) + HG * Math.max(0, n.kids.length - 1)); return n.w; };
  const all: TNode[] = [];
  const place = (n: TNode, x: number) => {
    const total = n.kids.reduce((a, c) => a + c.w, 0) + HG * Math.max(0, n.kids.length - 1);
    let cx = x + (n.w - total) / 2;
    for (const c of n.kids) { place(c, cx); cx += c.w + HG; }
    n.x = x + n.w / 2 - NW / 2; n.y = levelY[n.d] ?? 0; all.push(n);
  };
  let x = PAD;
  for (const r of roots) { measure(r); place(r, x); x += r.w + 50; }
  const W = Math.max(x - 50 + PAD, 620), H = yy - VG + PAD + 26;
  const o: string[] = [];
  const text = (t: string, tx: number, ty: number, size: number, fill: string, bold = false, anchor = "middle") =>
    o.push(`<text x="${tx}" y="${ty}" text-anchor="${anchor}" font-size="${size}" fill="${fill}"${bold ? ' font-weight="700"' : ""}>${esc(t)}</text>`);
  o.push(`<rect width="${W}" height="${H}" fill="#fffdf8"/><rect x="10" y="10" width="${W - 20}" height="${H - 20}" fill="none" stroke="#b8924a" stroke-width="2" rx="8"/>`);
  text(title, W / 2, PAD + 22, 28, "#14213d", true);
  if (subtitle) text(subtitle, W / 2, PAD + 46, 14, "#5b6478");
  for (const n of all) {
    if (!n.kids.length) continue;
    const px = n.x + NW / 2, my = (levelY[n.d + 1] ?? 0) - VG / 2;
    const xs = n.kids.map((c) => c.x + NW / 2);
    o.push(`<path d="M${px} ${n.y + n.h}V${my}M${Math.min(px, ...xs)} ${my}H${Math.max(px, ...xs)}${n.kids.map((c) => `M${c.x + NW / 2} ${my}V${c.y}`).join("")}" stroke="#9aa3b5" stroke-width="1.4" fill="none"/>`);
  }
  for (const n of all) {
    const girl = n.member_kind === "daughter" || n.member_kind === "woman";
    o.push(`<rect x="${n.x}" y="${n.y}" width="${NW}" height="${n.h}" rx="9" fill="${n.is_deceased ? "#f1efe9" : girl ? "#fdf1f4" : "#ffffff"}" stroke="${n.is_head ? "#14213d" : "#b8924a"}" stroke-width="${n.is_head ? 2.4 : 1.3}"/>`);
    lines(n).forEach((l, i) => text(l.t, n.x + NW / 2, n.y + 22 + i * 17, l.b ? 14.5 : 12, l.dim ? "#6b7385" : "#14213d", !!l.b));
    if (n.is_head) text(L ? "मुखिया" : "Head", n.x + NW - 6, n.y - 4, 10.5, "#14213d", true, "end");
  }
  return { W, H, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Mukta, 'Noto Sans Devanagari', 'Nirmala UI', sans-serif">${o.join("")}</svg>` };
}
